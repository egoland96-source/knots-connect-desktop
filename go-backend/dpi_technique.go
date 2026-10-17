// dpi_technique.go — DPI bypass tekniklerinin ortak arayüzü ve kayıt mekanizması.
package main

import (
	"fmt"
	"os"
	"strings"
	"sync"
)

// Technique, bir DPI bypass tekniğinin arayüzü.
// Apply: ClientHello paketini bypass ederek gönderir ve true döner.
// Eğer teknik bu paket için uygun değilse (yanlış tür vb.) false döner;
// caller o zaman paketi passthrough ile gönderir.
type Technique interface {
	Name() string
	Apply(raw []byte, addr []byte, wd *WinDivert) (handled bool, err error)
}

// TechniqueSet, etkin tekniklerin thread-safe haritasıdır.
// Sıra kayıt sırasına göre tutulur: ilk başarılı teknik kullanılır.
type TechniqueSet struct {
	mu         sync.RWMutex
	ordered    []Technique
	activeNames map[string]bool
}

// NewTechniqueSet, tüm teknikleri devre dışı başlayan boş bir set oluşturur.
func NewTechniqueSet() *TechniqueSet {
	return &TechniqueSet{
		activeNames: make(map[string]bool),
	}
}

// Register, tekniği sete ekler. Varsayılan olarak etkin değildir.
func (ts *TechniqueSet) Register(t Technique) {
	ts.mu.Lock()
	defer ts.mu.Unlock()
	ts.ordered = append(ts.ordered, t)
}

// Enable, verilen isimdeki tekniği etkinleştirir.
func (ts *TechniqueSet) Enable(name string) {
	ts.mu.Lock()
	defer ts.mu.Unlock()
	ts.activeNames[name] = true
}

// Disable, tekniği devre dışı bırakır.
func (ts *TechniqueSet) Disable(name string) {
	ts.mu.Lock()
	defer ts.mu.Unlock()
	delete(ts.activeNames, name)
}

// SetActive, aktif teknik listesini atomik olarak değiştirir.
func (ts *TechniqueSet) SetActive(names []string) {
	ts.mu.Lock()
	defer ts.mu.Unlock()
	ts.activeNames = make(map[string]bool, len(names))
	for _, n := range names {
		ts.activeNames[n] = true
	}
	fmt.Fprintf(os.Stderr, "[dpi] aktif teknikler: %s\n", strings.Join(names, ", "))
}

// Apply, aktif teknikleri sırayla dener; ilk başarılı olan kullanılır.
// Hiçbiri uygun değilse false döner → caller passthrough yapar.
func (ts *TechniqueSet) Apply(raw []byte, addr []byte, wd *WinDivert) (handled bool, err error) {
	ts.mu.RLock()
	defer ts.mu.RUnlock()

	for _, t := range ts.ordered {
		if !ts.activeNames[t.Name()] {
			continue
		}
		ok, applyErr := t.Apply(raw, addr, wd)
		if applyErr != nil {
			fmt.Fprintf(os.Stderr, "[dpi] %s hata: %v\n", t.Name(), applyErr)
			continue
		}
		if ok {
			return true, nil
		}
	}
	return false, nil
}

// ActiveList, etkin teknik isimlerini döner.
func (ts *TechniqueSet) ActiveList() []string {
	ts.mu.RLock()
	defer ts.mu.RUnlock()
	var out []string
	for _, t := range ts.ordered {
		if ts.activeNames[t.Name()] {
			out = append(out, t.Name())
		}
	}
	return out
}
