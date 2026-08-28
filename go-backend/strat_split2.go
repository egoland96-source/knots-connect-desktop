// strat_split2.go — TCP 443 SNI-blacklist ClientHello'yu 2 parçaya bölen
// strateji. Bu, KNOWN-GOOD davranışın birebir taşındığı stratejidir:
// "Roblox sorunsuz çalıştırdı" motorun algoritması aynen korunur.
package main

import (
	"encoding/binary"
	"fmt"
	"os"
	"strings"
	"time"

	"knots-go-backend/engine"
)

// globalVideoSkips — eskiden global bypass modunda passthrough edilen video
// CDN hostları. SNI-gizleyen splitv stratejisi gelince GEREKSİZ hale geldi:
// passthrough full SNI gösterdiği için video CDN'leri yine boğuluyordu;
// splitv ise hostname'i parçalar arasına yayarak DPI'ın eşleştirmesini
// imkansızlaştırır. Liste boş bırakılır — splitv her şeye uygulanır.
var globalVideoSkips []string

// globalSkipMatch, SNI'nin video CDN muafiyet listesinde olup olmadığını
// kontrol eder (tam veya alt domain eşleşmesi: "googlevideo.com" kuralı
// "r5---sn-...googlevideo.com"u yakalar).
func globalSkipMatch(sni string) bool {
	sni = strings.ToLower(sni)
	for _, s := range globalVideoSkips {
		if sni == s || strings.HasSuffix(sni, "."+s) {
			return true
		}
	}
	return false
}

// Split2Strategy, ikili TLS ClientHello parçalama stratejisidir.
type Split2Strategy struct {
	blacklist []string
	mode      int
	force     bool // global bypass: blacklist'e bakmadan TÜM SNI'li ClientHello'ları böl
}

// NewSplit2Strategy, blacklist ile kurulmuş 2 parçacıklı split stratejisi döner.
func NewSplit2Strategy(blacklist []string, mode int) *Split2Strategy {
	return &Split2Strategy{blacklist: blacklist, mode: mode}
}

// SetForceAll, blacklist eşleşmesini yok sayarak her SNI'li ClientHello'yu
// bölmeyi açar (GoodbyeDPI -k tarzı global bypass).
func (s *Split2Strategy) SetForceAll(v bool) { s.force = v }

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
	if sni == "" {
		return false, nil
	}
	if IsAdDomainFast(sni) {
		fmt.Fprintf(os.Stderr, "[adblock] DROP ad/tracker: %s\n", sni)
		return true, nil
	}
	if s.force && globalSkipMatch(sni) {
		fmt.Fprintf(os.Stderr, "[go-engine] global skip (video CDN): %s -> passthrough\n", sni)
		return false, nil
	}
	if !s.force && !MatchesDomain(sni, s.blacklist) {
		return false, nil
	}

	if s.force {
		fmt.Fprintf(os.Stderr, "[go-engine] SNI bölünüyor (global): %s -> 2 parça (mode %d)\n", sni, s.mode)
	} else {
		fmt.Fprintf(os.Stderr, "[go-engine] SNI eşlendi: %s -> parçalanıyor (mode %d)\n", sni, s.mode)
	}
	s.sendFragmented(raw, addr, ipHdrLen, tcpHdrLen, payload, send)
	return true, nil
}

// sendFragmented — SNI civarından iki parçaya böl. Orijinal known-good.
func (s *Split2Strategy) sendFragmented(raw, addr []byte, ipHdrLen, tcpHdrLen int, payload []byte, send engine.SendFunc) {
	splitAt := chooseSplitPoint(payload)
	seqNum := binary.BigEndian.Uint32(raw[ipHdrLen+4 : ipHdrLen+8])

	// Kısa gecikme: DPI'ın TCP reassembly penceresini aş, parçaları tek
	// akışta SNI okumasın. Global modda GoodbyeDPI tarzı: neredeyse sıfır
	// gecikme (sayfa yüklerinde ~80 paralel TLS akışı 15ms'lik beklerse
	// ana döngü saniyelerce bloke olur — asıl yavaşlık buydu).
	delay := splitDelay
	if s.force {
		delay = time.Millisecond
	}
	sendFragments(raw, addr, ipHdrLen, tcpHdrLen, payload, splitAt, seqNum, delay, send)
}

// splitDelay, parçalar arası bekleme — DPI'ların çoğu ilk parçayı "eksik
// TLS" sayar; ikinci parça aralıklı gelince ClientHello'yu tamamlama
// penceresi dolmuş olur.
const splitDelay = 15 * time.Millisecond

func sendRawStrat(raw, addr []byte, send engine.SendFunc) {
	if send == nil {
		return
	}
	if err := send(raw, addr); err != nil {
		fmt.Fprintf(os.Stderr, "[go-engine] Gönderim hatası: %v\n", err)
	}
}