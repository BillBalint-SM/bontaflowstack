# Linux x64 support phases

Status: phase 1 implemented, proven by a real CI run, and published in `1.3.0`; `npx setup` works on Linux from `1.3.1` ([release record](RELEASE-1.3.1.md)). Windows x64 behavior is unchanged.
The `1.2.1` package declares `"os": ["win32"]` and ends in `EBADPLATFORM` on Linux; `os` includes `linux` from `1.3.0`, but `1.3.0`'s `npx setup` does nothing on Linux (fixed in `1.3.1`).

## Support matrix

| OS / arch | Hosts supported by `setup` | Notes |
| --- | --- | --- |
| Windows x64 | Codex, Claude Code, Gemini CLI, GitHub Copilot CLI, Cursor IDE, OpenCode CLI | unchanged |
| Linux x64 | **Claude Code 2.1.296+ only** (phase 1) | `--host codex\|gemini\|copilot\|cursor\|opencode\|all` stop with "not yet supported on Linux x64" |
| anything else (macOS, Linux arm64, Windows arm64, WSL-specific paths) | none | refused with the matrix; no compatibility claim |

The matrix lives in `installers/npm/bin/setup.mjs` (`supportMatrix`). Adding a host on an OS means adding it
to that list in the same change that carries its tests and evidence.

## What is Windows-specific

- Installer (`installers/npm/bin/setup.mjs`): the old hard guard, `LOCALAPPDATA`, `<host>.exe` launchers,
  the Codex Store data directory, the PowerShell preflight, `@impeccable/cli-windows-x64`, `impeccable.exe`.
- Engines: `scripts/install-engines.ps1` (PowerShell, `ZipFile`, `npm.cmd`) and the bundled archive's
  `scripts/build.ps1`; the archive's `scripts/manifest.mjs` writes the fixed platform `win32-x64`, which
  `core/engines.mjs` compares with the running machine.
- Codex hooks: `plugins/bontaflowstack/hooks/hooks.json` launches `powershell.exe ... scripts/bfstack.ps1`.
- Guard: `core/guard.mjs` parses non-Bash tool commands with `pwsh`/`powershell.exe` and `parse-command.ps1`.
  Claude's Bash tool goes through `parse-bash.mjs`.
- State default: `core/state.mjs` fell back to `%LOCALAPPDATA%` (`~/AppData/Local`).
- Not Windows-specific: the Claude adapter (`adapters/claude-code/hooks.json`, `mcp.json`) already starts
  `node` directly, so no launcher change was needed for Claude Code.

## Per-OS design

| Concern | Windows x64 | Linux x64 |
| --- | --- | --- |
| BFS install root | `%LOCALAPPDATA%\BontaFlowStack\npm` | `$XDG_DATA_HOME/BontaFlowStack/npm` (default `~/.local/share`) |
| Shared state | `%LOCALAPPDATA%\BontaFlowStack\state\v2` | `$XDG_DATA_HOME/BontaFlowStack/state/v2`, pinned in `install-state.json` as on Windows |
| Host discovery | `~\.local\bin\<host>.exe`, Node wrappers, `<host>.exe` | `~/.local/bin/<host>`, then `<host>` on `PATH` |
| Preflight | PowerShell `Get-Command npm.cmd,node,git` | `npm --version`, `git --version` |
| Launchers | PowerShell scripts | none: hooks and MCP start `node` directly |
| Impeccable | `@impeccable/cli-windows-x64`, `bin/impeccable.exe` | `@impeccable/cli-linux-x64`, `bin/impeccable` (executable bit kept) |
| Engines | `install-engines.ps1` | `install-engines.mjs`: same checksum, path-safety and registration steps; built-in ZIP reader (no `unzip`); `npm ci`, Playwright Chromium, manifest |
| Engine platform | `win32-x64` | `linux-x64` |

Engine fallback (documented, tested): the bundled engine archive is unchanged so its lock checksum and the
Windows build stay identical. `install-engines.mjs` runs the archive's own `scripts/manifest.mjs`, then records
the real platform in `engine.json` before registration; `core/engines.mjs` still verifies platform and file
hashes. A native `linux-x64` engine release (manifest generator that reads `process.platform`) is the
cleaner end state and needs a new engines version.

Linux notes: Chromium needs the usual system libraries; on a minimal image run
`npx playwright install-deps chromium` as root first. Playwright downloads from `cdn.playwright.dev`.

## Phases

1. **Phase 1 (this change): shared installer + Claude Code on Linux x64.**
2. Remaining hosts, one per phase, each with documented contract, contract tests and an observed native
   run (the evidence rules of `HOST-EXPANSION-PLAN.md`). Proposed order, to be confirmed by the owner:
   Gemini CLI → GitHub Copilot CLI → OpenCode CLI → Codex (replace the PowerShell hook launcher) → Cursor IDE
   (desktop app discovery and install location need their own design).
   Windows-only helpers each host still uses (`core/<host>-*.mjs`, `installers/npm/bin/<host>.mjs`) are
   reviewed in that host's phase, not before.

## Evidence and the `package.json` gate

- Unit/contract tests: `tests/linux-setup.test.mjs` (matrix, refusals, POSIX paths, no PowerShell calls,
  XDG, version gate, ZIP extraction safety, bundled archive vs lock). Runs in `node scripts/check.mjs`.
- Real run: `tests/linux-setup.integration.mjs` builds the npm package, runs the shipped `setup` against the
  real Claude Code CLI with downloaded engines, checks `claude plugin list`, the engine doctor and a repeat run.
  CI job `linux-setup` (ubuntu-latest) runs it.
- `installers/npm/package.json` `os` is `["win32", "linux"]` (`cpu` stays `["x64"]`). It was widened only after the
  `linux-setup` CI job passed on this branch (real setup, real Claude Code CLI, `ubuntu-latest`); the job no longer
  needs `npm install --force`. `setup` still enforces the matrix, so the other hosts stay refused on Linux. No release,
  tag, version bump or publish is part of this work; those need the owner's separate approval.
- Windows assertions (`tests/npm-setup.test.mjs` and others) are unchanged and still run on `windows-latest`.
