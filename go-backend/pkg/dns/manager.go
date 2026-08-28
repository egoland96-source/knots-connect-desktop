package dns

import (
	"context"
	"net"
	"sync"
	"time"

	"golang.org/x/net/dns/dnsmessage"
)

// Mode kullanıcı seçimi: yerel sistem DNS'i veya filtreli Cloudflare DoH
type Mode string

const (
	ModeLocal      Mode = "local"      // net.DefaultResolver
	ModeCloudflare Mode = "cloudflare" // https://security.cloudflare-dns.com/dns-query
)

var (
	mu      sync.RWMutex
	current Mode = ModeLocal
)

func SetMode(m Mode) {
	mu.Lock()
	defer mu.Unlock()
	if m == ModeCloudflare {
		current = ModeCloudflare
	} else {
		current = ModeLocal
	}
}

func GetMode() Mode {
	mu.RLock()
	defer mu.RUnlock()
	return current
}

// Resolve tek noktadan çağrılır - uygulama heryerde bunu kullanır
func Resolve(ctx context.Context, host string) ([]net.IP, error) {
	mu.RLock()
	m := current
	mu.RUnlock()

	if m == ModeCloudflare {
		ips, err := resolveViaDoH(ctx, host)
		if err == nil && len(ips) > 0 {
			return ips, nil
		}
		// fallback -> yerel
	}
	// yerel (sistem DNS)
	resolver := net.DefaultResolver
	ctx2, cancel := context.WithTimeout(ctx, 4*time.Second)
	defer cancel()
	return resolver.LookupIP(ctx2, "ip4", host)
}

func resolveViaDoH(ctx context.Context, host string) ([]net.IP, error) {
	// DNS wire query oluştur (A kaydı)
	var b [512]byte
	packed, err := buildQuery(host, b[:])
	if err != nil {
		return nil, err
	}
	ctx2, cancel := context.WithTimeout(ctx, 4*time.Second)
	defer cancel()
	respWire, err := QueryWithFallback(ctx2, packed)
	if err != nil {
		return nil, err
	}
	return parseResponse(respWire)
}

func buildQuery(host string, buf []byte) ([]byte, error) {
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
	// kopyala çünkü buf stack'te
	out := make([]byte, len(packed))
	copy(out, packed)
	return out, nil
}

func parseResponse(wire []byte) ([]net.IP, error) {
	var p dnsmessage.Parser
	h, err := p.Start(wire)
	if err != nil {
		return nil, err
	}
	if err := p.SkipAllQuestions(); err != nil {
		return nil, err
	}
	// header'daki cevap sayısını kullan
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
