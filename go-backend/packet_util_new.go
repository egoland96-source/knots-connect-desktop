//go:build ignore

package main

import (
	"encoding/binary"
	"fmt"
	"math/rand"
	"strconv"
	"time"

	"knots-go-backend/engine"
)

func chooseSplitPoint(payload []byte) int {
	sniStart, sniLen, ok := findSniHostnameRange(payload)
	var point int
	if ok && sniLen > 4 {
		point = sniStart + rand.Intn(sniLen)
	} else if ok && sniLen > 0 {
		point = sniStart
	} else {
		point = len(payload) / 3
	}
	if point < 16 {
		point = 16
	}
	if point > len(payload)-16 {
		point = len(payload) - 16
	}
	return point
}

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

func buildTCPFragment(original []byte, ipHdrLen, tcpHdrLen int, payload []byte, seqNum uint32, psh bool) []byte {
	totalLen := ipHdrLen + tcpHdrLen + len(payload)
	buf := make([]byte, totalLen)
	copy(buf, original[:ipHdrLen+tcpHdrLen])
	copy(buf[ipHdrLen+tcpHdrLen:], payload)

	binary.BigEndian.PutUint16(buf[2:4], uint16(totalLen))
	if psh {
		buf[ipHdrLen+13] = 0x18
	} else {
		buf[ipHdrLen+13] = 0x10
	}
	binary.BigEndian.PutUint32(buf[ipHdrLen+4:ipHdrLen+8], seqNum)

	buf[10], buf[11] = 0, 0
	binary.BigEndian.PutUint16(buf[10:12], checksum16(buf[:ipHdrLen]))

	buf[ipHdrLen+16], buf[ipHdrLen+17] = 0, 0
	cs := tcpChecksumWithPseudoHeader(buf[12:16], buf[16:20], buf[ipHdrLen:])
	binary.BigEndian.PutUint16(buf[ipHdrLen+16:ipHdrLen+18], cs)

	return buf
}

func tcpPayload(raw []byte) (ipHdrLen, tcpHdrLen int, payload []byte, ok bool) {
	if len(raw) < 20 {
		return 0, 0, nil, false
	}
	ver := raw[0] >> 4
	if ver != 4 && ver != 6 {
		return 0, 0, nil, false
	}
	hdrLen, next, err := ipv6SkipExtHeaders(ver, raw, 6)
	if err != nil || hdrLen < 20 {
		return 0, 0, nil, false
	}
	if next != 6 {
		return 0, 0, nil, false
	}
	if len(raw) < hdrLen+20 {
		return 0, 0, nil, false
	}
	thl := int((raw[hdrLen+12]>>4)&0x0F) * 4
	if thl < 20 || len(raw) < hdrLen+thl {
		return 0, 0, nil, false
	}
	return hdrLen, thl, raw[hdrLen+thl:], true
}

func ipv6SkipExtHeaders(ver byte, raw []byte, wantNext byte) (hdrLen int, nextHdr byte, err error) {
	if ver == 4 {
		ihl := int(raw[0]&0x0F) * 4
		if ihl < 20 {
			return 0, 0, fmt.Errorf("ipv4 ihl too small")
		}
		return ihl, raw[9], nil
	}
	if ver != 6 {
		return 0, 0, fmt.Errorf("unknown ip version")
	}
	if len(raw) < 40 {
		return 0, 0, fmt.Errorf("ipv6 header too short")
	}
	off := 40
	next := raw[6]
	for {
		if next == wantNext {
			return off, next, nil
		}
		if next == 59 || next == 0 {
			return 0, 0, fmt.Errorf("ipv6 ext chain ended without tcp/udp")
		}
		if next != 44 && next != 50 && next != 51 && next != 60 {
			return 0, 0, fmt.Errorf("ipv6 unexpected next=%d", next)
		}
		if off+8 > len(raw) {
			return 0, 0, fmt.Errorf("ipv6 ext header truncated")
		}
		hdrExtLen := int(raw[off+1])
		if hdrExtLen == 0 {
			return 0, 0, fmt.Errorf("ipv6 ext len 0")
		}
		next = raw[off]
		off += hdrExtLen
		if off > len(raw) {
			return 0, 0, fmt.Errorf("ipv6 ext overflow")
		}
	}
}

func windowMinTransform(raw []byte) []byte {
	hl, thl, payload, ok := tcpPayload(raw)
	if !ok || len(payload) > 0 {
		return nil
	}
	if raw[hl+13]&0x02 == 0 {
		return nil
	}
	buf := make([]byte, len(raw))
	copy(buf, raw)
	binary.BigEndian.PutUint16(buf[hl+14:hl+16], 16)
	buf[10], buf[11] = 0, 0
	binary.BigEndian.PutUint16(buf[10:12], checksum16(buf[:hl]))
	buf[hl+16], buf[hl+17] = 0, 0
	cs := tcpChecksumWithPseudoHeader(buf[12:16], buf[16:20], buf[hl:])
	binary.BigEndian.PutUint16(buf[hl+16:hl+18], cs)
	return buf
}

func isSYNPkt(raw []byte) bool {
	if len(raw) < 20 || raw[0]>>4 != 4 || raw[9] != 6 {
		return false
	}
	hl := int(raw[0]&0x0F) * 4
	if hl < 20 || len(raw) < hl+14 {
		return false
	}
	return raw[hl+13]&0x02 != 0 && raw[hl+13]&0x10 == 0
}

func isTCPRSTFlag(raw []byte) bool {
	if len(raw) < 20 || raw[0]>>4 != 4 || raw[9] != 6 {
		return false
	}
	hl := int(raw[0]&0x0F) * 4
	if hl < 20 || len(raw) < hl+14 {
		return false
	}
	return raw[hl+13]&0x04 != 0
}

func ipStr4(ip []byte, off int) string {
	if len(ip) < off+4 {
		return "?"
	}
	return strconv.Itoa(int(ip[off])) + "." + strconv.Itoa(int(ip[off+1])) + "." +
		strconv.Itoa(int(ip[off+2])) + "." + strconv.Itoa(int(ip[off+3]))
}
