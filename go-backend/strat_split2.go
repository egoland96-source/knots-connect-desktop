// strat_split2.go — TCP 443 SNI-blacklist ClientHello'yu 2 parçaya bölen
// strateji. Bu, KNOWN-GOOD davranışın birebir taşındığı stratejidir:
// "Roblox sorunsuz çalıştırdı" motorun algoritması aynen korunur.
package main

import (
	"encoding/binary"
	"fmt"
	"os"
	"time"

	"knots-go-backend/engine"
)

// Split2Strategy, ikili TLS ClientHello parçalama stratejisidir.
type Split2Strategy struct {
	blacklist []string
	mode      int
}

// NewSplit2Strategy, blacklist ile kurulmuş 2 parçacıklı split stratejisi döner.
func NewSplit2Strategy(blacklist []string, mode int) *Split2Strategy {
	return &Split2Strategy{blacklist: blacklist, mode: mode}
}

func (s *Split2Strategy) Metadata() engine.StrategyMeta {
	return engine.StrategyMeta{
		ID:         "split2",
		Name:       "İki parçalı TLS split (IPv4 TCP 443)",
		Protocols:  []int{6},
		IPVersions: []int{4},
		RiskLevel:  2,
	}
}

// Apply — orijinal recovery davranışı: IPv4 TCP/443 ClientHello + SNI
// blacklist match → iki parçaya böl. Uygun değilse (handled=false) döner,
// paket passthrough edilir.
func (s *Split2Strategy) Apply(raw, addr []byte, send engine.SendFunc) (bool, error) {
	if len(raw) < 20 {
		return false, nil
	}
	if raw[0]>>4 != 4 { // IPv4 dışı
		return false, nil
	}
	ipHdrLen := int(raw[0]&0x0F) * 4
	if ipHdrLen < 20 || len(raw) < ipHdrLen+8 {
		return false, nil
	}
	if raw[9] != 6 { // TCP dışı
		return false, nil
	}

	tcpHdrLen := int((raw[ipHdrLen+12]>>4)&0x0F) * 4
	if tcpHdrLen < 20 || len(raw) < ipHdrLen+tcpHdrLen {
		return false, nil
	}

	payload := raw[ipHdrLen+tcpHdrLen:]
	if len(payload) < 50 {
		return false, nil
	}
	if !IsClientHello(payload) {
		return false, nil
	}

	sni := ExtractSNI(payload)
	if sni == "" || !MatchesDomain(sni, s.blacklist) {
		return false, nil
	}

	fmt.Fprintf(os.Stderr, "[go-engine] SNI eşlendi: %s -> parçalanıyor (mode %d)\n", sni, s.mode)
	s.sendFragmented(raw, addr, ipHdrLen, tcpHdrLen, payload, send)
	return true, nil
}

// sendFragmented — SNI civarından iki parçaya böl. Orijinal known-good.
func (s *Split2Strategy) sendFragmented(raw, addr []byte, ipHdrLen, tcpHdrLen int, payload []byte, send engine.SendFunc) {
	splitAt := chooseSplitPoint(payload)
	part1 := payload[:splitAt]
	part2 := payload[splitAt:]

	seqNum := binary.BigEndian.Uint32(raw[ipHdrLen+4 : ipHdrLen+8])
	frag1 := s.buildFragment(raw, ipHdrLen, tcpHdrLen, part1, seqNum, false)
	frag2 := s.buildFragment(raw, ipHdrLen, tcpHdrLen, part2, seqNum+uint32(len(part1)), true)

	sendRawStrat(frag1, addr, send)
	// Kısa gecikme: DPI'ın TCP reassembly penceresini aş, parçaları tek
	// akışta SNI okumasın.
	time.Sleep(splitDelay)
	sendRawStrat(frag2, addr, send)
}

// splitDelay, parçalar arası bekleme — DPI'ların çoğu ilk parçayı "eksik
// TLS" sayar; ikinci parça aralıklı gelince ClientHello'yu tamamlama
// penceresi dolmuş olur.
const splitDelay = 15 * time.Millisecond

// buildFragment — psh=true ise yalnızca SON parça PSH+ACK taşır; ara
// parçalar yalnız ACK ile gider ki alıcı ANAHTARINI doldurmasın.
func (s *Split2Strategy) buildFragment(original []byte, ipHdrLen, tcpHdrLen int, payload []byte, seqNum uint32, psh bool) []byte {
	totalLen := ipHdrLen + tcpHdrLen + len(payload)
	buf := make([]byte, totalLen)
	copy(buf, original[:ipHdrLen+tcpHdrLen])
	copy(buf[ipHdrLen+tcpHdrLen:], payload)

	binary.BigEndian.PutUint16(buf[2:4], uint16(totalLen)) // IP Total Length
	if psh {
		buf[ipHdrLen+13] = 0x18 // TCP PSH+ACK (son parça)
	} else {
		buf[ipHdrLen+13] = 0x10 // TCP ACK yalnız (ara parça)
	}
	binary.BigEndian.PutUint32(buf[ipHdrLen+4:ipHdrLen+8], seqNum)

	buf[10], buf[11] = 0, 0
	binary.BigEndian.PutUint16(buf[10:12], checksum16(buf[:ipHdrLen]))

	buf[ipHdrLen+16], buf[ipHdrLen+17] = 0, 0
	cs := tcpChecksumWithPseudoHeader(buf[12:16], buf[16:20], buf[ipHdrLen:])
	binary.BigEndian.PutUint16(buf[ipHdrLen+16:ipHdrLen+18], cs)

	return buf
}

func sendRawStrat(raw, addr []byte, send engine.SendFunc) {
	if send == nil {
		return
	}
	if err := send(raw, addr); err != nil {
		fmt.Fprintf(os.Stderr, "[go-engine] Gönderim hatası: %v\n", err)
	}
}