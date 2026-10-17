// dpi_tech_recfrag.go — TLS Record Fragmentation (recfrag) tekniği.
//
// Yöntem:
//   Tek bir TCP paketi içindeki TLS ClientHello handshake kaydını
//   iki ayrı RFC 8446 TLS Record'una böler:
//     Record 1: [0x16][TLS_VER][len1][Data 1]
//     Record 2: [0x16][TLS_VER][len2][Data 2]
//
// Avantajı:
//   - Paket sayısı değişmez (tek TCP paketi, aynı TCP Seq numarası).
//   - Sıfır TCP parçalanması (fragmentation), sıfır paket kaybı riski.
//   - DPI ilk TLS kaydında tam SNI göremez ve engellemez.
//   - Sunucu (Roblox / Cloudflare / Akamai) standartlara uygun olarak iki kaydı birleştirir.
//   - Connection Reset (RST) veya Handshake hatası oluşmaz.
package main

// RecFragTechnique, devre dışı bırakılmış teknik.
type RecFragTechnique struct {
	blacklist []string
}

func NewRecFragTechnique(blacklist []string) *RecFragTechnique {
	return &RecFragTechnique{blacklist: blacklist}
}

func (t *RecFragTechnique) Name() string { return "recfrag" }

func (t *RecFragTechnique) Apply(raw []byte, addr []byte, wd *WinDivert) (bool, error) {
	// Devre dışı: Tek TCP segmentine TLS header eklemek TCP Seq numaralarını
	// bozduğu için RST ve wil::ResultException çöküşüne yol açar.
	return false, nil
}
