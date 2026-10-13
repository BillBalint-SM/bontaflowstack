# Install BontaFlowStack on Windows

[Magyar útmutató](../../TELEPITES.md) · [Claude Code-részletek](INSTALL-CLAUDE-CODE.md)

Release `1.2.0` includes Codex, Claude Code, Gemini CLI, GitHub Copilot CLI,
Cursor IDE and OpenCode CLI. See [all six platforms](PLATFORMS.md)
for selectors, minimum host versions and first use.

The single standard install route is the exact-version npm setup command. Version
**1.2.0 is the six-platform npm release**; see the
[release report](RELEASE-1.2.0.md).

```powershell
npx bontaflowstack@1.2.0 setup
```

Invoking the same pinned package without the `setup` argument starts the same
setup flow. Do not download a ZIP, copy plugin files by hand, or register a second
marketplace manually.

## Requirements

- Windows x64.
- Node.js 24 or newer, including npm, and Git for Windows on `PATH`.
- At least one platform from the table below. CLI hosts must be on `PATH`;
  Cursor can also be discovered from its Windows installation.
- Internet access for the pinned engine dependencies and Chromium download.
- A signed-in host account for model-driven work. Authentication is separate from setup.

Check PowerShell:

```powershell
node --version
npm.cmd --version
git --version
Get-Command codex,claude,gemini,copilot,opencode -ErrorAction SilentlyContinue
```

At least one host CLI or the Cursor Windows application must be available.
Setup configures all detected platforms by default. Select one explicitly:

| Platform | Command |
| --- | --- |
| Codex | `npx bontaflowstack@1.2.0 setup --host codex` |
| Claude Code | `npx bontaflowstack@1.2.0 setup --host claude` |
| Gemini CLI | `npx bontaflowstack@1.2.0 setup --host gemini` |
| GitHub Copilot CLI | `npx bontaflowstack@1.2.0 setup --host copilot` |
| Cursor IDE | `npx bontaflowstack@1.2.0 setup --host cursor` |
| OpenCode CLI | `npx bontaflowstack@1.2.0 setup --host opencode` |

Use `--host all` only when all six platforms are installed; it stops if any is missing.

## Install and start

Run the command once. It verifies the package version and host prerequisites,
prepares the checksum-pinned browser/render engine and Impeccable CLI, and installs each selected
host adapter outside the npm cache. It does not install Node, Git or host
applications, sign in, change permission settings, or approve hooks.

The versioned files are stored under
`%LOCALAPPDATA%\BontaFlowStack\npm\versions\1.2.0\hosts`.
For BFS state, setup reuses the sole existing state root it finds, including a
Windows Store redirected LocalAppData location. With no existing state it uses
`%LOCALAPPDATA%\BontaFlowStack\state\v2`. If it finds non-empty state at two
different roots, it stops before host configuration; set `BFS_STATE_HOME` to the
existing root you choose and rerun setup. It never merges the roots. Each host's
`install-state.json` pins the selected root for project memory and retained
records. Active workflows and browser ownership remain session/workspace scoped.

Start a fresh session in each configured host and use its router:

- Codex: `$bfs-router`
- Claude Code: `/bontaflowstack:bfs-router`
- Gemini CLI, Copilot CLI, Cursor IDE and OpenCode CLI: ask the agent to use
  the installed `bfs-router` skill.

For Cursor, save your work and run **Developer: Reload Window** before starting
a new Agent chat.

Ask the router to prepare browser/render capability if you need it. Engine file
readiness is not proof that a browser can launch. Retain any exact startup or
network error in the host session.

## Hook trust and permissions

Review hooks in the host's native trust interface when prompted. Setup does not
establish trust or bypass that review. Keep your chosen host permission profile
and leave Chromium sandboxing enabled. Hook approval is a host decision, separate
from plugin installation.

## Update and recovery

Release `1.2.0` also prepares the official Impeccable CLI and
its persistent shared configuration for all six hosts. No manual command setting is needed.
See [Impeccable setup](IMPECCABLE-SETUP.md) for the change and verification scope.

To upgrade an earlier release to the 1.2.0 release, run:

```powershell
npx bontaflowstack@1.2.0 setup
```

The installer preserves earlier versioned adapters and the shared `state/v2`
store. Run one setup at a time. To roll back, run setup with the previous exact
version if it is still available. Restart the host and verify the active plugin
version after an update.

## Remove a host registration

Remove only the BontaFlowStack registration using that host's plugin UI or
documented CLI. The Codex plugin ID is `bontaflowstack@bontaflowstack`; Claude
Code uses `bontaflowstack@bontaflowstack-npx`. Removing a registration does not
authorize deleting other plugins, durable version files, project state or engine
data. Back up and remove those separately only when you intend to erase them; see
[local data](LOCAL-DATA.md).

## Troubleshooting

| Symptom | Action |
| --- | --- |
| npm reports `404` or `not published` | Check the exact version and registry with `npm view bontaflowstack@1.2.0 version --registry=https://registry.npmjs.org`. See the release report for publication status. |
| The selected host is not detected | Install the host and open a new PowerShell window. Check CLI hosts on `PATH`, or the Cursor Windows installation. |
| Plugin version is old after setup | Start a new host session and inspect the installed version and plugin path. |
| Engine works in terminal but not in host | Check the adapter's `install-state.json` and run the host's BFS doctor command; do not guess a redirected app data path. |
| Host asks for hook trust | Review the hook definitions and decide in the host's native trust interface. Do not use a trust bypass. |
| npm or Chromium download fails | Preserve the exact network/proxy error, correct that issue, then rerun the same pinned setup command. |

Historical 1.0.0 Codex Desktop results retain their original scope in the
[release evidence](RELEASE-1.0.0.md).

For other problems, [open an issue](https://github.com/BillBalint-SM/bontaflowstack/issues/new)
with the BFS and host versions, setup command, reproduction steps and exact error.
Remove credentials, personal paths and private content from logs.
