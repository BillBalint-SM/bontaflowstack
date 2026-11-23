# BontaFlowStack 1.2.1 — installer fix for current Node

Status: published and verified on 2026-11-23. Package: `bontaflowstack@1.2.1`.
Source tag: `v1.2.1`; npm channel: `latest`.

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

Published on 2026-11-23 from Linux x64 with Node 26.13.1, from a clean worktree
of the `v1.2.1` tag, using `node scripts/npm-release.mjs publish` with the owner's
interactive npm web login (not the GitHub Actions OIDC route).

- Source tag `v1.2.1` (annotated tag object `63052f80b3c9354f62ca86df5b83bfc1323703ce`)
  points to commit `f6869b167e47dacca331397ef7f76fc5081c6ac4`.
- Archive: `bontaflowstack-1.2.1.tgz`, 461.5 kB packed, 2.4 MB unpacked, 603 files.
- SHA-256: `3b543dfaf1eb6f5a2c0c860386a0a72231ea5dae2304b0b0b9c483a5b318a2c3`.
- npm integrity: `sha512-9MLKlu1jWcfkQJl2iGhCuuJ/wHU+Bh2O/ExpGSzesqXMI4/63QD6glbBU503ouJ1KTqWtL2/LrLdtvijllN0Lg==`;
  shasum `738484026c0d12498159e7f61885a72ebaf7cbed`.
- `node scripts/npm-release.mjs verify`: outcome `verified`; dist-tags `latest` is
  `1.2.1`, `rc` is `1.1.0-rc.3`; the registry did not assign `latest` to a prerelease.
  The tarball built from the tag matched the earlier rehearsal build byte for byte
  (same SHA-256).
- Not run: an actual registry `npx bontaflowstack@1.2.1 setup`. The package is
  limited to `os: win32` and `cpu: x64`, so npm refuses it on the Linux
  maintainer machine (`EBADPLATFORM`); it has to be exercised on Windows x64.
