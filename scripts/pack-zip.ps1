$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$pkg = Get-Content (Join-Path $root 'package.json') | ConvertFrom-Json
$version = $pkg.version
$unpacked = Join-Path $root "release\win-unpacked"
if (-not (Test-Path $unpacked)) { Write-Error "win-unpacked not found: $unpacked"; exit 1 }

$fullZip = Join-Path $root "release\Knots-Connect-$version.zip"
$updateZip = Join-Path $root "release\update-$version.zip"

if (Test-Path $fullZip) { Remove-Item $fullZip -Force }
if (Test-Path $updateZip) { Remove-Item $updateZip -Force }

Write-Output "packing full zip..."
Add-Type -AssemblyName System.IO.Compression.FileSystem
$tmpFull = Join-Path $root "release\.tmp-full-$version"
$tmpUpd = Join-Path $root "release\.tmp-upd-$version"
if (Test-Path $tmpFull) { Remove-Item $tmpFull -Recurse -Force }
if (Test-Path $tmpUpd) { Remove-Item $tmpUpd -Recurse -Force }
New-Item -ItemType Directory -Path $tmpFull | Out-Null
New-Item -ItemType Directory -Path (Join-Path $tmpUpd 'resources') | Out-Null

Copy-Item -Path (Join-Path $unpacked '*') -Destination $tmpFull -Recurse -Force
Copy-Item -Path (Join-Path $unpacked 'resources\*') -Destination (Join-Path $tmpUpd 'resources') -Recurse -Force

[System.IO.Compression.ZipFile]::CreateFromDirectory($tmpFull, $fullZip, [System.IO.Compression.CompressionLevel]::Optimal, $false)
Write-Output "full zip: $((Get-Item $fullZip).Length) bytes"

[System.IO.Compression.ZipFile]::CreateFromDirectory($tmpUpd, $updateZip, [System.IO.Compression.CompressionLevel]::Optimal, $false)
Write-Output "update zip: $((Get-Item $updateZip).Length) bytes"

Remove-Item $tmpFull -Recurse -Force
Remove-Item $tmpUpd -Recurse -Force
Write-Output "DONE"