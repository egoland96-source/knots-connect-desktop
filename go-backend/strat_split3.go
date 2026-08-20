// strat_split3.go — TCP 443 SNI-blacklist ClientHello'yu 3 parçaya bölen
// strateji. split2 başarısız olduğunda (cooldown) devreye giren alternatiftir:
// akış, ilk parçası en küçük olacak şekilde üçe bölünür. Bazı DPI
// ürünleri iki parçayı birleştirip SNI okurken üç parçada şaşırır.
package main

import (
	"encoding/binary"
	"fmt"
	"math/rand"
	"os"
	"time"

	"knots-go-backend/engine"
)

// Split3Strategy, üçlü TLS ClientHello parçalama stratejisidir.
type Split3Strategy struct {
	blacklist []string
	mode      int
}

// NewSplit3Strategy, blacklist ile kurulmuş 3 parçacıklı split stratejisi döner.
func NewSplit3Strategy(blacklist []string, mode int) *Split3Strategy {
	return &Split3Strategy{blacklist: blacklist, mode: mode}
}

func (s *Split3Strategy) Metadata() engine.StrategyMeta {
	return engine.StrategyMeta{
		ID:         "split3",
		Name:       "Üç parçalı TLS split (IPv4 TCP 443)",
		Protocols:  []int{6},
		IPVersions: []int{4},
		RiskLevel:  3,
	}
}

// Apply, split2 ile aynı ön koşulları kullanır; fark sadece parça sayısı.
func (s *Split3Strategy) Apply(raw, addr []byte, send engine.SendFunc) (bool, error) {
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

	fmt.Fprintf(os.Stderr, "[go-engine] SNI eşlendi: %s -> 3 parça (mode %d)\n", sni, s.mode)
	s.sendFragmented3(raw, addr, ipHdrLen, tcpHdrLen, payload, send)
	return true, nil
}

// sendFragmented3 — payload'ı üç parçaya böler.
// İlk bölünme SNI civarında (jitter), ikincisi kalanın yarısına yakın.
func (s *Split3Strategy) sendFragmented3(raw, addr []byte, ipHdrLen, tcpHdrLen int, payload []byte, send engine.SendFunc) {
	length := len(payload)
	split1 := chooseSplitPoint(payload)
	if split1 < 16 {
		split1 = 16
	}
	if split1 > length-24 {
		split1 = length - 24
	}
	split2 := split1 + (length-split1)/2 + rand.Intn(9) - 4
	if split2 < split1+8 {
		split2 = split1 + 8
	}
	if split2 > length-8 {
		split2 = length - 8
	}

	part1 := payload[:split1]
	part2 := payload[split1:split2]
	part3 := payload[split2:]

	seqNum := binary.BigEndian.Uint32(raw[ipHdrLen+4 : ipHdrLen+8])
	frag1 := s.buildFragment(raw, ipHdrLen, tcpHdrLen, part1, seqNum, false)
	frag2 := s.buildFragment(raw, ipHdrLen, tcpHdrLen, part2, seqNum+uint32(len(part1)), false)
	frag3 := s.buildFragment(raw, ipHdrLen, tcpHdrLen, part3, seqNum+uint32(len(part1)+len(part2)), true)

	sendRawStrat(frag1, addr, send)
	time.Sleep(splitDelay)
	sendRawStrat(frag2, addr, send)
	time.Sleep(splitDelay)
	sendRawStrat(frag3, addr, send)
}

// buildFragment — psh=true yalnızca SON parçada TCP PSH+ACK set eder;
// ara parçalar yalnız ACK ile gider (DPI reassembly penceresini doldurmasın).
func (s *Split3Strategy) buildFragment(original []byte, ipHdrLen, tcpHdrLen int, payload []byte, seqNum uint32, psh bool) []byte {
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