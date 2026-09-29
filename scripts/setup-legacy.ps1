$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$legacyDir = Join-Path $root 'legacy'
$linkPath = Join-Path $legacyDir 'CribSheets'
$target = Resolve-Path (Join-Path $root '..\CribSheets')

if (-not (Test-Path $target)) {
    throw "Legacy target not found: $target"
}

New-Item -ItemType Directory -Force -Path $legacyDir | Out-Null

if (Test-Path $linkPath) {
    $item = Get-Item $linkPath
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
        Write-Host "legacy\CribSheets junction already exists."
        exit 0
    }
    throw "legacy\CribSheets exists and is not a junction. Remove or rename it first."
}

cmd /c "mklink /J `"$linkPath`" `"$target`""
Write-Host "Created junction: $linkPath -> $target"
