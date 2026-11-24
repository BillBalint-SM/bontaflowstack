# BontaFlowStack 1.3.1 — `npx setup` fix for Linux

Status: prepared on 2026-11-24; **not yet published**. Package: `bontaflowstack@1.3.1`.
Planned source tag: `v1.3.1`; planned npm channel: `latest`.

## Change

`1.3.0` installs on Linux x64, but `npx bontaflowstack@1.3.0 setup` exits 0 without output
and installs nothing there (observed, see [RELEASE-1.3.0.md](RELEASE-1.3.0.md)). The entry
point of `installers/npm/bin/setup.mjs` ran only when `path.resolve(process.argv[1])` equalled
its real path, but `npx` starts it through the `node_modules/.bin/bontaflowstack` symlink.
It now compares `fs.realpathSync` of both. Adapters, skills and Windows behavior are unchanged.

`1.3.0` stays published and unchanged; deprecating it is the owner's decision.

## Release checks

Run on Linux x64 with Node 24.22.3 (npm package `node@24`) and npm 10.9.9, below the
documented npm minimum of 11.21.0; the release `prepare` therefore still has to run on the
owner's machine.

- New test `the installed entry point runs when started through the .bin symlink that npx
  uses` in `tests/linux-setup.test.mjs`: failed before the fix ("a silent exit means the
  symlinked entry point did nothing"), passes after it.
- `node --test tests/linux-setup.test.mjs tests/npm-setup.test.mjs tests/npm-package.test.mjs`:
  37 tests, 36 passed, 0 failed, 1 skipped (a Windows-host test).
- Left to CI: the full `check.mjs`, the `linux-setup` job, and the Windows jobs on `windows-latest`.

## Published package identity

Filled in after publication by the record pull request.
