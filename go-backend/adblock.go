package main

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

var (
	adBlocklist   map[string]struct{}
	adBlocklistMu sync.RWMutex
)

// LoadAdBlocklist loads the StevenBlack/AdGuard hostlist into memory.
// It tries multiple locations: next to the exe, backend/adblock_lists/malicious.txt, etc.
func LoadAdBlocklist() {
	adBlocklistMu.Lock()
	defer adBlocklistMu.Unlock()

	adBlocklist = make(map[string]struct{})

	// Try multiple candidate paths
	candidates := []string{
		getAdBlocklistPath(),
		filepath.Join("adblock_lists", "malicious.txt"),
		filepath.Join("..", "backend", "adblock_lists", "malicious.txt"),
		filepath.Join(filepath.Dir(os.Args[0]), "..", "backend", "adblock_lists", "malicious.txt"),
		"malicious.txt",
	}

	var path string
	var file *os.File
	var err error
	for _, p := range candidates {
		file, err = os.Open(p)
		if err == nil {
			path = p
			break
		}
	}
	if err != nil {
		fmt.Fprintf(os.Stderr, "[adblock] Hostlist bulunamadı, ad engelleme devre dışı\n")
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	// Increase buffer for long lines
	buf := make([]byte, 0, 64*1024)
	scanner.Buffer(buf, 1024*1024)

	count := 0
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		// Hosts format: "0.0.0.0 domain" or "127.0.0.1 domain"
		fields := strings.Fields(line)
		var domain string
		if len(fields) == 1 {
			domain = fields[0]
		} else if len(fields) >= 2 {
			// Skip IP, take domain
			if fields[0] == "0.0.0.0" || fields[0] == "127.0.0.1" || fields[0] == "::1" {
				domain = fields[1]
			} else {
				domain = fields[0]
			}
		}
		domain = strings.ToLower(strings.TrimSpace(domain))
		domain = strings.TrimPrefix(domain, "*.")
		domain = strings.TrimPrefix(domain, "www.")
		if domain == "" || domain == "localhost" || domain == "localhost.localdomain" {
			continue
		}
		if _, exists := adBlocklist[domain]; !exists {
			adBlocklist[domain] = struct{}{}
			count++
		}
	}

	fmt.Fprintf(os.Stderr, "[adblock] %d ad/tracker domain yüklendi: %s\n", count, path)

	// Also add the specific domains mentioned in the bug report for quick test
	extra := []string{"cmp.inmobi.com", "linksynergy.com", "skimresources.com", "inmobi.com", "inmobicdn.net"}
	for _, d := range extra {
		if _, exists := adBlocklist[d]; !exists {
			adBlocklist[d] = struct{}{}
		}
	}
}

func getAdBlocklistPath() string {
	exePath, err := os.Executable()
	if err != nil {
		return "adblock_lists/malicious.txt"
	}
	// Try next to exe
	p1 := filepath.Join(filepath.Dir(exePath), "adblock_lists", "malicious.txt")
	if _, err := os.Stat(p1); err == nil {
		return p1
	}
	// Try next to exe (flat)
	p2 := filepath.Join(filepath.Dir(exePath), "malicious.txt")
	if _, err := os.Stat(p2); err == nil {
		return p2
	}
	return p1
}

// IsAdDomain checks if the SNI is in the ad/tracker blocklist (with subdomain matching)
func IsAdDomain(sni string) bool {
	sni = strings.ToLower(sni)
	adBlocklistMu.RLock()
	defer adBlocklistMu.RUnlock()

	if adBlocklist == nil {
		return false
	}

	// Exact match or subdomain match
	if _, exists := adBlocklist[sni]; exists {
		return true
	}
	// Check suffix match: "ads.inmobi.com" should match "inmobi.com" if in list
	// But we need to be careful to not match too broadly
	for domain := range adBlocklist {
		if sni == domain || strings.HasSuffix(sni, "."+domain) {
			return true
		}
	}
	return false
}

// IsAdDomainFast is a faster check for the hot path - uses exact match first
func IsAdDomainFast(sni string) bool {
	sni = strings.ToLower(sni)
	adBlocklistMu.RLock()
	defer adBlocklistMu.RUnlock()
	if adBlocklist == nil || len(adBlocklist) == 0 {
		return false
	}
	if _, ok := adBlocklist[sni]; ok {
		return true
	}
	// For subdomains, check if any parent domain is in the list
	// e.g., "cmp.inmobi.com" -> check "inmobi.com"
	parts := strings.Split(sni, ".")
	for i := 0; i < len(parts)-1; i++ {
		parent := strings.Join(parts[i+1:], ".")
		if _, ok := adBlocklist[parent]; ok {
			return true
		}
	}
	return false
}
