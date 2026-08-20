// packet_util.go — parçalama stratejilerinin kullandığı ortak IP/TCP
// checksum ve fragman yardımcıları. Orijinal go_main.go'dan taşındı.
package main

import (
	"encoding/binary"
	"math/rand"
	"strconv"
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