# Install BontaFlowStack on Windows

## Requirements

- Windows x64 and Codex Desktop.
- Node.js 24 or newer on PATH.
- Git for Git-based installation and delivery workflows.
- npm, included with Node.js, for installing the optional engine dependencies.

The core has no npm dependency installation. Engine setup downloads locked npm
dependencies and Chromium to its own directory. Git Bash and jq are unnecessary.

## Install from GitHub (recommended)

Use the Git-backed marketplace for installation and updates. Run in PowerShell
with the Codex CLI on PATH to install the `0.7.1` release:

```powershell
codex plugin marketplace add BillBalint-SM/bontaflowstack-workbook --ref v0.7.1
codex plugin add bontaflowstack@bontaflowstack
```

This pins the marketplace to `v0.7.1`. Select a newer release explicitly using
the [Update](#update) procedure. If `bontaflowstack` is already registered with a
different source or tag, use that procedure to switch it.

Start a new chat in your project. Ask `$bfs-router Set up BontaFlowStack`.
Include "browser and design capabilities" to run the optional engine installer.
Open `/hooks` in the Codex CLI and review/trust this plugin's PreToolUse and Stop
definitions. Installation alone does not trust hooks; changed definitions need
review again. See the [official hook guide](https://learn.chatgpt.com/docs/hooks#review-and-trust-hooks).
Setup with `-InstallPrerequisites` can use Windows Package Manager to install
missing Node.js. Existing unsupported Node versions produce an upgrade message.

## Set up the target project

The PowerShell setup checks the plugin installation. To add project guidance,
open a Codex chat in the target project and request:

```text
$bfs-router Set up BontaFlowStack for this project.
```

Before any setup script or doctor check, the router reads the guard reference,
including for core-only setup. Reading it does not enable guard protection or
grant native hook trust.

After successful technical setup, the router offers a one-time question about
BFS decision questions: selection panels when available (recommended), or chat.
It saves an actual answer as a user preference shared across projects. Existing
effective choices are reused on repeated setup. An unanswered question saves
nothing and does not block setup. The PowerShell installer itself does not open
this question; request setup in a Codex chat.

Change the choice later with `$bfs-plan-tune Use chat for BFS decision questions.`
or `$bfs-plan-tune Prefer selection panels for BFS decision questions.` Ask it to
reset the preference to restore inheritance. Explicit project or current-chat
overrides are also supported. Without a saved choice, BFS prefers available
panels without saving that default. Panels depend on the host's available tools
and usage rules; otherwise BFS asks in chat. Native approval dialogs are separate.
After updating the plugin, start a new chat to load these instructions.

The router checks `AGENTS.md`, issue-tracker guidance, domain terms and decision
locations before changing project files. It creates a missing
`docs/agents/issue-tracker.md` with the chosen tracker location and its read,
publish and update procedure; a missing `docs/agents/domain.md` points to the
actual domain and decision sources. It adds only missing `AGENTS.md` links.
Existing instructions are not replaced. If the tracker or domain source is not
clear, answer the router's focused question first. A Git remote alone does not
mean specifications belong in GitHub Issues. Choosing no tracker is valid and
is recorded explicitly. Setup never creates invented terms, labels or ADRs.

For example, an empty project may need the answer “Use local Markdown issues in
`tasks/`; keep domain terms in `CONTEXT.md` and decisions in `docs/adr/`.” The
router can then create the two guides and their `AGENTS.md` pointers. Verify the
reported created and reused paths, open each pointer, and rerun the same setup
request: it should leave the guides unchanged. Use `doctor` to confirm requested
core or browser capabilities; a core-only check does not prove browser readiness.

`bfs-guard` is not started by the router. Invoke `$bfs-guard Show the current protection
status.` directly when you want task protection. Skill selection does not itself
authorize publication, deployment, spending or destructive changes.

## Optional: install a source ZIP or local clone

Use this alternative for manual setup from a release archive or local source
checkout. Download the source ZIP and SHA-256 file from
[GitHub Releases](https://github.com/BillBalint-SM/bontaflowstack-workbook/releases/tag/v0.7.1).
Compare the archive's SHA-256 with the downloaded checksum before extraction.
Extract the complete repository ZIP to a stable directory, or use a local clone.
From that directory:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup.ps1 -InstallPlugin -WithEngines
```

`-InstallPlugin` registers the local directory as a marketplace and installs the
plugin through Codex. Keep that source directory for updates. `-WithEngines`
installs the exact optional engine release recorded in
`plugins/bontaflowstack/engines.lock.json`. Omit either switch when that step is
already handled. Add `-InstallPrerequisites` to install missing prerequisites.

To inspect the package before installation:

```powershell
node scripts/check.mjs
powershell -NoProfile -File plugins/bontaflowstack/scripts/bfstack.ps1 -Command doctor
```

## Verify an installed plugin

Ask in a new chat:

```text
$bfs-router Check the installed catalog and capabilities, then guide me to the next step.
```

The skill entries must match the catalog. Core readiness and engine readiness are
reported separately. `doctor bfs-browse` must report the browser capability ready
before a browser-dependent task starts. Images use the Codex image generation tool
available in the chat; no separate API key is needed. Optional impeccable and
Google DESIGN.md commands report unavailable until their external installations
are configured; this does not block the browser, renderer or ordinary design work.

If a task lacks both required inputs and an available capability, BFS asks for
the missing inputs and reports the capability gap. Dependent work waits for the
actual answer and capability readiness.

The first browser operation starts the local browser. A visible session supports
manual login and continuation. Close it with the bfs-browse skill when finished.

## Update

Choose a tested release from
[GitHub Releases](https://github.com/BillBalint-SM/bontaflowstack-workbook/releases).
Set `$releaseTag` to the tag you selected; `v0.7.1` is the current example. To change
an existing marketplace's source or pinned tag, remove its registration first,
then register the selected Git release and install it:

```powershell
$releaseTag = 'v0.7.1'
codex plugin marketplace remove bontaflowstack
codex plugin marketplace add BillBalint-SM/bontaflowstack-workbook --ref $releaseTag
codex plugin add bontaflowstack@bontaflowstack
```

Use the same sequence to switch from a local source installation to Git. For a
ZIP or local clone installation that should remain local, update its source
files first, then repeat `codex plugin add bontaflowstack@bontaflowstack`.

If you intentionally track a Git branch, refresh it with
`codex plugin marketplace upgrade bontaflowstack`, then repeat the plugin-add
command. Refreshing a pinned tag keeps that tag; it does not select a newer release.

Start a new chat after updating. Review changed hook definitions through `/hooks`
when Codex requests it. Run setup with `-WithEngines` when the pinned engine
version changes.

Engine releases install to distinct version/checksum directories. Local project
memory and checkpoints remain separate from the plugin cache. Updating the plugin
does not remove old data. Legacy notes can be previewed and imported with
`memory import-legacy`; original files remain untouched. Legacy guard state and
historical permissions are not imported.

## Troubleshooting

For retained project state, backups, browser profiles and uninstall cleanup, see
[Local data](LOCAL-DATA.md). Uninstalling the plugin retains that data.

| Message or symptom | Action |
|---|---|
| `node` is missing or too old | Install Node.js 24+ and reopen PowerShell/Codex. |
| `codex` is not recognized | Add the Codex CLI to PATH, or use Desktop's plugin installation interface. |
| Optional engines are missing | Run the installed plugin's `scripts/setup.ps1 -WithEngines`. |
| Archive checksum mismatch | Stop installation; download the pinned release again. No archive source has run. |
| Engine component changed/missing | Inspect the installation and rerun the explicit installer; do not bypass the hash check. |
| Incomplete engine directory | Inspect the named failed installation. Preserve useful logs before removing only that directory and retrying. |
| Another process holds a state lock | Wait for that operation and retry. Never remove a lock while its writer is active. |
| PreToolUse says `BFS guard could not inspect this event` | The tool call was denied. A brief Windows lock error is retried automatically; if the message persists, check state-directory permissions and competing processes before retrying. Changed hook definitions must be reviewed again in `/hooks`. |
| Guard lacks a native observation | Review/trust the plugin definitions in `/hooks`, then use a new chat. Manual hook invocation is not native integration evidence. |
| Saved checks are stale | Recheck the changed inputs and rerun the affected workflow step. |
| Codex image tool unavailable | Use a chat with image generation available, or choose local HTML variants. |
| External design checker unavailable | Install/configure the selected optional tool as described in the engine README. |

Set `BFS_STATE_HOME` only for an intentional separate state directory, such as an
isolated verification run. No developer checkout, personal runtime cache or global
skill directory is required by the installed package.
