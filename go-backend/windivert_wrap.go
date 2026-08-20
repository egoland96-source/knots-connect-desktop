// windivert_wrap.go — WinDivert.dll için minimal, kendi içinde yeterli wrapper.
//
// ÖNEMLİ (Recv crash düzeltmesi): Recv çağrısında HER seferinde make ile yeni
// buffer üretilip uintptr(unsafe.Pointer(...)) olarak syscall'a geçirildiğinde,
// Go GC buffer'ı "kökten kopmuş" (unrooted) sayar ve sistem çağrısı bloklanmış
// durumdayken belleği geri alıp yeniden kullanabilir. WinDivert bu belleğe
// yazınca recvLen çöp/dağılmış değerler alır (örn. 3.8 milyar) -> 'geçersiz
// paket uzunluğu' veya 'slice bounds' panic. Çözüm: buffer'lar VpnHandle
// üzerinde BİR KEZ tahsis edilip struct üzerinde köklenir (asla toplanamaz),
// ayrıca çağrı sonrası runtime.KeepAlive ile ek güvence alınır.
package main

import (
	"fmt"
	"net"
	"runtime"
	"sync"
	"syscall"
	"unsafe"
)

const (
	winDivertAddrSize = 28 // WIN_DIVERT_ADDRESS (Timestamp 8 + InterfaceIndex 4 +
	// SubInterfaceIndex 4 + Direction/Flags 4 + PseudoChecksum 4 + Reserved 4)
	winDivertRecvBuf = 65536
)

var (
	wdll   *syscall.LazyDLL
	wOpen  *syscall.LazyProc
	wClose *syscall.LazyProc
	wRecv  *syscall.LazyProc
	wSend  *syscall.LazyProc
)

func init() {
	wdll = syscall.NewLazyDLL("WinDivert.dll")
	wOpen = wdll.NewProc("WinDivertOpen")
	wClose = wdll.NewProc("WinDivertClose")
	wRecv = wdll.NewProc("WinDivertRecv")
	wSend = wdll.NewProc("WinDivertSend")
}

type VpnHandle struct {
	h    uintptr
	rbuf []byte // kalıcı receive buffer — köklü, GC tarafından asla taşınmaz/toplanmaz
	radd []byte // kalıcı WinDivert address buffer
	rl   uint32 // kalıcı received length slot
}

// VpnPacket, yakalanan ham paket + WinDivert adres bloğu (yeniden gönderim için).
type VpnPacket struct {
	Raw  []byte
	Addr []byte // Send'e aynen aktarılır
}

// OpenVpnHandle, verilen filtre ile WinDivertHandle açar ve kalıcı
// receive buffer'larını tahsis eder.
func OpenVpnHandle(filter string) (*VpnHandle, error) {
	filterPtr, err := syscall.BytePtrFromString(filter)
	if err != nil {
		return nil, err
	}
	handle, _, _ := wOpen.Call(
		uintptr(unsafe.Pointer(filterPtr)),
		uintptr(0),
		uintptr(0),
		uintptr(0),
	)
	if handle == ^uintptr(0) { // INVALID_HANDLE_VALUE
		return nil, fmt.Errorf("WinDivertOpen başarısız (sürücü yüklü mü?)")
	}
	return &VpnHandle{
		h:    handle,
		rbuf: make([]byte, winDivertRecvBuf),
		radd: make([]byte, winDivertAddrSize),
	}, nil
}

func (v *VpnHandle) Close() {
	if v != nil && v.h != 0 {
		wClose.Call(v.h)
		v.h = 0
	}
}

var (
	localIPOnce sync.Once
	localIPSet  map[[4]byte]bool
)

// initLocalIPs, yerel arayüzlerin IPv4 adreslerini toplar. Neredeyse her
// sistemde 192.168.x.x / 10.x.x.x olan bu adresler, paketlerin hangi
// yöne gittiğini belirlemenin güvenilir yoludur.
func initLocalIPs() {
	localIPSet = make(map[[4]byte]bool)
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return
	}
	for _, a := range addrs {
		ipn, ok := a.(*net.IPNet)
		if !ok {
			continue
		}
		ip := ipn.IP.To4()
		if ip == nil {
			continue
		}
		var k [4]byte
		copy(k[:], ip)
		localIPSet[k] = true
	}
}

// isLocalIPv4, verilen 4 baytlık IPv4 adresi yerel bir arayüzden geliyor mu?
func isLocalIPv4(ip []byte) bool {
	localIPOnce.Do(initLocalIPs)
	var k [4]byte
	copy(k[:], ip)
	return localIPSet[k]
}

// IsOutbound, paketin giden (outbound) yönde olup olmadığını söyler.
//
// ÖNEMLİ: adres yapısındaki Direction baytına (radd[16]) güvenilmiyor;
// saha kanıtı: bu sistemdeki DLL radd[16]'ya her paket için 0x12 yazıyor.
// Filtre artık TÜM TCP'yi kapsadığı için port bazlı yön de geçerli değil
// (oyun sunucuları 49xxx-65535 portlarına bağlanır). Yön paketin kendisinden
// belirlenir: kaynak IP yerel arayüz adreslerinden biriyse outbound'dur.
func (p *VpnPacket) IsOutbound() bool {
	raw := p.Raw
	if len(raw) < 20 || raw[0]>>4 != 4 {
		return false
	}
	if isLocalIPv4(raw[12:16]) {
		return true
	}
	// Fallback: yerel set boşsa (çok nadir) eski port kuralı.
	ihl := int(raw[0]&0x0F) * 4
	if ihl+4 > len(raw) {
		return false
	}
	dst := uint16(raw[ihl+2])<<8 | uint16(raw[ihl+3])
	return dst == 443
}

// Recv, bir sonraki paketi alır.
// Buffer kalıcıdır (VpnHandle üzerinde köklü), böylece WinDivertRecv
// uykuda/beklerken GC'nin belleği geri alması imkânsız hale gelir.
//
// ÖNEMLİ (kök neden bulundu): Bu sistemdeki WinDivert.dll dosyasının
// WinDivertRecv imzası resmi $(HANDLE, pPacket, packetLen, pAddr, pRecvLen)
// sırasını KULLANMIYOR; 4. ve 5. parametreler yer değiştirmiş:
//   BOOL WinDivertRecv(h, pPacket, packetLen, pRecvLen, pAddr)
// Kanıt (saha logu): adres slotuna (radd) gelen değerler IPv4 IP-toplam-
// uzunluğunun little-endian hali (rbuf[2..3] = 02 45 iken radd = 45 02 ...),
// yani DLL oraya uzunluk yazıyor; uzunluk slotuna (rl) ise monoton artan
// QPC timestamp değerleri doluyor (adres yapısının ilk alanı Timestamp).
// Bu yüzden çağrıda 4. arg=&rl (recvLen), 5. arg=&radd (addr) verilir.
func (v *VpnHandle) Recv() (*VpnPacket, error) {
	ok, _, _ := wRecv.Call(
		v.h,
		uintptr(unsafe.Pointer(&v.rbuf[0])),
		uintptr(winDivertRecvBuf),
		uintptr(unsafe.Pointer(&v.rl)),
		uintptr(unsafe.Pointer(&v.radd[0])),
	)
	// Syscall bitmeden buffer'ların toplanamayacağını garantiye al.
	runtime.KeepAlive(v)
	if ok == 0 {
		return nil, fmt.Errorf("WinDivertRecv başarısız")
	}
	if v.rl == 0 || v.rl > winDivertRecvBuf {
		// WinDivert bozulmuş değer yazdıysa paketi say, çökme (bilgi amaçlı).
		// rl saat (QPC/FILETIME) gibi davranıyorsa adres yapısı farklı yorumlanıyor
		// demektir; radd/rbuf dökümü bunu kanıtlar.
		return nil, fmt.Errorf("geçersiz paket uzunluğu: %d (radd[0..8]=% X rbuf[0..8]=% X)",
			v.rl, v.radd[:8], v.rbuf[:8])
	}

	// Addr kopyası: 28 bayt, Recv döngüsü arasında üzerine yazılmasın.
	addrCopy := make([]byte, winDivertAddrSize)
	copy(addrCopy, v.radd)

	return &VpnPacket{
		Raw:  v.rbuf[:v.rl],
		Addr: addrCopy,
	}, nil
}

// Send, paketi ağ yığınına geri enjekte eder.
// Not: Recv'deki gibi, bu DLL'in WinDivertSend imzası da takaslı:
// (h, pPacket, packetLen, pSendLen, pAddr) → burada 4. arg=&sent, 5. arg=addr.
func (v *VpnHandle) Send(p *VpnPacket) error {
	if len(p.Raw) == 0 {
		return fmt.Errorf("boş paket gönderilemez")
	}
	var sent uint32
	ok, _, _ := wSend.Call(
		v.h,
		uintptr(unsafe.Pointer(&p.Raw[0])),
		uintptr(uint32(len(p.Raw))),
		uintptr(unsafe.Pointer(&sent)),
		uintptr(unsafe.Pointer(&p.Addr[0])),
	)
	runtime.KeepAlive(p)
	if ok == 0 {
		return fmt.Errorf("WinDivertSend başarısız")
	}
	return nil
}