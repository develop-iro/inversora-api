# Full Neon production sync: metadata -> 7y prices -> scoring
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$logDir = Join-Path $PSScriptRoot "..\logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$logFile = Join-Path $logDir "production-full-sync-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

function Write-Log {
  param([string]$Message)
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
  Add-Content -Path $logFile -Value $line
  Write-Output $line
}

Write-Log "Phase 1/3: metadata refresh for all persisted funds"
node scripts/run-with-profile.cjs pro npm run sync:run -- --metadata --no-prices --no-composition --no-scoring 2>&1 | Tee-Object -FilePath $logFile -Append
if ($LASTEXITCODE -ne 0) { Write-Log "Phase 1 failed with exit code $LASTEXITCODE"; exit $LASTEXITCODE }

Write-Log "Phase 2/3: 7-year price backfill for all US-listed funds"
node scripts/run-with-profile.cjs pro npm run sync:run -- --no-metadata --prices --no-composition --no-scoring --full-prices --from 2019-07-11 2>&1 | Tee-Object -FilePath $logFile -Append
if ($LASTEXITCODE -ne 0) { Write-Log "Phase 2 failed with exit code $LASTEXITCODE"; exit $LASTEXITCODE }

Write-Log "Phase 3/3: scoring recalculation"
node scripts/run-with-profile.cjs pro npm run sync:score 2>&1 | Tee-Object -FilePath $logFile -Append
if ($LASTEXITCODE -ne 0) { Write-Log "Phase 3 failed with exit code $LASTEXITCODE"; exit $LASTEXITCODE }

Write-Log "Production full sync completed successfully"
