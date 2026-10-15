$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$sourceText = [Console]::In.ReadToEnd()
$tokens = $null
$parseErrors = $null
$tree = [Management.Automation.Language.Parser]::ParseInput($sourceText, [ref]$tokens, [ref]$parseErrors)
$commands = @($tree.FindAll({ param($node) $node -is [Management.Automation.Language.CommandAst] }, $true) | ForEach-Object {
    $commandNode = $_
    $elements = @($commandNode.CommandElements | Select-Object -Skip 1 | ForEach-Object {
        if ($_ -is [Management.Automation.Language.StringConstantExpressionAst]) { $_.Value }
        else { $_.Extent.Text }
    })
    @{ name = $commandNode.GetCommandName(); args = $elements; text = $commandNode.Extent.Text }
})
$dynamic = @($tree.FindAll({ param($node) $node -is [Management.Automation.Language.VariableExpressionAst] -or $node -is [Management.Automation.Language.SubExpressionAst] }, $true)).Count -gt 0
@{ valid = ($parseErrors.Count -eq 0 -and -not $dynamic); commands = $commands } | ConvertTo-Json -Depth 6 -Compress
