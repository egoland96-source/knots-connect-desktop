// diag.go — --diag bayrağıyla çalışan teşhis modu.
// WinDivertRecv neden çöp pRecvLen üretiyor sorusunu yanıtlar:
//   - hangi WinDivert.dll yüklendi (modül yolu)
//   - export adresleri doğru mu
//   - Recv'in dönüşü (ok), GetLastError, stabil pointer adresleri
//   - rl değerinin çağrılar arasında nasıl değiştiği
package main

import (
	"fmt"
	"os"
	"runtime"
	"syscall"
	"time"
	"unsafe"
)

const diagFilter = "(tcp.DstPort == 443)"

// LoadedModulePath, verilen modül tanıtıcısının dosya yolunu döner.
// (syscall.GetModuleFileName yok; kernel32 GetModuleFileNameW kullanılır.)
var (
	diagK32     = syscall.NewLazyDLL("kernel32.dll")
	diagGetModW = diagK32.NewProc("GetModuleFileNameW")
)

func loadedModulePath(h uintptr) string {
	buf := make([]uint16, 1024)
	rc, _, _ := diagGetModW.Call(h, uintptr(unsafe.Pointer(&buf[0])), uintptr(len(buf)))
	if rc == 0 {
		return "?"
	}
	return syscall.UTF16ToString(buf[:rc])
}

func runDiag() int {
	fmt.Fprintf(os.Stderr, "[diag] Go %s\n", runtime.Version())

	// 1) Yüklenen modülün gerçek yolu
	wdll.Load() // garanti et
	fmt.Fprintf(os.Stderr, "[diag] Yüklenen WinDivert.dll: %s\n", loadedModulePath(wdll.Handle()))

	// 2) Export adresleri
	fmt.Fprintf(os.Stderr, "[diag] WinDivertOpen adresi  : 0x%X\n", wOpen.Addr())
	fmt.Fprintf(os.Stderr, "[diag] WinDivertRecv adresi  : 0x%X\n", wRecv.Addr())
	fmt.Fprintf(os.Stderr, "[diag] WinDivertSend adresi  : 0x%X\n", wSend.Addr())

	// 3) Açılış — önce NONBLOCK (0x10) flag'i dene, kuyruk boşsa Recv
	// anında döner; olmazsa klasik blok moda düş.
	filterPtr, ferr := syscall.BytePtrFromString(diagFilter)
	if ferr != nil {
		fmt.Fprintf(os.Stderr, "[diag] filtre hatası: %v\n", ferr)
		return 1
	}
	var wd *VpnHandle
	diagOpenFlags := ^uintptr(0)
	for _, flags := range []uintptr{0x10, 0} {
		handle, _, _ := wOpen.Call(
			uintptr(unsafe.Pointer(filterPtr)),
			uintptr(0),
			uintptr(0),
			flags,
		)
		if handle != ^uintptr(0) {
			diagOpenFlags = flags
			wd = &VpnHandle{
				h:    handle,
				rbuf: make([]byte, winDivertRecvBuf),
				radd: make([]byte, winDivertAddrSize),
			}
			break
		}
	}
	if wd == nil {
		fmt.Fprintf(os.Stderr, "[diag] Açılamadı: WinDivertOpen başarısız (sürücü yüklü mü?)\n")
		return 1
	}
	fmt.Fprintf(os.Stderr, "[diag] Açıldı (flags=0x%X). h=0x%X | rbuf=&0x%X | radd=&0x%X | rl=&0x%X rl@=0x%X\n",
		diagOpenFlags,
		wd.h,
		uintptr(unsafe.Pointer(&wd.rbuf[0])),
		uintptr(unsafe.Pointer(&wd.radd[0])),
		uintptr(unsafe.Pointer(&wd.rl)),
		wd.rl)
	defer wd.Close()

	// 4) QPC korelasyon testi: rl bir saat (clock) ise hız ~10M tick/sn
	// görünür. Ayrıca paket verisi gerçekten rbuf'a yazılıyor mu bakılır.
	fmt.Fprintf(os.Stderr, "[diag] QPC korelasyon testi (60 deneme, 20ms ara)...\n")
	t0 := time.Now()
	rlFirst, rlLast := uint32(0), uint32(0)
	okCount, okFail := 0, 0
	dataHits := 0
	for i := 0; i < 60; i++ {
		ok, _, lastErr := wRecv.Call(
			wd.h,
			uintptr(unsafe.Pointer(&wd.rbuf[0])),
			uintptr(winDivertRecvBuf),
			uintptr(unsafe.Pointer(&wd.rl)),
			uintptr(unsafe.Pointer(&wd.radd[0])),
		)
		if ok != 0 {
			if okCount == 0 {
				rlFirst = wd.rl
			}
			rlLast = wd.rl
			okCount++
			if len(wd.rbuf) >= 20 && wd.rbuf[0]&0xF0 == 0x40 {
				dataHits++
			}
		} else {
			okFail++
			if i < 6 {
				fmt.Fprintf(os.Stderr, "[diag] #%02d ok=FALSE lastErr=%v rl=%d (beklenen: kuyruk boş ise ERROR_NO_DATA)\n",
					i, lastErr, wd.rl)
			}
		}
		time.Sleep(20 * time.Millisecond)
	}
	elapsed := time.Since(t0)
	fmt.Fprintf(os.Stderr, "[diag] rlFirst=%d rlLast=%d | ok=%d fail=%d | elapsed=%v | ipv4-paket=%d\n",
		rlFirst, rlLast, okCount, okFail, elapsed, dataHits)
	if okCount >= 2 {
		dl := uint32(rlLast) - uint32(rlFirst)
		fmt.Fprintf(os.Stderr, "[diag] rl delta=%d, süre=%v -> tick/sn ≈ %d (QPC ~10M ise: saat deseni DOĞRULANDI)\n",
			dl, elapsed, int64(float64(dl)/elapsed.Seconds()))
	}

	// 5) Paket yakalanırsa: rbuf başlangıcı + Send A/B testi.
	// A: takaslı sıra (4=&sent, 5=addr) — mevcut çalışan Recv hipotezi.
	// B: resmi sıra (4=addr, 5=&sent).
	// Hangisi ok=1 dönüyorsa bu DLL'in WinDivertSend imzası odur.
	if okCount > 0 {
		fmt.Fprintf(os.Stderr, "[diag] son paket rbuf[0..16]=% X len=%d\n", wd.rbuf[:16], wd.rl)
		fmt.Fprintf(os.Stderr, "[diag] son paket radd[0..28]=% X\n", wd.radd)

		var sentA uint32
		okA, r2A, errA := wSend.Call(
			wd.h,
			uintptr(unsafe.Pointer(&wd.rbuf[0])),
			uintptr(uint32(wd.rl)),
			uintptr(unsafe.Pointer(&sentA)),
			uintptr(unsafe.Pointer(&wd.radd[0])),
		)
		var sentB uint32
		okB, r2B, errB := wSend.Call(
			wd.h,
			uintptr(unsafe.Pointer(&wd.rbuf[0])),
			uintptr(uint32(wd.rl)),
			uintptr(unsafe.Pointer(&wd.radd[0])),
			uintptr(unsafe.Pointer(&sentB)),
		)
		fmt.Fprintf(os.Stderr, "[diag] SEND-A(takaslı)  ok=%v sent=%d err=%v r2=0x%X\n", okA != 0, sentA, errA, r2A)
		fmt.Fprintf(os.Stderr, "[diag] SEND-B(resmi)    ok=%v sent=%d err=%v r2=0x%X\n", okB != 0, sentB, errB, r2B)
		if okA != 0 {
			fmt.Fprintf(os.Stderr, "[diag] => WinDivertSend TAKASLI imza kullanıyor (mevcut kod doğru)\n")
		} else if okB != 0 {
			fmt.Fprintf(os.Stderr, "[diag] => WinDivertSend RESMİ imza kullanıyor (kod düzeltilmeli)\n")
		} else {
			fmt.Fprintf(os.Stderr, "[diag] => ikisi de başarısız, send beklenmiyor\n")
		}
	}
	if okCount == 0 {
		fmt.Fprintf(os.Stderr, "[diag] hiç paket alınamadı — trafik var mı? (Discord/Roblox açık olmalı)\n")
	}
	fmt.Fprintf(os.Stderr, "[diag] bitti\n")
	return 0
}