// dpi_tech_winclamp.go — Window-Size tekniği.
//
// Yöntem:
//   Outbound SYN paketinde TCP window boyutu 0 olarak ayarlanır (Window=0).
//   Bazı DPI sistemleri bu durumda akışı izlemeyi keser. Gerçek paket
//   hemen ardından orijinal window boyutuyla gönderilir; sunucu yalnızca
//   ikincisini görür (ya da SYN paketi yeniden gönderilir, zaten TCP bunu
//   normalize eder). Alternatif: SYN+Window=4 küçük parça modu.
//
// Not: Bu teknik tek başına az etkilidir; sni-split veya ttl-fake ile
//      birlikte kullanıldığında ek DPI baskısı sağlar.
package main

import (
	"fmt"
	"os"
)

// WindowClampTechnique, ClientHello öncesi SYN'de window=0 ile DPI'ı şaşırtır.
type WindowClampTechnique struct {
	blacklist []string
}

func NewWindowClampTechnique(blacklist []string) *WindowClampTechnique {
	return &WindowClampTechnique{blacklist: blacklist}
}

func (t *WindowClampTechnique) Name() string { return "window-clamp" }

func (t *WindowClampTechnique) Apply(raw []byte, addr []byte, wd *WinDivert) (bool, error) {
	if !AddrIsOutbound(addr) {
		return false, nil
	}
	info := ParsePacketInfo(raw)
	if info.Proto != 6 || info.THL == 0 {
		return false, nil
	}

	// Yalnızca ClientHello paketlerine uygula
	if !IsClientHello(info.Payload) {
		return false, nil
	}
	sni := ExtractSNI(info.Payload)
	if sni == "" || !MatchesDomain(sni, t.blacklist) {
		return false, nil
	}

	// Kopyaya window=4 yaz (çok küçük pencere — DPI bu paketle tutarsız davranır)
	clamped := ClonePacket(raw)
	SetTCPWindow(clamped, info.IHL, 4)
	RecalcTCPChecksum(clamped)

	clampAddr := CloneAddr(addr)
	if err := wd.Send(clamped, clampAddr); err != nil {
		fmt.Fprintf(os.Stderr, "[dpi] window-clamp send err: %v\n", err)
	} else {
		fmt.Fprintf(os.Stderr, "[dpi] window-clamp SNI=%s\n", sni)
	}

	return false, nil
}
