param([Parameter(Mandatory)][string]$SourceDirectory, [Parameter(Mandatory)][string]$ZipPath)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
$releaseRoot = [IO.Path]::GetFullPath((Get-Location).Path)
$releaseSource = [IO.Path]::GetFullPath($SourceDirectory)
$releaseZip = [IO.Path]::GetFullPath($ZipPath)
if ($releaseSource -ne (Join-Path $releaseRoot 'dist-poki')) { throw 'Expected workspace dist-poki source' }
if ($releaseZip -ne (Join-Path $releaseRoot 'night-market-poki-rc-v1.zip')) { throw 'Expected workspace RC ZIP path' }
if (!(Test-Path -LiteralPath (Join-Path $releaseSource 'index.html'))) { throw 'Missing root index.html' }
if (Test-Path -LiteralPath $releaseZip) { Remove-Item -LiteralPath $releaseZip }
$releaseStream = [IO.File]::Open($releaseZip, [IO.FileMode]::CreateNew)
$releaseArchive = [IO.Compression.ZipArchive]::new($releaseStream, [IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($releaseFile in (Get-ChildItem -LiteralPath $releaseSource -Recurse -File | Sort-Object FullName)) {
    $releaseName = [IO.Path]::GetRelativePath($releaseSource, $releaseFile.FullName).Replace('\', '/')
    $releaseEntry = $releaseArchive.CreateEntry($releaseName, [IO.Compression.CompressionLevel]::Optimal)
    $releaseEntry.LastWriteTime = [DateTimeOffset]::new(1980, 1, 1, 0, 0, 0, [TimeSpan]::Zero)
    $releaseInput = [IO.File]::OpenRead($releaseFile.FullName)
    $releaseOutput = $releaseEntry.Open()
    try { $releaseInput.CopyTo($releaseOutput) } finally { $releaseInput.Dispose(); $releaseOutput.Dispose() }
  }
} finally { $releaseArchive.Dispose(); $releaseStream.Dispose() }
# Verify the ZIP root and every expanded entry byte-for-byte against dist-poki.
$releaseVerify = [IO.Compression.ZipFile]::OpenRead($releaseZip)
try {
  if (!$releaseVerify.GetEntry('index.html')) { throw 'ZIP root index.html missing' }
  foreach ($releaseEntry in $releaseVerify.Entries) {
    if ($releaseEntry.FullName -ne 'index.html' -and !$releaseEntry.FullName.StartsWith('assets/')) { throw "Unexpected ZIP entry: $($releaseEntry.FullName)" }
    $releaseReader = $releaseEntry.Open()
    $releaseHash = [Security.Cryptography.SHA256]::Create()
    try { $releaseDigest = [Convert]::ToHexString($releaseHash.ComputeHash($releaseReader)) } finally { $releaseReader.Dispose(); $releaseHash.Dispose() }
    $releaseExpected = (Get-FileHash -LiteralPath (Join-Path $releaseSource $releaseEntry.FullName) -Algorithm SHA256).Hash
    if ($releaseDigest -ne $releaseExpected) { throw "ZIP byte mismatch: $($releaseEntry.FullName)" }
  }
  Write-Output "Verified $($releaseVerify.Entries.Count) root-relative ZIP entries."
} finally { $releaseVerify.Dispose() }
