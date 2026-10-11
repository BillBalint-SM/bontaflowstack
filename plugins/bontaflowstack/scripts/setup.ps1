[CmdletBinding()]
param([switch]$WithEngines, [switch]$InstallPrerequisites)
$ErrorActionPreference = 'Stop'
$OutputEncoding = [Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = $OutputEncoding
$pluginRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if ($env:OS -ne 'Windows_NT' -or -not [Environment]::Is64BitOperatingSystem) { throw 'BontaFlowStack requires Windows x64.' }
function Require-Program([string]$Name, [string]$Package) {
    if (Get-Command $Name -CommandType Application -ErrorAction SilentlyContinue) { return }
    if (-not $InstallPrerequisites) { throw "$Name is missing. Install it, or rerun setup with -InstallPrerequisites. Package: $Package" }
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) { throw "Install $Name and reopen PowerShell; Windows Package Manager is unavailable." }
    & winget install --id $Package --exact --source winget --silent --disable-interactivity
    if ($LASTEXITCODE -ne 0) { throw "Installation of $Name failed ($LASTEXITCODE). Complete the package manager instructions and retry." }
    $env:PATH = [Environment]::GetEnvironmentVariable('PATH','Machine') + ';' + [Environment]::GetEnvironmentVariable('PATH','User')
    if (-not (Get-Command $Name -CommandType Application -ErrorAction SilentlyContinue)) { throw "Reopen PowerShell after installing $Name, then rerun setup." }
}
Require-Program 'node' 'OpenJS.NodeJS.LTS'
$nodeVersion = & node --version
if ($LASTEXITCODE -ne 0 -or ([version]$nodeVersion.TrimStart('v')).Major -lt 24) { throw 'Install Node.js 24 or newer, then rerun setup.' }
if ($WithEngines) {
    & (Join-Path $PSScriptRoot 'install-engines.ps1')
    if ($LASTEXITCODE -ne 0) { throw 'Optional engine setup failed.' }
}
& node (Join-Path $pluginRoot 'core/cli.mjs') doctor
if ($LASTEXITCODE -ne 0) { throw 'BontaFlowStack core check failed.' }
if ($WithEngines) {
    & node (Join-Path $pluginRoot 'core/cli.mjs') doctor bfs-browse
    if ($LASTEXITCODE -ne 0) { throw 'Browser capability is unavailable after setup.' }
}
Write-Host 'Setup complete. In Codex, use $bfs-router. Installed plugin changes are loaded in a new chat.'
Write-Host 'Review and trust PreToolUse and Stop in Codex /hooks to enable protection and interruption tracking.'
if ($WithEngines) {
    Write-Host 'Enable this plugin browser MCP connection in Codex. Engine file readiness does not verify browser launch.'
    Write-Host 'Keep Chromium sandbox enabled. Browser/render use the host MCP connection, not the MXC shell.'
    Write-Host 'The browser uses the workspace selected in Codex. Selecting an outside directory requires host confirmation. Keep your chosen permission profile.'
}
