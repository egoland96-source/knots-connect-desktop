// registry.go — strateji havuzu. Tüm stratejiler buraya kaydedilir;
// kayıt sırası, eşit skorlarda öncelik sırasını belirler.
package engine

import (
	"sort"
	"time"
)

// Hold (anti-cascade) sabitleri: ardışık küresel başarısızlıklar DPI
// zehirlenmesine işarettir. Eşik aşılınca strateji seçimi kısa süreliğine
// durdurulur (passthrough) — skorlar çökmeden, süre bitince lider tekrar
// denenir. Süre her tekrarda ikiye katlanır.
const (
	holdThreshold  = 3              // ardışık başarısızlık eşiği
	baseHoldDur    = 25 * time.Second
	maxHoldDur     = 3 * time.Minute
)

// Registry, kayıtlı tüm stratejileri ve canlı health kayıtlarını tutar.
type Registry struct {
	strategies map[string]Strategy // id -> strategy
	health     map[string]*Health  // id -> health
	order      []string            // kayıt sırası (kararlı öncelik)

	// Küresel degrade durumu (hold latch).
	consecFails int
	consecSucc  int
	holdTill    time.Time
	holdLen     time.Duration
}

// NewRegistry, boş bir strateji havuzu oluşturur.
func NewRegistry() *Registry {
	return &Registry{
		strategies: make(map[string]Strategy),
		health:     make(map[string]*Health),
	}
}

// Register, stratejiyi havuza ekler. Kayıt sırası önemlidir:
// eşit skorda daha önce kaydedilen önceliklidir.
func (r *Registry) Register(s Strategy) {
	id := s.Metadata().ID
	if _, exists := r.strategies[id]; exists {
		return
	}
	r.strategies[id] = s
	r.health[id] = &Health{}
	r.order = append(r.order, id)
}

// Get, id ile strateji ve health kaydını döner; yoksa nil.
func (r *Registry) Get(id string) (Strategy, *Health, bool) {
	s, ok := r.strategies[id]
	if !ok {
		return nil, nil, false
	}
	return s, r.health[id], true
}

// Has, id'de kayıtlı strateji olup olmadığını döner.
func (r *Registry) Has(id string) bool {
	_, ok := r.strategies[id]
	return ok
}

// Compatible, verilen paket bilgisiyle uyumlu tüm stratejileri
// (health'leriyle birlikte) döner. Sıra: kayıt sırası.
func (r *Registry) Compatible(info PacketInfo) []StrategyWithHealth {
	var out []StrategyWithHealth
	for _, id := range r.order {
		s := r.strategies[id]
		md := s.Metadata()
		if !containsInt(md.Protocols, info.Proto) {
			continue
		}
		if !containsInt(md.IPVersions, info.Ver) {
			continue
		}
		out = append(out, StrategyWithHealth{Strategy: s, Health: r.health[id]})
	}
	return out
}

// StrategyWithHealth, selector'ın kullandığı eşleştirilmiş kayıttır.
type StrategyWithHealth struct {
	Strategy Strategy
	Health   *Health
}

// All, kayıtlı tüm strateji-health çiftlerini kayıt sırasıyla döner.
func (r *Registry) All() []StrategyWithHealth {
	out := make([]StrategyWithHealth, 0, len(r.order))
	for _, id := range r.order {
		out = append(out, StrategyWithHealth{Strategy: r.strategies[id], Health: r.health[id]})
	}
	return out
}

// Len, kayıtlı strateji sayısını döner.
func (r *Registry) Len() int { return len(r.order) }

// SortedByScore, tüm stratejileri skora göre azalan sıralar (loglama için).
func (r *Registry) SortedByScore(now time.Time) []StrategyWithHealth {
	list := r.All()
	sort.SliceStable(list, func(i, j int) bool {
		return list[i].Health.Score(now) > list[j].Health.Score(now)
	})
	return list
}

func containsInt(list []int, v int) bool {
	for _, x := range list {
		if x == v {
			return true
		}
	}
	return false
}

// LeaderByEvidence, en fazla başarı kanıtına (SuccessCount) sahip strateji
// id'sini döner; honorCooldown=true ise cooldown'dakileri atlar. Oyun-pool
// hafızası ve en iyi strateji fallback'leri bu lideri kullanır.
func (r *Registry) LeaderByEvidence(now time.Time, honorCooldown bool) string {
	best := ""
	bestEv := -1
	for _, id := range r.order {
		h := r.health[id]
		if honorCooldown && h.InCooldown(now) {
			continue
		}
		if h.SuccessCount > bestEv {
			bestEv = h.SuccessCount
			best = id
		}
	}
	return best
}

// NoteOutcome, monitor sonuçlarından küresel degrade sayacını besler.
// Ardışık başarısızlıklar hold eşiğini aşarsa seçim geçici olarak durur;
// bir başarı hold'u anında temizler.
func (r *Registry) NoteOutcome(success bool) {
	if success {
		r.consecFails = 0
		r.consecSucc++
		r.holdTill = time.Time{}
		return
	}
	r.consecSucc = 0
	r.consecFails++
	if r.consecFails == holdThreshold {
		r.holdLen = baseHoldDur
		r.holdTill = time.Now().Add(r.holdLen)
	} else if r.consecFails > holdThreshold {
		// Hold süresi dolup başarısızlıklar sürüyorsa süreyi katla.
		if r.holdTill.IsZero() || time.Now().After(r.holdTill) {
			r.holdLen *= 2
			if r.holdLen > maxHoldDur {
				r.holdLen = maxHoldDur
			}
			r.holdTill = time.Now().Add(r.holdLen)
		}
	}
}

// InHold, küresel degrade penceresinin aktif olup olmadığını söyler.
// Aktifken Selector passthrough önerir (oyun-pool akışları muaf tutulur).
func (r *Registry) InHold(now time.Time) bool {
	return !r.holdTill.IsZero() && now.Before(r.holdTill)
}