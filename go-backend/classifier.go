// classifier.go — Knots Smart Traffic Classifier
//
// SNI hostname'inden trafik kategorisini tespit eder:
//   CategoryGame        → DPI bypass engine (oyun erişim engeli kaldırma)
//   CategorySocial      → WireGuard VPN tüneli (IP gizleme)
//   CategoryPassthrough → Normal sistem routu
//
// Kural hiyerarşisi:
//   1. Önce oyun domainleri kontrol edilir (latency-critical)
//   2. Sonra sosyal medya
//   3. Hiçbiriyle eşleşmezse passthrough
package main

import "strings"

// TrafficCategory, bir domain için tespit edilen trafik kategorisini temsil eder.
type TrafficCategory int

const (
	CategoryPassthrough TrafficCategory = iota // Normal rota (değişiklik yok)
	CategoryGame                               // DPI bypass engine'e yönlendir
	CategorySocial                             // WireGuard VPN tüneline yönlendir
)

// gameDomains, DPI bypass ile erişim kısıtlaması aşılması gereken oyun domainleri.
// Subdomain eşleştirmesi otomatik yapılır: "roblox.com" → "*.roblox.com" da eşleşir.
var gameDomains = []string{
	// Roblox
	"roblox.com",
	"rbxcdn.com",
	"rbxtrk.com",

	// Steam / Valve
	"steampowered.com",
	"steamcommunity.com",
	"steamstatic.com",
	"steam-chat.com",
	"valve.net",

	// Riot Games (Valorant, LoL, TFT)
	"riotgames.com",
	"leagueoflegends.com",
	"riotcdn.net",
	"playvalorant.com",

	// Epic Games / Fortnite
	"epicgames.com",
	"fortnite.com",
	"unrealengine.com",

	// Activision / Battle.net
	"battle.net",
	"blizzard.com",
	"activision.com",

	// EA / Origin
	"ea.com",
	"origin.com",
	"eaplay.com",

	// PUBG
	"pubg.com",
	"battlegroundsgame.com",

	// GTA Online / Rockstar
	"rockstargames.com",

	// Ubisoft
	"ubisoft.com",
	"ubi.com",

	// NCSoft / NC
	"ncsoft.com",
	"bladeandsoul.com",
	"lineage2.com",

	// Wargaming
	"wargaming.net",
	"worldoftanks.com",
	"worldofwarships.com",

	// Gaijin / War Thunder
	"gaijin.net",
	"warthunder.com",

	// Minecraft / Mojang
	"minecraft.net",
	"mojang.com",

	// Genshin Impact / miHoYo / HoYoverse
	"mihoyo.com",
	"hoyoverse.com",
	"yuanshen.com",

	// Supercell (Clash of Clans, Clash Royale vb.)
	"supercell.com",
	"supercell.net",

	// Garena
	"garena.com",
	"garena.sg",

	// SEGA
	"sega.com",

	// 2K / Take-Two
	"2k.com",
	"take2games.com",
	"rockstargames.com",

	// Square Enix
	"square-enix.com",
	"finalfantasyxiv.com",

	// Capcom
	"capcom.com",

	// Bandai Namco
	"bandainamcoent.com",
	"bandainamcoent.eu",
}

// socialDomains, WireGuard VPN tüneli üzerinden yönlendirilmesi gereken
// sosyal medya domainleri. Birincil amaç: IP gizleme / coğrafi kısıtlama aşma.
var socialDomains = []string{
	// Instagram / Meta
	"instagram.com",
	"facebook.com",
	"fbcdn.net",
	"fb.com",
	"threads.net",
	"whatsapp.com",
	"whatsapp.net",

	// Twitter / X
	"twitter.com",
	"x.com",
	"t.co",
	"twimg.com",

	// TikTok / ByteDance
	"tiktok.com",
	"tiktokcdn.com",
	"tiktokv.com",
	"bytedance.com",
	"musical.ly",

	// YouTube / Google (sosyal içerik)
	"youtube.com",
	"youtu.be",
	"yt.be",
	"googlevideo.com",
	"ytimg.com",

	// Snapchat
	"snapchat.com",
	"snap.com",

	// LinkedIn
	"linkedin.com",
	"licdn.com",

	// Pinterest
	"pinterest.com",
	"pinimg.com",

	// Reddit
	"reddit.com",
	"redd.it",
	"redditmedia.com",
	"reddituploads.com",
	"reditstatic.com",

	// Tumblr
	"tumblr.com",

	// Telegram
	"telegram.org",
	"t.me",
	"telesco.pe",

	// Discord (sosyal — ses/oyun bypass ayrı ele alınır)
	"discord.com",
	"discord.gg",
	"discordapp.com",
	"discordapp.net",
	"discord.media",

	// Twitch
	"twitch.tv",
	"twitchapps.com",
	"jtvnw.net",

	// BeReal
	"bereal.com",

	// Mastodon / Fediverse ana instancelar
	"mastodon.social",
}

// ClassifyDomain, verilen SNI hostname'ini analiz ederek trafik kategorisini döner.
// Büyük/küçük harf duyarsızdır. Subdomain eşleştirmesi desteklenir.
func ClassifyDomain(sni string) TrafficCategory {
	if sni == "" {
		return CategoryPassthrough
	}
	sni = strings.ToLower(sni)

	// Önce oyun domainleri — latency öncelikli
	for _, d := range gameDomains {
		if matchDomain(sni, d) {
			return CategoryGame
		}
	}

	// Sonra sosyal medya
	for _, d := range socialDomains {
		if matchDomain(sni, d) {
			return CategorySocial
		}
	}

	return CategoryPassthrough
}

// matchDomain, sni'nin tam olarak domain ile ya da onun bir subdomain'i olup olmadığını kontrol eder.
// Örnek: matchDomain("api.roblox.com", "roblox.com") → true
func matchDomain(sni, domain string) bool {
	return sni == domain || strings.HasSuffix(sni, "."+domain)
}

// CategoryString, kategoriyi okunabilir string'e çevirir (log/debug için).
func CategoryString(c TrafficCategory) string {
	switch c {
	case CategoryGame:
		return "game-bypass"
	case CategorySocial:
		return "social-vpn"
	default:
		return "passthrough"
	}
}
