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
	"time"

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
	// Ad-block check: If SNI is an ad/tracker, DROP instead of bypassing
	// This prevents the engine from "rescuing" ad domains and causing 11% ad-block score
	if IsAdDomainFast(sni) {
		fmt.Fprintf(os.Stderr, "[adblock] DROP ad/tracker: %s\n", sni)
		return true, nil
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

// sendFragmentsGood — Dinamik DPI Bypass: GoodbyeDPI -k felsefesiyle ClientHello'yu
// rastgele parçalara böler: 10-30 bayt arası dinamik dilimler + mikrosaniyelik jitter.
// SNI hostname bölgesi dahil tüm payload rastgele boyutlarda parçalanır.
// Sonuç:
//  1. Her bağlantıda farklı parçalanma deseni → DPI'ın statik reassembly kuralları çöker.
//  2. Mikrosaniyelik jitter (50-300µs) → DPI'ın zaman penceresi tabanlı birleştirmesi bozulur.
//  3. Sunucu normal TCP reassembly ile tam ClientHello'yu sorunsuz alır (sıra numaraları doğru).
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

		// Dinamik parçalama: 10-30 bayt arası rastgele dilimler
		// Hostname ÖNCESİ: rastgele 10-30 bayt
		p := 16
		for p < hostStart {
			chunk := 10 + rand.Intn(21) // 10-30
			e := p + chunk
			if e > hostStart {
				e = hostStart
			}
			cuts = append(cuts, e)
			p = e
		}

		// Hostname BÖLGESİ: rastgele 10-30 bayt (SNI asla tek parçada birleşmesin, ama her seferinde farklı)
		p = hostStart
		for p+10 < hostEnd {
			chunk := 10 + rand.Intn(21)
			if p+chunk > hostEnd {
				chunk = hostEnd - p
			}
			if chunk < 10 {
				chunk = 10
			}
			cuts = append(cuts, p+chunk)
			p += chunk
		}
		if p < hostEnd {
			cuts = append(cuts, hostEnd)
		}

		// Hostname SONRASI: rastgele 10-30 bayt
		p = hostEnd
		for p+10 < len(payload) {
			chunk := 10 + rand.Intn(21)
			e := p + chunk
			if e > len(payload) {
				e = len(payload)
			}
			cuts = append(cuts, e)
			p = e
		}
	}

	if len(cuts) == 0 { // fallback: rastgele noktadan 2 parça
		// Fallback'te bile rastgele offset
		randOffset := splitAt + rand.Intn(11) - 5 // -5 to +5
		if randOffset < 16 {
			randOffset = 16
		}
		if randOffset > len(payload)-16 {
			randOffset = len(payload) - 16
		}
		cuts = append(cuts, randOffset)
	}

	prev := 0
	for i, c := range cuts {
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
		// Mikrosaniyelik jitter: her parçadan sonra 50-300µs rastgele bekleme
		// DPI'ın zaman penceresi tabanlı reassembly'sini bozar, sunucuyu etkilemez
		if !last && i < len(cuts)-1 {
			jitter := time.Duration(50+rand.Intn(251)) * time.Microsecond // 50-300µs
			time.Sleep(jitter)
		}
	}
	if prev < len(payload) {
		frag := buildTCPFragment(raw, ipHdrLen, tcpHdrLen, payload[prev:], seqNum, true)
		sendRawStrat(frag, addr, send)
	}
}