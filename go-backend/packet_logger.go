//go:build ignore

// packet_logger.go — gerçek zamanlı paket günlüğü (ring buffer, son 500 paket)
// Her yakalanan paket için teknik veri + sade Türkçe açıklama üretir.
package main

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"sync"
	"time"
)

const maxPacketLogs = 500

type PacketLogEntry struct {
	Timestamp  string `json:"timestamp"`
	// TEKNİK KISIM (küçük/gri — genişleyince görünür)
	SrcIP      string `json:"src_ip"`
	DstIP      string `json:"dst_ip"`
	SrcPort    int    `json:"src_port"`
	DstPort    int    `json:"dst_port"`
	Protocol   string `json:"protocol"` // TCP / UDP
	TCPFlags   string `json:"tcp_flags"` // örn: SYN+ACK / RST / PSH+ACK
	PayloadLen int    `json:"payload_len"`
	SNI        string `json:"sni"` // ClientHello'dan çıkarılan hostname
	Strategy   string `json:"strategy"` // split2 / split3 / splitv / mssClamp / windowMin / passthrough / none
	// SADE AÇIKLAMA — ana satır, insan-okur Türkçe
	Description string `json:"description"`
	Color       string `json:"color"` // green / yellow / red / gray
}

type PacketLogger struct {
	mu     sync.Mutex
	buffer []PacketLogEntry
}

func NewPacketLogger() *PacketLogger {
	return &PacketLogger{buffer: make([]PacketLogEntry, 0, maxPacketLogs)}
}

func (pl *PacketLogger) Log(srcIP, dstIP string, srcPort, dstPort int, proto string, flags string, payloadLen int, sni, strategy string, description, color string) {
	pl.mu.Lock()
	defer pl.mu.Unlock()

	entry := PacketLogEntry{
		Timestamp:    time.Now().Format("15:04:05.000"),
		SrcIP:        srcIP,
		DstIP:        dstIP,
		SrcPort:      srcPort,
		DstPort:      dstPort,
		Protocol:     proto,
		TCPFlags:     flags,
		PayloadLen:   payloadLen,
		SNI:          sni,
		Strategy:     strategy,
		Description:  description,
		Color:        color,
	}

	pl.buffer = append(pl.buffer, entry)
	if len(pl.buffer) > maxPacketLogs {
		pl.buffer = pl.buffer[len(pl.buffer)-maxPacketLogs:]
	}

	// Elektron'a TELEMETRY: JSON olarak stdout'a yaz
	data, _ := json.Marshal(map[string]interface{}{
		"event": "packet_log",
		"data": entry,
	})
	fmt.Fprintf(os.Stdout, "TELEMETRY:%s\n", string(data))
}

func (pl *PacketLogger) GetLogs() []PacketLogEntry {
	pl.mu.Lock()
	defer pl.mu.Unlock()
	out := make([]PacketLogEntry, len(pl.buffer))
	copy(out, pl.buffer)
	return out
}

// describePacket — teknik verileri insan-okur, günlük dille açıklayan cümle üretir.
// Teknik jargon (SYN, ACK, MSS) kullanılmaz; yerine "bağlantı isteği", "cevap geldi",
// "bağlantı koptu" gibi ifadeler kullanılır.
func describePacket(srcIP, dstIP string, srcPort, dstPort int, proto string, flags string, payloadLen int, sni, strategy string) (desc, color string) {

	// Renk kodlaması
	color = "gray"

	// --- Özel durumlar önce ---

	// Engellenen / RST geldi
	if strings.Contains(flags, "RST") {
		color = "red"
		desc = fmt.Sprintf("%s sunucusuyla bağlantı koptu (engellendi), tekrar denenecek", dstIP)
		if sni != "" {
			desc = fmt.Sprintf("%s sunucusuyla bağlantı koptu — %s hedefine ulaşım engellendi, tekrar denenecek", dstIP, sni)
		}
		return
	}

	// SYN + MSS clamp (oyun sunucusu bağlantısı)
	if proto == "TCP" && strings.Contains(flags, "SYN") && strategy == "mssClamp" {
		color = "yellow"
		desc = fmt.Sprintf("Oyun sunucusuyla (%s) gizli bağlantı kuruluyor — küçük parçalarla veri gizleniyor", dstIP)
		if sni != "" {
			desc = fmt.Sprintf("%s oyun sunucusuyla gizli bağlantı kuruluyor — veri küçük parçalara bölündü", sni)
		}
		return
	}

	// SYN + split2 / split3 (SNI parçalama)
	if proto == "TCP" && (strings.Contains(flags, "SYN") || payloadLen > 0) && (strategy == "split2" || strategy == "split3" || strategy == "splitv") {
		color = "green"
		if sni != "" {
			desc = fmt.Sprintf("%s adresine bağlantı deneniyor → SNI gizlendi, DPI'dan saklanmaya çalışılıyor", sni)
		} else {
			desc = fmt.Sprintf("%s adresine bağlantı deneniyor → DPI'dan saklanmaya çalışılıyor", dstIP)
		}
		return
	}

	// Passthrough / bilinçli bypass uygulanmadı (sosyal medya vb.)
	if strategy == "passthrough" || strategy == "none" {
		color = "gray"
		if sni != "" {
			desc = fmt.Sprintf("%s adresine bağlantı → bilinçli olarak bypass UYGULANMADI (gizlilik koruması)", sni)
		} else {
			desc = fmt.Sprintf("%s adresine bağlantı → bilinçli olarak bypass uygulanmadı", dstIP)
		}
		return
	}

	// SYN-ACK / başarılı bağlantı
	if strings.Contains(flags, "SYN") && strings.Contains(flags, "ACK") {
		color = "green"
		if sni != "" {
			desc = fmt.Sprintf("%s sunucusundan yanıt geldi (%s) → bağlantı başarılı, veri akışı başladı", dstIP, sni)
		} else {
			desc = fmt.Sprintf("%s sunucusundan yanıt geldi → bağlantı başarılı", dstIP)
		}
		return
	}

	// PSH + ACK (veri akışı)
	if strings.Contains(flags, "PSH") && strings.Contains(flags, "ACK") {
		color = "green"
		if sni != "" {
			desc = fmt.Sprintf("%s ile veri alışverişi devam ediyor → bağlantı sağlıklı", sni)
		} else {
			desc = fmt.Sprintf("%s ile veri alışverişi devam ediyor", dstIP)
		}
		return
	}

	// WindowMin (TCP pencere küçültme)
	if strategy == "windowMin" {
		color = "yellow"
		desc = fmt.Sprintf("Bağlantı isteği (%s) → TCP penceresi daraltıldı, DPI'ı şaşırtma denemesi", dstIP)
		if sni != "" {
			desc = fmt.Sprintf("%s bağlantısı → TCP penceresi daraltıldı, DPI'ı şaşırtma", sni)
		}
		return
	}

	// Bilinmeyen/ilgisiz trafik
	color = "gray"
	desc = fmt.Sprintf("%s:%d → bilinmeyen trafik, bypass uygulanmadı (%s, %d bayt)", dstIP, dstPort, proto, payloadLen)
	if sni != "" {
		desc = fmt.Sprintf("%s adresine giden trafik (%d bayt) → bypass uygulanmadı", sni, payloadLen)
	}
	return
}
