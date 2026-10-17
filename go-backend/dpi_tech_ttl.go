// dpi_tech_ttl.go — TTL-Fake tekniği.
//
// Yöntem (GoodbyeDPI --fake-* / Zapret fake felsefesi):
//   ClientHello'dan ÖNCE TTL=3 ile sahte bir paket gönderilir.
//   Sahte paketteki SNI alanı zararsız bir hostname (örn. google.com) ile maskelenir.
//   İnternet Servis Sağlayıcısının DPI kutusu (genelde 1-2 hop mesafede) bu sahte
//   paketi görür, onaylar ve akış durumunu "temiz" olarak kaydeder.
//   Sahte paket 3 hop sonra sunucuya ulaşmadan internette düşer.
//   Hemen ardından gerçek paket (sni-split ile parçalanmış) gönderilir ve sunucuya ulaşır.
package main

import (
	"fmt"
	"os"
)

const fakeTTL = 3 // 3 hop: ISP DPI'ı aşar, sunucuya varmadan düşer

// TtlFakeTechnique, gerçek ClientHello'dan önce düşük TTL'li sahte paket enjekte eder.
type TtlFakeTechnique struct {
	blacklist []string
}

func NewTtlFakeTechnique(blacklist []string) *TtlFakeTechnique {
	return &TtlFakeTechnique{blacklist: blacklist}
}

func (t *TtlFakeTechnique) Name() string { return "ttl-fake" }

func (t *TtlFakeTechnique) Apply(raw []byte, addr []byte, wd *WinDivert) (bool, error) {
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

	// Sahte paket hazırla
	fake := ClonePacket(raw)
	SetIPTTL(fake, fakeTTL)

	// Sahte paketteki SNI hostname'ini zararsız bir adla ("google.com") maskele.
	// Böylece ISP DPI sahte paketi yakalasa bile asla bloklu domain görmez!
	sniStart, sniLen, ok := findSniHostnameRange(info.Payload)
	if ok && sniLen > 0 {
		fakePayloadStart := info.IHL + info.THL
		fakeSniStart := fakePayloadStart + sniStart
		dummy := []byte("www.google.com")
		for i := 0; i < sniLen; i++ {
			if i < len(dummy) {
				fake[fakeSniStart+i] = dummy[i]
			} else {
				fake[fakeSniStart+i] = 'a'
			}
		}
	}

	RecalcIPChecksum(fake)
	RecalcTCPChecksum(fake)

	fakeAddr := CloneAddr(addr)
	if err := wd.Send(fake, fakeAddr); err != nil {
		fmt.Fprintf(os.Stderr, "[dpi] ttl-fake send err: %v\n", err)
	} else {
		fmt.Fprintf(os.Stderr, "[dpi] ttl-fake maskelenmiş SNI=%s ttl=%d\n", sni, fakeTTL)
	}

	// Sahte paket yollandıktan sonra gerçek paket pipeline'daki sonraki teknik (sni-split)
	// tarafından gönderilsin diye false dönüyoruz.
	return false, nil
}
