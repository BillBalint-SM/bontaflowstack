# BontaFlowStack

34 connected skills and local project memory for **Codex, Claude Code, Gemini
CLI, GitHub Copilot CLI, Cursor IDE and OpenCode CLI** on Windows x64.

One npm setup prepares the selected platform adapters, browser/render engine and
Impeccable CLI. Release `1.2.0` includes all six adapters.

The issue #6 candidate also accepts Linux/macOS x64/ARM64. This is not a published
POSIX release or a full native support claim. Recorded Linux evidence and pending
Mac/ARM64/host-model checks are listed in the source checkout's
`docs/bontaflowstack/OS-SUPPORT.md`. Linux capability checks do not use an Ubuntu allowlist.

## Install

Install and configure detected platforms:

```powershell
npx bontaflowstack@1.2.0 setup
```

Running the same exact package without `setup` starts the same flow. Setup does
not run as an npm install lifecycle script. Use Node.js 24+ with npm, Git,
internet access and an installed host. On Windows, use Git for Windows.
Sign in through the host before model-driven work.

The installer accepts these selectors:

| Platform | Selector | Minimum version |
| --- | --- | --- |
| Codex | `--host codex` | 0.162.0 |
| Claude Code | `--host claude` | 2.1.296 |
| Gemini CLI | `--host gemini` | 0.63.0 |
| GitHub Copilot CLI | `--host copilot` | 1.0.96 |
| Cursor IDE | `--host cursor` | 3.24.12 |
| OpenCode CLI | `--host opencode` | 1.19.0 |

With no selector, setup configures detected hosts. `--host all` requires all six;
select one explicitly if you want to configure only that host.

## First session

Start a fresh session after setup. In Cursor, save your work and run
**Developer: Reload Window**, then open a new Agent chat.

Use `$bfs-router` in Codex or `/bontaflowstack:bfs-router` in Claude Code. On the
other platforms, ask the agent to use the installed `bfs-router` skill.

On Windows, the installer prepares adapters outside the npm cache under
`%LOCALAPPDATA%\BontaFlowStack\npm\versions\<version>\hosts`. It configures native
plugins/extensions, skills, hooks and MCP. Cursor uses plugin ID
`bontaflowstack-cursor` and MCP server `bfs-cursor`; OpenCode uses a local V1
plugin and preserves existing JSON/JSONC configuration.

Setup reuses the sole existing BFS state root, including Windows Store
redirected locations. On Windows, without previous state, it uses
`%LOCALAPPDATA%\BontaFlowStack\state\v2`. If multiple roots contain data, choose
one with `BFS_STATE_HOME` and rerun. It does not merge state. Project memory can
be shared across hosts; active workflows and browser ownership stay scoped to
workspace and session.

The pinned Impeccable CLI and its shared configuration are installed
automatically. Existing explicit command overrides and modified files are
preserved. Setup does not install the host application, sign in or change host
permissions. Review native hook/extension prompts when requested.

On Linux the default adapter root is
`${XDG_DATA_HOME:-$HOME/.local/share}/bontaflowstack/npm`, and new state uses
`${XDG_STATE_HOME:-$HOME/.local/state}/bontaflowstack/state/v2`. Relative XDG values
use the defaults. The macOS candidate uses
`$HOME/Library/Application Support/BontaFlowStack/{npm,state/v2}`. POSIX adapters
use `versions/<platform>-<arch>/<version>/hosts`. An existing state pin takes
precedence over a changed default; `BFS_STATE_HOME` must be absolute.

Missing engine prerequisites leave core registration available while setup
reports `incomplete` and exits nonzero. Resolve the reported prerequisite, then
rerun the same setup. The `setup-status.json` file under the adapter root records
the actual phases and host outcomes. GUI hook/MCP Node-path recovery also uses
the normal repeated setup command; no data migration is required.

## Update and recovery

Rerun setup with a newer published exact version. Previous adapters and shared
project state are retained. Run one setup at a time, then start a fresh session.
The six-platform installer records phases and per-host registration in
`%LOCALAPPDATA%\BontaFlowStack\npm\setup-status.json`. If setup is interrupted,
wait for the previous process to stop and rerun the same command.

Remove BFS through each host's plugin or extension controls. Retained versions,
engine files and project data are separate from registration.

## Documentation and help

- [All platforms and first use](https://github.com/BillBalint-SM/bontaflowstack/blob/main/docs/bontaflowstack/PLATFORMS.md)
- [Windows installation](https://github.com/BillBalint-SM/bontaflowstack/blob/main/docs/bontaflowstack/INSTALL-WINDOWS.md)
- [Magyar útmutató](https://github.com/BillBalint-SM/bontaflowstack/blob/main/TELEPITES.md)
- [Report an issue](https://github.com/BillBalint-SM/bontaflowstack/issues/new)

Include the BFS version, platform name and version, reproduction steps and exact
error in an issue. Remove credentials, private content and personal paths.
