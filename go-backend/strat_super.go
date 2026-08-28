// strat_super.go — Superonline tipi DPI'lara karşı agresif stratejiler.
//
// Superonline'ın TCP birleştirme motoru küçük parçalarda zorlanır:
//   splitA  : ClientHello'yu ilk 2 bayttan böler (b[:2] ve b[2:]) —
//             DPI'ın reassembly'si en zayıf senaryo.
//   recfrag : ClientHello'yu 2 TLS Record'a böler ve TEK bir TCP paketinde
//             gönderir (TLS Record Fragmentation) — DPI kayıt sınırlarını
//             doğru ayrıştıramaz.
package main

import (
	"encoding/binary"
	"fmt"
	"os"
	"time"

	"knots-go-backend/engine"
)

// SplitAStrategy — ClientHello'yu ilk 2 bayttan bölen agresif split.
type SplitAStrategy struct {
	blacklist []string
	mode      int
}

func NewSplitAStrategy(blacklist []string, mode int) *SplitAStrategy {
	return &SplitAStrategy{blacklist: blacklist, mode: mode}
}

func (s *SplitAStrategy) Metadata() engine.StrategyMeta {
	return engine.StrategyMeta{
		ID:         "splitA",
		Name:       "Agresif 2-bayt TLS split",
		Protocols:  []int{6},
		IPVersions: []int{4},
		RiskLevel:  4,
	}
}

func (s *SplitAStrategy) Apply(raw, addr []byte, send engine.SendFunc) (bool, error) {
	if len(raw) < 20 || raw[0]>>4 != 4 || raw[9] != 6 {
		return false, nil
	}
	ipHdrLen := int(raw[0]&0x0F) * 4
	if ipHdrLen < 20 || len(raw) < ipHdrLen+8 {
		return false, nil
	}
	tcpHdrLen := int((raw[ipHdrLen+12]>>4)&0x0F) * 4
	if tcpHdrLen < 20 || len(raw) < ipHdrLen+tcpHdrLen {
		return false, nil
	}

	payload := raw[ipHdrLen+tcpHdrLen:]
	if len(payload) < 50 || !IsClientHello(payload) {
		return false, nil
	}

	sni := ExtractSNI(payload)
	if sni == "" {
		return false, nil
	}
	if IsAdDomainFast(sni) {
		fmt.Fprintf(os.Stderr, "[adblock] DROP ad/tracker: %s\n", sni)
		return true, nil
	}
	if !MatchesDomain(sni, s.blacklist) {
		return false, nil
	}

	fmt.Fprintf(os.Stderr, "[go-engine] splitA: SNI eşlendi %s -> ilk 2 bayt ayrılıyor\n", sni)
	s.sendSuperFrag(raw, addr, ipHdrLen, tcpHdrLen, payload, send, 2)
	return true, nil
}

// sendSuperFrag — payload'ı ilk headBytes'dan ve orta noktadan bölerek üç
// parça gönderir (Superonline profili). Parçalar arası kısa gecikme.
func (s *SplitAStrategy) sendSuperFrag(raw, addr []byte, ipHdrLen, tcpHdrLen int, payload []byte, send engine.SendFunc, headBytes int) {
	length := len(payload)
	if headBytes < 1 || headBytes >= length-8 {
		return
	}
	split2 := length/2 + (length%2) - headBytes
	if split2 < headBytes+8 {
		split2 = headBytes + 8
	}
	if split2 > length-8 {
		split2 = length - 8
	}

	part1 := payload[:headBytes]
	part2 := payload[headBytes:split2]
	part3 := payload[split2:]

	seqNum := binary.BigEndian.Uint32(raw[ipHdrLen+4 : ipHdrLen+8])
	frag1 := buildTCPFragment(raw, ipHdrLen, tcpHdrLen, part1, seqNum, false)
	frag2 := buildTCPFragment(raw, ipHdrLen, tcpHdrLen, part2, seqNum+uint32(len(part1)), false)
	frag3 := buildTCPFragment(raw, ipHdrLen, tcpHdrLen, part3, seqNum+uint32(len(part1)+len(part2)), true)

	sendRawStrat(frag1, addr, send)
	time.Sleep(splitDelay)
	sendRawStrat(frag2, addr, send)
	time.Sleep(splitDelay)
	sendRawStrat(frag3, addr, send)
}

// RecFragStrategy — ClientHello'yu iki TLS Record'a bölüp TEK TCP paketinde
// gönderir. TCP payload'ı yeniden yazılır: iki (type,len,data) kaydı.
type RecFragStrategy struct {
	blacklist []string
	mode      int
}

func NewRecFragStrategy(blacklist []string, mode int) *RecFragStrategy {
	return &RecFragStrategy{blacklist: blacklist, mode: mode}
}

func (s *RecFragStrategy) Metadata() engine.StrategyMeta {
	return engine.StrategyMeta{
		ID:         "recfrag",
		Name:       "TLS Record parçalama (2 kayıt, tek TCP)",
		Protocols:  []int{6},
		IPVersions: []int{4},
		RiskLevel:  3,
	}
}

func (s *RecFragStrategy) Apply(raw, addr []byte, send engine.SendFunc) (bool, error) {
	if len(raw) < 20 || raw[0]>>4 != 4 || raw[9] != 6 {
		return false, nil
	}
	ipHdrLen := int(raw[0]&0x0F) * 4
	if ipHdrLen < 20 || len(raw) < ipHdrLen+8 {
		return false, nil
	}
	tcpHdrLen := int((raw[ipHdrLen+12]>>4)&0x0F) * 4
	if tcpHdrLen < 20 || len(raw) < ipHdrLen+tcpHdrLen {
		return false, nil
	}

	payload := raw[ipHdrLen+tcpHdrLen:]
	if len(payload) < 50 || !IsClientHello(payload) {
		return false, nil
	}

	sni := ExtractSNI(payload)
	if sni == "" {
		return false, nil
	}
	if IsAdDomainFast(sni) {
		fmt.Fprintf(os.Stderr, "[adblock] DROP ad/tracker: %s\n", sni)
		return true, nil
	}
	if !MatchesDomain(sni, s.blacklist) {
		return false, nil
	}

	fmt.Fprintf(os.Stderr, "[go-engine] recfrag: SNI eşlendi %s -> TLS kayıtları bölünüyor\n", sni)
	s.sendRecFrag(raw, addr, ipHdrLen, tcpHdrLen, payload, send)
	return true, nil
}

// sendRecFrag — tek TLS handshake kaydını iki ayrı TLS Record'a böler.
// Orijinal kayıt: [0x16][ver][len][data]; yeni: [0x16][ver][len1][data1]
// [0x16][ver][len2][data2], aynı TCP seq ile tek gönderim.
func (s *RecFragStrategy) sendRecFrag(raw, addr []byte, ipHdrLen, tcpHdrLen int, payload []byte, send engine.SendFunc) {
	// TLS Record başlığı en az 5 bayt: type(1)+ver(2)+len(2)
	if len(payload) < 5+5 {
		return
	}
	recLen := int(binary.BigEndian.Uint16(payload[3:5]))
	if recLen < 4 || 5+recLen > len(payload) {
		return
	}
	recType := payload[0]
	recVer := payload[1:3]
	data := payload[5 : 5+recLen]

	// İkiye böl — SNI'nin kayıt sınırını asla aşmayacak şekilde orta noktadan.
	mid := recLen / 2
	if mid < 2 {
		mid = 2
	}
	if recLen-mid < 2 {
		mid = recLen - 2
	}

	newPayload := make([]byte, 0, recLen+5+5)
	newPayload = append(newPayload, recType, recVer[0], recVer[1])
	var l1 = uint16(mid)
	newPayload = append(newPayload, byte(l1>>8), byte(l1))
	newPayload = append(newPayload, data[:mid]...)
	newPayload = append(newPayload, recType, recVer[0], recVer[1])
	var l2 = uint16(recLen - mid)
	newPayload = append(newPayload, byte(l2>>8), byte(l2))
	newPayload = append(newPayload, data[mid:]...)

	seqNum := binary.BigEndian.Uint32(raw[ipHdrLen+4 : ipHdrLen+8])
	frag := buildTCPFragment(raw, ipHdrLen, tcpHdrLen, newPayload, seqNum, true)
	sendRawStrat(frag, addr, send)
}