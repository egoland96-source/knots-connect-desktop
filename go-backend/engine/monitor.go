// monitor.go — Result Monitor: stratejinin gerçek sonucunu ölçer.
//
// Bir ClientHello'yu stratejiyle işlediğimizde akışı kaydederiz; akışta
// ServerHello görürsek = başarı (ek olarak gecikme ölçeriz), RST veya
// zaman aşımı = başarısızlık. Sonuçlar stratejinin Health kaydına işlenir;
// böylece motor "A başarısız → B'ye geç" kararını veriyle verir.
package engine

import (
	"encoding/binary"
	"fmt"
	"os"
	"sync"
	"time"
)

// FlowKey, bir TLS akışını tanımlar (yön bağımsız — iki yön de aynı key).
type FlowKey struct {
	Ver      int
	Proto    int
	SrcIP    string
	DstIP    string
	SrcPort  int
	DstPort  int
	Strategy string // bu akışta hangi strateji uygulandı
}

// flowRecord, izlenen bir akışın durumudur.
type flowRecord struct {
	key       FlowKey
	startedAt time.Time // stratejinin uygulandığı an
	seenReply bool      // ServerHello/TLS cevabı görüldü mü
}

// Monitor, tüm aktif akışları ve strateji sonuçlarını izler.
type Monitor struct {
	mu          sync.Mutex
	flows       map[FlowKey]*flowRecord
	registry    *Registry
	handshakeT  time.Duration // ServerHello için beklenen maksimum süre
	maxFlowLife time.Duration // akış kaydının yaşam süresi
}

// NewMonitor, yeni bir izleyici oluşturur.
func NewMonitor(reg *Registry) *Monitor {
	return &Monitor{
		flows:       make(map[FlowKey]*flowRecord),
		registry:    reg,
		handshakeT:  8 * time.Second,
		maxFlowLife: 60 * time.Second,
	}
}

// BeginFlow, bir akışa strateji uygulanmaya başlandığını kaydeder.
func (m *Monitor) BeginFlow(key FlowKey) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.flows[key] = &flowRecord{key: key, startedAt: time.Now()}
}

// Observe, gelen paketi akış tablosuyla eşleştirir; akış varsa
// TLS cevabi/RST durumunu değerlendirir ve health kaydına işler.
// Handshake tespiti için TLS 1.2/1.3 ServerHello (0x16 0x03 0x03 ... 0x02)
// veya TLS 1.3 0x16 0x03 0x03 ile gelen herhangi bir handshake cevabı
// sayılır (ClientHello'dan sonra sunucudan gelen ilk TLS handshake paketi).
func (m *Monitor) Observe(pkt PacketInfo, raw []byte) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for k, rec := range m.flows {
		if !sameFlow(k, pkt, raw) {
			continue
		}
		if rec.seenReply {
			continue // zaten sonuçlanmış
		}

		// TLS handshake cevabı mı? (ServerHello veya sonraki sunucu handshake)
		if isTLSHandshakeResponse(raw, pkt) {
			rec.seenReply = true
			latency := time.Since(rec.startedAt)
			if _, h, ok := m.registry.Get(k.Strategy); ok {
				h.RecordSuccess(latency.Seconds() * 1000)
				logf("[monitor] strateji %s BAŞARILI (%s → cevap %dms)", k.Strategy, k.DstIP, int(latency.Milliseconds()))
			}
			delete(m.flows, k)
			return
		}

		// RST mi? (TCP flag 0x04)
		if isTCPRST(raw, pkt) {
			rec.seenReply = true
			if _, h, ok := m.registry.Get(k.Strategy); ok {
				h.RecordFailure()
				logf("[monitor] strateji %s BAŞARISIZ: RST (%s)", k.Strategy, k.DstIP)
			}
			delete(m.flows, k)
			return
		}
	}
}

// Expire, zaman aşımına uğramış akışları başarısızlık olarak işler.
// Her Tick'te çağrılır.
func (m *Monitor) Expire(now time.Time) int {
	m.mu.Lock()
	defer m.mu.Unlock()
	failed := 0
	for k, rec := range m.flows {
		age := now.Sub(rec.startedAt)
		if age > m.handshakeT {
			if _, h, ok := m.registry.Get(k.Strategy); ok {
				h.RecordFailure()
				logf("[monitor] strateji %s BAŞARISIZ: zaman aşımı (%s, %ds)", k.Strategy, k.DstIP, int(age.Seconds()))
			}
			delete(m.flows, k)
			failed++
		} else if age > m.maxFlowLife {
			// Uzun süre sonuçsuz (ör. akış zaten bitmiş) — sessizce temizle.
			delete(m.flows, k)
		}
	}
	return failed
}

// Len, izlenen akış sayısını döner.
func (m *Monitor) Len() int {
	m.mu.Lock()
	defer m.mu.Unlock()
	return len(m.flows)
}

// sameFlow, bir paketin FlowKey ile eşleşip eşleşmediğini söyler.
// Yön bağımsız: src↔dst swap'li paket de eşleşir.
func sameFlow(k FlowKey, pkt PacketInfo, raw []byte) bool {
	if k.Ver != pkt.Ver || k.Proto != pkt.Proto {
		return false
	}
	if len(raw) < 20 || k.Ver == 4 {
		if len(raw) < 20 {
			return false
		}
		src := ipStr(raw, 12, 16)
		dst := ipStr(raw, 16, 20)
		sp, dp := ports(raw, pkt)
		return (src == k.SrcIP && dst == k.DstIP && sp == k.SrcPort && dp == k.DstPort) ||
			(src == k.DstIP && dst == k.SrcIP && sp == k.DstPort && dp == k.SrcPort)
	}
	return false
}

func ipStr(raw []byte, a, b int) string {
	return fmt.Sprintf("%d.%d.%d.%d", raw[a], raw[a+1], raw[a+2], raw[a+3])
}

func ports(raw []byte, pkt PacketInfo) (int, int) {
	if len(raw) < 20 {
		return 0, 0
	}
	ihl := int(raw[0]&0x0F) * 4
	if ihl+4 > len(raw) {
		return 0, 0
	}
	return int(binary.BigEndian.Uint16(raw[ihl : ihl+2])), int(binary.BigEndian.Uint16(raw[ihl+2 : ihl+4]))
}

// isTLSHandshakeResponse — TCP 443'ten gelen TLS handshake cevabı mı?
// 0x16 (Handshake) + major version 0x03 + handshake tipi 0x02 (ServerHello).
func isTLSHandshakeResponse(raw []byte, pkt PacketInfo) bool {
	if pkt.Proto != 6 || len(raw) < 40 {
		return false
	}
	ihl := int(raw[0]&0x0F) * 4
	if ihl+14 > len(raw) {
		return false
	}
	thl := int(raw[ihl+12]>>4&0x0F) * 4 // TCP data offset (options dahil)
	if ihl+thl+6 > len(raw) {
		return false
	}
	payload := raw[ihl+thl:]
	// TLS record: 0x16 (handshake) | 0x03 (major) | ServerHello tipi 0x02
	return payload[0] == 0x16 && payload[1] == 0x03 && payload[5] == 0x02
}

// isTCPRST — TCP RST bayrağı (0x04) var mı?
func isTCPRST(raw []byte, pkt PacketInfo) bool {
	if pkt.Proto != 6 || len(raw) < 40 {
		return false
	}
	ihl := int(raw[0]&0x0F) * 4
	tcpOff := ihl
	if tcpOff+14 > len(raw) {
		return false
	}
	return raw[tcpOff+13]&0x04 != 0
}

func logf(format string, args ...interface{}) {
	fmt.Fprintf(os.Stderr, format+"\n", args...)
}