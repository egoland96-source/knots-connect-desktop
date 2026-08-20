// registry.go — strateji havuzu. Tüm stratejiler buraya kaydedilir;
// kayıt sırası, eşit skorlarda öncelik sırasını belirler.
package engine

import (
	"sort"
	"time"
)

// Registry, kayıtlı tüm stratejileri ve canlı health kayıtlarını tutar.
type Registry struct {
	strategies map[string]Strategy // id -> strategy
	health     map[string]*Health  // id -> health
	order      []string            // kayıt sırası (kararlı öncelik)
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