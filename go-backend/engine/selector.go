// selector.go — uyumlu stratejileri Health skoruna göre sıralar ve en iyisini seçer.
//
// Kural: "A -> başarısız ise B'ye geç; B birkaç kez başarısız ise C stabil ise C'ye geç."
// Cooldown'daki stratejiler atlanır; hiçbiri uygun değilse nil döner (passthrough).
package engine

import (
	"math"
	"time"
)

// Anti-cascade sabitleri: kanıtsız (taze) bir strateji, kanıtlı lideri ancak
// açık farkla geçerse tahtından edebilir. Aksi halde DPI zehirlenmesinde
// tüm stratejiler sırayla yakılıp passthrough çöküşüne gidilir.
const (
	minDethroneEvidence = 3    // tahttan indirmek için gereken asgari kanıt
	anchorSlack         = 12.0 // liderin korunma payı (puan)
)

// Selector, registry'den en iyi uyumlu stratejiyi seçer.
type Selector struct{}

// Select, paket bilgisine uygun, cooldown'da olmayan en yüksek skorlu
// stratejiyi döner. Uygun aday yoksa veya hepsi cooldown'daysa nil döner
// (çağıran passthrough eder). Küresel hold aktifken de passthrough önerir.
func (s *Selector) Select(reg *Registry, info PacketInfo, now time.Time) (Strategy, bool) {
	if reg.InHold(now) {
		return nil, false
	}
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
	best := candidates[bestIdx]

	// Anti-cascade anchor: seçilen aday kanıtsızsa ve kanıtlı bir lider
	// varsa, aday lideri açık farkla geçmedikçe lider korunur. Böylece
	// zehirli pencerede taze stratejiler sırayla yakılmaz; lider cooldown'a
	// girdiyse yenisi zaten devreye girer (keşif yolu açık kalır).
	if best.Health.Observed() < minDethroneEvidence {
		if lid := reg.LeaderByEvidence(now, true); lid != "" && lid != best.Strategy.Metadata().ID {
			if ls, lh, ok := reg.Get(lid); ok && lh.Observed() >= minDethroneEvidence {
				if lh.Score(now) >= bestScore-anchorSlack {
					return ls, true
				}
			}
		}
	}
	return best.Strategy, true
}