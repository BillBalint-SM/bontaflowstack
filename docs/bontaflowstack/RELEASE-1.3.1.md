# BontaFlowStack 1.3.1 — `npx setup` fix for Linux

Status: published on 2026-11-24 (registry time 2026-11-24T07:35:59Z). Package: `bontaflowstack@1.3.1`.
Source tag: `v1.3.1`; npm channel: `latest`.

## Change

`1.3.0` installs on Linux x64, but `npx bontaflowstack@1.3.0 setup` exits 0 without output
and installs nothing there (observed, see [RELEASE-1.3.0.md](RELEASE-1.3.0.md)). The entry
point of `installers/npm/bin/setup.mjs` ran only when `path.resolve(process.argv[1])` equalled
its real path, but `npx` starts it through the `node_modules/.bin/bontaflowstack` symlink.
It now compares `fs.realpathSync` of both. Adapters, skills and Windows behavior are unchanged.

`1.3.0` stays published and unchanged; deprecating it is the owner's decision.

## Release checks

Run on Linux x64 with Node 24.22.3 (npm package `node@24`) and npm 10.9.9, below the
documented npm minimum of 11.21.0; the release `prepare` was therefore run on the
owner's machine.

- New test `the installed entry point runs when started through the .bin symlink that npx
  uses` in `tests/linux-setup.test.mjs`: failed before the fix ("a silent exit means the
  symlinked entry point did nothing"), passes after it.
- `node --test tests/linux-setup.test.mjs tests/npm-setup.test.mjs tests/npm-package.test.mjs`:
  37 tests, 36 passed, 0 failed, 1 skipped (a Windows-host test).
- Left to CI: the full `check.mjs`, the `linux-setup` job, and the Windows jobs on `windows-latest`.

## Published package identity

Published on 2026-11-24 from the owner's machine with `node scripts/npm-release.mjs publish
--artifact artifacts/npm/1.3.1 --tag latest` (npm browser authentication). The first `verify`
run, seconds after the publish, got E404 because the registry was still processing; the package
was not republished. A second `verify` after the version appeared returned `outcome: verified`.

- Source tag `v1.3.1` (annotated tag object `a787f0504fa5d388646ed64ade56bea9cd054af7`) points to
  commit `b55e65558e11bcbccfa7391589feaa9fa453b704` (merge of #17), on `origin`.
- Registry: `latest` is `1.3.1`, `rc` is `1.1.0-rc.3`; manifest `os` `["win32","linux"]`,
  `cpu` `["x64"]`, `engines.node` `>=24`.
- Tarball `bontaflowstack-1.3.1.tgz`, 466,373 bytes, SHA-256
  `6f19f577f69b26b06fc328ee630fde026d651f4fcfb0d950f393181b39145e37`, npm shasum
  `8059ad6034b5a250f9cba8d4fe93242a28d02a1d`.
- npm integrity (registry equals the local `release.json`):
  `sha512-vFIWqMa/foqGXyAcP1s2gjWWpDrBlihUFGBFehFNVdQxqTntR+JOo+H+/oj5Zhnnipiuw2BwdFOTdgjWaK+4uA==`.

## Observed Linux result

Run on 2026-11-24 on Linux x64 with Node 26.13.1, Claude Code 2.1.331, in an empty scratch
folder with an isolated `HOME` and `XDG_*` directories, against the registry package.

- `npx --yes bontaflowstack@1.3.1 setup --host claude`: **exit 0**. Output: engines `0.3.3`
  installed (Chromium headless shell downloaded from `cdn.playwright.dev`), 34 skills,
  marketplace `bontaflowstack-npx` added, plugin `bontaflowstack@bontaflowstack-npx` installed,
  "BontaFlowStack 1.3.1: claude registered."
- `claude plugin list` in that `HOME`: `bontaflowstack@bontaflowstack-npx`, version 1.3.1,
  scope user, enabled. Data under `$XDG_DATA_HOME/BontaFlowStack`.
- This confirms the fix for the 1.3.0 defect: the same command now installs on Linux.
- `design-md` reported not ready (external tool, `BFS_DESIGN_MD_COMMAND` unset); the other
  engine capabilities were ready.
- Not run: Windows x64 setup, any Claude Code session using the installed plugin, the full
  `check.mjs` and the CI jobs for this release (left to CI).
