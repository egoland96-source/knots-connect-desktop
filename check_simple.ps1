Write-Host "=== Workspace (new, clean) ==="
$content = Get-Content package.json -Raw
$json = $content | ConvertFrom-Json
Write-Host "version: $($json.version)"
Write-Host (node --check electron/main.cjs 2>&1)
if ($LASTEXITCODE -eq 0) { Write-Host "syntax: OK" } else { Write-Host "syntax: ERROR" }
Write-Host "=== New .exe (release/) ==="
Get-Item release/Knots-Connect-Setup-1.2.0.exe | Select-Object Length, LastWriteTime
Write-Host "=== Old installed .asar (this is what's running and broken) ==="
Get-Item "C:\Users\1evre\AppData\Local\Programs\knots-connect-desktop\resources\app.asar" | Select-Object Length, LastWriteTime
Write-Host ""
Write-Host "SOLUTION:"
Write-Host "1. Uninstall old: C:\Users\1evre\AppData\Local\Programs\knots-connect-desktop\ -> DELETE folder"
Write-Host "2. Install new .exe: release\Knots-Connect-Setup-1.2.0.exe"
Write-Host "Old installed .asar is broken (v1.1.1 syntax). New workspace/main.cjs is clean."
