# BontaFlowStack 1.3.0 — Linux x64 phase 1

Status: prepared on 2026-11-24; **not yet published**. Package: `bontaflowstack@1.3.0`.
Planned source tag: `v1.3.0`; planned npm channel: `latest`.

## Change

Pull request #14 (merge commit `fec606f`) makes the package installable on Linux x64
as well as Windows x64: `os` becomes `["win32","linux"]`, `cpu` stays `["x64"]`.
Linux x64 supports the shared installer and Claude Code 2.1.296+ only; the other five
hosts stay refused on Linux. Windows x64 behavior is unchanged. Details:
[Linux phases](LINUX-PHASES.md). `1.2.1` stays published and unchanged.

## Release checks

Evidence from pull request #14 (recorded there, run on 2026-11-24):

- Local, Linux x64, Node 24.22.3: real end-to-end `setup` against Claude Code 2.1.331
  (`tests/linux-setup.integration.mjs`); `node scripts/check.mjs`: 151 passed, 2 failed
  (guard tests that need `pwsh`, absent in that container; identical on `main`), 9 skipped.
- CI on head `f7d00e2`: jobs `core`, `linux`, `linux-setup` ended Success.

The release pull request carries its own checks; the Windows package build and the
Windows-only tests run in the `core` job on `windows-latest`.

## Published package identity

Filled in after publication by the record pull request, as for `1.2.1`.
