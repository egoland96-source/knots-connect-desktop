// dpi_tech_split.go — SNI-Split tekniği.
//
// Yöntem (GoodbyeDPI -k felsefesi):
//   ClientHello TCP segmenti, SNI hostname'inin tam ortasından 2 parçaya bölünür.
//   Hiçbir parça tek başına tam domain adını ("roblox.com") taşımaz.
//   Segment 1 ACK-only (PSH bayrağı temizlenir), Segment 2 PSH+ACK olarak yollanır.
//   Aradaki 2ms gecikme ile DPI reassembly penceresi aşılır.
package main

import (
	"fmt"
	"os"
	"strings"
	"time"
)

// SniSplitTechnique, ClientHello'yu SNI ortasından 2 TCP segmentine böler.
type SniSplitTechnique struct {
	blacklist  []string
	globalMode bool
}

func NewSniSplitTechnique(blacklist []string, globalMode bool) *SniSplitTechnique {
	return &SniSplitTechnique{blacklist: blacklist, globalMode: globalMode}
}

func (t *SniSplitTechnique) SetBlacklist(bl []string) {
	t.blacklist = bl
}

func (t *SniSplitTechnique) SetGlobal(g bool) {
	t.globalMode = g
}

func (t *SniSplitTechnique) Name() string { return "sni-split" }

func (t *SniSplitTechnique) Apply(raw []byte, addr []byte, wd *WinDivert) (bool, error) {
	info := ParsePacketInfo(raw)
	if info.Proto != 6 || info.THL == 0 {
		return false, nil
	}

	// Payload ClientHello mı?
	if !IsClientHello(info.Payload) {
		return false, nil
	}

	// SNI kontrolü
	sni := ExtractSNI(info.Payload)
	if sni == "" {
		return false, nil
	}

	// Global mod değilse blacklist eşleşmesi ara
	if !t.globalMode && !MatchesDomain(sni, t.blacklist) {
		return false, nil
	}

	origSeq := TCPSeq(raw, info.IHL)
	sniStart, sniLen, hasSniRange := findSniHostnameRange(info.Payload)

	splitPt := 0
	if hasSniRange && sniLen >= 4 && sniStart > 4 {
		// Domain adının içini tam ortasından bölüyoruz (GoodbyeDPI -k felsefesi).
		// Eğer roblox.com içeriyorsa "rob" ve "lox.com" arasından kes:
		// Segment 1 sonu: "...rob"
		// Segment 2 başı: "lox.com..."
		// Böylece hiçbir segmentte "roblox.com" kelimesi BÜTÜN olarak GEÇMEZ.
		hostname := strings.ToLower(string(info.Payload[sniStart : sniStart+sniLen]))
		if idx := strings.Index(hostname, "roblox.com"); idx != -1 {
			splitPt = sniStart + idx + 3 // "rob" | "lox.com"
		} else if idx := strings.Index(hostname, "rbxcdn.com"); idx != -1 {
			splitPt = sniStart + idx + 3 // "rbx" | "cdn.com"
		} else {
			splitPt = sniStart + (sniLen / 2)
		}
	} else {
		splitPt = len(info.Payload) / 2
	}

	// Güvenlik sınırları: segmentler en az 16 bayt olmalı (Tiny Fragment koruması)
	if splitPt < 16 {
		splitPt = 16
	}
	if splitPt > len(info.Payload)-16 {
		splitPt = len(info.Payload) - 16
	}

	payload1 := info.Payload[:splitPt]
	payload2 := info.Payload[splitPt:]

	// Segment 1: ACK bayraklı (PSH bayrağı 0x08 temizlenir), orijinal seq
	seg1, err := BuildTCPSegment(raw, info.IHL, info.THL, payload1, origSeq)
	if err != nil {
		return false, fmt.Errorf("seg1 build: %w", err)
	}
	seg1[info.IHL+13] &= ^byte(0x08)
	RecalcTCPChecksum(seg1)

	// Segment 2: PSH+ACK bayraklı, seq += len(payload1)
	seg2, err := BuildTCPSegment(raw, info.IHL, info.THL, payload2, origSeq+uint32(len(payload1)))
	if err != nil {
		return false, fmt.Errorf("seg2 build: %w", err)
	}
	RecalcTCPChecksum(seg2)

	addr1 := CloneAddr(addr)
	addr2 := CloneAddr(addr)

	if err := wd.Send(seg1, addr1); err != nil {
		return false, fmt.Errorf("seg1 send: %w", err)
	}

	// DPI reassembly penceresini aşmak için 2ms gecikme
	time.Sleep(2 * time.Millisecond)

	if err := wd.Send(seg2, addr2); err != nil {
		return false, fmt.Errorf("seg2 send: %w", err)
	}

	fmt.Fprintf(os.Stderr, "[dpi] sni-split-2 SNI=%s split@%d/%d seg1=%d seg2=%d\n",
		sni, splitPt, len(info.Payload), len(payload1), len(payload2))
	return true, nil
}
