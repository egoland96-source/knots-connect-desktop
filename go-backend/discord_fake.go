// discord_fake.go — Discord (ve Cloudflare öncesi) hedeflerine özel strateji.
//
// Neden ayrı: Discord'un gateway/CDN edge'i (Cloudflare 162.159.x.x) splitv'nin
// 10-30 baytlık mikro-parçalı ClientHello'sunu kabul etmiyor — ya ek (sunucu
// tarafı) RST basıyor ya da el sıkışmayı "middlebox interference" sayıp
// düşürüyor. Roblox edge'i (128.116.0.0/16) parçaları birleştiriyor; Discord
// etmez. Discord için bu yüzden SNI'yi HİÇ parçalamayan fake_ttl yaklaşımı
// kullanılır: sahte TTL=2..4 paketleri (sunucuya asla ulaşmaz, DPI'ın
// ilk gördüğü akış olur) + orijinal ClientHello arkasından gönderilir.
package main

import (
	"fmt"
	"os"
	"strings"
	"time"

	"knots-go-backend/engine"
)

// discordDomainSet — Discord'a tahammülsüz Cloudflare edge'ini karşılayan
// SNI listesi. Tam ve alt-domain eşleşmesi yapılır. gateway.discord.gg,
// media.discordapp.net, status.discord.com gibi tüm alt alanlar tek kuralla
// yakalanır: "discord.gg" kuralı "gateway.discord.gg"u da eşler.
var discordDomainSet = []string{
	"discord.com",
	"discord.gg",
	"discordapp.com",
	"discordapp.net",
	"discord.media",
}

// IsDiscordDomain, SNI'nin Discord/Cloudflare öncesi listede olup olmadığını
// söyler (tam veya alt domain eşleşmesi). Ayrıca splitv global-video-skip
// istisnasından bağımsızdır: Discord için her koşulda split yerine fake_ttl
// uygulanır.
func IsDiscordDomain(sni string) bool {
	sni = strings.ToLower(strings.TrimSpace(sni))
	if sni == "" {
		return false
	}
	for _, d := range discordDomainSet {
		if sni == d || strings.HasSuffix(sni, "."+d) {
			return true
		}
	}
	return false
}

// sendDiscordFakeTtl — Discord ClientHello'su için DPI'ı şaşırt:
//  1. Orijinal paketin TTL=2..4 kopyaları gönderilir (sunucuya ulaşmaz,
//     DPI bunları "akışın ilk paketleri" sanır).
//  2. Orijinal ClientHello aynen (parçalanmadan) gönderilir.
//
// SNI hiçbir parçada bölünmez → Cloudflare el sıkışmayı normal kabul eder;
// DPI ise çoktan önceki sahte paketleri "gerçek" saydığı için orijinali
// engellemez.
func sendDiscordFakeTtl(raw, addr []byte, ipHdrLen int, send engine.SendFunc) {
	thl := int((raw[ipHdrLen+12]>>4)&0x0F) * 4
	if thl < 20 || len(raw) < ipHdrLen+thl {
		// Başlıklar bozuksa orijinali passthrough et, asla düşürme.
		sendRawStrat(raw, addr, send)
		return
	}
	sent := 0
	for _, ttl := range fakeTTLs {
		fake := buildFakePacket(raw, ipHdrLen, ttl)
		if err := send(fake, addr); err != nil {
			fmt.Fprintf(os.Stderr, "[go-engine] discord fake_ttl gönderilemedi (ttl %d): %v\n", ttl, err)
			continue
		}
		sent++
		time.Sleep(2 * time.Millisecond)
	}
	if sent == 0 {
		// Hiçbir fake gitmedi (ör. WinDivert reddi): orijinali passthrough et.
		fmt.Fprintln(os.Stderr, "[go-engine] discord fake_ttl fake gönderilemedi, orijinal passthrough")
		sendRawStrat(raw, addr, send)
		return
	}
	sendRawStrat(raw, addr, send)
}