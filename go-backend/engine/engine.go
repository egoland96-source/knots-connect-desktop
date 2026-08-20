// engine.go — Adaptive Network Engine orkestratörü.
//
// Paket akışı:
//   HandleOutbound (outbound TLS) → FlowKey + registry
//       → Selector (compatibility + health skoru)
//       → strateji Apply (split vs passthrough)
//       → Monitor: akışı izle, sonucu health'e yaz
//   Gelen paketler → ObserveInbound (ServerHello = başarı, RST = başarısızlık)
//
// Kural: en iyi skorlu uygun strateji seçilir; başarısız olan strateji
// cooldown'a girer ve bir sonraki denemede bir sonraki en iyi seçilir.
// Hiçbir strateji uygun değilse passthrough (ağ normal davranışına döner).
package engine

import (
	"time"
)

// FlowKeyFactory, bir ham paketten FlowKey üretir (main'in header parse'ına
// bağımlılığı azaltmak için burada saf offsets ile çalışan versiyon vardır).
type FlowKeyFactory struct{}

// Make, ham IPv4 paketinden yön-bağımsız FlowKey üretir.
func (FlowKeyFactory) Make(raw []byte) (FlowKey, bool) {
	if len(raw) < 20 {
		return FlowKey{}, false
	}
	ver := int(raw[0] >> 4)
	if ver != 4 {
		return FlowKey{}, false
	}
	ihl := int(raw[0]&0x0F) * 4
	if ihl+20 > len(raw) {
		return FlowKey{}, false
	}
	proto := int(raw[9])
	src := ipStr(raw, 12, 16)
	dst := ipStr(raw, 16, 20)
	sp := int(u16be(raw[ihl : ihl+2]))
	dp := int(u16be(raw[ihl+2 : ihl+4]))
	return normalizeKey(ver, proto, src, dst, sp, dp), true
}

// normalizeKey, src/dst'yi sıralayarak yön-bağımsız key üretir.
func normalizeKey(ver, proto int, src, dst string, sp, dp int) FlowKey {
	if src < dst || (src == dst && sp < dp) {
		return FlowKey{Ver: ver, Proto: proto, SrcIP: src, DstIP: dst, SrcPort: sp, DstPort: dp}
	}
	return FlowKey{Ver: ver, Proto: proto, SrcIP: dst, DstIP: src, SrcPort: dp, DstPort: sp}
}

func u16be(b []byte) uint16 { return uint16(b[0])<<8 | uint16(b[1]) }

// Engine, motorun çekirdek nesnesidir.
type Engine struct {
	Registry *Registry
	Selector *Selector
	Monitor  *Monitor
	Store    *StateStore
	bestID   string // güncel en iyi strateji (profil kaydı için)
	finish   chan struct{}
	tickDur  time.Duration
	saveTick int // profil kaydı sayacı
}

// NewEngine, registry'yi kurar ve monitor'ü aynı registry'ye bağlar.
func NewEngine() *Engine {
	reg := NewRegistry()
	return &Engine{
		Registry: reg,
		Selector: &Selector{},
		Monitor:  NewMonitor(reg),
		Store:    NewStateStore(),
		finish:   make(chan struct{}),
		tickDur:  5 * time.Second,
	}
}

// Register, stratejiyi registry'ye ekler.
func (e *Engine) Register(s Strategy) {
	e.Registry.Register(s)
}

// Start, mevcut ağ profilini yükler ve periyodik bakım döngüsünü başlatır.
func (e *Engine) Start() {
	e.Store.ApplyToRegistry(e.Registry)
	e.updateBest()
	go e.loop()
}

// Stop, bakım döngüsünü durdurur ve son profili kaydeder.
func (e *Engine) Stop() {
	select {
	case <-e.finish:
	default:
		close(e.finish)
	}
	e.updateBest()
	e.Store.PersistHealth(e.Registry, NetworkSignature(), e.bestID)
}

// bestStrategy, güncel en yüksek skorlu (cooldown dışı) strateji id'dir.
func (e *Engine) bestStrategy(now time.Time) string {
	best := ""
	bestScore := -1e9
	for _, swh := range e.Registry.All() {
		if swh.Health.InCooldown(now) {
			continue
		}
		sc := swh.Health.Score(now)
		if sc > bestScore {
			bestScore = sc
			best = swh.Strategy.Metadata().ID
		}
	}
	if best == "" {
		best = "passthrough"
	}
	return best
}

// HandleOutbound, giden TLS paketini strateji seçimiyle işler.
// handled=true: paket tüketildi (parçalanma) — main orijinali göndermez.
// handled=false: passthrough — main orijinali gönderir.
func (e *Engine) HandleOutbound(info PacketInfo, raw, addr []byte, send SendFunc) (handled bool, err error) {
	if info.Proto != 6 || info.Ver != 4 || !isClientHello(info, raw) {
		return false, nil
	}

	now := time.Now()
	strategy, ok := e.Selector.Select(e.Registry, info, now)
	if !ok {
		return false, nil
	}

	handled, err = strategy.Apply(raw, addr, send)
	if err != nil {
		logf("[engine] strateji %s hata: %v", strategy.Metadata().ID, err)
		return false, err
	}

	// Akış izlemeye yalnızca strateji GERÇEKTEN işlediyse başla:
	// SNI eşleşmeyen trafik stratejiyi cezalandırmasın.
	if handled {
		if fk, ok := (FlowKeyFactory{}).Make(raw); ok {
			fk.Strategy = strategy.Metadata().ID
			e.Monitor.BeginFlow(fk)
		}
		if _, h, ok := e.Registry.Get(strategy.Metadata().ID); ok {
			logf("[engine] strateji seçildi: %s (skor %.1f)", strategy.Metadata().ID, h.Score(now))
		}
	}
	return handled, nil
}

// ObserveInbound, gelen paketleri monitor'a aktarır (ServerHello/RST tespiti).
func (e *Engine) ObserveInbound(info PacketInfo, raw []byte) {
	e.Monitor.Observe(info, raw)
}

// ProbeStats, mevcut strateji sağlık özetlerini döner (UI/log için).
func (e *Engine) ProbeStats() []ProbeStats {
	return CollectStats(e.Registry)
}

// isClientHello hızlı ön filtre: TCP payload TLS Handshake (0x16 0x03).
// Tam ClientHello doğrulaması strateji içinde yapılır.
func isClientHello(info PacketInfo, raw []byte) bool {
	if info.Proto != 6 || len(raw) < 40 {
		return false
	}
	ihl := int(raw[0]&0x0F) * 4
	if len(raw) < ihl+20+5 {
		return false
	}
	thl := int(raw[ihl+12]>>4&0x0F) * 4
	payload := raw[ihl+thl:]
	if len(payload) < 5 {
		return false
	}
	return payload[0] == 0x16 && payload[1] == 0x03
}

// loop, periyodik bakımı yapar: zaman aşımı temizliği + profil kaydı.
func (e *Engine) loop() {
	t := time.NewTicker(e.tickDur)
	defer t.Stop()
	for {
		select {
		case <-e.finish:
			return
		case now := <-t.C:
			failed := e.Monitor.Expire(now)
			if failed > 0 {
				e.updateBest()
			}
			e.saveTick++
			if e.saveTick%20 == 0 { // ~100 sn'de bir
				e.updateBest()
				e.Store.PersistHealth(e.Registry, NetworkSignature(), e.bestID)
			}
		}
	}
}

// updateBest, en iyi stratejiyi günceller (profil kaydı ve loglama için).
func (e *Engine) updateBest() {
	e.bestID = e.bestStrategy(time.Now())
}