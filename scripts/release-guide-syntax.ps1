param([Parameter(Mandatory=$true)][string]$Root)
$ErrorActionPreference='Stop'
$count=0
$fence=[string]::new([char]96,3)
foreach ($relative in @('TELEPITES.md','docs/bontaflowstack/INSTALL-WINDOWS.md')) {
    $content=[IO.File]::ReadAllText((Join-Path $Root $relative))
    $blocks=[regex]::Matches($content,'(?ms)^'+$fence+'powershell\r?\n(.*?)^'+$fence)
    if ($blocks.Count -eq 0) { throw ('No PowerShell installation example: ' + $relative) }
    foreach ($block in $blocks) {
        $tokens=$null
        $parseErrors=$null
        [System.Management.Automation.Language.Parser]::ParseInput($block.Groups[1].Value,[ref]$tokens,[ref]$parseErrors) | Out-Null
        if ($parseErrors.Count) { throw ($relative + ': ' + ($parseErrors.Message -join '; ')) }
        $count++
    }
}
Write-Output ("Parsed " + $count + " installation examples in Windows PowerShell " + $PSVersionTable.PSVersion.ToString() + "; none executed.")
