// dpi_driver.go — WinDivert 2.x wrapper (temiz implementasyon).
//
// WinDivert 2.x standart imzaları:
//   WinDivertOpen(filter, layer, priority, flags) → HANDLE
//   WinDivertRecv(h, pPacket, packetLen, pRecvLen, pAddr) → BOOL
//   WinDivertSend(h, pPacket, packetLen, pSendLen, pAddr) → BOOL
//   WinDivertClose(h) → BOOL
//
// WINDIVERT_ADDRESS (80 bayt) layout:
//   offset  0: Timestamp (INT64)
//   offset  8: Flags (UINT32) — bit17=Outbound, bit19=Impostor
//   offset 12: Reserved (UINT32)
//   offset 16: Data[64] — Network: IfIdx(4)+SubIfIdx(4)+padding
//
// GC güvenliği: recv buffer ve addr buffer WinDivert struct'ında tutulur;
// syscall devam ederken GC bunlara erişemez. runtime.KeepAlive ek güvence.
package main

import (
	"encoding/binary"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
	"unsafe"
)

const (
	addrSize = 80    // sizeof(WINDIVERT_ADDRESS) for WinDivert 2.x
	recvBuf  = 65536 // max paket boyutu
)

var (
	wdDLL      = syscall.NewLazyDLL("WinDivert.dll")
	wdOpen     = wdDLL.NewProc("WinDivertOpen")
	wdClose    = wdDLL.NewProc("WinDivertClose")
	wdRecv     = wdDLL.NewProc("WinDivertRecv")
	wdSend     = wdDLL.NewProc("WinDivertSend")
	wdSetParam = wdDLL.NewProc("WinDivertSetParam")
)

// WinDivert, bir WinDivert handle ve GC-safe kalıcı buffer'larını tutar.
type WinDivert struct {
	handle  uintptr
	rawBuf  [recvBuf]byte // kalıcı recv buffer — GC tarafından asla toplanamaz
	addrBuf [addrSize]byte
	recvLen uint32
}

// Open, verilen filtre ile WinDivert handle açar (varsayılan priority=0).
func Open(filter string) (*WinDivert, error) {
	return OpenWithPriority(filter, 0)
}

// OpenWithPriority, verilen filtre ve priority (öncelik) değeriyle WinDivert handle açar.
// Farklı priority değerlerine sahip motorlar aynı veya örtüşen filtreleri
// birbirinin paketlerini çalmadan/bölmeden sıralı ve izole bir şekilde işleyebilir.
func OpenWithPriority(filter string, priority int16) (*WinDivert, error) {
	if err := ensureDriver(); err != nil {
		fmt.Fprintf(os.Stderr, "[dpi-driver] driver uyarısı: %v\n", err)
	}

	fp, err := syscall.BytePtrFromString(filter)
	if err != nil {
		return nil, fmt.Errorf("filter encode: %w", err)
	}

	h, _, errno := wdOpen.Call(
		uintptr(unsafe.Pointer(fp)),
		uintptr(0),                  // layer = WINDIVERT_LAYER_NETWORK (0)
		uintptr(uint16(priority)),   // priority (INT16)
		uintptr(0),                  // flags = 0 (UINT64)
	)
	if h == ^uintptr(0) {
		return nil, fmt.Errorf("WinDivertOpen başarısız (kod=%v) priority=%d: filter=%q", errno, priority, filter)
	}

	// Paket kaybını önlemek için kernel kuyruğunu genişlet
	wdSetParam.Call(h, 0, uintptr(16384))    // WINDIVERT_PARAM_QUEUE_LEN (16k paket)
	wdSetParam.Call(h, 1, uintptr(4000))     // WINDIVERT_PARAM_QUEUE_TIME (4 saniye)
	wdSetParam.Call(h, 2, uintptr(33554432)) // WINDIVERT_PARAM_QUEUE_SIZE (32 MB)

	return &WinDivert{handle: h}, nil
}

// Recv, bir sonraki paketi alır. raw ve addr, her çağrıda yeni kopyalardır.
func (w *WinDivert) Recv() (raw []byte, addr []byte, err error) {
	ok, _, _ := wdRecv.Call(
		w.handle,
		uintptr(unsafe.Pointer(&w.rawBuf[0])),
		uintptr(recvBuf),
		uintptr(unsafe.Pointer(&w.recvLen)),
		uintptr(unsafe.Pointer(&w.addrBuf[0])),
	)
	runtime.KeepAlive(w) // GC'nin w'yi toplamasını engelle
	if ok == 0 {
		return nil, nil, fmt.Errorf("WinDivertRecv: %w", syscall.GetLastError())
	}
	raw = make([]byte, w.recvLen)
	copy(raw, w.rawBuf[:w.recvLen])
	addr = make([]byte, addrSize)
	copy(addr, w.addrBuf[:])
	return raw, addr, nil
}

// Send, paketi ağ yığınına enjekte eder.
func (w *WinDivert) Send(raw []byte, addr []byte) error {
	if len(raw) == 0 {
		return fmt.Errorf("boş paket")
	}
	if len(addr) < addrSize {
		return fmt.Errorf("addr çok kısa: %d", len(addr))
	}
	var sent uint32
	ok, _, _ := wdSend.Call(
		w.handle,
		uintptr(unsafe.Pointer(&raw[0])),
		uintptr(len(raw)),
		uintptr(unsafe.Pointer(&sent)),
		uintptr(unsafe.Pointer(&addr[0])),
	)
	runtime.KeepAlive(raw)
	runtime.KeepAlive(addr)
	if ok == 0 {
		return fmt.Errorf("WinDivertSend: %w", syscall.GetLastError())
	}
	return nil
}

// Close, WinDivert handle'ı kapatır.
func (w *WinDivert) Close() {
	if w != nil && w.handle != 0 {
		wdClose.Call(w.handle)
		w.handle = 0
	}
}

// --- Address helpers ---

// AddrIsOutbound, WinDivert 2.x addr bloğundan paketin giden yönde olup
// olmadığını okur. Bit 17 (Outbound) Flags UINT32'de (offset 8).
func AddrIsOutbound(addr []byte) bool {
	if len(addr) < 12 {
		return false
	}
	flags := binary.LittleEndian.Uint32(addr[8:12])
	return flags&(1<<17) != 0
}

// AddrIsImpostor, paketin bizim tarafımızdan enjekte edilip edilmediğini kontrol eder.
// Bit 19 (Impostor) Flags UINT32'de (offset 8).
func AddrIsImpostor(addr []byte) bool {
	if len(addr) < 12 {
		return false
	}
	flags := binary.LittleEndian.Uint32(addr[8:12])
	return flags&(1<<19) != 0
}

// --- Driver auto-install ---

// ensureDriver, WinDivert kernel driver'ının çalışır durumda olmasını sağlar.
// Driver zaten çalışıyorsa hiçbir şey yapmaz.
func ensureDriver() error {
	// Önce sc query ile kontrol et
	out, err := exec.Command("sc.exe", "query", "WinDivert").Output()
	if err == nil && strings.Contains(string(out), "RUNNING") {
		return nil // zaten çalışıyor
	}

	// Driver dosyasını bul (exe'nin yanındaki WinDivert64.sys)
	exeDir, err := execDir()
	if err != nil {
		return fmt.Errorf("exe klasörü bulunamadı: %w", err)
	}
	sysFile := filepath.Join(exeDir, "WinDivert64.sys")
	if _, err := os.Stat(sysFile); err != nil {
		return fmt.Errorf("WinDivert64.sys bulunamadı: %s", sysFile)
	}

	// sc create + sc start
	target := `C:\Windows\System32\drivers\WinDivert64.sys`
	if err := copyFile(sysFile, target); err != nil {
		return fmt.Errorf("sys kopyalanamadı: %w", err)
	}
	exec.Command("sc.exe", "create", "WinDivert", "type=", "kernel", "start=", "demand", "binPath=", target).Run()
	exec.Command("sc.exe", "start", "WinDivert").Run()
	fmt.Fprintf(os.Stderr, "[dpi-driver] WinDivert servisi başlatıldı\n")
	return nil
}

func execDir() (string, error) {
	exe, err := os.Executable()
	if err != nil {
		return "", err
	}
	return filepath.Dir(exe), nil
}

func copyFile(src, dst string) error {
	data, err := os.ReadFile(src)
	if err != nil {
		return err
	}
	return os.WriteFile(dst, data, 0644)
}
