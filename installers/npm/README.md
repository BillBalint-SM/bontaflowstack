# BontaFlowStack

34 connected skills and local project memory for Codex and Claude Code. The
Windows x64 npm installer prepares each detected host and the pinned
browser/render engine and Impeccable CLI in one setup flow.

**Package `1.1.0-rc.2` is a release candidate; native host acceptance is pending.**
Use the command below for this exact version:

```powershell
npx bontaflowstack@1.1.0-rc.2 setup
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
%LOCALAPPDATA%\BontaFlowStack\npm\versions\1.1.0-rc.2\hosts\codex
%LOCALAPPDATA%\BontaFlowStack\npm\versions\1.1.0-rc.2\hosts\claude
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
npx bontaflowstack@1.1.0-rc.2 setup --host codex
npx bontaflowstack@1.1.0-rc.2 setup --host claude
npx bontaflowstack@1.1.0-rc.2 setup --host all
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

Prerelease validation covers local package and setup checks.
File validation or successful registration does not establish actual host MCP,
hook or skill behavior. In particular, authenticated Claude session acceptance
is still pending. See the source repository's
[validation report](https://github.com/BillBalint-SM/bontaflowstack/blob/main/docs/bontaflowstack/CLAUDE-CODE-VALIDATION.md)
and [universal installation guide](https://github.com/BillBalint-SM/bontaflowstack/blob/main/docs/bontaflowstack/INSTALL-WINDOWS.md).
