// packet_util.go — parçalama stratejilerinin kullandığı ortak IP/TCP
// checksum ve fragman yardımcıları. Orijinal go_main.go'dan taşındı.
package main

import (
	"encoding/binary"
	"math/rand"
	"strconv"
	"time"

	"knots-go-backend/engine"
)

// chooseSplitPoint, SNI extension'ının BAŞLANGICINDAN ÖNCE sabitlenen bölünme
// noktası seçer (-6..+2 bayt). Amaç: hiçbir parçada SNI hostname'i tam olarak
// görünmesin; parça1 TLS başlığı+ClientHello öncesini, parça2 SNI'yi içerir.
func chooseSplitPoint(payload []byte) int {
	length := len(payload)
	sniOffset := findApproxSNIOffset(payload)

	var point int
	if sniOffset > 30 && sniOffset < length-30 {
		point = sniOffset - 6 + rand.Intn(8)
	} else {
		point = length / 3
	}

	if point < 16 {
		point = 16
	}
	if point > length-16 {
		point = length - 16
	}
	return point
}

// sendFragments — ClientHello'yu splitAt noktasından iki parçaya böler ve
// gönderir: ilk parça ACK-only, son parça PSH+ACK. delay > 0 ise parçalar
// arasında beklenir (DPI reassembly pencere aşımı); global GoodbyeDPI tarzı
// modlarda delay=0 verilir (parçalar arka arkaya gider, SNI hiçbir segmentte
// tam görünmez). Checksum'lar buildTCPFragment içinde yeniden hesaplanır.
func sendFragments(raw, addr []byte, ipHdrLen, tcpHdrLen int, payload []byte, splitAt int, seqNum uint32, delay time.Duration, send engine.SendFunc) {
	if splitAt < 16 || splitAt > len(payload)-16 {
		splitAt = len(payload) / 2
	}
	part1 := payload[:splitAt]
	part2 := payload[splitAt:]

	frag1 := buildTCPFragment(raw, ipHdrLen, tcpHdrLen, part1, seqNum, false)
	seq2 := seqNum + uint32(len(part1))
	frag2 := buildTCPFragment(raw, ipHdrLen, tcpHdrLen, part2, seq2, true)

	sendRawStrat(frag1, addr, send)
	if delay > 0 {
		time.Sleep(delay)
	}
	sendRawStrat(frag2, addr, send)
}

func checksum16(data []byte) uint16 {
	var sum uint32
	for i := 0; i+1 < len(data); i += 2 {
		sum += uint32(data[i])<<8 | uint32(data[i+1])
	}
	if len(data)%2 == 1 {
		sum += uint32(data[len(data)-1]) << 8
	}
	for sum>>16 != 0 {
		sum = (sum & 0xFFFF) + (sum >> 16)
	}
	return ^uint16(sum)
}

func tcpChecksumWithPseudoHeader(srcIP, dstIP []byte, tcpSegment []byte) uint16 {
	srcIP4 := srcIP
	dstIP4 := dstIP
	buf := make([]byte, 12+len(tcpSegment))
	copy(buf[0:4], srcIP4)
	copy(buf[4:8], dstIP4)
	buf[8], buf[9] = 0, 6
	binary.BigEndian.PutUint16(buf[10:12], uint16(len(tcpSegment)))
	copy(buf[12:], tcpSegment)
	return checksum16(buf)
}

// buildTCPFragment — IP/TCP başlığını orijinalden kopyalayıp payload'u
// seqNum ile yerleştirir; psh=true ise TCP PSH+ACK, değilse ACK-only.
// IP/TCP checksum'ları yeniden hesaplanır. Tüm stratejiler ortak kullanır.
func buildTCPFragment(original []byte, ipHdrLen, tcpHdrLen int, payload []byte, seqNum uint32, psh bool) []byte {
	totalLen := ipHdrLen + tcpHdrLen + len(payload)
	buf := make([]byte, totalLen)
	copy(buf, original[:ipHdrLen+tcpHdrLen])
	copy(buf[ipHdrLen+tcpHdrLen:], payload)

	binary.BigEndian.PutUint16(buf[2:4], uint16(totalLen)) // IP Total Length
	if psh {
		buf[ipHdrLen+13] = 0x18 // TCP PSH+ACK (son parça)
	} else {
		buf[ipHdrLen+13] = 0x10 // TCP ACK yalnız (ara parça)
	}
	binary.BigEndian.PutUint32(buf[ipHdrLen+4:ipHdrLen+8], seqNum)

	buf[10], buf[11] = 0, 0
	binary.BigEndian.PutUint16(buf[10:12], checksum16(buf[:ipHdrLen]))

	buf[ipHdrLen+16], buf[ipHdrLen+17] = 0, 0
	cs := tcpChecksumWithPseudoHeader(buf[12:16], buf[16:20], buf[ipHdrLen:])
	binary.BigEndian.PutUint16(buf[ipHdrLen+16:ipHdrLen+18], cs)

	return buf
}

// tcpPayload — IPv4+TCP paketinden IHL, TCP header uzunluğu ve payload'ı ayıklar.
// Geçersizse ok=false döner.
func tcpPayload(raw []byte) (ipHdrLen, tcpHdrLen int, payload []byte, ok bool) {
	if len(raw) < 20 || raw[0]>>4 != 4 || raw[9] != 6 {
		return 0, 0, nil, false
	}
	ihl := int(raw[0]&0x0F) * 4
	if ihl < 20 || len(raw) < ihl+8 {
		return 0, 0, nil, false
	}
	thl := int((raw[ihl+12]>>4)&0x0F) * 4
	if thl < 20 || len(raw) < ihl+thl {
		return 0, 0, nil, false
	}
	return ihl, thl, raw[ihl+thl:], true
}

// windowMinTransform — SYN paketinin TCP Window'unu 16'ya çeker.
// Amaç: sunucu tüm veriyi minik parçalarda gönderir; DPI'ın reassembly
// buffer'ı dolar ve takibi bırakır (GoodbyeDPI -w felsefesi).
// Geçersiz/SYN olmayan paket için nil döner (UDP dahil — proto guard var).
func windowMinTransform(raw []byte) []byte {
	ihl, thl, payload, ok := tcpPayload(raw)
	if !ok || len(payload) > 0 {
		return nil
	}
	if raw[ihl+13]&0x02 == 0 { // SYN bayrağı yok
		return nil
	}
	buf := make([]byte, len(raw))
	copy(buf, raw)

	binary.BigEndian.PutUint16(buf[ihl+14:ihl+16], 16) // Window = 16

	buf[10], buf[11] = 0, 0
	binary.BigEndian.PutUint16(buf[10:12], checksum16(buf[:ihl]))

	buf[ihl+16], buf[ihl+17] = 0, 0
	cs := tcpChecksumWithPseudoHeader(buf[12:16], buf[16:20], buf[ihl:])
	binary.BigEndian.PutUint16(buf[ihl+16:ihl+18], cs)

	_ = thl
	return buf
}

// mssClampTransform — SYN/SYN-ACK'in TCP MSS seçeneğini 512'ye sabitler.
// Hedef: Roblox oyun edge'i (128.116.0.0/16) ile kurulan TLS oturumlarının
// TÜM segmentleri ≤512B olsun; DPI'ın el sıkışma SONRASI akışı kesen
// büyük-segment/desen kuralı tetiklenmesin. Giden SYN'de sunucunun segment
// boyutunu, gelen SYN-ACK'te kendi segment boyutumuzu kısar (iki yön de
// minik parça). MSS seçeneği yoksa / hedef oyun ağı değilse nil döner.
// İpucu: windowMinTransform sonrası çalışırsa MSS korunur (o, buffer'ın
// kopyasını alır).
func mssClampTransform(raw []byte, outbound bool) []byte {
	if len(raw) < 40 || raw[0]>>4 != 4 || raw[9] != 6 {
		return nil
	}
	ihl := int(raw[0]&0x0F) * 4
	if ihl < 20 || len(raw) < ihl+24 {
		return nil
	}
	// Uzak (Roblox) taraf: giden→dst, gelen→src; 128.116.0.0/16 mı?
	off := 16
	if !outbound {
		off = 12
	}
	if raw[off] != 128 || raw[off+1] != 116 {
		return nil
	}
	if raw[ihl+13]&0x02 == 0 { // SYN yok
		return nil
	}
	thl := int(raw[ihl+12]>>4) * 4
	if thl < 20 || len(raw) < ihl+thl {
		return nil
	}
	found := false
	for p := ihl + 20; p < ihl+thl; {
		kind := raw[p]
		switch kind {
		case 0: // EOL
			p = ihl + thl
		case 1: // NOP
			p++
		default:
			if p+1 >= ihl+thl || int(raw[p+1]) < 2 {
				p = ihl + thl
				continue
			}
			ln := int(raw[p+1])
			if p+ln > ihl+thl {
				p = ihl + thl
				continue
			}
			if kind == 2 && ln == 4 {
				found = true
			}
			p += ln
		}
	}
	if !found {
		return nil
	}
	buf := make([]byte, len(raw))
	copy(buf, raw)
	for p := ihl + 20; p+4 <= ihl+thl; {
		kind := buf[p]
		if kind == 0 {
			break
		}
		ln := int(buf[p+1])
		if kind == 1 {
			p++
			continue
		}
		if ln < 2 || p+ln > ihl+thl {
			break
		}
		if kind == 2 && ln == 4 {
			buf[p+2] = 0x02 // MSS = 512 (0x0200)
			buf[p+3] = 0x00
			p += ln
			continue
		}
		p += ln
	}
	// TCP checksum'ı yeniden hesapla (IP başlığı değişmedi).
	buf[ihl+16], buf[ihl+17] = 0, 0
	cs := tcpChecksumWithPseudoHeader(buf[12:16], buf[16:20], buf[ihl:])
	binary.BigEndian.PutUint16(buf[ihl+16:ihl+18], cs)
	return buf
}

// isSYNPkt — IPv4 TC paketi SYN bayrağı taşıyor mu? (SYN-ACK dahil değil:
// yalnız SYN set; uzunluk ve TCP başlık varlığı kontrol edilir.)
func isSYNPkt(raw []byte) bool {
	if len(raw) < 20 || raw[0]>>4 != 4 || raw[9] != 6 {
		return false
	}
	ihl := int(raw[0]&0x0F) * 4
	if ihl < 20 || len(raw) < ihl+14 {
		return false
	}
	return raw[ihl+13]&0x02 != 0 && raw[ihl+13]&0x10 == 0 // SYN var, ACK yok
}

// isTCPRSTFlag — IPv4 TCP paketi RST taşıyor mu?
func isTCPRSTFlag(raw []byte) bool {
	if len(raw) < 20 || raw[0]>>4 != 4 || raw[9] != 6 {
		return false
	}
	ihl := int(raw[0]&0x0F) * 4
	if ihl < 20 || len(raw) < ihl+14 {
		return false
	}
	return raw[ihl+13]&0x04 != 0
}

// ipStr4 — 4 baytlık IPv4 adresini "a.b.c.d" biçiminde dizeye çevirir.
func ipStr4(ip []byte, off int) string {
	if len(ip) < off+4 {
		return "?"
	}
	return strconv.Itoa(int(ip[off])) + "." + strconv.Itoa(int(ip[off+1])) + "." +
		strconv.Itoa(int(ip[off+2])) + "." + strconv.Itoa(int(ip[off+3]))
}