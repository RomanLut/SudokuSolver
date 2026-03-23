$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$CoreDir = Join-Path $Root "vendor\clips631\clips_core_source_631\core"
$OutDir = Join-Path $Root "public\wasm"
$LocalEmcc = Join-Path $Root ".emsdk\upstream\emscripten\emcc.bat"

$Emcc = $null
if (Test-Path $LocalEmcc) {
    $Emcc = $LocalEmcc
} elseif (Get-Command emcc -ErrorAction SilentlyContinue) {
    $Emcc = "emcc"
} else {
    throw "emcc was not found in PATH and no local .emsdk install was found. Install Emscripten before running this script."
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$SourceListFile = Join-Path $OutDir "clips-sources.rsp"
$sources = Get-ChildItem -Path $CoreDir -Filter *.c | ForEach-Object { $_.Name }
Set-Content -Path $SourceListFile -Value ($sources -join [Environment]::NewLine)

Push-Location $CoreDir
try {
    & $Emcc "@$SourceListFile" `
    -O2 `
    -s MODULARIZE=1 `
    -s EXPORT_NAME=createClipsModule `
    -s ENVIRONMENT=web,worker `
    -s FORCE_FILESYSTEM=1 `
    -s ALLOW_MEMORY_GROWTH=1 `
    -s EXIT_RUNTIME=1 `
    -s EMULATE_FUNCTION_POINTER_CASTS=1 `
    -s EXPORTED_RUNTIME_METHODS="['callMain','FS']" `
    -o (Join-Path $OutDir "clips.js")
} finally {
    Pop-Location
}

Write-Host "Built WebAssembly runtime in $OutDir"
