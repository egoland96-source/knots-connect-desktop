// strategy.go —  Adaptive Network Engine'in strateji soyutlaması.
//
// Her strateji bir Strategy interface'i uygular: hangi protokolleri / IP
// sürümlerini desteklediğini Metadata ile bildirir ve Apply ile paketi işler.
// Registry bu bildirimleri kullanarak Compatibility Check yapar; Selector
// health skorlarıyla en iyi adayı seçer; Monitor sonucu (başarı/başarısızlık)
// geri bildirir. Böylece motor "teknik havuzundan" çalışanı seçer.
package engine

// PacketInfo, yakalanan bir paketin selector'un karar verebilmesi için
// ihtiyaç duyduğu özet bilgileridir.
type PacketInfo struct {
	Ver     int  // IP sürümü: 4 veya 6
	Proto   int  // IP protokolü: 6=TCP, 17=UDP
	SrcPort int  // TCP/UDP kaynak portu
	DstPort int  // TCP/UDP hedef portu
}

// SendFunc, motorun yeniden enjekte edilecek paketleri ağ yığınına
// gönderme yeteneğidir. Windivert wrap'ten bağımsız kalması için
// callback olarak enjekte edilir.
type SendFunc func(raw, addr []byte) error

// StrategyMeta, bir stratejinin capability bilgisidir.
// Compatibility Check bu veriyle yapılır.
type StrategyMeta struct {
	ID         string // "split2", "split3", "passthrough", ...
	Name       string // kısa açıklama
	Protocols  []int  // desteklenen IP protokolleri (6=TCP, 17=UDP)
	IPVersions []int  // desteklenen IP sürümleri (4, 6)
	RiskLevel  int    // 0 = pasif/passthrough, 5 = agresif
}

// Strategy, bir ağ bağlantı davranışını temsil eder.
type Strategy interface {
	Metadata() StrategyMeta
	// Apply, paketi bu stratejiye göre işler.
	// handled=true: paket tüketildi (orijinali yeniden gönderme — parçalanma gibi).
	// handled=false: strateji bu pakete uygulanmadı, orijinal passthrough edilsin.
	Apply(raw, addr []byte, send SendFunc) (handled bool, err error)
}