package dns

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net"
	"net/http"
	"sync"
	"time"

	"golang.org/x/net/dns/dnsmessage"
)

const (
	// Primary - AdGuard Default (reklam+izleyici+malware filtreli)
	AdGuardDoH = "https://dns.adguard-dns.com/dns-query"
	// Secondary fallback - Cloudflare Security Shield (malware/phishing filtreli)
	CloudflareDoH = "https://security.cloudflare-dns.com/dns-query"

	// Spec aliases - Primary/Secondary naming for clarity
	PrimaryDoH   = AdGuardDoH
	SecondaryDoH = CloudflareDoH
)

var (
	httpClient = &http.Client{
		Timeout: 4 * time.Second,
		Transport: &http.Transport{
			ForceAttemptHTTP2: true,
		},
	}
	dohMu sync.RWMutex
)

// QueryRaw ham DNS paketini (RFC1035 wire format) DoH'a POST eder.
// UDP 53 dinlemez - sadece Knots'un kendi sorguları için kullanılır.
func QueryRaw(ctx context.Context, wire []byte, dohURL string) ([]byte, error) {
	if len(wire) == 0 {
		return nil, fmt.Errorf("empty query")
	}
	if dohURL == "" {
		dohURL = CloudflareDoH
	}
	req, err := http.NewRequestWithContext(ctx, "POST", dohURL, bytes.NewReader(wire))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/dns-message")
	req.Header.Set("Accept", "application/dns-message")

	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("DoH %s: %d", dohURL, resp.StatusCode)
	}
	return io.ReadAll(resp.Body)
}

// QueryWithFallback önce AdGuard Default dener, hata olursa Cloudflare Security'e düşer
// Spec: Primary AdGuard, Secondary Cloudflare
func QueryWithFallback(ctx context.Context, wire []byte) ([]byte, error) {
	dohMu.RLock()
	defer dohMu.RUnlock()

	if data, err := QueryRaw(ctx, wire, AdGuardDoH); err == nil {
		return data, nil
	}
	return QueryRaw(ctx, wire, CloudflareDoH)
}

// ResolveDomain temiz ve hazır DoH çözümlemesi sağlar.
// Yerel UDP 53 soketine dokunmadan, sadece net/http ile DoH üzerinden
// domain'i çözer ve IP'leri string olarak döndürür.
// Primary: AdGuard, Fallback: Cloudflare Security
func ResolveDomain(domain string) ([]string, error) {
	if domain == "" {
		return nil, fmt.Errorf("empty domain")
	}
	// AdGuard ve Cloudflare arasında fallback ile çözümle
	ctx, cancel := context.WithTimeout(context.Background(), 4*time.Second)
	defer cancel()

	// Önce AdGuard dene
	ips, err := resolveDomainWithURL(ctx, domain, AdGuardDoH)
	if err == nil && len(ips) > 0 {
		return ips, nil
	}
	// Fallback: Cloudflare Security
	ctx2, cancel2 := context.WithTimeout(context.Background(), 4*time.Second)
	defer cancel2()
	return resolveDomainWithURL(ctx2, domain, CloudflareDoH)
}

// resolveDomainWithURL tek bir DoH upstream'i ile domain çözümler
func resolveDomainWithURL(ctx context.Context, domain, dohURL string) ([]string, error) {
	// DNS wire query oluştur
	var buf [512]byte
	packed, err := buildQueryForResolve(domain, buf[:])
	if err != nil {
		return nil, err
	}
	respWire, err := QueryRaw(ctx, packed, dohURL)
	if err != nil {
		return nil, err
	}
	ips, err := parseResponseForResolve(respWire)
	if err != nil {
		return nil, err
	}
	out := make([]string, len(ips))
	for i, ip := range ips {
		out[i] = ip.String()
	}
	return out, nil
}

func buildQueryForResolve(host string, buf []byte) ([]byte, error) {
	name, err := dnsmessage.NewName(host + ".")
	if err != nil {
		return nil, err
	}
	h := dnsmessage.Header{ID: 0x1234, RecursionDesired: true}
	b := dnsmessage.NewBuilder(buf, h)
	if err := b.StartQuestions(); err != nil {
		return nil, err
	}
	if err := b.Question(dnsmessage.Question{Name: name, Type: dnsmessage.TypeA, Class: dnsmessage.ClassINET}); err != nil {
		return nil, err
	}
	packed, err := b.Finish()
	if err != nil {
		return nil, err
	}
	out := make([]byte, len(packed))
	copy(out, packed)
	return out, nil
}

func parseResponseForResolve(wire []byte) ([]net.IP, error) {
	var p dnsmessage.Parser
	h, err := p.Start(wire)
	if err != nil {
		return nil, err
	}
	if err := p.SkipAllQuestions(); err != nil {
		return nil, err
	}
	var ips []net.IP
	for {
		hdr, err := p.AnswerHeader()
		if err == dnsmessage.ErrSectionDone {
			break
		}
		if err != nil {
			return nil, err
		}
		if hdr.Type == dnsmessage.TypeA {
			res, err := p.AResource()
			if err != nil {
				return nil, err
			}
			_ = h
			ips = append(ips, net.IP(res.A[:]))
		} else {
			if err := p.SkipAnswer(); err != nil {
				return nil, err
			}
		}
	}
	return ips, nil
}
