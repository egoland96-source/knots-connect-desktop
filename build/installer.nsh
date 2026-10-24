; build/installer.nsi — Knots Connect NSIS özel kurulum betiği.
; electron-builder'ın nsis.include alanıyla yüklenir.
; Amaç: Kurulum, ESKİ kurulumu temiz şekilde YENİSİYLE değiştirir:
;   - çalışan motor/uygulama süreçleri önce kapatılır (kilitli dosya hatası yok)
;   - eski sürümün artıkları (Python dist/build artefaktları, log'lar) temizlenir
;   - uygulama dizininde yalnızca güncel dosyalar kalır

!macro customInstall
  ; Uygulama ve motor süreçlerini kapat (dosyalar değiştirilirken kilitlenmesin)
  DetailPrint "Eski süreçler kapatılıyor..."
  ExecWait '"$SYSDIR\taskkill.exe" /F /IM k_main.exe /T'   ; Go motoru
  ExecWait '"$SYSDIR\taskkill.exe" /F /IM Knots Connect.exe /T'  ; ana uygulama
  ExecWait '"$SYSDIR\taskkill.exe" /F /IM electron.exe /T'

  ; Eski Python tabanlı kalıntıları temizle — yeni sürüm yalnız Go motoru kullanır
  DetailPrint "Eski Python artefaktları temizleniyor..."
  Delete /REBOOTOK "$INSTDIR\backend\dist\k_main.exe"
  RMDir /r "$INSTDIR\backend\build"
  RMDir /r "$INSTDIR\backend\__pycache__"
  Delete /REBOOTOK "$INSTDIR\backend\k_main.py"
  Delete /REBOOTOK "$INSTDIR\backend\k_main.spec"
  Delete /REBOOTOK "$INSTDIR\backend\k_main.exe~"
  Delete /REBOOTOK "$INSTDIR\backend\knots_engine.log"
  Delete /REBOOTOK "$INSTDIR\backend\*.log"

  ; Güncel (Go) motor dosyasının pakette bulunduğunu doğrula
  IfFileExists "$INSTDIR\backend\k_main.exe" 0 +2
    DetailPrint "Go motoru hazır: $INSTDIR\backend\k_main.exe"

  ; WireGuard otomatik kurulumu (eğer sistemde yüklü değilse)
  IfFileExists "$PROGRAMFILES64\WireGuard\wireguard.exe" +4 0
    IfFileExists "$INSTDIR\resources\wireguard.msi" 0 +3
      DetailPrint "WireGuard VPN bileşenleri yükleniyor..."
      ExecWait '"$SYSDIR\msiexec.exe" /i "$INSTDIR\resources\wireguard.msi" /qn /norestart DO_NOT_LAUNCH=1'

  ; C:\ProgramData\WireGuard dizinini oluştur ve KnotsImport.conf kopyala
  CreateDirectory "C:\ProgramData\WireGuard"
  IfFileExists "$INSTDIR\resources\KnotsImport.conf" 0 +2
    CopyFiles /SILENT "$INSTDIR\resources\KnotsImport.conf" "C:\ProgramData\WireGuard\KnotsImport.conf"

  ; KnotsImport tünel servisini kaydet
  IfFileExists "$PROGRAMFILES64\WireGuard\wireguard.exe" 0 +3
    IfFileExists "C:\ProgramData\WireGuard\KnotsImport.conf" 0 +2
      ExecWait '"$PROGRAMFILES64\WireGuard\wireguard.exe" /installtunnelservice "C:\ProgramData\WireGuard\KnotsImport.conf"'
!macroend
