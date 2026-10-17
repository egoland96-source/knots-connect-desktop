# PowerShell script to launch VPN server and DPI engine together
# Adjust the paths below to match your VPN executable and DPI binary.

$vpnPath = "C:/Dev/knots-vpn-desktop-v3/backend/vpn_server.exe"  # <-- replace with actual VPN server executable
$dpiPath = "C:/Dev/knots-vpn-desktop-v3/backend/k_main.exe"

# Optional: arguments for VPN server (e.g., config file)
$vpnArgs = "--config C:/Dev/knots-vpn-desktop-v3/backend/vpn_config.json"

# Optional: arguments for DPI engine (enable techniques)
$dpiArgs = "--ttl-fake --sni-split"

Write-Host "Starting VPN server..."
$vpnProcess = Start-Process -FilePath $vpnPath -ArgumentList $vpnArgs -PassThru
if ($vpnProcess -eq $null) {
    Write-Error "Failed to start VPN server. Check the path and arguments."
    exit 1
}

# Wait a moment to ensure VPN is up
Start-Sleep -Seconds 3

Write-Host "Starting DPI engine..."
$dpiProcess = Start-Process -FilePath $dpiPath -ArgumentList $dpiArgs -PassThru
if ($dpiProcess -eq $null) {
    Write-Error "Failed to start DPI engine."
    # Optionally stop VPN
    Stop-Process -Id $vpnProcess.Id -Force
    exit 1
}

Write-Host "Both VPN and DPI engine are running. Press Ctrl+C to stop."
# Wait for both processes to exit (or interrupt)
Wait-Process -Id $vpnProcess.Id, $dpiProcess.Id

Write-Host "Processes terminated."
