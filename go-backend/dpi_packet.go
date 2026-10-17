// dpi_packet.go — Ham IPv4/TCP/UDP paket ayrıştırma ve checksum yardımcıları.
// Tüm teknikler bu dosyadaki fonksiyonları kullanır.
package main

import (
	"encoding/binary"
	"fmt"
)

// PacketInfo, bir IP paketinin temel alanlarını tutar.
type PacketInfo struct {
	Version uint8  // 4 veya 6
	Proto   uint8  // 6=TCP, 17=UDP
	SrcIP   []byte // 4 veya 16 bayt
	DstIP   []byte // 4 veya 16 bayt
	SrcPort uint16
	DstPort uint16
	IHL     int // IP header length (bayt)
	THL     int // TCP header length (bayt, sadece TCP)
	Payload []byte
}

// ParsePacketInfo, ham IPv4 veya IPv6 paketinden temel bilgileri çıkarır.
func ParsePacketInfo(raw []byte) PacketInfo {
	if len(raw) < 20 {
		return PacketInfo{}
	}
	ver := raw[0] >> 4
	if ver == 4 {
		ihl := int(raw[0]&0x0F) * 4
		if ihl < 20 || len(raw) < ihl+4 {
			return PacketInfo{}
		}
		proto := raw[9]
		info := PacketInfo{
			Version: 4,
			Proto:   proto,
			SrcIP:   raw[12:16],
			DstIP:   raw[16:20],
			IHL:     ihl,
		}
		info.SrcPort = binary.BigEndian.Uint16(raw[ihl : ihl+2])
		info.DstPort = binary.BigEndian.Uint16(raw[ihl+2 : ihl+4])

		if proto == 6 && len(raw) >= ihl+13 {
			thl := int(raw[ihl+12]>>4) * 4
			if thl >= 20 && len(raw) >= ihl+thl {
				info.THL = thl
				info.Payload = raw[ihl+thl:]
			}
		} else if proto == 17 && len(raw) >= ihl+8 {
			info.Payload = raw[ihl+8:]
		}
		return info
	} else if ver == 6 {
		if len(raw) < 40 {
			return PacketInfo{}
		}
		proto := raw[6] // NextHeader
		info := PacketInfo{
			Version: 6,
			Proto:   proto,
			SrcIP:   raw[8:24],
			DstIP:   raw[24:40],
			IHL:     40,
		}
		if proto == 6 && len(raw) >= 40+13 {
			info.SrcPort = binary.BigEndian.Uint16(raw[40:42])
			info.DstPort = binary.BigEndian.Uint16(raw[42:44])
			thl := int(raw[40+12]>>4) * 4
			if thl >= 20 && len(raw) >= 40+thl {
				info.THL = thl
				info.Payload = raw[40+thl:]
			}
		} else if proto == 17 && len(raw) >= 40+8 {
			info.SrcPort = binary.BigEndian.Uint16(raw[40:42])
			info.DstPort = binary.BigEndian.Uint16(raw[42:44])
			info.Payload = raw[40+8:]
		}
		return info
	}
	return PacketInfo{}
}

// TCPFlags, TCP flags baytını döner.
func TCPFlags(raw []byte, ihl int) byte {
	if len(raw) < ihl+14 {
		return 0
	}
	return raw[ihl+13]
}

// IsSYN, paketin SYN bayraklı olup olmadığını kontrol eder (ACK yok).
func IsSYN(raw []byte, ihl int) bool {
	f := TCPFlags(raw, ihl)
	return f&0x02 != 0 && f&0x10 == 0
}

// IsACK döner.
func IsACK(raw []byte, ihl int) bool {
	return TCPFlags(raw, ihl)&0x10 != 0
}

// TCPSeq, TCP seq numarasını döner.
func TCPSeq(raw []byte, ihl int) uint32 {
	if len(raw) < ihl+8 {
		return 0
	}
	return binary.BigEndian.Uint32(raw[ihl+4 : ihl+8])
}

// checksum16, RFC 1071 internet checksum (ones-complement sum).
func checksum16(data []byte) uint16 {
	var sum uint32
	for i := 0; i+1 < len(data); i += 2 {
		sum += uint32(binary.BigEndian.Uint16(data[i : i+2]))
	}
	if len(data)%2 == 1 {
		sum += uint32(data[len(data)-1]) << 8
	}
	for sum>>16 != 0 {
		sum = (sum & 0xffff) + (sum >> 16)
	}
	return ^uint16(sum)
}

// RecalcIPChecksum, IP header checksum'unu yerinde yeniden hesaplar (IPv4 için; IPv6'da IP checksum yoktur).
func RecalcIPChecksum(raw []byte) {
	if len(raw) < 20 || raw[0]>>4 != 4 {
		return
	}
	ihl := int(raw[0]&0x0F) * 4
	raw[10] = 0
	raw[11] = 0
	cs := checksum16(raw[:ihl])
	binary.BigEndian.PutUint16(raw[10:12], cs)
}

// RecalcTCPChecksum, pseudo-header dahil TCP checksum'unu yerinde yeniden hesaplar.
func RecalcTCPChecksum(raw []byte) {
	if len(raw) < 20 {
		return
	}
	ver := raw[0] >> 4
	ihl := int(raw[0]&0x0F) * 4
	if ver == 6 {
		ihl = 40
	}
	if len(raw) < ihl+20 {
		return
	}
	tcpLen := len(raw) - ihl
	raw[ihl+16] = 0
	raw[ihl+17] = 0

	var buf []byte
	if ver == 4 {
		buf = make([]byte, 12+tcpLen)
		copy(buf[0:4], raw[12:16])
		copy(buf[4:8], raw[16:20])
		buf[8] = 0
		buf[9] = 6
		binary.BigEndian.PutUint16(buf[10:12], uint16(tcpLen))
		copy(buf[12:], raw[ihl:])
	} else if ver == 6 {
		buf = make([]byte, 40+tcpLen)
		copy(buf[0:16], raw[8:24])
		copy(buf[16:32], raw[24:40])
		binary.BigEndian.PutUint32(buf[32:36], uint32(tcpLen))
		buf[36] = 0
		buf[37] = 0
		buf[38] = 0
		buf[39] = 6
		copy(buf[40:], raw[ihl:])
	}
	cs := checksum16(buf)
	binary.BigEndian.PutUint16(raw[ihl+16:ihl+18], cs)
}

// ClonePacket, ham paketi kopyalar.
func ClonePacket(raw []byte) []byte {
	cp := make([]byte, len(raw))
	copy(cp, raw)
	return cp
}

// CloneAddr, WinDivert adres bloğunu kopyalar.
func CloneAddr(addr []byte) []byte {
	cp := make([]byte, len(addr))
	copy(cp, addr)
	return cp
}

// SetIPTotalLen, IP total length alanını günceller.
func SetIPTotalLen(raw []byte, total int) {
	if len(raw) < 6 {
		return
	}
	if raw[0]>>4 == 4 {
		binary.BigEndian.PutUint16(raw[2:4], uint16(total))
	} else if raw[0]>>4 == 6 {
		binary.BigEndian.PutUint16(raw[4:6], uint16(total-40))
	}
}

// SetTCPSeq, TCP seq numarasını günceller.
func SetTCPSeq(raw []byte, ihl int, seq uint32) {
	binary.BigEndian.PutUint32(raw[ihl+4:ihl+8], seq)
}

// SetTCPWindow, TCP window alanını günceller.
func SetTCPWindow(raw []byte, ihl int, window uint16) {
	binary.BigEndian.PutUint16(raw[ihl+14:ihl+16], window)
}

// SetIPTTL, IP TTL alanını günceller.
func SetIPTTL(raw []byte, ttl uint8) {
	raw[8] = ttl
}

// SetTCPURG, TCP URG bayrağını ve pointer'ını günceller.
func SetTCPURG(raw []byte, ihl int, urgPtr uint16) {
	raw[ihl+13] |= 0x20 // URG flag
	binary.BigEndian.PutUint16(raw[ihl+18:ihl+20], urgPtr)
}

// BuildTCPSegment, orijinal paketin TCP payload'ının bir bölümünden
// yeni bir TCP segmenti oluşturur (IP + TCP header + subPayload).
// seq: bu segmentin TCP seq numarası.
func BuildTCPSegment(raw []byte, ihl, thl int, subPayload []byte, seq uint32) ([]byte, error) {
	if len(raw) < ihl+thl {
		return nil, fmt.Errorf("raw too short")
	}
	hdrLen := ihl + thl
	newLen := hdrLen + len(subPayload)
	seg := make([]byte, newLen)
	// IP + TCP header kopyala
	copy(seg[:hdrLen], raw[:hdrLen])
	// Payload ekle
	copy(seg[hdrLen:], subPayload)
	// IP total length güncelle
	SetIPTotalLen(seg, newLen)
	// TCP seq güncelle
	SetTCPSeq(seg, ihl, seq)
	// Checksumları yeniden hesapla
	RecalcIPChecksum(seg)
	RecalcTCPChecksum(seg)
	return seg, nil
}

// MSSClamp, Roblox edge ağına (128.116.0.0/16) giden TCP SYN paketlerinin MSS değerini 512'ye sabitler.
// Böylece el sıkışma sonrası akış minik paketlerle akar ve DPI el sıkışma sonrası engelleme yapamaz.
func MSSClamp(raw []byte) []byte {
	if len(raw) < 40 || raw[0]>>4 != 4 || raw[9] != 6 {
		return nil
	}
	ihl := int(raw[0]&0x0F) * 4
	if ihl < 20 || len(raw) < ihl+24 {
		return nil
	}
	// Hedef IP 128.116.0.0/16 mı?
	if raw[16] != 128 || raw[17] != 116 {
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
		case 0:
			p = ihl + thl
		case 1:
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
	RecalcTCPChecksum(buf)
	return buf
}
