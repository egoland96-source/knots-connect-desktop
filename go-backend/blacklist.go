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

// MatchesDomain, SNI hostname'inin blacklist'teki herhangi bir kelimeyi
// İÇERİP içermediğini kontrol eder (contains matching, suffix değil):
//   - "roblox.com" kuralı → api.roblox.com, games.roblox.com, sea1-....roblox.com
// Alt domain desteği: "discord.com" kuralı "gateway.discord.com" SNI'sını yakalar.
// Microsoft bypass sinyali: ilgili domainler filtrelenmez (Roblox hata kodu 2 önlemi).
func MatchesDomain(sni string, blacklist []string) bool {
	sni = strings.ToLower(sni)

	// Microsoft/Windows servislerini asla engelleme (Roblox Hata Kodu 2 koruması)
	microsoftKeywords := []string{"microsoft", "windows", "xbox", "live.com", "office", "azure"}
	for _, kw := range microsoftKeywords {
		if strings.Contains(sni, kw) {
			return false
		}
	}

	for _, target := range blacklist {
		if strings.Contains(sni, target) {
			return true
		}
	}
	return false
}
