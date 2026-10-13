# BontaFlowStack

34 connected skills and local project memory for **Codex, Claude Code, Gemini
CLI, GitHub Copilot CLI, Cursor IDE and OpenCode CLI** on Windows x64.

One npm setup prepares the selected platform adapters, browser/render engine and
Impeccable CLI. The repository includes all six adapters. Published npm `1.1.0`
contains Codex and Claude Code; the four additional adapters ship in the next
npm release.

## Install

For the currently published Codex/Claude Code release:

```powershell
npx bontaflowstack@1.1.0 setup
```

Running the same exact package without `setup` starts the same flow. Setup does
not run as an npm install lifecycle script. Use Node.js 24+ with npm, Git for
Windows, internet access and an installed host. Sign in through the host before
model-driven work.

The six-platform source installer accepts these selectors:

| Platform | Selector | Minimum version |
| --- | --- | --- |
| Codex | `--host codex` | 0.162.0 |
| Claude Code | `--host claude` | 2.1.296 |
| Gemini CLI | `--host gemini` | 0.63.0 |
| GitHub Copilot CLI | `--host copilot` | 1.0.96 |
| Cursor IDE | `--host cursor` | 3.24.12 |
| OpenCode CLI | `--host opencode` | 1.19.0 |

With no selector, setup configures detected hosts. In the six-platform source,
`--host all` requires all six. Published `1.1.0` bundles two hosts, so its `all`
requires Codex and Claude Code.

## First session

Start a fresh session after setup. In Cursor, save your work and run
**Developer: Reload Window**, then open a new Agent chat.

Use `$bfs-router` in Codex or `/bontaflowstack:bfs-router` in Claude Code. On the
other platforms, ask the agent to use the installed `bfs-router` skill.

The installer prepares adapters outside the npm cache under
`%LOCALAPPDATA%\BontaFlowStack\npm\versions\<version>\hosts`. It configures native
plugins/extensions, skills, hooks and MCP. Cursor uses plugin ID
`bontaflowstack-cursor` and MCP server `bfs-cursor`; OpenCode uses a local V1
plugin and preserves existing JSON/JSONC configuration.

Setup reuses the sole existing BFS state root, including Windows Store
redirected locations. Without previous state, it uses
`%LOCALAPPDATA%\BontaFlowStack\state\v2`. If multiple roots contain data, choose
one with `BFS_STATE_HOME` and rerun. It does not merge state. Project memory can
be shared across hosts; active workflows and browser ownership stay scoped to
workspace and session.

The pinned Impeccable CLI and its shared configuration are installed
automatically. Existing explicit command overrides and modified files are
preserved. Setup does not install the host application, sign in or change host
permissions. Review native hook/extension prompts when requested.

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
