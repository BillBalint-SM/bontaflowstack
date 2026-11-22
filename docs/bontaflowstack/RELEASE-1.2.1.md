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

Run on 2026-11-22 on Linux x64 with Node 26.13.1. The package is built and
released for Windows x64, so these results are partial.

- `node --test tests/release-gate.test.mjs`: 10 of 10 passed.
- `node --test tests/npm-setup.test.mjs`: 25 of 26 passed.
- `node scripts/check.mjs`: 153 tests, 142 passed, 8 failed, 3 skipped. The same
  8 tests fail on `main` (`ed5b0de`) without this change; they exercise the
  Windows shell, PowerShell launchers and a Codex wrapper lookup. The failing
  sets are identical.
- Skipped on Linux by their own condition: the real `npm pack` tests in
  `tests/npm-release.test.mjs` and `tests/npm-package.test.mjs`.
- `node scripts/npm-release.mjs prepare` was not completed: it stopped with
  `Cannot locate npm-cli.js` on this machine, and the process requires Windows
  x64. Run it on Windows x64 or in the Windows CI job from a committed source
  with the `v1.2.1` tag.
- Not run: the Windows package build and test (`scripts/build-package.ps1`,
  `scripts/test-package.ps1`), which `check.yml` runs on `windows-latest`.

## Published package identity

Not available until the package is published and verified with
`node scripts/npm-release.mjs verify`. Do not copy values from 1.2.0.
