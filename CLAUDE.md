# BontaFlowStack

@AGENTS.md

Published npm product: one skill pack with adapters for six agent hosts (Codex, Claude Code, Gemini CLI,
GitHub Copilot CLI, Cursor IDE, OpenCode CLI). `AGENTS.md`, `.agents/`, `adapters/` and `plugins/` are
product content for those hosts; keep every host working when changing shared files.

## Working here

- **Maintainer platform is Linux; the product also targets Windows x64.** The npm release path
  (`scripts/check.mjs`, `scripts/npm-release.mjs prepare/publish/verify`) runs on Linux, and
  `.github/workflows/check.yml` runs it in the `linux` job. Tests of Windows host behavior (PowerShell
  launchers, Windows shell, Windows PATH) are skipped off Windows and run in the `core` job on
  `windows-latest`, which also runs the PowerShell package build and test
  (`scripts/build-package.ps1`, `scripts/test-package.ps1`). Say which checks did not run locally; while CI is off (`CI_ENABLED=0` in `../home/scripts/flow-policy.sh`) nothing else runs them.
- Node.js 24 or newer.
- Release steps are described in `docs/bontaflowstack/RELEASE-PROCESS.md` and gated by
  `release/policy.json`; follow them instead of ad-hoc version bumps.

## Authority

Publishing to npm and creating a release or tag need explicit authorization. Push, pull request
and merge of prose changes follow the home repo's "Standing approval".
A passing local check is not a release approval.

## Ownership
This codebase is yours: what it's for and how it's built are your call, and you'll keep building on it.
