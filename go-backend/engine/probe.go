// probe.go — strateji sağlık metriklerinin toplanması ve özeti.
//
// "success rate, connection latency, packet errors, retries" ölçümleri
// Monitor'ün gözlemlerinden akar; bu dosya bunları per-strateji ProbeStats'e
// dönüştürür ve periyodik log/snapshot için kullanılır.
package engine

import "time"

// ProbeStats, kullanıcının istediği ölçümlerdir.
type ProbeStats struct {
	SuccessRate   float64 // 0..1
	AvgLatencyMs  float64
	PacketErrors  int // FailCount
	Retries       int
	Cooldown      bool
	StrategyID    string
	ObservedFlows int // bu stratejiyle gözlemlenen akış sayısı
}

// CollectStats, registry'deki her strateji için ProbeStats üretir.
func CollectStats(reg *Registry) []ProbeStats {
	out := make([]ProbeStats, 0, reg.Len())
	for _, swh := range reg.All() {
		h := swh.Health
		md := swh.Strategy.Metadata()
		out = append(out, ProbeStats{
			StrategyID:    md.ID,
			SuccessRate:   h.SuccessRate(),
			AvgLatencyMs:  h.AvgLatencyMs,
			PacketErrors:  h.FailCount,
			Retries:       h.Retries,
			Cooldown:      h.InCooldown(time.Now()),
			ObservedFlows: h.SuccessCount + h.FailCount,
		})
	}
	return out
}