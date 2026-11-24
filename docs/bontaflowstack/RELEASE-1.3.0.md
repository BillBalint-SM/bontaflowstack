# BontaFlowStack 1.3.0 — Linux x64 phase 1

Status: published on 2026-11-24 (registry time 2026-11-24T06:30:26Z). Package: `bontaflowstack@1.3.0`.
Source tag: `v1.3.0`; npm channel: `latest`.

**Known defect: `npx bontaflowstack@1.3.0 setup` does nothing on Linux.** See
[Observed Linux result](#observed-linux-result). Fixed in [1.3.1](RELEASE-1.3.1.md).

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

Published on 2026-11-24 from the owner's machine with `node scripts/npm-release.mjs
prepare`, `publish` and `verify` against the pushed `v1.3.0` tag. The `release.json` of
that run was not available to the recording session; the values below were read from the
npm registry and GitHub, and compared with a rehearsal `prepare` build made on Linux
from the same tag.

- Source tag `v1.3.0` (annotated tag object `73ea8df35143d053b5a95b389396f5a5cb457118`)
  points to commit `590227c7abe50035001d82a653f85e481893266f` (merge of #15).
- Registry: `latest` is `1.3.0`, `rc` is `1.1.0-rc.3`; manifest `os` `["win32","linux"]`,
  `cpu` `["x64"]`, `engines.node` `>=24`.
- npm integrity: `sha512-8WQ6hojSY5XwXYH3Rh4M9/E7e3c5WVpEpATlPcbdnQg/+iO49zD0yYbCdvBMbjkd0EBYJ9Y8plmWjnr+rbEEqw==`.
  It equals the integrity of the rehearsal build, so the published bytes equal the rehearsal
  tarball (466,295 bytes), whose SHA-256 is
  `1cdce236bdef21856d99d5454c86eb09c36c979fca86479eaf9202992ac70e4b`. The rehearsal ran on
  Node 22.23.5 and npm 10.9.9, below the documented minimum, so it is a comparison, not the
  release evidence; the owner's `release.json` remains the authoritative record.

## Observed Linux result

Run on 2026-11-24 on Linux x64 with Node 24.22.3 (from the npm `node@24` package), npm 10.9.9,
Claude Code 2.1.331, in an empty scratch folder with an isolated `HOME`.

- `npx --yes bontaflowstack@1.3.0 setup --host claude`: **exit 0, no setup output, nothing
  installed** (`claude plugin list` empty; no `BontaFlowStack` data directory).
- Cause (observed): `installers/npm/bin/setup.mjs` runs `main()` only when
  `path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)`. Under `npx` on Linux,
  `argv[1]` is the symlink `node_modules/.bin/bontaflowstack`, so the comparison fails and the
  script exits silently. Running the `.bin` symlink directly shows the same. The same
  comparison exists in `1.2.1`; Windows `.cmd` shims pass the real path, so Windows is not known
  to be affected, but this was not run here.
- Running the installed entry point directly,
  `node .../node_modules/bontaflowstack/bin/setup.mjs setup --host claude`, **succeeded**:
  Claude Code registered, engines `0.3.3` installed (Chromium downloaded from
  `cdn.playwright.dev`), 34 skills, data under `$XDG_DATA_HOME/BontaFlowStack`.
- So `os: linux` installs, but the documented command `npx bontaflowstack@1.3.0 setup` does
  not set anything up on Linux. A fix needs a new version; it is not part of this record.
- Not run: Windows x64 setup, and any Claude Code session using the installed plugin.
