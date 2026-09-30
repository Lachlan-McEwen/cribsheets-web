# Resend sending domain for Crib Sheets — does NOT change website (A/CNAME) or apex Private Email (MX/SPF).
# Prereq: RESEND_API_KEY in api/.env (or env var), and npx available.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File ./scripts/configure-resend-cribsheets.ps1
#   powershell -ExecutionPolicy Bypass -File ./scripts/configure-resend-cribsheets.ps1 -ApplyCloudflare
#
# -ApplyCloudflare requires CLOUDFLARE_API_TOKEN with Zone.DNS Edit on cribsheets.com.au

param(
  [string]$SendingSubdomain = "send",
  [string]$RootDomain = "cribsheets.com.au",
  [string]$ResendRegion = "ap-northeast-1",
  [switch]$ApplyCloudflare
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $repoRoot "api\.env"
$outFile = Join-Path $PSScriptRoot ".resend-domain.json"
$zoneId = "5e8e20080b50aade66655d484d9041a8"
$sendingDomain = "$SendingSubdomain.$RootDomain"

function Load-DotEnv([string]$path) {
  if (-not (Test-Path $path)) { return }
  Get-Content $path | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
    $name, $value = $_ -split '=', 2
    $name = $name.Trim()
    $value = $value.Trim().Trim('"')
    if ($name -eq "RESEND_API_KEY" -and $value -and -not $env:RESEND_API_KEY) {
      $env:RESEND_API_KEY = $value
    }
  }
}

Load-DotEnv $envFile
if (-not $env:RESEND_API_KEY) {
  Write-Error "RESEND_API_KEY missing. Add it to api/.env or run: npx resend-cli login"
}

Write-Host "Creating Resend domain: $sendingDomain (region $ResendRegion)"
$createJson = npx --yes resend-cli domains create --name $sendingDomain --region $ResendRegion --json 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host $createJson
  Write-Error "resend domains create failed (domain may already exist — try: npx resend-cli domains list --json)"
}

$domain = $createJson | ConvertFrom-Json
$domain | ConvertTo-Json -Depth 20 | Set-Content -Encoding utf8 $outFile
Write-Host "Saved Resend response to $outFile"

$records = @($domain.records)
if (-not $records -or $records.Count -eq 0) {
  $id = $domain.id
  if ($id) {
    Write-Host "Fetching DNS records for domain id $id"
    $getJson = npx --yes resend-cli domains get $id --json 2>&1
    if ($LASTEXITCODE -eq 0) {
      $fetched = $getJson | ConvertFrom-Json
      $records = @($fetched.records)
      $fetched | ConvertTo-Json -Depth 20 | Set-Content -Encoding utf8 $outFile
    }
  }
}

Write-Host ""
Write-Host "DNS records to ADD in Cloudflare (zone $RootDomain) — do not edit A/www/MX/apex SPF:"
foreach ($rec in $records) {
  $type = $rec.type
  $name = $rec.name
  $value = $rec.value
  if ($rec.content) { $value = $rec.content }
  Write-Host "  $type  $name  ->  $value"
}

Write-Host ""
Write-Host "Suggested api/.env:"
Write-Host "  EMAIL_FROM=Crib Sheets <noreply@$sendingDomain>"

if (-not $ApplyCloudflare) {
  Write-Host ""
  Write-Host "Next: add records in Cloudflare (or re-run with -ApplyCloudflare and CLOUDFLARE_API_TOKEN), then:"
  Write-Host "  npx resend-cli domains verify <domain-id>"
  exit 0
}

if (-not $env:CLOUDFLARE_API_TOKEN) {
  Write-Error "CLOUDFLARE_API_TOKEN is required for -ApplyCloudflare"
}

$headers = @{
  Authorization = "Bearer $env:CLOUDFLARE_API_TOKEN"
  "Content-Type" = "application/json"
}

foreach ($rec in $records) {
  $type = $rec.type
  $name = $rec.name
  $content = $rec.value
  if ($rec.content) { $content = $rec.content }
  if (-not $type -or -not $name -or -not $content) { continue }

  $body = @{
    type = $type
    name = $name
    content = $content
    ttl = 1
  }
  if ($type -eq "CNAME") { $body.proxied = $false }

  $payload = $body | ConvertTo-Json
  $uri = "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records"
  try {
    $resp = Invoke-RestMethod -Method POST -Uri $uri -Headers $headers -Body $payload
    if (-not $resp.success) {
      Write-Warning "Failed to create $type $name : $($resp.errors | ConvertTo-Json -Compress)"
    } else {
      Write-Host "Created $type $name"
    }
  } catch {
    Write-Warning "POST $type $name : $_"
  }
}

$id = $domain.id
if ($id) {
  Write-Host "Triggering Resend verification for $id"
  npx --yes resend-cli domains verify $id --json
}
