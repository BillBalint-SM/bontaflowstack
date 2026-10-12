[CmdletBinding()]
param([switch]$WithEngines, [switch]$InstallPrerequisites, [switch]$InstallPlugin)
$ErrorActionPreference = 'Stop'
throw 'Repository setup has moved to the single npm installer: npx bontaflowstack@<published-version> setup. See README.md for publication status and prerequisites.'
