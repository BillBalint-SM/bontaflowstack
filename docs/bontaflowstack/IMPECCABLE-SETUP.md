# Automatic Impeccable setup

The user requested that the single npm setup install and configure Impeccable
for both Codex and Claude Code, with no manual environment setting. This change
is prepared for `bontaflowstack@1.1.0-rc.2`; npm publication is pending.
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

Authenticated Claude model-session acceptance is still pending. CLI installation,
core execution and fixture tests do not establish native model-driven behavior.
Live URL detector scans and the full standalone Impeccable skill workflow were
not tested; the practical detector checks above used local CSS files.

## Upstream references

- [Official source](https://github.com/pbakaus/impeccable)
- [Detector command and exit contract](https://impeccable.style/docs/detector/)
- [Pinned npm package](https://www.npmjs.com/package/impeccable/v/4.5.2)
