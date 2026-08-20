// health.go — her strateji için canlı sağlık takibi.
//
// Kullanıcının istediği ölçümler burada tutulur:
//   - success rate      -> SuccessCount / (SuccessCount + FailCount)
//   - connection latency -> AvgLatencyMs (TLS ServerHello gecikmesi, TCP RTT)
//   - packet errors      -> FailCount (RST / zaman aşımı)
//   - retries            -> Retries (ardışık başarısızlıktan sonra tekrar deneme)
//   - cooldown           -> ardışık başarısızlıklarda strateji geçici devre dışı
package engine

import (
	"math"
	"time"
)

const (
	// Cooldown için ardışık başarısızlık eşiği: 2 + ardışık artış.
	cooldownThreshold = 2
	// Maksimum cooldown süresi (ardışık başarısızlık arttıkça uzar).
	maxCooldown = 5 * time.Minute
	// Laplacian yumuşatma: sıfır veriyle başlayan stratejiye optimistik başlangıç.
	smoothingAlpha = 0.7
)

// Health, bir stratejinin canlı performans kaydıdır.
type Health struct {
	SuccessCount int
	FailCount    int
	AvgLatencyMs float64
	LastLatency  float64
	Retries      int
	ConsecFails  int
	CooldownTill time.Time
	LastUsed     time.Time
	LastResult   string // son sonuç: "success" / "fail"
}

// SuccessRate, yumuşatılmış başarı oranıdır (0..1).
// Az veriyle yanlış karar verilmesini önlemek için Laplacian smoothing kullanılır.
func (h *Health) SuccessRate() float64 {
	total := float64(h.SuccessCount + h.FailCount)
	if total == 0 {
		return smoothingAlpha
	}
	return (float64(h.SuccessCount) + smoothingAlpha) / (total + 1)
}

// Score, selector'ın sıralama yaptığı tek skordur.
//   - higher success rate -> daha yüksek skor
//   - düşük gecikme -> hafif bonus
//   - cooldown aktif -> -Inf ta (asla seçilmez)
//   - çok fazla ardışık başarısızlık -> retry penaltısı
//
// Anti-cascade: cezalar düşük kanıtta tam uygulanmaz (evidence < 5 iken
// ölçeklenir). Aksi halde DPI'ın zehirli penceresinde tek zaman aşımı taze
// stratejiyi 70'ten 22'ye çökertir ve basamak çöküşü başlar.
func (h *Health) Score(now time.Time) float64 {
	if !h.CooldownTill.IsZero() && now.Before(h.CooldownTill) {
		return math.Inf(-1)
	}
	score := h.SuccessRate() * 100
	score -= math.Min(h.AvgLatencyMs/100, 20) // gecikme penaltısı (max 20 puan)
	ev := float64(h.Observed())
	scale := 1.0
	if ev < 5 {
		scale = ev / 5
	}
	score -= float64(h.Retries) * 3 * scale     // tekrar deneme penaltısı
	score -= float64(h.ConsecFails) * 10 * scale // ardışık başarısızlık penaltısı
	return score
}

// Observed, bu stratejiyle gözlemlenmiş toplam akış sayısıdır (kanıt).
func (h *Health) Observed() int {
	return h.SuccessCount + h.FailCount
}

// RecordSuccess, başarılı bağlantı ve gecikme ölçümünü işler.
// Başarı, ardışık başarısızlık zincirini kırar ve cooldown'u kaldırır:
// strateji çalıştığını kanıtladığı için tekrar denenebilir olmalıdır.
func (h *Health) RecordSuccess(latencyMs float64) {
	h.SuccessCount++
	h.LastLatency = latencyMs
	h.LastUsed = time.Now()
	h.LastResult = "success"
	h.Retries = 0
	h.ConsecFails = 0
	h.CooldownTill = time.Time{}

	if h.AvgLatencyMs == 0 {
		h.AvgLatencyMs = latencyMs
	} else {
		// Hareketli ortalama: son ölçüm %30 ağırlık.
		h.AvgLatencyMs = h.AvgLatencyMs*0.7 + latencyMs*0.3
	}
}

// RecordFailure, başarısız bağlantıyı işler; ardışık başarısızlık eşiğini
// aşarsa strateji cooldown'a girer.
func (h *Health) RecordFailure() {
	h.FailCount++
	h.ConsecFails++
	h.Retries++
	h.LastUsed = time.Now()
	h.LastResult = "fail"

	if h.ConsecFails >= cooldownThreshold {
		// Ardışık başarısızlık arttıkça cooldown üstel uzar:
		// 2 ardışık -> 60s, 3 ardışık -> 2dk, 4 -> 4dk, 5+ -> 5dk (kap).
		cd := time.Duration(60) * time.Second
		for i := cooldownThreshold; i < h.ConsecFails && cd < maxCooldown; i++ {
			cd *= 2
		}
		if cd > maxCooldown {
			cd = maxCooldown
		}
		h.CooldownTill = time.Now().Add(cd)
	}
}

// InCooldown, stratejinin şu anda seçilemez durumda olup olmadığını söyler.
func (h *Health) InCooldown(now time.Time) bool {
	return !h.CooldownTill.IsZero() && now.Before(h.CooldownTill)
}

// Reset, strateji health kaydını temizler (yeni ağ profili gibi).
func (h *Health) Reset() {
	*h = Health{}
}

// Copy, health kaydının kopyasını döner (state persistence için).
func (h *Health) Copy() *Health {
	c := *h
	return &c
}