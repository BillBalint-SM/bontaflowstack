# Automatic Impeccable setup

The user requested that the single npm setup install and configure Impeccable
for both Codex and Claude Code, with no manual environment setting. This change
is published as `bontaflowstack@1.1.0-rc.2` with the npm `rc` tag.
The published `1.1.0-rc.1` package is immutable and does not include this change.

## Implementation

- Pin the official `impeccable@4.5.2` npm dependency. Its Windows x64 platform
  package is `@impeccable/cli-windows-x64@0.1.14`; the actual binary reports
  `4.0.0` with `--version`. These are distinct upstream version labels.
- Copy that binary and its Apache-2.0 license to
  `<shared-state>/tools/impeccable/4.5.2` and probe the executable before changing
  host registrations. npm resolves and verifies its package downloads.
- Save the command and binary SHA-256 in `<shared-state>/impeccable.json`.
  Both adapters resolve it through their existing pinned shared state. No
  persistent user environment change or project hook installation is needed.
- Preserve explicit `BFS_IMPECCABLE_COMMAND` overrides. Repeated setup checks
  the installed files and reuses them; modified files are preserved and reported.
- Treat `design-detect detect` exit 2 as a completed scan with findings while
  retaining its exit code. Exit 1 remains a scan failure. Findings still need
  review against the actual interface.

Google DESIGN.md remains an optional external tool. This change supplies the
Impeccable CLI used by BFS; ordinary design does not require running it.

## Validation

Observed on Windows x64 with Node 26.8.1, 2026-10-13:

- Final `node scripts/check.mjs`: **115 passed, 0 failed**, including installer,
  package, core, host-adapter and release checks. Changed documentation links
  and `git diff --check` also passed.
- Before the change, the new setup test failed because no `impeccable.json` was
  written; the core test failed because a persisted command was not discovered.
  Both passed after implementation.
- Actual npm pack/npx setup registered both installed host CLIs in isolated
  profiles, repeated setup, upgraded to a synthetic version and restored the
  original candidate. The test then removed those registrations.
- Fresh core processes from both generated adapters reported `design-detect`
  ready without `BFS_IMPECCABLE_COMMAND` or `BFS_STATE_HOME`, including redirected
  `LOCALAPPDATA`. The adapters used their existing shared-state pins.
- After moving the npm cache and source packages away, both adapters ran the
  real detector: clean CSS returned 0, a font finding returned 2 with the actual
  `overused-font` finding, and a missing file returned 1 with failed status.
- Regression fixtures cover custom override precedence, invalid overrides,
  executable probe failure before registration, retry and preservation of a
  modified binary. These are fixture checks, not native host-session acceptance.

Real installation evidence:
`.tmp/npm-setup-integration-98d14046-b2df-4d75-932f-e4aa1158f8ed/result.json`.
The first integration run found a test-harness assumption that all completed
scans exit 0; it was corrected to assert the detector's actual 0/1/2 exit codes.
The first full gate also rejected an unnecessary Codex mention in the generated
Claude capability instructions. The wording was corrected; the final gate above
passed without relaxing its check.

## Prepared release

- Source commit: `32e71122fce18b847a675efbd4efc6370fbb166b`.
- Local release directory: `artifacts/npm/1.1.0-rc.2`, containing the exact npm
  tarball and `release.json` receipt. This is publishing evidence, not a second
  user installation route.
- Tarball SHA-256:
  `6772c0965b59165b4c32baad4611d89120a121e926405a6f832415b379ac4442`.
- Impeccable binary SHA-256:
  `38e09451694973ba664a24e67e1502a6913e6d0e533a0a5ae1e04c5963a804b1`.
- That exact prepared tarball passed a further real npx setup/repeat in fresh,
  isolated Codex and Claude profiles, using the previously verified shared
  engine state. Both adapters then ran the actual detector in fresh processes
  after the npm cache was moved away, with no command or state environment
  variable. Test registrations were removed. Evidence:
  `.tmp/impeccable-final-d7d6287b-e699-4876-b9c7-41d178676980/result.json`.

After the user explicitly approved rc.2 publication, the prepared artifact was
published to npm and the corresponding source and tag were pushed to GitHub.
See [publication verification](RELEASE-1.1.0-rc.2.md).

## Limits

Authenticated Claude model-session acceptance is still pending. CLI installation,
core execution and fixture tests do not establish native model-driven behavior.
Live URL detector scans and the full standalone Impeccable skill workflow were
not tested; the practical detector checks above used local CSS files.

## Upstream references

- [Official source](https://github.com/pbakaus/impeccable)
- [Detector command and exit contract](https://impeccable.style/docs/detector/)
- [Pinned npm package](https://www.npmjs.com/package/impeccable/v/4.5.2)
