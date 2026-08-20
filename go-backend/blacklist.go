// blacklist.go — blacklist.txt'i yükler ve SNI eşleştirmesi yapar.
// Python engine/blacklist.py'nin tam Go karşılığıdır.
// Contains eşleştirme: *.roblox.com normalize edilir; "roblox.com" kuralı
// api.roblox.com / games.roblox.com / sea1-...-123.roblox.com'u yakalar.
package main

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// getBlacklistPath, çalışan exe'nin yanındaki blacklist.txt'i hedefler.
func getBlacklistPath() string {
	exePath, err := os.Executable()
	if err != nil {
		return "blacklist.txt"
	}
	return filepath.Join(filepath.Dir(exePath), "blacklist.txt")
}

// LoadBlacklist, blacklist.txt'i okur ve temizlenmiş domain listesi döner.
// Yorum satırları (#), boş satırlar, protokol önekleri ve www. kaldırılır.
// *.domain.com girdileri domain.com olarak normalize edilir (contains'te
// bir anlamı kalmaz ama dosya uyumluluğu için sessizce kabul edilir).
func LoadBlacklist() []string {
	path := getBlacklistPath()
	f, err := os.Open(path)
	if err != nil {
		fmt.Fprintf(os.Stderr, "[blacklist] Dosya bulunamadı: %s\n", path)
		return nil
	}
	defer f.Close()

	var domains []string
	seen := make(map[string]bool)

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		// Protokol önekini kaldır (http:// veya https://)
		if idx := strings.Index(line, "://"); idx != -1 {
			line = line[idx+3:]
		}
		// Wildcard ön ekini kaldır: *.roblox.com → roblox.com
		line = strings.TrimPrefix(line, "*.")
		// www. kaldır
		line = strings.TrimPrefix(line, "www.")
		// Küçük harfe çevir ve boşlukları temizle
		line = strings.ToLower(strings.TrimSpace(line))

		if line == "" || seen[line] {
			continue
		}
		seen[line] = true
		domains = append(domains, line)
	}

	fmt.Fprintf(os.Stderr, "[blacklist] %d domain yüklendi: %s\n", len(domains), path)
	return domains
}

// webApiRobloxHost, DPI tarafından boğulmadığı kanıtlanmış (arayüz çalışıyor)
// saf web API hostlarını işaretler. Bunları bölmek zararlıdır: join API seli
// (ecsv2/ephemeralcounters/apis) 8-12 sn'lik timeout'larla tıkanır ve oyun
// join'i tamamlanmaz. Passthrough'a bırakılırlar — web zaten filtresiz akar.
func webApiRobloxHost(sni string) bool {
	if strings.HasSuffix(sni, ".api.roblox.com") {
		return true
	}
	switch sni {
	case "apis.roblox.com", "api.roblox.com", "games.roblox.com", "game.roblox.com", "gamejoin.roblox.com":
		return true
	}
	return false
}

// MatchesDomain, SNI hostname'inin blacklist'teki herhangi bir domain ile eşleşip eşleşmediğini kontrol eder.
// Alt domain desteği: "roblox.com" kuralı "api.roblox.com" / "games.roblox.com"
// / "sea1-....roblox.com" SNI'larını yakalar ("." + suffix).
// Kısa kurallarla (ör. "x.com") yanlış eşleşme olmaz — "box.com" yakalanmaz.
// Microsoft bypass sinyali: ilgili domainler filtrelenmez (Roblox hata kodu 2 önlemi).
// Roblox web API'leri de filtrelenmez (join API seli passthrough olmalı).
func MatchesDomain(sni string, blacklist []string) bool {
	sni = strings.ToLower(sni)

	// Microsoft/Windows servislerini asla engelleme (Roblox Hata Kodu 2 koruması)
	microsoftKeywords := []string{"microsoft", "windows", "xbox", "live.com", "office", "azure"}
	for _, kw := range microsoftKeywords {
		if strings.Contains(sni, kw) {
			return false
		}
	}

	// Roblox web API'leri asla bölünmez — join API seli boğulmasın.
	if webApiRobloxHost(sni) {
		return false
	}

	for _, target := range blacklist {
		if sni == target || strings.HasSuffix(sni, "."+target) {
			return true
		}
	}
	return false
}
