// discord_ipfrag.go — Discord/hedef ClientHello'larını IP KATMANINDA parçalar.
//
// Neden: Türkiye DPI'ı Discord SNI'sini HER pakette tarıyor (ilk paketi değil,
// tamamını). fake_ttl bu yüzden işe yaramadı — orijinal paketteki SNI yine
// RST yiyor. splitv ise TCP katmanında böler; Cloudflare (162.159.x.x) mikro
// parçalı ClientHello'yu kabul etmez (sunucu tarafı reddi).
//
// IP fragmentation: TCP segmenti (TLS kaydı) HİÇ değişmez. Tek IP paketi,
// IP header + parça 1 + parça 2 olarak GİDER:
//   - Fragment 1: IP header + TCP header + ClientHello öncesi (SNI yok)
//   - Fragment 2: IP header (offset) + SNI ve kalan ClientHello
//
// DPI reassembly yapmaz → SNI hostname'i hiçbir parçada tam görünmez.
// Cloudflare IP reassembly yapıp bütün TLS'i okur (TCP/TLS değişmediği için
// "middlebox interference" reddi OLMAZ).
//
// Yalnız IPv4: IPv6 fragmentasyon extension header ister; bu builder IPv4 RFC 791.
package main

import (
	"encoding/binary"
	"fmt"
	"os"
	"time"

	"knots-go-backend/engine"
)

const (
	ipFragMF      = 0x2000 // RFC 791: 16-bit flags+offset alanında More Fragments
	ipFragOffMask = 0x1FFF
)

// sendDiscordIPFrag — Discord ClientHello'sunu iki IP fragmentine böler ve
// gönderir. SNI hostname'i ikinci parçada başlar. Gönderemezse orijinali
// passthrough eder (asla düşürmez).
func sendDiscordIPFrag(raw, addr []byte, ipHdrLen, tcpHdrLen int, send engine.SendFunc) {
	if len(raw) < 20 || raw[0]>>4 != 4 || ipHdrLen < 20 || tcpHdrLen < 20 {
		sendRawStrat(raw, addr, send)
		return
	}
	if ipHdrLen+tcpHdrLen > len(raw) {
		sendRawStrat(raw, addr, send)
		return
	}

	payload := raw[ipHdrLen+tcpHdrLen:]

	// SNI hostname IP-payload ofseti = TCP header + TLS içi ofset.
	sniStart, _, ok := findSniHostnameRange(payload)
	if !ok {
		sendRawStrat(raw, addr, send)
		return
	}
	sniAt := tcpHdrLen + sniStart // ilk hostname baytı (IP payload, exclusive üst sınır)

	// Frag1 payload uzunluğu 8'in katı olmalı (MF=1). TCP başlığının tamamı
	// frag1'de kalır; hostname hiç frag1'e girmez.
	minCut := tcpHdrLen
	if minCut%8 != 0 {
		minCut += 8 - minCut%8
	}
	maxCut := sniAt - sniAt%8 // sniAt 8-hizalıysa hostname dahil edilmez ([0,maxCut))
	if maxCut < minCut {
		sendRawStrat(raw, addr, send)
		return
	}

	cutFromIP := sniAt - 16
	if cutFromIP < minCut {
		cutFromIP = minCut
	}
	cutFromIP -= cutFromIP % 8
	if cutFromIP < minCut {
		cutFromIP = minCut
	}
	if cutFromIP > maxCut {
		cutFromIP = maxCut
	}
	if cutFromIP < minCut || cutFromIP%8 != 0 {
		sendRawStrat(raw, addr, send)
		return
	}

	frag1Len := cutFromIP
	frag2Len := len(raw) - ipHdrLen - frag1Len
	if frag1Len < minCut || frag2Len < 8 {
		sendRawStrat(raw, addr, send)
		return
	}

	frag1 := buildIPFragment(raw, ipHdrLen, ipHdrLen, ipHdrLen+frag1Len, 0, true)
	frag2 := buildIPFragment(raw, ipHdrLen, ipHdrLen+frag1Len, len(raw), uint16(frag1Len/8), false)
	if frag1 == nil || frag2 == nil {
		fmt.Fprintln(os.Stderr, "[go-engine] discord ipfrag: fragment üretilemedi, orijinal passthrough")
		sendRawStrat(raw, addr, send)
		return
	}

	if err := send(frag1, addr); err != nil {
		fmt.Fprintf(os.Stderr, "[go-engine] discord ipfrag frag1 gönderilemedi: %v\n", err)
		sendRawStrat(raw, addr, send)
		return
	}
	// Kısa mikro aralık: sunucu reassembly penceresi içinde iki parça da
	// gelir; DPI ilk parçayı "eksik akış" sanar.
	time.Sleep(600 * time.Microsecond)
	if err := send(frag2, addr); err != nil {
		// Frag1 gitti; orijinali tekrar basmak aynı TCP seq'i çiftler.
		fmt.Fprintf(os.Stderr, "[go-engine] discord ipfrag frag2 gönderilemedi: %v\n", err)
	}
}

// buildIPFragment — raw'ın [dataStart:dataEnd] aralığını tek bir IPv4 fragmenti
// yapar. fragOffset16: IP payload başlangıcından 8 baytlık birim. moreFrags:
// ara parçalarda MF=1, DF=0. TCP checksum yeniden hesaplanmaz (reassembly
// sonrası orijinal segment checksum'u geçerlidir); yalnız IP checksum yenilenir.
func buildIPFragment(raw []byte, ipHdrLen, dataStart, dataEnd int, fragOffset16 uint16, moreFrags bool) []byte {
	if len(raw) < 20 || raw[0]>>4 != 4 {
		return nil
	}
	if ipHdrLen < 20 || ipHdrLen > len(raw) {
		return nil
	}
	if dataStart < ipHdrLen || dataEnd < dataStart || dataEnd > len(raw) {
		return nil
	}
	body := raw[dataStart:dataEnd]
	buf := make([]byte, ipHdrLen+len(body))
	copy(buf[:ipHdrLen], raw[:ipHdrLen])
	copy(buf[ipHdrLen:], body)

	binary.BigEndian.PutUint16(buf[2:4], uint16(len(buf)))

	// RFC 791: 16-bit field = 3 flag biti + 13-bit offset. DF açıkça 0.
	fragField := fragOffset16 & ipFragOffMask
	if moreFrags {
		fragField |= ipFragMF
	}
	binary.BigEndian.PutUint16(buf[6:8], fragField)

	buf[10], buf[11] = 0, 0
	binary.BigEndian.PutUint16(buf[10:12], checksum16(buf[:ipHdrLen]))
	return buf
}
