# BontaFlowStack platforms

[English overview](../../README.md) · [Magyar útmutató](../../TELEPITES.md)

BontaFlowStack provides 34 skills across six agent platforms on Windows x64.
Release `1.2.0` includes all six adapters in the same npm package.

The unpublished Linux/macOS candidate has a separate
[OS installation and evidence matrix](OS-SUPPORT.md). It distinguishes actual
native host/engine results, provider limits and unverified targets from the
released Windows baseline described below.

## One installer

Install all detected platforms with the exact-version setup command:

```powershell
npx bontaflowstack@1.2.0 setup
```

Setup detects installed platforms, installs durable adapter files outside the
npm cache, prepares the browser/render engine and Impeccable, and configures a
shared local BFS data directory. Running the same package without `setup` starts
the same flow. No ZIP download, manual skill copying or separate engine setup
is needed.

The installer accepts these selections:

| Platform | Selection | Installer minimum | Native integration |
| --- | --- | --- | --- |
| Codex | `--host codex` | 0.162.0 | Plugin, local marketplace, native hooks and browser MCP |
| Claude Code | `--host claude` | 2.1.296 | User-scope plugin, marketplace, native hooks and MCP |
| Gemini CLI | `--host gemini` | 0.63.0 | Extension with skills, lifecycle hooks and MCP |
| GitHub Copilot CLI | `--host copilot` | 1.0.96 | Agent plugin with skills, lifecycle hooks and MCP |
| Cursor IDE | `--host cursor` | 3.24.12 | Local `bontaflowstack-cursor` plugin and `bfs-cursor` MCP |
| OpenCode CLI | `--host opencode` | 1.19.0 | Local V1 plugin with skills and MCP |

Omit `--host` to configure detected platforms. `--host all` requires all six;
use a single selector when you want only one.

## Requirements and first use

Install Node.js 24+ with npm, Git for Windows and your chosen agent application.
CLI hosts must be discoverable by setup; Cursor can be detected from its Windows
installation. Internet access is required for the engine dependencies and
Chromium. Use your platform's normal sign-in and permission controls.

After setup, start a fresh agent session in your project. For Cursor, save your
work and run **Developer: Reload Window**, then open a new Agent chat.

- Codex: invoke `$bfs-router`.
- Claude Code: invoke `/bontaflowstack:bfs-router`.
- Gemini CLI, Copilot CLI, Cursor IDE and OpenCode CLI: ask the agent to use the
  installed `bfs-router` skill, for example: “Use bfs-router to help me plan and
  build a booking page.”

The same skill names cover planning, implementation, browser work, review,
project memory, checkpoints and delivery. Host-specific integrations supply
session identity and connect the shared BFS tools to your agent.

## Updates, state and removal

Rerun setup with a newer published exact version to update. Run one setup at a
time; previous adapter versions and project state remain available. Existing
foreign plugins, project instructions and permission settings are preserved.

Project memory is shared through the selected state root. Active workflows and
browser ownership remain bound to their workspace and session. See
[local data and backups](LOCAL-DATA.md).

Remove BFS through your platform's plugin or extension controls. Retained
version files, engine data and project state are separate from registration.

## Report a problem

[Open a GitHub issue](https://github.com/BillBalint-SM/bontaflowstack/issues/new)
with your BFS version, platform and version, Windows version, setup command,
reproduction steps and exact error. Remove credentials, private content and
personal paths before sharing logs.

[Windows installation](INSTALL-WINDOWS.md) · [Claude Code](INSTALL-CLAUDE-CODE.md)
· [Changelog](CHANGELOG.md)
