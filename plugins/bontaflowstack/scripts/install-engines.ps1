[CmdletBinding()]
param([string]$Archive, [string]$Sha256)
$ErrorActionPreference = 'Stop'
$OutputEncoding = [Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = $OutputEncoding
$pluginRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$lock = Get-Content -LiteralPath (Join-Path $pluginRoot 'engines.lock.json') -Raw | ConvertFrom-Json
if ($lock.schema -ne 1 -or $lock.version -notmatch '^\d+\.\d+\.\d+$') { throw 'Invalid engine release record.' }
if (-not (Get-Command node -CommandType Application -ErrorAction SilentlyContinue)) { throw 'Install Node.js 24+ first.' }
if (-not (Get-Command npm.cmd -CommandType Application -ErrorAction SilentlyContinue)) { throw 'Install Node.js with npm first.' }
if ($Archive) {
    if ($Sha256 -notmatch '^[a-fA-F0-9]{64}$') { throw 'A local archive requires its explicit SHA-256.' }
    $Archive = (Resolve-Path -LiteralPath $Archive).Path
} elseif ($lock.bundledArchive) {
    if ($lock.bundledArchive -notmatch '^engines/[a-zA-Z0-9._-]+\.zip$' -or $lock.sha256 -notmatch '^[a-f0-9]{64}$') { throw 'Invalid bundled engine archive record.' }
    $Archive = [IO.Path]::GetFullPath((Join-Path $pluginRoot $lock.bundledArchive))
    if (-not $Archive.StartsWith($pluginRoot + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw 'Bundled engine archive escapes the plugin.' }
    $archiveAncestor = $Archive
    while ($archiveAncestor) {
        if ((Test-Path -LiteralPath $archiveAncestor) -and ((Get-Item -LiteralPath $archiveAncestor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw "Bundled archive path contains a link: $archiveAncestor" }
        $archiveAncestor = [IO.Path]::GetDirectoryName($archiveAncestor)
    }
    if (-not (Test-Path -LiteralPath $Archive -PathType Leaf)) { throw 'The package is missing its bundled engine source archive.' }
    $Sha256 = $lock.sha256
} else {
    if ($lock.url -notmatch '^https://github\.com/BillBalint-SM/bontaflowstack-engines/releases/download/' -or $lock.sha256 -notmatch '^[a-f0-9]{64}$') { throw 'The engine release URL or checksum is invalid.' }
    $Sha256 = $lock.sha256
}
$stateHome = if ($env:BFS_STATE_HOME) { [IO.Path]::GetFullPath($env:BFS_STATE_HOME) } else { Join-Path $env:LOCALAPPDATA 'BontaFlowStack/state/v2' }
$installBase = [IO.Path]::GetFullPath((Join-Path $stateHome 'engines'))
$installRoot = [IO.Path]::GetFullPath((Join-Path $installBase ($lock.version + '-' + $Sha256.Substring(0,16).ToLowerInvariant())))
if (-not $installRoot.StartsWith($installBase + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw 'Engine target escapes the installation directory.' }
$ancestor = $installRoot
while ($ancestor) {
    if ((Test-Path -LiteralPath $ancestor) -and ((Get-Item -LiteralPath $ancestor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw "Installation path contains a link: $ancestor" }
    $ancestor = [IO.Path]::GetDirectoryName($ancestor)
}
[IO.Directory]::CreateDirectory($installBase) | Out-Null
$download = $null
try {
    if (-not $Archive) {
        $download = Join-Path $installBase ([guid]::NewGuid().ToString() + '.zip')
        Invoke-WebRequest -Uri $lock.url -OutFile $download -UseBasicParsing
        $Archive = $download
    }
    if ((Get-FileHash -LiteralPath $Archive -Algorithm SHA256).Hash -ne $Sha256) { throw 'Engine archive checksum does not match. No source was executed.' }
    if (-not (Test-Path -LiteralPath (Join-Path $installRoot 'engine.json'))) {
        if (Test-Path -LiteralPath $installRoot) { throw "An incomplete installation exists at $installRoot. Inspect it before retrying; it was preserved." }
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        $zip = [IO.Compression.ZipFile]::OpenRead($Archive)
        try {
            $seen = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
            [long]$size = 0
            foreach ($entry in $zip.Entries) {
                $name = $entry.FullName.Replace('\','/')
                if ($name.StartsWith('/') -or $name -match '(^|/)\.\.?(/|$)|:|[<>"|?*]' -or (($entry.ExternalAttributes -shr 16) -band 0xF000) -eq 0xA000) { throw "Unsafe archive entry: $name" }
                $target = [IO.Path]::GetFullPath((Join-Path $installRoot $name))
                if (-not $target.StartsWith($installRoot + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase) -or -not $seen.Add($target)) { throw "Invalid or repeated archive entry: $name" }
                $size += $entry.Length
                if ($size -gt 536870912 -or $seen.Count -gt 10000) { throw 'Engine source archive exceeds the supported size.' }
            }
        } finally { $zip.Dispose() }
        [IO.Compression.ZipFile]::ExtractToDirectory($Archive,$installRoot)
        $build = Join-Path $installRoot 'scripts/build.ps1'
        if (-not (Test-Path -LiteralPath $build)) { throw 'The archive has no engine build entry point.' }
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $build -Install -InstallBrowser
        if ($LASTEXITCODE -ne 0) { throw "Engine build failed ($LASTEXITCODE). Files were preserved at $installRoot." }
    }
    $manifest = Join-Path $installRoot 'engine.json'
    $metadata = Get-Content -LiteralPath $manifest -Raw | ConvertFrom-Json
    if ($metadata.version -ne $lock.version) { throw 'Built engine version differs from the selected release.' }
    $request = @{root=$installRoot;sha256=(Get-FileHash -LiteralPath $manifest -Algorithm SHA256).Hash.ToLowerInvariant()} | ConvertTo-Json -Compress
    $request | & node (Join-Path $pluginRoot 'core/cli.mjs') engine register --input -
    if ($LASTEXITCODE -ne 0) { throw 'Engine verification or registration failed.' }
    & node (Join-Path $pluginRoot 'core/cli.mjs') engine status
    if ($LASTEXITCODE -ne 0) { throw 'Engine status check failed.' }
} finally {
    if ($download -and (Test-Path -LiteralPath $download)) { Remove-Item -LiteralPath $download -Force }
}
