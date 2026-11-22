# BontaFlowStack

@AGENTS.md

Published npm product: one skill pack with adapters for six agent hosts (Codex, Claude Code, Gemini CLI,
GitHub Copilot CLI, Cursor IDE, OpenCode CLI). `AGENTS.md`, `.agents/`, `adapters/` and `plugins/` are
product content for those hosts; keep every host working when changing shared files.

## Working here

- **Target platform is Windows x64.** The package build and package test are PowerShell scripts
  (`scripts/build-package.ps1`, `scripts/test-package.ps1`) and run in CI on `windows-latest`
  (`.github/workflows/check.yml`). On Linux, run the Node tests that do not need the built package, for
  example `node --test tests/npm-release.test.mjs tests/release-gate.test.mjs`, and say which checks
  were left to CI.
- Node.js 24 or newer.
- Release steps are described in `docs/bontaflowstack/RELEASE-PROCESS.md` and gated by
  `release/policy.json`; follow them instead of ad-hoc version bumps.

## Authority

Publishing to npm, creating a release or tag, and pushing each need explicit authorization.
A passing local check is not a release approval.
