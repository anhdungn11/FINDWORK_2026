param(
  [string]$EnvFile = (Join-Path $PSScriptRoot '..\.env.employer-media.local')
)

$ErrorActionPreference = 'Stop'
$failures = [System.Collections.Generic.List[string]]::new()

if (-not (Test-Path -LiteralPath $EnvFile -PathType Leaf)) {
  Write-Output 'FAIL: isolated environment file is missing. Copy .env.employer-media.example to .env.employer-media.local.'
  exit 1
}

$settings = @{}
foreach ($line in Get-Content -LiteralPath $EnvFile) {
  $trimmed = $line.Trim()
  if (-not $trimmed -or $trimmed.StartsWith('#')) { continue }
  $pair = $trimmed.Split('=', 2)
  if ($pair.Count -ne 2) { $failures.Add('Invalid environment file line.'); continue }
  $settings[$pair[0].Trim()] = $pair[1].Trim()
}

if ($settings.NODE_ENV -ne 'test') { $failures.Add('NODE_ENV must be test to bind Backend to 127.0.0.1.') }
if ($settings.PORT -ne '3002') { $failures.Add('Backend PORT must be 3002.') }
if ($settings.API_PREFIX -ne 'api/v1') { $failures.Add('API_PREFIX must be api/v1.') }
$origins = @($settings.CORS_ORIGINS -split ',' | ForEach-Object { $_.Trim() })
if ($origins -notcontains 'http://127.0.0.1:5177' -or $origins -contains '*') {
  $failures.Add('CORS_ORIGINS must include http://127.0.0.1:5177 without a wildcard.')
}

try {
  $database = [uri]$settings.DATABASE_URL
  $dbName = [uri]::UnescapeDataString($database.AbsolutePath.TrimStart('/'))
  if ($database.Scheme -ne 'postgresql' -or $database.Host -ne '127.0.0.1' -or
      $database.Port -ne 5432 -or $dbName -ne 'findwork_employer_media_3002' -or
      $database.Query.TrimStart('?') -notmatch '(^|&)schema=public(&|$)' -or
      $database.UserInfo -match 'REPLACE_ME|CHANGE_ME|UNCONFIGURED') {
    $failures.Add('DATABASE_URL must name only 127.0.0.1:5432/findwork_employer_media_3002/public with real isolated credentials.')
  }
} catch { $failures.Add('DATABASE_URL is invalid.') }

foreach ($name in @('JWT_ACCESS_SECRET', 'REFRESH_TOKEN_PEPPER')) {
  if (-not $settings[$name] -or $settings[$name].Length -lt 32 -or $settings[$name] -match 'REPLACE|CHANGE_ME') {
    $failures.Add("$name must be a distinct random secret of at least 32 characters.")
  }
}
if ($settings.JWT_ACCESS_SECRET -eq $settings.REFRESH_TOKEN_PEPPER) {
  $failures.Add('JWT_ACCESS_SECRET and REFRESH_TOKEN_PEPPER must differ.')
}
if ($settings.EMAIL_DELIVERY_MODE -ne 'disabled' -or $settings.EMAIL_WORKER_ENABLED -ne 'false' -or
    $settings.EMAIL_INVITATION_DELIVERY_ENABLED -ne 'false') {
  $failures.Add('External email delivery and worker must be disabled in this isolated environment.')
}

$storagePath = $settings.COMPANY_MEDIA_STORAGE_DIR
if (-not $storagePath -or -not [IO.Path]::IsPathRooted($storagePath) -or
    -not (Test-Path -LiteralPath $storagePath -PathType Container)) {
  $failures.Add('COMPANY_MEDIA_STORAGE_DIR must be an existing absolute directory outside Git.')
} else {
  $resolvedStorage = (Resolve-Path -LiteralPath $storagePath).Path.TrimEnd('\')
  $repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path.TrimEnd('\')
  if ($resolvedStorage.StartsWith($repoRoot + '\', [StringComparison]::OrdinalIgnoreCase) -or
      $resolvedStorage -eq $repoRoot) { $failures.Add('Media storage must be outside the Git worktree.') }
  $item = Get-Item -LiteralPath $resolvedStorage
  if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
    $failures.Add('Media storage root must not be a junction or symbolic link.')
  }
  try {
    $acl = Get-Acl -LiteralPath $resolvedStorage
    $allowed = @($acl.Owner, 'NT AUTHORITY\SYSTEM', 'BUILTIN\Administrators')
    foreach ($entry in $acl.Access) {
      if ($entry.AccessControlType -eq 'Allow' -and $allowed -notcontains $entry.IdentityReference.Value) {
        $failures.Add('Media storage has an additional access grant; review its ACL before starting.')
        break
      }
    }
  } catch { $failures.Add('Cannot read media storage ACL with the current account.') }
}

foreach ($port in @(3002, 5177)) {
  if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
    $failures.Add("Port $port is already in use; do not terminate an unidentified process.")
  }
}

if ($failures.Count -gt 0) {
  $failures | ForEach-Object { Write-Output "FAIL: $_" }
  exit 1
}
Write-Output 'PASS: isolated Backend 3002 / Frontend 5177 configuration, private media directory and port availability.'
Write-Output 'Database provisioning, migrations and HTTP acceptance remain separate approval gates.'
