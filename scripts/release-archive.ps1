[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][ValidateSet('Inspect','Pack')][string]$Mode,
    [Parameter(Mandatory=$true)][string]$Archive,
    [string]$Source,
    [string]$Destination
)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$Archive=[IO.Path]::GetFullPath($Archive)
if ($Mode -eq 'Pack') {
    if (-not $Source -or (Test-Path -LiteralPath $Archive)) { throw 'Pack requires a source and an unused archive path.' }
    $sourceRoot=[IO.Path]::GetFullPath($Source).TrimEnd([IO.Path]::DirectorySeparatorChar)
    $created=[IO.Compression.ZipFile]::Open($Archive,[IO.Compression.ZipArchiveMode]::Create)
    try {
        foreach ($file in (Get-ChildItem -LiteralPath $sourceRoot -Recurse -File -Force)) {
            if ($file.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Source contains a link.' }
            $name=$file.FullName.Substring($sourceRoot.Length + 1).Replace('\','/')
            [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($created,$file.FullName,$name,[IO.Compression.CompressionLevel]::Optimal) | Out-Null
        }
    } finally { $created.Dispose() }
}
$zip=[IO.Compression.ZipFile]::OpenRead($Archive)
try {
    $names=[Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    [long]$size=0
    foreach ($entry in $zip.Entries) {
        $name=$entry.FullName
        if ($name -match '(^/|\\|:|(^|/)\.\.?(/|$)|[<>"|?*])' -or -not $names.Add($name) -or
            (($entry.ExternalAttributes -shr 16) -band 0xF000) -eq 0xA000) { throw "Unsafe or duplicate ZIP entry: $name" }
        $size += $entry.Length
        if ($size -gt 536870912 -or $names.Count -gt 10000) { throw 'Archive exceeds package limits.' }
    }
    $entry=$zip.GetEntry('PACKAGE.json')
    if (-not $entry -or $entry.Length -gt 16777216) { throw 'PACKAGE.json is missing or too large.' }
    $reader=[IO.StreamReader]::new($entry.Open())
    try { $package=$reader.ReadToEnd() | ConvertFrom-Json } finally { $reader.Dispose() }
    if ($package.schema -ne 1 -or $package.version -notmatch '^\d+\.\d+\.\d+$' -or -not $package.files) { throw 'Invalid package manifest.' }
    $files=@($package.files.PSObject.Properties)
    if ($files.Count + 1 -ne $names.Count) { throw 'Archive inventory mismatch.' }
    foreach ($file in $files) {
        $entry=$zip.GetEntry($file.Name)
        if (-not $entry -or $file.Value -notmatch '^[a-f0-9]{64}$') { throw "Missing/invalid inventory entry: $($file.Name)" }
        $stream=$entry.Open()
        $sha=[Security.Cryptography.SHA256]::Create()
        try { $actual=([BitConverter]::ToString($sha.ComputeHash($stream))).Replace('-','').ToLowerInvariant() }
        finally { $stream.Dispose();$sha.Dispose() }
        if ($actual -ne $file.Value) { throw "Archive file changed: $($file.Name)" }
    }
} finally { $zip.Dispose() }
if ($Destination) {
    if (Test-Path -LiteralPath $Destination) { throw 'Extract destination must not exist.' }
    [IO.Compression.ZipFile]::ExtractToDirectory($Archive,[IO.Path]::GetFullPath($Destination))
}
@{archiveSha256=(Get-FileHash -LiteralPath $Archive -Algorithm SHA256).Hash.ToLowerInvariant();version=$package.version;files=$package.files} | ConvertTo-Json -Depth 6 -Compress
