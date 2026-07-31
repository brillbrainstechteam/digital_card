# Redeploys the digital-card app to the VPS.
# Usage: right-click > Run with PowerShell, or: powershell -ExecutionPolicy Bypass -File deploy.ps1

$ErrorActionPreference = "Stop"

$base = $PSScriptRoot
$staging = Join-Path $base "_deploy_staging"
$zipPath = Join-Path $base "digital-card-deploy.zip"
$sshKey = "$env:USERPROFILE\.ssh\vps_deploy_key"
$vpsHost = "root@187.127.176.187"
$remoteApp = "/home/digital-card/app"

Write-Host "== 1/6 Building frontend ==" -ForegroundColor Cyan
Set-Location $base
npm run build

Write-Host "== 2/6 Staging files ==" -ForegroundColor Cyan
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Path $staging | Out-Null
New-Item -ItemType Directory -Path (Join-Path $staging "dist") | Out-Null
New-Item -ItemType Directory -Path (Join-Path $staging "server") | Out-Null

Copy-Item -Path (Join-Path $base "dist\*") -Destination (Join-Path $staging "dist") -Recurse
Copy-Item -Path (Join-Path $base "server\src") -Destination (Join-Path $staging "server\src") -Recurse
Copy-Item -Path (Join-Path $base "server\package.json") -Destination (Join-Path $staging "server\package.json")
Copy-Item -Path (Join-Path $base "server\package-lock.json") -Destination (Join-Path $staging "server\package-lock.json")
Copy-Item -Path (Join-Path $base "server\.env.production") -Destination (Join-Path $staging "server\.env")
Copy-Item -Path (Join-Path $base "ecosystem.config.js") -Destination (Join-Path $staging "ecosystem.config.js")

Write-Host "== 3/6 Zipping ==" -ForegroundColor Cyan
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path (Join-Path $staging "*") -DestinationPath $zipPath
Remove-Item $staging -Recurse -Force

Write-Host "== 4/6 Uploading to VPS ==" -ForegroundColor Cyan
scp -i $sshKey $zipPath "${vpsHost}:$remoteApp/deploy.zip"

Write-Host "== 5/6 Extracting + installing on VPS ==" -ForegroundColor Cyan
ssh -i $sshKey $vpsHost "cd $remoteApp && unzip -o deploy.zip -d . ; rm -f deploy.zip && cd server && npm install --omit=dev"

Write-Host "== 6/6 Restarting PM2 ==" -ForegroundColor Cyan
ssh -i $sshKey $vpsHost "pm2 restart digital-card"

Remove-Item $zipPath -Force

Write-Host ""
Write-Host "Deployed. Checking health..." -ForegroundColor Green
Start-Sleep -Seconds 2
try {
  Invoke-RestMethod -Uri "https://digitalcard.brillbrainsconsultants.com/api/health"
} catch {
  Write-Host "Health check failed - check 'ssh -i $sshKey $vpsHost pm2 logs digital-card'" -ForegroundColor Red
}
