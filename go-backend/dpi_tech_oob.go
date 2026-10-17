// dpi_tech_oob.go — OOB/URG Desync tekniği.
//
// Yöntem:
//   ClientHello'dan ÖNCE 1 bayt URG (Out-of-Band) verisi içeren bir TCP
//   segmenti gönderilir. URG flag + URG pointer ile işaretlenen bu bayt
//   pek çok DPI kutusunun stream reassembly mantığını bozar: DPI "OOB verisi"
//   baytını payload'a dahil ederek offset hesaplarını kaçırır.
//   Sunucu ise RFC 793'e uygun URG verisini doğru şekilde işler (bypass).
//
// Dikkat: Modern bazı kernel DPI'lar URG'yi yoksayar. Bu teknik sni-split
//         ile kombinlendiğinde kümülatif etki sağlar.
package main

import (
	"encoding/binary"
	"fmt"
	"os"
)

// OobDesyncTechnique, ClientHello öncesi URG baytlı sahte segment gönderir.
type OobDesyncTechnique struct {
	blacklist []string
}

func NewOobDesyncTechnique(blacklist []string) *OobDesyncTechnique {
	return &OobDesyncTechnique{blacklist: blacklist}
}

func (t *OobDesyncTechnique) Name() string { return "oob-desync" }

func (t *OobDesyncTechnique) Apply(raw []byte, addr []byte, wd *WinDivert) (bool, error) {
	if !AddrIsOutbound(addr) {
		return false, nil
	}
	info := ParsePacketInfo(raw)
	if info.Proto != 6 || info.THL == 0 {
		return false, nil
	}
	if !IsClientHello(info.Payload) {
		return false, nil
	}
	sni := ExtractSNI(info.Payload)
	if sni == "" || !MatchesDomain(sni, t.blacklist) {
		return false, nil
	}

	// OOB segment: IP+TCP header + 1 bayt sahte veri (0x00)
	origSeq := TCPSeq(raw, info.IHL)
	oobPayload := []byte{0x00}
	oobSeg, err := BuildTCPSegment(raw, info.IHL, info.THL, oobPayload, origSeq)
	if err != nil {
		return false, nil
	}

	// URG flag + URG pointer = 1 (son bayt OOB)
	oobSeg[info.IHL+13] |= 0x20 // URG flag
	binary.BigEndian.PutUint16(oobSeg[info.IHL+18:info.IHL+20], 1)
	RecalcTCPChecksum(oobSeg)

	oobAddr := CloneAddr(addr)
	if err := wd.Send(oobSeg, oobAddr); err != nil {
		fmt.Fprintf(os.Stderr, "[dpi] oob-desync urg send err: %v\n", err)
	} else {
		fmt.Fprintf(os.Stderr, "[dpi] oob-desync SNI=%s\n", sni)
	}

	return false, nil
}
