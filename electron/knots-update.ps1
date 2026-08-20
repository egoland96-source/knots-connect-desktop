param(
  [string]$staged = '',
  [string]$target = '',
  [string]$exe = '',
  [switch]$rollback
)
$ErrorActionPreference = 'Stop'

$procName = [System.IO.Path]::GetFileNameWithoutExtension($exe)
$deadline = (Get-Date).AddSeconds(90)
while ((Get-Process -Name $procName -ErrorAction SilentlyContinue) -and (Get-Date) -lt $deadline) {
  Start-Sleep -Seconds 2
}
Start-Sleep -Seconds 2

try {
  if ($rollback) {
    $bak = "$target.bak"
    if (Test-Path -LiteralPath $bak) {
      if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Recurse -Force }
      Move-Item -LiteralPath $bak -Destination $target
      Start-Process -FilePath $exe
      exit 0
    }
    exit 1
  }

  if (-not (Test-Path -LiteralPath $staged)) { exit 1 }
  $bak = "$target.bak"
  if (Test-Path -LiteralPath $bak) { Remove-Item -LiteralPath $bak -Recurse -Force }
  if (Test-Path -LiteralPath $target) { Move-Item -LiteralPath $target -Destination $bak }
  Move-Item -LiteralPath (Join-Path $staged 'resources') -Destination $target
  Remove-Item -LiteralPath (Split-Path $staged -Parent) -Recurse -Force -ErrorAction SilentlyContinue
  Start-Process -FilePath $exe
  exit 0
} catch {
  if (Test-Path -LiteralPath (Join-Path $staged 'resources')) {
    if (Test-Path -LiteralPath "$target.bak") {
      if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Recurse -Force }
      Move-Item -LiteralPath "$target.bak" -Destination $target
    }
  }
  exit 1
}