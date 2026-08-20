// state.go — kalıcı öğrenme: ağ profili başına strateji geçmişi.
//
// Kullanıcının fikri: "ISS / network profile → strategy history → son başarılı
// strateji." Motor her çalıştığında aynı ağda en iyi stratejiyi hatırlar;
// farklı sağlayıcıya geçince yeni profil açar (skorlar sıfırdan öğrenilir).
package engine

import (
	"encoding/json"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"time"
)

// NetworkProfile, bir ağın (ISS/gateway) öğrenilmiş strateji durumudur.
type NetworkProfile struct {
	Signature    string             `json:"signature"`    // ağ kimliği (gateway/prefix)
	BestStrategy string             `json:"best_strategy"` // son en iyi strateji
	Health       map[string]*Health `json:"health"`       // strateji -> canlı skor
	UpdatedAt    time.Time          `json:"updated_at"`
}

// StateStore, profilleri diskte JSON olarak tutar.
type StateStore struct {
	path string
}

// NewStateStore, exe'nin yanındaki engine_state.json dosyasını hedefler.
func NewStateStore() *StateStore {
	exePath, err := os.Executable()
	if err != nil {
		return &StateStore{path: "engine_state.json"}
	}
	return &StateStore{path: filepath.Join(filepath.Dir(exePath), "engine_state.json")}
}

// NetworkSignature, mevcut ağın kimliğini üretir.
// Strateji: default route üzerinden giden ilk IP'nin /24'ü + sağlayıcı DNS
// ipucu. DNS çağrısı yapmaz: ad-stünde tutarlı ve ucuz bir imza üretir.
func NetworkSignature() string {
	// UDP bağlantısı asla paket göndermez; çekirdek default interface'i seçer.
	conn, err := net.Dial("udp", "8.8.8.8:80")
	if err != nil {
		return "unknown"
	}
	defer conn.Close()
	local := conn.LocalAddr().(*net.UDPAddr)
	ip4 := local.IP.To4()
	if ip4 == nil {
		return local.IP.String()
	}
	// /24: ev ağları için yeterli; sağlayıcı değişince çekirdek/prefix değişir.
	return fmt.Sprintf("%d.%d.%d.0/24", ip4[0], ip4[1], ip4[2])
}

// Load, en son kayıtlı profili döner; yoksa nil. Dosya bozuksa yok sayar.
func (s *StateStore) Load() *NetworkProfile {
	data, err := os.ReadFile(s.path)
	if err != nil {
		return nil
	}
	var p NetworkProfile
	if err := json.Unmarshal(data, &p); err != nil {
		return nil
	}
	return &p
}

// Save, profili diske yazar.
func (s *StateStore) Save(p *NetworkProfile) error {
	p.UpdatedAt = time.Now()
	data, err := json.MarshalIndent(p, "", "  ")
	if err != nil {
		return err
	}
	tmp := s.path + ".tmp"
	if err := os.WriteFile(tmp, data, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, s.path)
}

// PersistHealth, registry'deki tüm health kayıtlarını profilde saklar
// ve Save eder. Profil imzası mevcut ağ değilse yeni profil başlatır.
func (s *StateStore) PersistHealth(reg *Registry, sig string, best string) {
	p := &NetworkProfile{
		Signature:    sig,
		BestStrategy: best,
		Health:       make(map[string]*Health),
	}
	for _, swh := range reg.All() {
		p.Health[swh.Strategy.Metadata().ID] = swh.Health.Copy()
	}
	if err := s.Save(p); err != nil {
		logf("[state] kaydedilemedi: %v", err)
		return
	}
	logf("[state] profil kaydedildi: sig=%s best=%s (%d strateji)", sig, best, len(p.Health))
}

// ApplyToRegistry, kayıtlı profili registry'ye yükler (aynı ağdaysa).
// Farklı ağ = yeni profil: strateji skorları sıfırdan öğrenilir.
func (s *StateStore) ApplyToRegistry(reg *Registry) {
	p := s.Load()
	if p == nil {
		logf("[state] kayıtlı profil yok — sıfırdan öğrenilecek")
		return
	}
	if p.Signature != NetworkSignature() {
		logf("[state] ağ değişmiş (%s → %s) — yeni profil başlatılıyor", p.Signature, NetworkSignature())
		return
	}
	applied := make(map[string]bool)
	for id, h := range p.Health {
		if _, he, ok := reg.Get(id); ok {
			he.SuccessCount = h.SuccessCount
			he.FailCount = h.FailCount
			he.AvgLatencyMs = h.AvgLatencyMs
			he.Retries = h.Retries
			he.ConsecFails = h.ConsecFails
			he.LastUsed = h.LastUsed
			he.LastResult = h.LastResult
			he.CooldownTill = h.CooldownTill
			applied[id] = true
		}
	}
	// Profilde OLMAYAN stratejiler (ör. yeni sürümde eklenen fake_ttl):
	// varsayılan 70.0 optimistik skorla öğrenilmiş skorları ezmesin diye
	// 30 saniye soğuk bekleyerek başlar (ileride puanını kazanır).
	for _, swh := range reg.All() {
		id := swh.Strategy.Metadata().ID
		if !applied[id] {
			swh.Health.CooldownTill = time.Now().Add(30 * time.Second)
			logf("[state] yeni strateji %s: 30s soğuk başlatma", id)
		}
	}
	logf("[state] profil yüklendi: sig=%s best=%s (%d strateji)", p.Signature, p.BestStrategy, len(p.Health))
}