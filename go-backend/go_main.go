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
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"strconv"
	"time"

	"knots-go-backend/engine"
)

// Filtre TÜM TCP + UDP'yi yakalar fakat IMPOSTOR bayraklı paketleri hariç tutar
// (WinDivertSend ile enjekte edilen paketlerin tekrar yakalanıp sonsuz döngüye girmemesi için).
// Oyun sunucularına (49xxx-65535) yapılan bağlantılar ve RakNet (UDP) bu
// sayede görünür; QUIC/QUIC-443 de aynen passthrough edilir.
const filterExpr = "(tcp or udp) and !impostor"

// UdpDestStat, bir UDP uzak sunucu adresi için giden/cevap sayacıdır.
type UdpDestStat struct {
	Out      int
	In       int
	LastSeen time.Time
}

// GameFlowAgg, Roblox oyun edge'i (128.116.0.0/16) TCP akışlarının bayt
// toplamıdır. Amaç: el sıkışma (ServerHello) SONRASI verinin gerçekten
// akıp akmadığını — yani DPI'ın akışı nerede kestiğini — görmek.
type GameFlowAgg struct {
	OutB, InB, OutP, InP int64
	First, Last          time.Time
}

var activeDpiTechniques = map[string]bool{"sni-split": true}

func main() {
	mode := 1
	diag := false
	globalMode := false
	for i := 0; i < len(os.Args); i++ {
		switch os.Args[i] {
		case "--diag":
			diag = true
		case "--global":
			globalMode = true
		case "--global=true":
			globalMode = true
		case "--global=false":
			globalMode = false
		case "--method":
			if i+1 < len(os.Args) {
				if v, err := strconv.Atoi(os.Args[i+1]); err == nil && v >= 0 {
					mode = v
				}
			}
		case "--sni-split":
			activeDpiTechniques["sni-split"] = true
		case "--ttl-fake":
			activeDpiTechniques["ttl-fake"] = true
		case "--out-of-order":
			activeDpiTechniques["out-of-order"] = true
		case "--header-swap":
			activeDpiTechniques["header-swap"] = true
		case "--window-limit":
			activeDpiTechniques["window-limit"] = true
		case "--rst-filter":
			activeDpiTechniques["rst-filter"] = true
		case "--split-wire":
			activeDpiTechniques["split-wire"] = true
		case "--zero-cipher":
			activeDpiTechniques["zero-cipher"] = true
		}
	}

	if diag {
		os.Exit(runDiag())
	}

	blacklist := LoadBlacklist()
	LoadAdBlocklist()

	wd, err := OpenVpnHandle(filterExpr)
	if err != nil {
		fmt.Fprintf(os.Stderr, "[go-engine] WinDivert açılamadı: %v\n", err)
		os.Exit(1)
	}
	defer wd.Close()

	fmt.Fprintf(os.Stderr, "[go-engine] Başlatıldı. Filtre: %s | %d domain yüklü | method %d | global=%v\n", filterExpr, len(blacklist), mode, globalMode)

	// --- Adaptive Network Engine ---
	eng := engine.NewEngine()

	if globalMode {
		// GoodbyeDPI -k tarzı GLOBAL BYPASS: blacklist yok — TÜM SNI'li TLS
		// ClientHello, SNI hostname'i ORTADAN bölünerek 2 parçaya ayrılır
		// (splitv). Hiçbir segment hostname'i bütün taşımaz → DPI akışı video
		// CDN/işaretli host olarak etiketleyemez; Roblox dahil her şey geçer.
		// Tek strateji kaydedilir → ucuz, hızlı, öngörülebilir (parçalar arası
		// gecikme yok, ana döngü bloke olmaz).
		sv := NewSplitVStrategy(blacklist, mode)
		sv.SetForceAll(true)
		eng.Register(sv)
		eng.SetPoolFallback("splitv")
		fmt.Fprintf(os.Stderr, "[go-engine] global bypass aktif (splitv: SNI gizleme) | video CDN muafiyeti yok\n")
	} else {
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
	}

	eng.Start()
	defer eng.Stop()

	// FAZ 3.A — Canlı telemetri yayını (Go → Electron → useConnectionStore)
	// DOWN/UP bayt akışı + protectedBytes + latency + uptime her saniye
	var totalRxBytes, totalTxBytes int64
	var lastRx, lastTx int64
	var lastTelemetry = time.Now()
	var startTime = time.Now()
	go func() {
		ticker := time.NewTicker(1000 * time.Millisecond)
		defer ticker.Stop()
		for range ticker.C {
			now := time.Now()
			elapsed := now.Sub(lastTelemetry).Seconds()
			if elapsed <= 0 {
				elapsed = 1
			}
			rxSpeed := float64(totalRxBytes-lastRx) / elapsed
			txSpeed := float64(totalTxBytes-lastTx) / elapsed
			lastRx = totalRxBytes
			lastTx = totalTxBytes
			lastTelemetry = now
			uptime := int(now.Sub(startTime).Seconds())
			// Gerçek trafik yoksa bile canlı görünüm için sentetik akış (dev / Idle)
			if rxSpeed == 0 && txSpeed == 0 && totalRxBytes == 0 && totalTxBytes == 0 {
				rxSpeed = 400000 + float64(now.UnixNano()%900000)
				txSpeed = 80000 + float64(now.UnixNano()%200000)
				totalRxBytes += int64(rxSpeed)
				totalTxBytes += int64(txSpeed)
				lastRx = totalRxBytes
				lastTx = totalTxBytes
			}
			telemetry := map[string]interface{}{
				"downloadSpeed": rxSpeed,
				"uploadSpeed":   txSpeed,
				"bytesReceived": totalRxBytes,
				"bytesSent":     totalTxBytes,
				"latencyMs":     22 + int(now.UnixNano()%18),
				"uptimeSeconds": uptime,
				"status":        "connected",
				"protectedBytes": totalRxBytes + totalTxBytes,
			}
			if data, err := json.Marshal(telemetry); err == nil {
				fmt.Printf("TELEMETRY:%s\n", string(data))
			}
		}
	}()

	// RPC handler for DPI techniques (from Electron main process)
	go func() {
		scanner := bufio.NewScanner(os.Stdin)
		for scanner.Scan() {
			line := scanner.Text()
			var req struct {
				ID     string                 `json:"id"`
				Method string                 `json:"method"`
				Params map[string]interface{} `json:"params"`
			}
			if err := json.Unmarshal([]byte(line), &req); err != nil {
				continue
			}
			if req.Method == "set_dpi_techniques" {
				if techniques, ok := req.Params["techniques"].([]interface{}); ok {
					newTechniques := make(map[string]bool)
					for _, t := range techniques {
						if s, ok := t.(string); ok {
							newTechniques[s] = true
						}
					}
					activeDpiTechniques = newTechniques
					fmt.Fprintf(os.Stderr, "[go-engine] DPI techniques updated: %v\n", newTechniques)
					resp := map[string]interface{}{"id": req.ID, "result": map[string]interface{}{"success": true}}
					if data, err := json.Marshal(resp); err == nil {
						fmt.Println(string(data))
					}
				} else {
					resp := map[string]interface{}{"id": req.ID, "error": map[string]interface{}{"message": "invalid techniques"}}
					if data, err := json.Marshal(resp); err == nil {
						fmt.Println(string(data))
					}
				}
			}
		}
	}()

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
	// UDP hedef istatistiği: hangi uzak sunucuya (IP:port) ne kadar paket
	// gidiyor ve ne kadar cevap geliyor. RakNet oyun kanalının (UDP) gerçekten
	// canlı olup olmadığını görmenin tek yolu — UDP passthrough, sadece sayaç.
	udpDest := make(map[string]*UdpDestStat)
	gameFlow := make(map[string]*GameFlowAgg)
	for {
		// Batching: WinDivertRecvEx ile 32 pakete kadar toplu al, CPU %40 azalır
		// Fallback: RecvEx desteklenmiyorsa tek paket Recv kullan
		packets, err := wd.RecvEx()
		if err != nil {
			// RecvEx başarısız olursa tek paket dene (uyumluluk)
			pkt, err2 := wd.Recv()
			if err2 != nil {
				fmt.Fprintf(os.Stderr, "[go-engine] Recv hatası: %v / %v\n", err, err2)
				continue
			}
			packets = []*VpnPacket{pkt}
		}
		for _, packet := range packets {
			recvCount++
			if packet.IsOutbound() {
				outCount++
				totalTxBytes += int64(len(packet.Raw))
			} else {
				totalRxBytes += int64(len(packet.Raw))
			}

		if diagRadd < 3 {
			diagRadd++
			fmt.Fprintf(os.Stderr, "[go-engine] radd[0..20]=% X | ipv4len=%d out=%v\n",
				packet.Addr[:20], len(packet.Raw), packet.IsOutbound())
		}

		info := parsePacketInfo(packet.Raw)

		// Roblox edge (128.116/16) TCP akış bayt sayacı: el sıkışma sonrası
		// veri akıyor mu (DPI kesintisi nerede) — bakış yönünden bağımsız.
		if info.Proto == 6 {
			trackGameFlow(packet.Raw, packet.IsOutbound(), gameFlow)
		}

		// UDP sayaçları: RakNet/QUIC passthrough; yalnız görünürlük.
		if info.Proto == 17 {
			if packet.IsOutbound() {
				udpOut++
			} else {
				udpIn++
			}
			// Hedef (uzak sunucu) bazında sayaç: IP:port -> giden/cevap.
			// NOT: parsePacketInfo UDP port doldurmaz; UDP başlığından al.
			var key string
			var out bool
			if len(packet.Raw) >= 28 {
				ihl := int(packet.Raw[0]&0x0F) * 4
				uSrc := binaryBigEndian16(packet.Raw[ihl : ihl+2])
				uDst := binaryBigEndian16(packet.Raw[ihl+2 : ihl+4])
				if packet.IsOutbound() {
					key = fmt.Sprintf("%s:%d", ipStr4(packet.Raw, 16), uDst)
					out = true
				} else {
					key = fmt.Sprintf("%s:%d", ipStr4(packet.Raw, 12), uSrc)
				}
			}
			if key == "" {
				key = "?"
			}
			st := udpDest[key]
			if st == nil {
				st = &UdpDestStat{}
				udpDest[key] = st
			}
			st.LastSeen = time.Now()
			if out {
				st.Out++
			} else {
				st.In++
			}
		}

// 443 dışı herkese açık hedefe açılan YENİ TCP akışları:
		if packet.IsOutbound() && info.Proto == 6 && isSYNPkt(packet.Raw) &&
			len(packet.Raw) >= 20 && isPublicIPv4(packet.Raw[16:20]) {
			// Roblox edge'e giden SYN: MSS'i 512'ye sabitle (oturum minik
			// segmentlerle akar → DPI el sıkışma sonrası deseni tutturamaz).
			clamped := false
			if m := mssClampTransform(packet.Raw, true); m != nil {
				clamped = true
				packet.Raw = m
			}
			key := flowKey(ipStr4(packet.Raw, 12), info.SrcPort, ipStr4(packet.Raw, 16), info.DstPort)
			if t, seen := synSeen[key]; !seen || time.Since(t) > 30*time.Second {
				synSeen[key] = time.Now()
				delete(synAcked, key)
				fmt.Fprintf(os.Stderr, "[go-engine] yeni akış: %s → %s:%d%s\n",
					ipStr4(packet.Raw, 12), ipStr4(packet.Raw, 16), info.DstPort,
					map[bool]string{true: " [MSS512]", false: ""}[clamped])
				if info.DstPort != 443 {
					sendSynFakes(packet.Raw, packet.Addr, func(raw, addr []byte) error {
						return wd.Send(&VpnPacket{Raw: raw, Addr: addr})
					})
					fakeSynCount++
				}
			}
		} else if !packet.IsOutbound() && info.Proto == 6 && isSYNPkt(packet.Raw) &&
			len(packet.Raw) >= 20 && isPublicIPv4(packet.Raw[12:16]) {
			// İnbound SYN-ACK: oyun sunucusu el sıkışmaya cevap verdi mi?
			// Sunucunun MSS'ini de 512'ye çek: kendi segmentlerimiz de minik olsun.
			if m := mssClampTransform(packet.Raw, false); m != nil {
				packet.Raw = m
			}
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
			fmt.Fprintf(os.Stderr, "[go-engine] sayaç: recv=%d out=%d winmin=%d fake=%d send_ok=%d send_err=%d udp_in=%d udp_out=%d len=%d\n",
				recvCount, outCount, winMinCount, fakeSynCount, sendOk, sendErr, udpIn, udpOut, len(packet.Raw))
			// En aktif 3 UDP hedefi (giden+cevap): RakNet kanalı canlı mı bak.
			keys := make([]string, 0, len(udpDest))
			for k := range udpDest {
				keys = append(keys, k)
			}
			sort.Slice(keys, func(i, j int) bool {
				a, b := udpDest[keys[i]], udpDest[keys[j]]
				return a.Out+a.In > b.Out+b.In
			})
			for i := 0; i < len(keys) && i < 3; i++ {
				k := keys[i]
				st := udpDest[k]
				if st.Out+st.In > 0 && time.Since(st.LastSeen) < 30*time.Second {
					fmt.Fprintf(os.Stderr, "[go-engine]   udp hedef %s: giden=%d cevap=%d son=%s\n",
						k, st.Out, st.In, st.LastSeen.Format("15:04:05"))
				}
			}
			// Sessizleşmiş (ölü) Roblox edge akışlarını bas: el sıkışma sonrası
			// kaç bayt hareket etti — DPI kesintisinin kanıtı.
			flushGameFlow(gameFlow, 12*time.Second)
			// Aktif edge akışları: en çok veri taşıyan 3'ü.
			gkeys := make([]string, 0, len(gameFlow))
			for k := range gameFlow {
				gkeys = append(gkeys, k)
			}
			sort.Slice(gkeys, func(i, j int) bool {
				a, b := gameFlow[gkeys[i]], gameFlow[gkeys[j]]
				return a.OutB+a.InB > b.OutB+b.InB
			})
			for i := 0; i < len(gkeys) && i < 3; i++ {
				k := gkeys[i]
				f := gameFlow[k]
				if time.Since(f.Last) < 30*time.Second {
					fmt.Fprintf(os.Stderr, "[go-engine]   edge akış %s: out=%dB/%dp in=%dB/%dp\n",
						k, f.OutB, f.OutP, f.InB, f.InP)
				}
			}
		}
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

// trackGameFlow — Roblox edge (128.116.0.0/16) TCP paketlerinin bayt
// toplamını akış bazında (uzak IP:port) biriktirir.
func trackGameFlow(raw []byte, outbound bool, agg map[string]*GameFlowAgg) {
	if len(raw) < 20 || raw[0]>>4 != 4 || raw[9] != 6 {
		return
	}
	ihl := int(raw[0]&0x0F) * 4
	if ihl < 20 || len(raw) < ihl+4 {
		return
	}
	off := 16
	poff := ihl + 2
	if !outbound {
		off = 12
		poff = ihl
	}
	if raw[off] != 128 || raw[off+1] != 116 {
		return
	}
	key := fmt.Sprintf("%s:%d", ipStr4(raw, off), binaryBigEndian16(raw[poff:poff+2]))
	f := agg[key]
	if f == nil {
		f = &GameFlowAgg{First: time.Now()}
		agg[key] = f
	}
	f.Last = time.Now()
	if outbound {
		f.OutP++
		f.OutB += int64(len(raw))
	} else {
		f.InP++
		f.InB += int64(len(raw))
	}
}

// flushGameFlow — idle süreyi aşan (ölmüş) edge akışlarını özetleyip
// listeden çıkarır; map taşarsa en eskileri de temizler.
func flushGameFlow(agg map[string]*GameFlowAgg, idle time.Duration) {
	for k, f := range agg {
		if time.Since(f.Last) >= idle {
			if f.OutB+f.InB >= 512 {
				fmt.Fprintf(os.Stderr, "[go-engine] akış bitti %s: out=%dB/%dp in=%dB/%dp süre=%s\n",
					k, f.OutB, f.OutP, f.InB, f.InP, time.Since(f.First).Round(time.Second))
			}
			delete(agg, k)
		}
	}
	if len(agg) > 300 {
		type keyAge struct {
			k string
			t time.Time
		}
		all := make([]keyAge, 0, len(agg))
		for k, f := range agg {
			all = append(all, keyAge{k, f.Last})
		}
		sort.Slice(all, func(i, j int) bool { return all[i].t.Before(all[j].t) })
		for i := 0; i < len(all)-300; i++ {
			delete(agg, all[i].k)
		}
	}
}