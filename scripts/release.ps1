# release.ps1 — Knots Connect küçük güncelleme yayınlama (tek komut)
#
# Kullanım:
#   powershell -ExecutionPolicy Bypass -File scripts/release.ps1
#
# Yapar: version bump (sorar) → typecheck+build → zip'ler → git commit+push → GitHub release
# Gereksinim: gh CLI (girişli veya GH_TOKEN env ile)
#   $env:GH_TOKEN = "ghp_..." ; powershell -ExecutionPolicy Bypass -File scripts/release.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

$pkgPath = Join-Path $root 'package.json'
$pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
$current = $pkg.version

Write-Host "Mevcut versiyon: $current"
$next = Read-Host "Yeni versiyon (Enter = $([version]$current + 0.0.1))" 
if ([string]::IsNullOrWhiteSpace($next)) {
    $v = [version]$current
    $next = "$($v.Major).$($v.Minor).$($v.Build + 1)"
}
$next = $next.Trim()
if ($next -notmatch '^\d+\.\d+\.\d+$') { Write-Error "Geçersiz versiyon: $next"; exit 1 }

$withSetup = Read-Host "Tam kurulum Setup.exe de üretilsin mi? (y/N)"
$wantSetup = $withSetup -match '^[yY]'

if (-not $env:GH_TOKEN) {
    $tok = Read-Host "GitHub token girmedin (GH_TOKEN). Token girmek ister misin? (bos = gh girisini kullan)"
    if (-not [string]::IsNullOrWhiteSpace($tok)) { $env:GH_TOKEN = $tok.Trim() }
}

Write-Host "`n==> version $current -> $next (setup: $wantSetup)"
$pkg.version = $next
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($pkgPath, ($pkg | ConvertTo-Json -Depth 100), $utf8NoBom)
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "`n==> build:win (typecheck + vite + electron-builder)..."
npm run build:win
if ($LASTEXITCODE -ne 0) { Write-Error "build:win başarısız"; exit 1 }

if ($wantSetup) {
    Write-Host "`n==> setup exe + latest.yml..."
    npx electron-builder --win nsis --x64 --publish never
    if ($LASTEXITCODE -ne 0) { Write-Error "setup üretimi başarısız"; exit 1 }
    $exe = Get-ChildItem (Join-Path $root "release") -Filter "*Setup-$next*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $exe) { $exe = Get-ChildItem (Join-Path $root "release") -Filter "*Setup $next*.exe" | Select-Object -First 1 }
    if ($exe) {
        $norm = Join-Path $root "release\Knots-Connect-Setup-$next.exe"
        if ($exe.FullName -ne $norm) { Move-Item $exe.FullName $norm -Force }
        $bm = Get-ChildItem (Join-Path $root "release") -Filter "$($exe.Name).blockmap" -ErrorAction SilentlyContinue
        if ($bm) { Move-Item $bm.FullName "$norm.blockmap" -Force }
        $yml = Join-Path $root "release\latest.yml"
        if (Test-Path $yml) {
            $c = Get-Content $yml -Raw
            $c = $c -replace [regex]::Escape((Get-Item $norm).Name), (Split-Path $norm -Leaf)
            $c | Set-Content $yml -Encoding UTF8
        }
    }
}

Write-Host "`n==> pack:zip..."
npm run pack:zip
if ($LASTEXITCODE -ne 0) { Write-Error "pack:zip başarısız"; exit 1 }

Write-Host "`n==> git commit + push (tag: v$next)..."
git add -A
git commit -m "chore: bump version to $next"
if ($LASTEXITCODE -ne 0) { Write-Error "git commit başarısız"; exit 1 }
git push origin main
if ($LASTEXITCODE -ne 0) { Write-Error "git push başarısız"; exit 1 }

Write-Host "`n==> GitHub release v$next..."
$updateZip = Join-Path $root "release\update-$next.zip"
$assets = @($updateZip)
if ($wantSetup) {
    $assets += (Join-Path $root "release\Knots-Connect-Setup-$next.exe")
    $assets += (Join-Path $root "release\Knots-Connect-Setup-$next.exe.blockmap")
    $assets += (Join-Path $root "release\latest.yml")
}
gh release create "v$next" @assets --title "Knots Connect $next" --notes "Knots Connect $next"
if ($LASTEXITCODE -ne 0) { Write-Error "gh release başarısız"; exit 1 }

Write-Host "`nDONE: https://github.com/egoland96-source/knots-connect-desktop/releases/tag/v$next"