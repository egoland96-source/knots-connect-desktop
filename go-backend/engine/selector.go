// selector.go — uyumlu stratejileri Health skoruna göre sıralar ve en iyisini seçer.
//
// Kural: "A -> başarısız ise B'ye geç; B birkaç kez başarısız ise C stabil ise C'ye geç."
// Cooldown'daki stratejiler atlanır; hiçbiri uygun değilse nil döner (passthrough).
package engine

import (
	"math"
	"time"
)

// Selector, registry'den en iyi uyumlu stratejiyi seçer.
type Selector struct{}

// Select, paket bilgisine uygun, cooldown'da olmayan en yüksek skorlu
// stratejiyi döner. Uygun aday yoksa veya hepsi cooldown'daysa nil döner
// (çağıran passthrough eder).
func (s *Selector) Select(reg *Registry, info PacketInfo, now time.Time) (Strategy, bool) {
	candidates := reg.Compatible(info)
	if len(candidates) == 0 {
		return nil, false
	}

	// Skora göre azalan sırala (eşit skorda kayıt sırası korunur).
	// Insertion yaklaşımı: stabil sıralama için önce indeksli çift yap.
	bestIdx := -1
	bestScore := math.Inf(-1)
	for i, c := range candidates {
		if c.Health.InCooldown(now) {
			continue
		}
		score := c.Health.Score(now)
		if score > bestScore {
			bestScore = score
			bestIdx = i
		}
	}
	if bestIdx == -1 {
		return nil, false
	}
	return candidates[bestIdx].Strategy, true
}