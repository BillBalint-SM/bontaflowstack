# BontaFlowStack

Development branch: Gemini CLI 0.63.0+, GitHub Copilot CLI 1.0.96+, Cursor IDE
3.24.12+ and OpenCode CLI 1.19.0+ setup are under validation here. A locally built
candidate accepts `--host gemini|copilot|cursor|opencode`; these additions are not
part of the published 1.1.0 described below. Complete native task journeys and
Cursor import coexistence are still pending. OpenCode uses a local V1 plugin
loader and preserves existing JSON/JSONC configuration. The source repository's
`docs/bontaflowstack/HOST-EXPANSION-IMPLEMENTATION.md` records the evidence.

The Cursor candidate uses plugin ID `bontaflowstack-cursor` and MCP server name
`bfs-cursor` to distinguish it from imported copies. Its managed directory stays
`~/.cursor/plugins/local/bontaflowstack`; the npm package name stays unchanged.
Setup preserves existing `bfs` MCP settings and stops on a `bfs-cursor` conflict.
It does not change the IDE's import or hook permission settings. Native coexistence
still needs IDE verification.

Development setup records its last attempt in
`%LOCALAPPDATA%\BontaFlowStack\npm\setup-status.json`: the selected release,
current phase and each host's placed, registering, registered, failed or
reload-required state. Registration is recorded only after host readback;
Cursor file placement still awaits IDE readback. A `running` record left after
setup exits is unfinished, not success. Rerun the same pinned command after the
previous process has stopped. Existing versions, project data and completed host
registrations remain available. The record contains no command output or account
details; preflight failures occur before this record is replaced.

Development acceptance tests retain `*.command-evidence.json` with exit codes
and output sizes, and `*.native-evidence.json` with bounded tool outcomes. Each
result writer also creates a separate `*.acceptance-evidence.json` containing
only fixed check flags, the reported status, and supported host/count/code-hash
metadata. Unknown status remains `unverified`; a zero command exit is not turned
into acceptance. These three diagnostic formats omit command output, model
transcripts, local paths, session IDs and error arguments. The acceptance summary
is scoped to `recorded-checks-only`, not an overall port acceptance verdict.
Share these summaries only. Original `result.json` files are private continuation
data; other fixture files, native host logs and older evidence remain private.
Do not share a whole test directory as a diagnostic bundle.

Gemini, Copilot and Cursor source updates retain the previous directory if the
swap or rollback fails. Rerunning setup restores a missing source only from a
single preserved copy that exactly matches an owned version. Modified or
ambiguous copies are preserved and reported. Verified recovery staging is removed
after a valid source exists; versioned release files remain available.

34 connected skills and local project memory for Codex and Claude Code. The
Windows x64 npm installer prepares each detected host and the pinned
browser/render engine and Impeccable CLI in one setup flow.

**BontaFlowStack `1.1.0` for Codex and Claude Code.**
Use the command below for this exact version:

```powershell
npx bontaflowstack@1.1.0 setup
```

Calling the same pinned package without `setup` starts the same setup. Setup
does not run as an npm install lifecycle script; review the requested command
before running it.

## Requirements

- Windows x64, Node.js 24 or newer with npm, and Git for Windows.
- Codex and/or Claude Code installed with its CLI on `PATH`.
- Internet access for pinned engine dependencies, Impeccable and Chromium.
- A signed-in host account to run model-driven work.

By default, setup detects the Codex and Claude Code CLIs and configures every
detected host. To choose a single host, use `--host codex` or `--host claude`.
Use `--host all` to require both. At least one host must be available.

## What setup does

The package installs its versioned adapters outside the npm cache:

```text
%LOCALAPPDATA%\BontaFlowStack\npm\versions\1.1.0\hosts\codex
%LOCALAPPDATA%\BontaFlowStack\npm\versions\1.1.0\hosts\claude
```

Only adapters selected and supported by the detected hosts are registered. Setup
reuses the sole existing BFS state root it finds, including a Windows Store
redirected LocalAppData location. With no existing state, it uses
`%LOCALAPPDATA%\BontaFlowStack\state\v2`. If two different roots contain state,
setup stops before host configuration; set `BFS_STATE_HOME` to the existing root
you choose and rerun. It does not merge state. Each host's `install-state.json`
pins the selected common root, so Codex and Claude Code share memory, workflow
records, checkpoints and browser state. Existing state is preserved across setup
and updates.

Setup also downloads the official `impeccable@4.5.2` npm dependency, copies its
Windows binary and license into the shared state under `tools/impeccable/4.5.2`,
and saves the verified command in `impeccable.json`. Both adapters use this
default in fresh sessions, even after the npm cache is removed. No manual
`BFS_IMPECCABLE_COMMAND` is required; an existing explicit override takes
precedence. Setup probes the binary before registering hosts, and preserves
modified installed files instead of overwriting them.

The installer does not install Node, Git or a host application, sign in, change
host permissions or grant hook trust. Review hooks in the host's normal trust
interface when prompted. Never enable a hook-trust bypass to make setup pass.

Open a fresh host session after setup. Start with `$bfs-router` in Codex or
`/bontaflowstack:bfs-router` in Claude Code. Claude image understanding,
authored HTML/SVG and supplied assets are supported; raster image generation and
editing are outside the accepted scope.

## Select, update and remove

```powershell
npx bontaflowstack@1.1.0 setup --host codex
npx bontaflowstack@1.1.0 setup --host claude
npx bontaflowstack@1.1.0 setup --host all
```

Use a newer exact version to update. Previous versioned adapters and the shared
state root remain available for recovery. Run only one setup at a time, then
start a new session in each updated host.

Remove each registration in its host's plugin manager. The Codex plugin ID is
`bontaflowstack@bontaflowstack`; Claude Code uses
`bontaflowstack@bontaflowstack-npx`. Uninstalling a host adapter
does not remove retained version files, BFS state, engine data or another host's
plugin. Remove those separately only when you intentionally want to erase them.

## Validation status

Package and setup checks cover the generated host adapters, shared engines and
Impeccable installation. See the source repository's
[release report](https://github.com/BillBalint-SM/bontaflowstack/blob/main/docs/bontaflowstack/RELEASE-1.1.0.md)
and [universal installation guide](https://github.com/BillBalint-SM/bontaflowstack/blob/main/docs/bontaflowstack/INSTALL-WINDOWS.md).
