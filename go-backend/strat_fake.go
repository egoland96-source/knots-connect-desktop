// strat_fake.go — FAKE_PACKET sistemi: DPI'ı yanıltan sahte paketler.
//
// Yöntem (GoodbyeDPI "fake" + window-min felsefesinin sertleştirilmiş hali):
//  - Orijinal paketin TTL=2..4 ile kopyaları gönderilir. Bu hop aralığında
//    paket DPI cihazına ulaşır ama sunucuya ASLA varamaz (yolda ölür).
//  - TCP Window = 16: sunucu minik parçalarda gönderir (PCI tamponu dolar).
//  - Oyun senaryosu: oyun sunucularına (49xxx-65535) yapılan SYN akışlarına
//    sahte paketler basılır → DPI akışı sahte pakette tanır, gerçek SYN
//    "var olan akışın devamı" gibi görünür.
//
// NOT: IP Total Length=65535 veya TLS Record length=16384 yalanları KALDIRILDI
// (ikisi de WinDivertSend reddi / DPI "geçersiz kayıt" RST'i üretti; bir paketi
// yapısal olarak geçersiz kılan her yalan, tam tersini tetikliyor).
package main

import (
	"encoding/binary"
	"fmt"
	"os"
	"time"

	"knots-go-backend/engine"
)

// fakeTTLs — sahte paketlerin IP TTL değerleri. TTL=2..4: DPI cihazının
// (genelde ISP kenar/router) görebildiği, sunucuya ulaşamayan hop aralığı.
var fakeTTLs = []uint8{2, 3, 4}

// buildFakePacket — orijinal paketin kopyası; TTL değiştirilir ve TCP Window
// 16'ya çekilir. Paket yapısal olarak GEÇERLİDİR — yapısal yalanlar
// (65535 / TLS-16384) her iki tarafça da reddedildi, yalnız TTL+Window
// değişikliği bırakıldı. IP/TCP checksum'ları yeniden hesaplanır.
func buildFakePacket(original []byte, ipHdrLen int, ttl uint8) []byte {
	buf := make([]byte, len(original))
	copy(buf, original)

	buf[8] = ttl // IP TTL

	thl := int((original[ipHdrLen+12]>>4)&0x0F) * 4
	if thl >= 20 && thl <= len(original)-ipHdrLen {
		binary.BigEndian.PutUint16(buf[ipHdrLen+14:ipHdrLen+16], 16) // TCP Window = 16
	}

	buf[10], buf[11] = 0, 0
	binary.BigEndian.PutUint16(buf[10:12], checksum16(buf[:ipHdrLen]))

	buf[ipHdrLen+16], buf[ipHdrLen+17] = 0, 0
	cs := tcpChecksumWithPseudoHeader(buf[12:16], buf[16:20], buf[ipHdrLen:])
	binary.BigEndian.PutUint16(buf[ipHdrLen+16:ipHdrLen+18], cs)

	return buf
}

// isPublicIPv4 — 4 baytlık IPv4 adresi halka açık mı? (yerel ağ, loopback,
// link-local 169.254/16, multicast, reserved dışı). Yerel/broadcast hedeflere
// fake atılmaz.
func isPublicIPv4(ip []byte) bool {
	if len(ip) < 4 {
		return false
	}
	b0 := ip[0]
	switch {
	case b0 == 0, b0 == 10, b0 == 127, b0 == 255:
		return false
	case b0 == 172 && ip[1] >= 16 && ip[1] <= 31:
		return false
	case b0 == 192 && ip[1] == 168:
		return false
	case b0 == 169 && ip[1] == 254: // link-local (APIPA/metadata)
		return false
	case b0 == 100 && ip[1] >= 64 && ip[1] <= 127: // CGNAT 100.64.0.0/10
		return false
	case b0 >= 224: // multicast + reserved
		return false
	}
	return true
}

// sendSynFakes — yeni çıkan SYN akışına sahte paketleri yollar.
// Her fake 1ms arayla: DPI'ın her birini ayrı incelemeye alması sağlanır.
// Gönderim hatası loglanır (sessiz hata, gerçek SYN'i asla engellemez).
func sendSynFakes(raw []byte, addr []byte, send func(raw, addr []byte) error) {
	ihl := int(raw[0]&0x0F) * 4
	if ihl < 20 || len(raw) < ihl+20 || send == nil {
		return
	}
	for _, ttl := range fakeTTLs {
		fake := buildFakePacket(raw, ihl, ttl)
		if err := send(fake, addr); err != nil {
			fmt.Fprintf(os.Stderr, "[go-engine] SYN fake gönderilemedi (ttl %d): %v\n", ttl, err)
			return
		}
		time.Sleep(time.Millisecond)
	}
}

// FakeTtlStrategy — SNI eşleşen ClientHello'ya sahte TTL paketleri gönderip
// arkasından ORİJİNAL paketi değiştirmeden iletir. DPI akışı sahte pakette
// tanır; orijinal, mevcut akışın devamı gibi göründüğü için engellenmez.
type FakeTtlStrategy struct {
	blacklist []string
	mode      int
}

// NewFakeTtlStrategy, blacklist ile kurulmuş sahte-TTL stratejisi döner.
func NewFakeTtlStrategy(blacklist []string, mode int) *FakeTtlStrategy {
	return &FakeTtlStrategy{blacklist: blacklist, mode: mode}
}

func (s *FakeTtlStrategy) Metadata() engine.StrategyMeta {
	return engine.StrategyMeta{
		ID:         "fake_ttl",
		Name:       "Sahte TTL paketleri + orijinal TLS (IPv4 TCP)",
		Protocols:  []int{6},
		IPVersions: []int{4},
		RiskLevel:  2,
	}
}

func (s *FakeTtlStrategy) Apply(raw, addr []byte, send engine.SendFunc) (bool, error) {
	if len(raw) < 20 || raw[0]>>4 != 4 || raw[9] != 6 {
		return false, nil
	}
	ihl := int(raw[0]&0x0F) * 4
	if ihl < 20 || len(raw) < ihl+8 {
		return false, nil
	}
	thl := int((raw[ihl+12]>>4)&0x0F) * 4
	if thl < 20 || len(raw) < ihl+thl {
		return false, nil
	}
	payload := raw[ihl+thl:]
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

	fmt.Fprintf(os.Stderr, "[go-engine] fake_ttl: SNI %s -> %d sahte paket + orijinal (mode %d)\n", sni, len(fakeTTLs), s.mode)
	sent := 0
	for _, ttl := range fakeTTLs {
		fake := buildFakePacket(raw, ihl, ttl)
		if err := send(fake, addr); err != nil {
			fmt.Fprintf(os.Stderr, "[go-engine] fake_ttl gönderilemedi (ttl %d): %v\n", ttl, err)
			continue
		}
		sent++
		time.Sleep(2 * time.Millisecond)
	}
	if sent == 0 {
		// Hiçbir fake gitmedi (ör. DLL reddi): passthrough döndür. Ana döngü
		// orijinali normal yoldan gönderir, strateji izlemeye girmez.
		return false, nil
	}
	sendRawStrat(raw, addr, send)
	return true, nil
}