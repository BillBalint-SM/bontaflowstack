[CmdletBinding()]
param([string]$Archive, [string]$Sha256)
$ErrorActionPreference = 'Stop'
$OutputEncoding = [Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = $OutputEncoding
$installerArgs = @()
if ($Archive) { $installerArgs += @('--archive', $Archive) }
if ($Sha256) { $installerArgs += @('--sha256', $Sha256) }
& node (Join-Path $PSScriptRoot 'install-engines.mjs') @installerArgs
exit $LASTEXITCODE
