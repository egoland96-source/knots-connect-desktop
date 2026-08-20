// go_main.go — Knots Adaptive Network Engine (Go WinDivert motoru) girişi.
//
// Mimarî (kullanıcının kararı):
//   Engine (go_main) → Handler
//       → Selector (registry + health skoru)
//       → Strategy havuzu (split2, split3, passthrough)
//       → Monitor (ServerHello/RST/zaman aşımı → health'e yaz)
//       → StateStore (per-ISS profil kalıcılığı)
//
// Varsayılan davranış ("known-good recovery"):
//   - Filtre TÜM IPv4 TCP (UDP/IPv6 hiç dokunulmaz, passthrough).
//   - split2 stratejisi, SNI-blacklist eşleşen ClientHello'yu 2 parçaya böler.
//   - Oyun sunucularına (49xxx-65535) giden SYN'lerde sahte TTL paketleri
//     basılır (DPI'ı oyuna bağlarken şaşırtmak için).
//   - recv 65536 kalıcı buffer (GC-bağışıklı) — godivert panic düzeltmesi.
//
// Yeni: --method N ile split modu seçilir (1=2 parça, 3=3 parça);
// state, ağ profiline göre en iyi stratejiyi hatırlar.
package main

import (
	"fmt"
	"os"
	"strconv"
	"time"

	"knots-go-backend/engine"
)

// Filtre TÜM TCP + UDP'yi yakalar (UDP passthrough — yalnız sayaç görünürlüğü).
// Oyun sunucularına (49xxx-65535) yapılan bağlantılar ve RakNet (UDP) bu
// sayede görünür; QUIC/QUIC-443 de aynen passthrough edilir.
const filterExpr = "tcp or udp"

func main() {
	mode := 1
	diag := false
	for i := 0; i < len(os.Args); i++ {
		switch os.Args[i] {
		case "--diag":
			diag = true
		case "--method":
			if i+1 < len(os.Args) {
				if v, err := strconv.Atoi(os.Args[i+1]); err == nil && v >= 0 {
					mode = v
				}
			}
		}
	}

	if diag {
		os.Exit(runDiag())
	}

	blacklist := LoadBlacklist()

	wd, err := OpenVpnHandle(filterExpr)
	if err != nil {
		fmt.Fprintf(os.Stderr, "[go-engine] WinDivert açılamadı: %v\n", err)
		os.Exit(1)
	}
	defer wd.Close()

	fmt.Fprintf(os.Stderr, "[go-engine] Başlatıldı. Filtre: %s | %d domain yüklü | method %d\n", filterExpr, len(blacklist), mode)

	// --- Adaptive Network Engine ---
	eng := engine.NewEngine()

	// Strateji havuzu (kayıt sırası, eşit skorda öncelik demektir).
	switch mode {
	case 3:
		eng.Register(NewSplit3Strategy(blacklist, mode))
		eng.Register(NewSplit2Strategy(blacklist, mode))
		eng.Register(NewRecFragStrategy(blacklist, mode))
		eng.Register(NewSplitAStrategy(blacklist, mode))
		eng.Register(NewFakeTtlStrategy(blacklist, mode))
	default:
		eng.Register(NewSplit2Strategy(blacklist, mode))
		eng.Register(NewRecFragStrategy(blacklist, mode))
		eng.Register(NewSplitAStrategy(blacklist, mode))
		eng.Register(NewSplit3Strategy(blacklist, mode))
		eng.Register(NewFakeTtlStrategy(blacklist, mode))
	}

	eng.Start()
	defer eng.Stop()

	fmt.Fprintf(os.Stderr, "[engine] Adaptive hazır | ağ: %s | strateji: %d\n", engine.NetworkSignature(), eng.Registry.Len())

	// akış: outbound ClientHello -> strateji; inbound -> monitor.
	var recvCount, sendOk, sendErr, outCount, winMinCount, fakeSynCount, udpIn, udpOut int
	diagRadd := 0
	// Oyun/443-dışı akış izleme: SYN → SYN-ACK/RST kararını görmek için.
	synSeen := make(map[string]time.Time)  // akış -> son SYN zamanı
	synAcked := make(map[string]bool)      // akış -> handshake cevabı alındı mı
	flowKey := func(srcIP string, sp int, dstIP string, dp int) string {
		return srcIP + ":" + strconv.Itoa(sp) + "-" + dstIP + ":" + strconv.Itoa(dp)
	}
	for {
		packet, err := wd.Recv()
		if err != nil {
			fmt.Fprintf(os.Stderr, "[go-engine] Recv hatası: %v\n", err)
			continue // tek paketlik hata motoru durdurmasın
		}
		recvCount++
		if packet.IsOutbound() {
			outCount++
		}

		if diagRadd < 3 {
			diagRadd++
			fmt.Fprintf(os.Stderr, "[go-engine] radd[0..20]=% X | ipv4len=%d out=%v\n",
				packet.Addr[:20], len(packet.Raw), packet.IsOutbound())
		}

		info := parsePacketInfo(packet.Raw)

		// UDP sayaçları: RakNet/QUIC passthrough; yalnız görünürlük.
		if info.Proto == 17 {
			if packet.IsOutbound() {
				udpOut++
			} else {
				udpIn++
			}
		}

		// 443 dışı herkese açık hedefe açılan YENİ TCP akışları:
		// oyun sunucusu bağlantılarını gör, ilk SYN'de sahte paket bas.
		if packet.IsOutbound() && info.Proto == 6 && isSYNPkt(packet.Raw) &&
			len(packet.Raw) >= 20 && isPublicIPv4(packet.Raw[16:20]) && info.DstPort != 443 {
			key := flowKey(ipStr4(packet.Raw, 12), info.SrcPort, ipStr4(packet.Raw, 16), info.DstPort)
			if t, seen := synSeen[key]; !seen || time.Since(t) > 30*time.Second {
				synSeen[key] = time.Now()
				delete(synAcked, key)
				fmt.Fprintf(os.Stderr, "[go-engine] yeni akış: %s → %s:%d\n",
					ipStr4(packet.Raw, 12), ipStr4(packet.Raw, 16), info.DstPort)
				sendSynFakes(packet.Raw, packet.Addr, func(raw, addr []byte) error {
					return wd.Send(&VpnPacket{Raw: raw, Addr: addr})
				})
				fakeSynCount++
			}
		} else if !packet.IsOutbound() && info.Proto == 6 && isSYNPkt(packet.Raw) &&
			len(packet.Raw) >= 20 && isPublicIPv4(packet.Raw[12:16]) {
			// İnbound SYN-ACK: oyun sunucusu el sıkışmaya cevap verdi mi?
			key := flowKey(ipStr4(packet.Raw, 12), info.SrcPort, ipStr4(packet.Raw, 16), info.DstPort)
			if _, seen := synSeen[key]; seen && !synAcked[key] {
				synAcked[key] = true
				delete(synSeen, key)
				fmt.Fprintf(os.Stderr, "[go-engine] el sıkışma OK: %s:%d cevap verdi\n",
					ipStr4(packet.Raw, 12), info.SrcPort)
			}
		} else if !packet.IsOutbound() && info.Proto == 6 && isTCPRSTFlag(packet.Raw) &&
			len(packet.Raw) >= 20 && isPublicIPv4(packet.Raw[12:16]) {
			key := flowKey(ipStr4(packet.Raw, 12), info.SrcPort, ipStr4(packet.Raw, 16), info.DstPort)
			if _, seen := synSeen[key]; seen {
				delete(synSeen, key)
				fmt.Fprintf(os.Stderr, "[go-engine] RST geldi: %s:%d (bağlantı koptu)\n",
					ipStr4(packet.Raw, 12), info.SrcPort)
			}
		}

		if packet.IsOutbound() {
			// Superonline profili: SYN paketlerinde TCP Window=16 (Min).
			// DPI'ın reassembly buffer'ını doldurur; sunucu minik parçalarda
			// gönderir. ClientHello olmadığı için strateji akışını etkilemez.
			if wm := windowMinTransform(packet.Raw); wm != nil {
				winMinCount++
				packet.Raw = wm
			}

			handled, _ := eng.HandleOutbound(info, packet.Raw, packet.Addr, func(raw, addr []byte) error {
				return wd.Send(&VpnPacket{Raw: raw, Addr: addr})
			})
			if handled {
				continue
			}
		} else {
			eng.ObserveInbound(info, packet.Raw)
		}

		if err := wd.Send(packet); err != nil {
			sendErr++
			fmt.Fprintf(os.Stderr, "[go-engine] Send hatası: %v\n", err)
		} else {
			sendOk++
		}

		if recvCount%200 == 0 {
			fmt.Fprintf(os.Stderr, "[go-engine] sayaç: recv=%d out=%d winmin=%d fake=%d send_ok=%d send_err=%d len=%d\n",
				recvCount, outCount, winMinCount, fakeSynCount, sendOk, sendErr, len(packet.Raw))
		}
	}
}

// parsePacketInfo, ham paketten selector'ın ihtiyaç duyduğu özeti çıkarır.
// IPv6/UDP passthrough'tur; yalnız IPv4/TCP işlenir.
func parsePacketInfo(raw []byte) engine.PacketInfo {
	info := engine.PacketInfo{}
	if len(raw) < 20 {
		return info
	}
	info.Ver = int(raw[0] >> 4)
	info.Proto = int(raw[9])

	if info.Ver != 4 || info.Proto != 6 {
		return info
	}
	ipHdrLen := int(raw[0]&0x0F) * 4
	if ipHdrLen < 20 || len(raw) < ipHdrLen+4 {
		return info
	}
	info.SrcPort = int(binaryBigEndian16(raw[ipHdrLen : ipHdrLen+2]))
	info.DstPort = int(binaryBigEndian16(raw[ipHdrLen+2 : ipHdrLen+4]))
	return info
}

func binaryBigEndian16(b []byte) uint16 {
	return uint16(b[0])<<8 | uint16(b[1])
}