param(
  [string]$FrontendOrigin = 'http://localhost:5176'
)

$ErrorActionPreference = 'Stop'
$envPath = Join-Path (Split-Path $PSScriptRoot -Parent) '.env'
$failed = $false

function Report([string]$label, [bool]$ok, [string]$detail) {
  if ($ok) { Write-Host "PASS $label - $detail" }
  else { Write-Host "FAIL $label - $detail"; $script:failed = $true }
}

if (-not (Test-Path -LiteralPath $envPath)) {
  Report 'DEV config' $false 'server/.env is missing.'
  exit 1
}

$values = @{}
foreach ($line in Get-Content -LiteralPath $envPath) {
  if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$') {
    $values[$matches[1]] = $matches[2].Trim('"', "'")
  }
}

$configOk = $values['NODE_ENV'] -eq 'development' -and
  $values['PORT'] -eq '3000' -and
  $values['API_PREFIX'] -eq 'api/v1'
Report 'DEV config' $configOk 'Expected NODE_ENV=development, PORT=3000, API_PREFIX=api/v1.'

$databaseUrl = $values['DATABASE_URL']
$databaseOk = $databaseUrl -match '^postgres(?:ql)?://[^/\s]+@127\.0\.0\.1:5432/findwork_dev\?[^\s#]*' -and
  $databaseUrl -match '[?&]schema=public(&|$)'
Report 'Database target' $databaseOk 'Expected 127.0.0.1:5432/findwork_dev/public; credentials are not printed.'

$origins = @($values['CORS_ORIGINS'] -split ',' | ForEach-Object { $_.Trim() })
Report 'Frontend origin config' ($origins -contains $FrontendOrigin) "Expected $FrontendOrigin in CORS_ORIGINS."

$base = 'http://127.0.0.1:3000/api/v1'
foreach ($check in @(
  @{ Name = 'Health and PostgreSQL'; Path = '/health'; Kind = 'health' },
  @{ Name = 'Public jobs'; Path = '/jobs?page=1&pageSize=1'; Kind = 'list' },
  @{ Name = 'Public companies'; Path = '/companies?page=1&pageSize=1'; Kind = 'list' }
)) {
  try {
    $response = Invoke-RestMethod -Method Get -Uri ($base + $check.Path) -TimeoutSec 5
    if ($check.Kind -eq 'health') {
      $ok = $response.status -eq 'ok' -and $response.database -eq 'up'
    } else {
      $ok = $null -ne $response.data -and $null -ne $response.pagination
    }
    Report $check.Name $ok 'HTTP 200 with expected response shape.'
  } catch {
    Report $check.Name $false 'HTTP or response check failed.'
  }
}

try {
  $preflight = Invoke-WebRequest -Method Options -Uri ($base + '/auth/login') -Headers @{
    Origin = $FrontendOrigin
    'Access-Control-Request-Method' = 'POST'
  } -UseBasicParsing -TimeoutSec 5
  Report 'Frontend CORS' ($preflight.StatusCode -eq 204 -and
    $preflight.Headers['Access-Control-Allow-Origin'] -eq $FrontendOrigin) 'Auth preflight permits the configured origin.'
} catch {
  Report 'Frontend CORS' $false 'Auth preflight failed.'
}

if ($failed) {
  Write-Host 'DEMO_CHECK: FAIL. Correct config or start the existing Backend from server/ with npm run start:dev; do not stop an unidentified process.'
  exit 1
}
Write-Host 'DEMO_CHECK: PASS. This script made only read-only HTTP requests.'
