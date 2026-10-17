// dpi_dispatch.go — Paket gelen–giden sınıflandırması ve pipeline.
//
// Akış:
//   UDP  → sayaç + passthrough (WinDivert'e bırakılır)
//   TCP inbound → passthrough
//   TCP outbound, non-ClientHello → passthrough
//   TCP outbound, ClientHello + blacklist hit → TechniqueSet.Apply()
//     ├─ handled=true  → teknik kendi Send'ini yaptı, bitti
//     └─ handled=false → passthrough (wd.Send ile orijinali yolla)
//
// Smart Split modu (SetClassifierFilter):
//   dpiModeGameBypass → sadece CategoryGame SNI'larına DPI uygular
//   dpiModeSocialVPN  → sadece CategorySocial SNI'larını raporlar, pakete dokunmaz
//   dpiModeFull       → mevcut davranış (blacklist tabanlı)
package main

import (
	"encoding/json"
	"fmt"
	"os"
	"sync/atomic"
)

// Stats, motor istatistikleri (atomic).
type Stats struct {
	Recv       atomic.Int64
	Passthru   atomic.Int64
	Bypassed   atomic.Int64
	DropErr    atomic.Int64
	UDPPackets atomic.Int64
	// Smart Split ek sayaçları
	GameBypassed   atomic.Int64
	SocialDetected atomic.Int64
}

// Dispatcher, gelen paketleri sınıflandırıp uygun tekniği uygular.
type Dispatcher struct {
	wd               *WinDivert
	techniques       *TechniqueSet
	Stats            Stats
	classifierFilter dpiEngineMode // Smart Split modu
}

// NewDispatcher, yeni bir dispatcher oluşturur.
func NewDispatcher(wd *WinDivert, ts *TechniqueSet) *Dispatcher {
	return &Dispatcher{wd: wd, techniques: ts, classifierFilter: dpiModeFull}
}

// SetClassifierFilter, Smart Split çalışma modunu ayarlar.
func (d *Dispatcher) SetClassifierFilter(mode dpiEngineMode) {
	d.classifierFilter = mode
}

// Handle, tek bir paketi işler.
func (d *Dispatcher) Handle(raw []byte, addr []byte) {
	d.Stats.Recv.Add(1)

	info := ParsePacketInfo(raw)

	// UDP: passthrough (Roblox oyun oturumu, ses vb. doğrudan akar)
	if info.Proto == 17 {
		d.Stats.UDPPackets.Add(1)
		d.passthrough(raw, addr)
		return
	}

	// TCP değilse passthrough
	if info.Proto != 6 {
		d.passthrough(raw, addr)
		return
	}

	// Outbound TCP: Sadece ClientHello paketleri DPI bypass tekniğine girer.
	if !IsClientHello(info.Payload) {
		d.passthrough(raw, addr)
		return
	}

	// --- Smart Split Classifier ---
	if d.classifierFilter != dpiModeFull {
		sni := ExtractSNI(info.Payload)
		category := ClassifyDomain(sni)

		switch d.classifierFilter {
		case dpiModeGameBypass:
			// Sadece oyun domainleri DPI'a girer; sosyal medya ve diğerleri dokunulmaz geçer.
			if category != CategoryGame {
				d.passthrough(raw, addr)
				return
			}
			// Oyun SNI → DPI bypass uygula (aşağıya devam)
			d.Stats.GameBypassed.Add(1)

		case dpiModeSocialVPN:
			// Sosyal medya SNI tespit edildi → Electron'a telemetri gönder, pakete dokunma.
			if category == CategorySocial {
				d.Stats.SocialDetected.Add(1)
				d.emitRouteEvent(sni, "social-vpn")
			}
			// Her iki durumda da pakete DPI UYGULANMAZ — WireGuard zaten route'u üstleniyor.
			d.passthrough(raw, addr)
			return

		case dpiModeSmartSplit:
			// TEK ENGINE SMART SPLIT:
			// 1. Sosyal medya ise: WireGuard/IP gizliliği için telemetri gönder, DPI bypass yapma (tünelden aksın).
			if category == CategorySocial {
				d.Stats.SocialDetected.Add(1)
				d.emitRouteEvent(sni, "social-vpn")
				d.passthrough(raw, addr)
				return
			}
			// 2. Oyun domaini ise: DPI bypass uygula (0 ms ping / sansür delme)
			if category == CategoryGame {
				d.Stats.GameBypassed.Add(1)
				// Teknik uygulamasına devam et (aşağı akar)
			} else {
				// Diğer normal siteler: DPI'sız doğrudan passthrough
				d.passthrough(raw, addr)
				return
			}
		}
	}

	// Teknik uygula (sni-split vb.)
	handled, err := d.techniques.Apply(raw, addr, d.wd)
	if err != nil {
		fmt.Fprintf(os.Stderr, "[dispatch] teknik hatası: %v\n", err)
		d.Stats.DropErr.Add(1)
		d.passthrough(raw, addr)
		return
	}
	if handled {
		d.Stats.Bypassed.Add(1)
		return
	}

	// Blacklist ile eşleşmediyse veya teknik uygulanmadıysa orijinali geçir
	d.passthrough(raw, addr)
}

// emitRouteEvent, Electron'a sosyal medya SNI tespitini JSON telemetrisi olarak bildirir.
// Bu bilgiyle Electron, WireGuard route'unu dinamik olarak güncelleyebilir.
func (d *Dispatcher) emitRouteEvent(sni, routeType string) {
	event := map[string]interface{}{
		"type":       "smart-route",
		"sni":        sni,
		"route_type": routeType,
	}
	if data, err := json.Marshal(event); err == nil {
		fmt.Println("TELEMETRY:" + string(data))
	}
}

// passthrough, paketi değiştirmeden ağa geri enjekte eder.
func (d *Dispatcher) passthrough(raw []byte, addr []byte) {
	if err := d.wd.Send(raw, addr); err != nil {
		fmt.Fprintf(os.Stderr, "[dispatch] passthrough hata: %v\n", err)
		d.Stats.DropErr.Add(1)
		return
	}
	d.Stats.Passthru.Add(1)
}
