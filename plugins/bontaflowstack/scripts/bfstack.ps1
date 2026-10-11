[CmdletBinding()]
param(
    [Alias('Mode')][string]$Command = 'doctor',
    [string]$Action,
    [string]$Skill,
    [string]$InputFile,
    [Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments
)
$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$OutputEncoding = [Text.UTF8Encoding]::new($false)
try {
    $node = (Get-Command node -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
    $entry = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../core/cli.mjs'))
    $cliArguments = @($entry, $Command)
    if ($Action) { $cliArguments += $Action }
    if ($Skill) { $cliArguments += $Skill }
    if ($InputFile) { $cliArguments += @('--input', $InputFile) }
    if ($Arguments) { $cliArguments += $Arguments }
    if ($Command -eq 'hook' -and -not $InputFile) {
        # Forward hook JSON explicitly to avoid Windows PowerShell's event 4100 on inherited stdin.
        [Console]::In.ReadToEnd() | & $node @cliArguments
    } else {
        & $node @cliArguments
    }
    exit $LASTEXITCODE
} catch {
    [Console]::Error.WriteLine("BontaFlowStack launcher: $($_.Exception.Message)")
    if ($Command -eq 'hook' -and $Action -eq 'stop') { exit 0 }
    exit 1
}
