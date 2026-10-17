//go:build ignore

package main

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

func LoadBlacklist() []string {
	path := filepath.Join(filepath.Dir(func() string { p, _ := os.Executable(); return p }()), "blacklist.txt")
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
		if idx := strings.Index(line, "://"); idx != -1 {
			line = line[idx+3:]
		}
		line = strings.TrimPrefix(line, ".*")
		line = strings.TrimPrefix(line, "www.")
		line = strings.ToLower(strings.TrimSpace(line))
		if line == "" || seen[line] {
			continue
		}
		seen[line] = true
		domains = append(domains, line)
	}
	fmt.Fprintf(os.Stderr, "[blacklist] %d domain yuklendi: %s\n", len(domains), path)
	return domains
}

func webApiRobloxHost(sni string) bool {
	return false
}

func MatchesDomain(sni string, blacklist []string) bool {
	sni = strings.ToLower(sni)
	microsoftKeywords := []string{"microsoft", "windows", "xbox", "live.com", "office", "azure"}
	for _, kw := range microsoftKeywords {
		if strings.Contains(sni, kw) {
			return false
		}
	}
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
