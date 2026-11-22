# BontaFlowStack 1.2.1 — installer fix for current Node

Status: prepared on 2026-11-22, **not published**. Package: `bontaflowstack@1.2.1`.
Planned source tag: `v1.2.1`; npm channel: `latest`.

## Change

`fs.cpSync` with `errorOnExist` rejects a target directory that already exists on
Node 24.22 and newer. The npm installer's Impeccable copy and the host package
build copied into the empty directory reserved by `mkdtemp` and failed with
`EEXIST`. Both now remove the reserved empty directory right before the copy
(commit `2c786e2`). Adapters, skills and host behavior are unchanged from 1.2.0.

Version 1.2.0 stays published and unchanged; its [report](RELEASE-1.2.0.md) keeps
its own scope.

## Release checks

Run on 2026-11-22 on Linux x64 with Node 26.13.1, from branch
`chore/linux-release-path` (the release path now runs on Linux).

- `node scripts/check.mjs`: exit 0; 153 tests, 142 passed, 0 failed, 11 skipped.
  The 8 tests that exercise Windows host behavior (PowerShell launchers, Windows
  shell, Windows PATH) are skipped off Windows and run in the `core` job.
- `node --test tests/npm-package.test.mjs tests/npm-release.test.mjs`: 4 of 4
  passed, including the real `npm pack` tests that were Windows-only before.
- `node --test tests/npm-release.test.mjs tests/release-gate.test.mjs tests/release-workflow.test.mjs tests/release-promotion.test.mjs`:
  18 passed, 0 failed, 1 skipped.
- `node scripts/npm-release.mjs prepare --tag latest --release-tag v1.2.1`
  completed on Linux as a rehearsal into a temporary directory (removed); the
  real preparation runs from the tagged source.
- Not run on this machine: the Windows package build and test
  (`scripts/build-package.ps1`, `scripts/test-package.ps1`) and the skipped
  Windows host tests, which `check.yml` runs on `windows-latest`.

## Published package identity

Not available until the package is published and verified with
`node scripts/npm-release.mjs verify`. Do not copy values from 1.2.0.
