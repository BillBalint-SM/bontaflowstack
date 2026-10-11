[CmdletBinding()]
param([string]$OutputDirectory, [switch]$Release, [switch]$SkipChecks,
    [string]$Candidate, [string]$EvidenceDirectory, [string]$Policy, [string]$Report)
$ErrorActionPreference = 'Stop'
if ($Release -and $SkipChecks) { throw 'Release packaging requires the package checks.' }
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if ($Release) {
    if (-not $Candidate -or -not $EvidenceDirectory) { throw 'Release requires -Candidate and -EvidenceDirectory. See scripts/release.mjs help.' }
    if (-not $OutputDirectory) { $OutputDirectory = Join-Path $repoRoot 'artifacts/releases' }
    $releaseArguments = @((Join-Path $PSScriptRoot 'release.mjs'),'finalize','--candidate',$Candidate,'--evidence',$EvidenceDirectory,'--output',$OutputDirectory)
    if ($Policy) { $releaseArguments += @('--policy',$Policy) }
    if ($Report) { $releaseArguments += @('--report',$Report) }
    & node @releaseArguments
    if ($LASTEXITCODE -ne 0) { throw 'Release gate rejected finalization; inspect its JSON diagnostic report.' }
    exit 0
}
$status = @(& git -C $repoRoot status --porcelain --untracked-files=all)
if ($LASTEXITCODE -ne 0) { throw 'Build from the source Git checkout.' }
$dirty = $status.Count -gt 0
if (-not $OutputDirectory) { $OutputDirectory = Join-Path $repoRoot 'artifacts' }
$OutputDirectory = [IO.Path]::GetFullPath($OutputDirectory)
if (-not $SkipChecks) {
    & node (Join-Path $PSScriptRoot 'check.mjs')
    if ($LASTEXITCODE -ne 0) { throw 'Package checks failed.' }
}
$status = @(& git -C $repoRoot status --porcelain --untracked-files=all)
if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect source status.' }
$dirty = $status.Count -gt 0
$manifest = Get-Content -LiteralPath (Join-Path $repoRoot 'plugins/bontaflowstack/.codex-plugin/plugin.json') -Raw | ConvertFrom-Json
$version = $manifest.version
if ($version -notmatch '^\d+\.\d+\.\d+$') { throw 'Use a release version without a development suffix.' }
$files = @(& git -C $repoRoot ls-files --cached --others --exclude-standard) | Where-Object {
    $_ -match '^(plugins/bontaflowstack/(\.codex-plugin/|\.mcp\.json$|engines/|core/|skills/|references/|scripts/|hooks/|catalog\.json$|engines\.lock\.json$|HOST\.md$|LICENSE$)|\.agents/plugins/|\.github/|release/(policy\.json$|desktop-acceptance\.md$|desktop-fixture\.html$)|docs/|tasks/|scripts/|tests/|README\.md$|TELEPITES\.md$|LICENSE$|CONTEXT\.md$|AGENTS\.md$|\.gitignore$|\.gitattributes$)' -and (Test-Path -LiteralPath (Join-Path $repoRoot $_) -PathType Leaf)
} | Sort-Object -Unique
if ($LASTEXITCODE -ne 0 -or $files.Count -lt 50) { throw 'Build from the source Git checkout.' }
$head = & git -C $repoRoot rev-parse HEAD
[IO.Directory]::CreateDirectory($OutputDirectory) | Out-Null
$zipPath = Join-Path $OutputDirectory "BontaFlowStack-$version-source.zip"
if (Test-Path -LiteralPath $zipPath) { throw "Output exists; choose a new output directory: $zipPath" }
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$zip = [IO.Compression.ZipFile]::Open($zipPath,[IO.Compression.ZipArchiveMode]::Create)
$hashes = [ordered]@{}
try {
    foreach ($file in $files) {
        $source = Join-Path $repoRoot $file
        if ((Get-Item -LiteralPath $source).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Cannot package a link: $file" }
        $hashes[$file] = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant()
        [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip,$source,$file,[IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
    $entry = $zip.CreateEntry('PACKAGE.json')
    $writer = [IO.StreamWriter]::new($entry.Open(),[Text.UTF8Encoding]::new($false))
    try { $writer.Write((@{schema=1;version=$version;commit=$head;dirty=$dirty;checks=$(if ($SkipChecks) {'not-run'} else {'passed'});files=$hashes} | ConvertTo-Json -Depth 5)) } finally { $writer.Dispose() }
} finally { $zip.Dispose() }
$hash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
[IO.File]::WriteAllText($zipPath + '.sha256',"$hash  $([IO.Path]::GetFileName($zipPath))`n",[Text.UTF8Encoding]::new($false))
@{archive=$zipPath;sha256=$hash;files=$files.Count;commit=$head;dirty=$dirty} | ConvertTo-Json -Compress
