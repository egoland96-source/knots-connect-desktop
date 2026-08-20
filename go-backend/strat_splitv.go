// strat_splitv.go — GoodbyeDPI "-k" tarzı SNI-gizleyen parçalama stratejisi.
//
// split2 SNI'nin ÖNÜNDEN bölüyor: ikinci parçada full SNI hostname'i tek
// segmentte görünür → segment bazlı eşleşme yapan DPI video CDN'i anında
// tanır ve akışı boğar/kapatır (videoların passthrough'te bile açılmama
// nedeni buydu — passthrough'ta da full SNI görülüyordu).
//
// splitv bunun yerine bölme noktasını SNI hostname'inin TAM ORTASINA koyar
// ve parçaları GECİKMESİZ (arka arkaya) gönderir. Hiçbir tek segment
// hostname'i bütün halinde taşımaz → "pornhub.com" hiçbir pakette
// eşleşemez → DPI akışa video etiketi basamaz → boğma tetiklenmez.
//
// Sertleştirme (sendFragmentsGood): sıralı parçaları birleştiren (reassembly
// yapan) DPI'lara karşı SNI bölgesi 2 BAYTLIK minik segmentlere ayrılır ve
// öncesi/sonrası iri parçalarla çevrelenir. Segment sayısı artınca DPI'ın
// reassembly kuyruğu dolar → birleştirmeyi bırakır ve SNI'yi asla okuyamaz.
package main

import (
	"encoding/binary"
	"fmt"
	"math/rand"
	"os"

	"knots-go-backend/engine"
)

// SplitVStrategy, ClientHello'yu SNI hostname bölgesinden çoklu parçaya böler.
type SplitVStrategy struct {
	blacklist []string
	mode      int
	force     bool // global bypass: blacklist'e bakmadan TÜM SNI'li ClientHello'ları böl
}

// NewSplitVStrategy, SNI-gizleyen parçalama stratejisi kurar.
func NewSplitVStrategy(blacklist []string, mode int) *SplitVStrategy {
	return &SplitVStrategy{blacklist: blacklist, mode: mode}
}

// SetForceAll, blacklist eşleşmesini yok sayarak her SNI'li ClientHello'yu
// bölmeyi açar (GoodbyeDPI -k tarzı global bypass).
func (s *SplitVStrategy) SetForceAll(v bool) { s.force = v }

func (s *SplitVStrategy) Metadata() engine.StrategyMeta {
	return engine.StrategyMeta{
		ID:         "splitv",
		Name:       "SNI-gizleyen çoklu TLS split (IPv4 TCP 443)",
		Protocols:  []int{6},
		IPVersions: []int{4},
		RiskLevel:  2,
	}
}

// Apply — IPv4 TCP/443 ClientHello + (force veya blacklist match) → SNI
// hostname bölgesinden çoklu parçaya böl. Uygun değilse (handled=false)
// döner, paket passthrough edilir.
func (s *SplitVStrategy) Apply(raw, addr []byte, send engine.SendFunc) (bool, error) {
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
	if len(payload) < 50 {
		return false, nil
	}
	if !IsClientHello(payload) {
		return false, nil
	}

	sni := ExtractSNI(payload)
	if sni == "" {
		return false, nil
	}
	if s.force && globalSkipMatch(sni) {
		fmt.Fprintf(os.Stderr, "[go-engine] global skip: %s -> passthrough\n", sni)
		return false, nil
	}
	if !s.force && !MatchesDomain(sni, s.blacklist) {
		return false, nil
	}

	// SNI hostname aralığını bul; bölme noktası hostname'in ortasında olur.
	splitAt := len(payload) / 2 // fallback (hostname bulunamazsa)
	hostLen := 0
	if start, length, ok := findSniHostnameRange(payload); ok && length >= 4 {
		splitAt = start + length/2 + rand.Intn(2)
		if splitAt < start+1 {
			splitAt = start + 1
		}
		if splitAt > start+length-1 {
			splitAt = start + length - 1
		}
		hostLen = length
	}

	seqNum := binary.BigEndian.Uint32(raw[ipHdrLen+4 : ipHdrLen+8])

	fmt.Fprintf(os.Stderr, "[go-engine] SNI gizleniyor (splitv/%d): %s (%d bayt) -> 2 baytlık parçalar + iri çevre\n", s.mode, sni, len(sni))

	// Gecikme yok: parçalar arka arkaya gider. DPI segment bazlı tararsa
	// hostname'i hiçbirinde tam bulamaz; beklemek yerine akışı kaçırır.
	sendFragmentsGood(raw, addr, ipHdrLen, tcpHdrLen, payload, seqNum, splitAt, hostLen, send)
	return true, nil
}

// sendFragmentsGood — GoodbyeDPI -k felsefesiyle ClientHello'yu çok parçaya
// böler: SNI hostname bölgesi 2 baytlık minik segmentlere, öncesi/sonrası
// iri parçalara ayrılır; hepsi art arda (gecikmesiz) gönderilir. İlk N-1
// parça ACK-only, son parça PSH+ACK. Sonuç:
//  1. Hiçbir segment 2 hostname karakterinden fazlasını taşımaz → SNI hiçbir
//     pakette tam eşleşmez.
//  2. Segment sayısı yüksek (hostname ~15 bayt ⇒ ~8 + çevre ~8 parça) →
//     DPI'ın reassembly kuyruğu dolar → birleştirmeyi bırakır ve SNI'yi asla
//     okuyamaz. Sunucu ise normal TCP reassembly ile tam ClientHello'yu alır.
func sendFragmentsGood(raw, addr []byte, ipHdrLen, tcpHdrLen int, payload []byte, seqNum uint32, splitAt, hostLen int, send engine.SendFunc) {
	var cuts []int

	if hostLen >= 4 && splitAt > 16 && splitAt < len(payload)-16 {
		hostStart := splitAt - (hostLen / 2)
		if hostStart < 16 {
			hostStart = 16
		}
		hostEnd := hostStart + hostLen
		if hostEnd > len(payload)-16 {
			hostEnd = len(payload) - 16
			hostStart = hostEnd - hostLen
			if hostStart < 16 {
				hostStart = 16
			}
		}

		// Hostname ÖNCESİ: 64 baytlık iri parçalar
		p := 16
		for p < hostStart {
			e := p + 64
			if e > hostStart {
				e = hostStart
			}
			cuts = append(cuts, e)
			p = e
		}

		// Hostname BÖLGESİ: 2 baytlık minik parçalar (SNI asla birleşmesin)
		p = hostStart
		for p+2 < hostEnd {
			cuts = append(cuts, p+2)
			p += 2
		}
		cuts = append(cuts, hostEnd)

		// Hostname SONRASI: 64 baytlık iri parçalar
		p = hostEnd
		for p+64 < len(payload) {
			cuts = append(cuts, p+64)
			p += 64
		}
	}

	if len(cuts) == 0 { // fallback: 2 parça (splitAt)
		cuts = append(cuts, splitAt)
	}

	prev := 0
	for _, c := range cuts {
		if c <= prev {
			continue
		}
		if c > len(payload) {
			c = len(payload)
		}
		last := c >= len(payload)
		frag := buildTCPFragment(raw, ipHdrLen, tcpHdrLen, payload[prev:c], seqNum, last)
		sendRawStrat(frag, addr, send)
		seqNum += uint32(c - prev)
		prev = c
	}
	if prev < len(payload) { // kesim noktası hatalıysa kalanı da gönder
		frag := buildTCPFragment(raw, ipHdrLen, tcpHdrLen, payload[prev:], seqNum, true)
		sendRawStrat(frag, addr, send)
	}
}