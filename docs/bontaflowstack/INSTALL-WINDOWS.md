# Install BontaFlowStack 1.0.0 on Windows

[Magyar útmutató](../../TELEPITES.md) · [Release evidence](RELEASE-1.0.0.md)

This guide installs the **1.0.0 ZIP** into Codex Desktop. Keep your preferred
permission profile. Version 1.0.0 carries forward the implementation practically
verified as 0.7.5 under Full Access, with only version labels and user documentation
changed. The original evidence retains its original version; no new 1.0.0 Desktop
run is claimed. The plugin uses the selected workspace and keeps Chromium's sandbox
enabled. It does not require switching to on-request.

## Requirements

- Windows x64, Codex Desktop, and a signed-in Codex account.
- Node.js **24 or newer**, including npm, available on PATH.
- A Codex CLI with `plugin marketplace` and `plugin add` commands.
- Internet access for the engine's pinned npm dependencies and Chromium download.
  The engine's 0.3.3 source archive is already included.
- Git only for Git-based project/delivery operations; not for this ZIP installation.

Check in normal Windows PowerShell, using the same Windows account as Desktop:

```powershell
node --version
npm.cmd --version
codex --version
codex --no-daemon plugin --help
```

Expected: Node 24+; working npm; Codex lists plugin commands. The observed Desktop
build was `26.1007.2314.0`, with CLI `0.162.0-alpha.17.2`. These identify the
tested environment, not a proven minimum version.

If Node is missing, install it from [nodejs.org](https://nodejs.org/en/download)
and reopen PowerShell and Codex. If Codex CLI is missing, OpenAI documents
`npm.cmd install -g @openai/codex@latest` in its
[CLI installation instructions](https://developers.openai.com/codex/cli/).
Then reopen PowerShell. Do not invoke an arbitrary `codex.exe` from an app cache.
If your CLI lacks these plugin commands, update it before continuing.
The commands below use `--no-daemon`, as verified with the installed CLI;
an older CLI that rejects this flag needs an update.

## 1. Verify and extract the download

Obtain both `BontaFlowStack-1.0.0.zip` and
`BontaFlowStack-1.0.0.zip.sha256` from the
[GitHub release](https://github.com/BillBalint-SM/bontaflowstack/releases/tag/v1.0.0).
Choose these named assets, not GitHub's automatic source-code archive. Do not use
an older release's checksum.

The example expects the two files in Downloads. Change only `$downloadDir`
if your browser saved them elsewhere. Use a new, stable destination: Codex keeps
this directory as its local marketplace source.

```powershell
$downloadDir = Join-Path $env:USERPROFILE 'Downloads'
$archive = Join-Path $downloadDir 'BontaFlowStack-1.0.0.zip'
$checksum = "$archive.sha256"
$expected = ((Get-Content -LiteralPath $checksum -Raw).Trim() -split '\s+')[0]
if ($expected -notmatch '^[a-fA-F0-9]{64}$') { throw 'Invalid checksum file.' }
$actual = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash
if ($actual -ine $expected) { throw 'Checksum mismatch. Stop installation.' }

$packageDir = Join-Path $env:USERPROFILE 'Tools/BontaFlowStack/1.0.0'
if (Test-Path -LiteralPath $packageDir) { throw 'Destination exists. Choose a new empty directory.' }
Unblock-File -LiteralPath $archive
Expand-Archive -LiteralPath $archive -DestinationPath $packageDir
Set-Location -LiteralPath $packageDir
```

Expected: extraction succeeds; the directory contains `README.md`,
`TELEPITES.md`, `.agents/plugins/marketplace.json`, and `plugins/bontaflowstack`.
A mismatch stops the process before any packaged code runs.

## 2. Register and install the plugin

For a **first installation**, continue in the same PowerShell window:

```powershell
codex --no-daemon plugin marketplace add $packageDir --json
if ($LASTEXITCODE -ne 0) { throw 'Marketplace registration failed.' }
codex --no-daemon plugin add bontaflowstack@bontaflowstack --json
if ($LASTEXITCODE -ne 0) { throw 'Plugin installation failed.' }
```

Expected: plugin ID `bontaflowstack@bontaflowstack`, version **1.0.0**, and an
installed cache path. If a marketplace with this name already exists, use
[Update](#update) below; do not delete another marketplace or edit its files.
Keep the extracted directory after installation.

## 3. Load it in Desktop and install the requested engines

Save any active work, then fully quit and reopen Codex Desktop. Merely sending
another message did not reload an already-running old MCP server during
validation. Open a chat in **your actual project directory**, not the extracted
plugin directory.

Keep your preferred permission profile. If Codex prompts to enable the plugin's
`bfs-browser` connection, review and enable that connection through its normal
plugin/MCP controls. The exact UI wording depends on the Desktop version.

Send:

```text
$bfs-router Set up BontaFlowStack for this project, including browser, render and design capabilities. Use the installed 1.0.0 plugin.
```

Expected: the router runs the installed setup script with `-WithEngines`,
verifies the bundled engine archive, installs pinned dependencies and Chromium,
and reports core plus browser/render capability readiness. Let downloads finish.
This step runs from the actual Desktop environment so setup and the MCP host use
the same effective local state root.

If you only want planning/core skills, omit the browser/render/design request.
The core needs Node but no npm dependency installation.

The router preserves existing project instructions. It asks for missing tracker
or domain choices before creating the corresponding project guides. It may offer
panels versus chat for BFS decision questions; either choice is valid.
Optional external impeccable and Google DESIGN.md integrations can remain
unavailable without blocking browser/render or ordinary design work.

For optional guard protection, review and trust **PreToolUse** and **Stop** in
Codex's `/hooks` interface when requested; see OpenAI's
[hook guide](https://learn.chatgpt.com/docs/hooks#review-and-trust-hooks).
Installing the plugin does not itself establish native hook trust.

## 4. Check actual use

Ask in that Desktop chat:

```text
$bfs-browse Open https://example.com visibly using the installed plugin. First report its connection version, project and permission state. Read the page title, then stop only this task's browser.
```

Expected:

| Check | Correct result |
| --- | --- |
| Connection | Version 1.0.0, project equals the selected workspace, bindingSource host-workspace |
| Permission | Your chosen profile stays unchanged; under Full Access the host reports type disabled |
| Engine | 0.3.3 installed and browser ready |
| Actual browser | Visible page; the agent reads Example Domain and reports any network error separately |
| Cleanup | This task's browser closes and its status is stopped |

File readiness alone is not a launch check. Only report installation/use success
after the requested operation actually succeeds. When a site needs sign-in, ask
for visible handoff, enter credentials yourself, then ask BFS to resume.
A directory outside the selected workspace needs actual host confirmation; a
host that cannot provide that confirmation cannot authorize the outside path.

## Update

Extract the new verified ZIP into a **new** version directory and assign that
absolute directory to `$packageDir`. Preserve the previous source directory and
[local data](LOCAL-DATA.md) for rollback. Replace only the BFS registration:

```powershell
codex --no-daemon plugin marketplace remove bontaflowstack
if ($LASTEXITCODE -ne 0) { throw 'Could not remove the old BFS marketplace registration.' }
codex --no-daemon plugin marketplace add $packageDir --json
if ($LASTEXITCODE -ne 0) { throw 'Could not register the selected BFS directory.' }
codex --no-daemon plugin add bontaflowstack@bontaflowstack --json
if ($LASTEXITCODE -ne 0) { throw 'Could not install the selected BFS version.' }
```

Fully quit/reopen Desktop and check the version through the native connection.
If the engine version changes, request engine setup again from Desktop. An old
running server can retain the old version until the application actually exits.

Rollback uses the same registration/install sequence with the previous verified
directory. Engine versions and local memory are stored separately; see
[Local data](LOCAL-DATA.md). Reverting to an older plugin can reintroduce its known
bugs; versions 0.7.3/0.7.4 do not provide the demonstrated Full Access Desktop fix.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| `codex` or `node` missing | Install the prerequisite and reopen both apps; confirm PATH using the commands above. |
| CLI says it has no complete local package | Use the documented `--no-daemon` commands, or install the complete standalone CLI. |
| Marketplace already exists | Use the BFS-only Update sequence. |
| Status shows an older version | Confirm installation output says 1.0.0; fully quit/reopen Desktop. A new message alone is insufficient. |
| Project is null or approval is declined | Select/open the real project in Codex. Check version 1.0.0 and host workspace metadata; do not switch profiles as a workaround. An outside path still requires supported host confirmation. |
| Engine ready in a terminal, missing in Desktop | Ask the installed router to run setup from Desktop. Windows app packaging can redirect LOCALAPPDATA. |
| `BFS_STATE_HOME` is customized | Installer and Desktop must inherit the same value. Otherwise leave it unset; do not copy someone else's state paths. |
| No browser tool | Enable the plugin/MCP connection normally. Do not launch a replacement from the sandboxed shell or disable Chromium sandbox. |
| `CreateWindowStationW` | Confirm use of the packaged host MCP connection, not a shell browser launch; retain the exact error if that connection also fails. |
| Checksum mismatch | Stop; obtain the archive and its matching checksum again. |
| npm/Chromium download fails | Check the stated network/proxy error, then retry the installer. No offline engine binary is bundled. |
| Hook trust/guard warning | Review the changed hook definitions; preserve the error and do not treat a denied call as success. |

Uninstall through Codex's plugin controls. Uninstalling keeps local memory,
checkpoints, browser state and engine files; the [data guide](LOCAL-DATA.md)
explains their locations, backup and explicit cleanup.
