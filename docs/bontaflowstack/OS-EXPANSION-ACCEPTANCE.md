# Issue #6: model-independent acceptance ledger

Recorded on 2026-10-15 against [issue #6](https://github.com/BillBalint-SM/bontaflowstack/issues/6).
This ledger separates executed checks from checks requiring an unavailable external
prerequisite. It does not turn CLI registration or fixture events into a native
agent/model acceptance result. The blocked branches were not retried with model requests.

## Executed source and artifacts

- Final source: `e5f8b79a0a5e3b1e684dd65d48425030be2085a3`.
- [GitHub run 38754515090](https://github.com/BillBalint-SM/bontaflowstack/actions/runs/38754515090): all **14 jobs succeeded**.
- Native Linux x64/ARM64 and Mac ARM64/Intel jobs installed pinned Codex 0.162.0,
  Claude Code 2.1.296, Gemini 0.63.0, Copilot 1.0.96 and OpenCode 1.19.0 packages.
  Real host CLIs confirmed their native registration and repeat/update. Gemini,
  Copilot and OpenCode additionally exercised their skill/MCP listing interfaces
  and preserved conflicts/policy; the package catalog is checked separately.
  Codex/Claude also exercised rollback and removal
  without data deletion. Upgrade versions in these tests are synthetic test releases.
- Each of those four native targets executed Chromium click/readback, screenshot,
  640×480 render and Impeccable CSS checks. Actual browser process arguments lacked
  `--no-sandbox`; this is not a separate audit of every OS sandbox mechanism.
- Both Mac targets exercised case-insensitive runner storage and a mounted
  case-sensitive HFSX volume, Unicode/spaces and canonical project aliases.
- Windows common checks: **173 PASS / 4 SKIP / 0 FAIL**; source ZIP build/test passed;
  additional release checks **19 PASS / 0 FAIL**. Skips include the Darwin-specific
  large-output case and existing POSIX-only cases, not omitted Windows behavior.
- Actual Windows engine suite: **12 PASS / 1 Linux-specific SKIP / 0 FAIL**.
- Engine source is committed locally at `65b67ad1f0fd8f8f16a22ba6fbcb17717975948e`.
  The candidate includes the complete `0.3.5` source ZIP and file-hash manifest;
  SHA-256 `1f06b011cd5250931ca818cfb8dda1a974a029de568684e1d8015b920109b182`.
  That source commit is local; it was not pushed to the separate engine repository.
- CI distro jobs used one packed core candidate, SHA-256
  `294207b9b9802b859feada78e08bef460d527b3c486a254c934a0e35d320da38`.
  Separate Fedora/Arch real OpenCode lifecycle tests used the same earlier Linux
  tarball `e98ad0bd1cc2220315298d3ba7327df39390dda18a61e56d0c003ae8b7d0f7e1`;
  their result is bound to those bytes, not relabeled as a rerun of the later Mac
  output-capture change. A final-source Debian 13 OpenCode lifecycle also passed.
- The controlled unknown-distro overlay completed real setup/core/headless checks.
  The final CI tarball also completed native Codex core registration under musl
  Node 24.22.0. Its full Alpine setup correctly returned incomplete; separate
  installed core/browser doctor checks distinguished ready core from unavailable
  browser, and the missing ELF interpreter was inspected in the actual binary.

Fedora, Arch and Debian checks ran in native x64 userlands on the WSL kernel,
not independently booted desktops. System packages were installed only in private
test rootfs copies. No user's distribution packages or security policy were changed.
Ubuntu CI runners received a namespace permission limited to Chromium executables
under their private test directory. The installer adds no AppArmor profile and
does not install system libraries or disable Chromium sandboxing.

## Acceptance cases

“Executed” below names the actual boundary. A remaining native agent/GUI check
is explicitly listed even when the underlying core/CLI check passed.

| Case | Executed boundary | External prerequisite or capability limit |
| --- | --- | --- |
| A01 | Real npm/npx and native registration on all four new OS/CPU targets, five CLI hosts | Fresh model-driven agent session and graphical hosts require their own access |
| A02 | Shared packed-core CI on Debian/Fedora/Arch; actual non-Ubuntu native host/engine paths | Independently booted graphical desktops were not tested |
| A03 | POSIX target checks plus actual setup/core/headless click under controlled unknown distro metadata on the verified Fedora userland | The metadata overlay does not represent an additional physical distribution |
| A04 | Actual final CI tarball npx setup under native musl Node 24.22.0 with real Codex 0.162.0: core registered, native plugin read-back and core doctor passed; setup exit 1 correctly incomplete | Bundled glibc Chromium launch reports ENOENT for its existing binary with the missing glibc loader; not full Alpine browser support |
| A05 | Common setup tests exercise invalid/non-executable candidates and auto/explicit/all behavior | No missing host is represented as installed |
| A06 | Absolute Node pin/discovery/recovery has controlled coverage and native Linux evidence | Finder-launched graphical Mac host requires an interactive Mac session |
| A07 | XDG, explicit root and pin precedence cases run in common native CI | None for the tested core boundary |
| A08 | Existing state pins, redirected defaults, cache removal and preserved records checked | No automatic data migration is claimed |
| A09 | Native Mac case-sensitive/insensitive volumes, aliases, Unicode/spaces and link guards | None for the tested filesystem boundary |
| A10 | Native common CI runs real linked-worktree/concurrent state tests; controlled session ownership tests | Native model-driven multi-host event flow remains separate |
| A11 | POSIX private state/token mode and foreign-path protection tests | None for the tested owned-state boundary |
| A12 | Controlled hook/timeout/failure contracts; recorded Linux Cursor session lifecycle events retained | Real model/tool events require authentication/quota; no requests sent |
| A13 | Actual stdio/MCP process-boundary rejection and controlled ownership/replay checks | Fresh host-driven tool invocation remains access-dependent |
| A14 | Native common guard tests: literal/dynamic Bash, unsupported shells, edit boundaries | Host permission/consent is never granted by these tests |
| A15 | ZIP/integrity/staging/failure/retry tests and actual native engine installation | None for the tested installer boundary |
| A16 | Platform/hash/manifest refusal tests and native platform manifests | None for the tested manifest boundary |
| A17 | Core-first registration and incomplete setup/doctor tests | Missing native capability remains unavailable, not silently ready |
| A18 | Same-command recovery and preservation tests; real repeat installs on four new targets | No fake full success for an unresolved dependency |
| A19 | Actual native Impeccable CSS findings/clean/error and cache-independent paths on four targets | Full Alpine browser is a different capability |
| A20 | Actual standalone engine click/readback/screenshot/render on four targets | Model-initiated native MCP tool call remains authentication/quota-dependent |
| A21 | Real X11/WSLg evidence and Wayland-only visible engine click/readback/screenshot | Human handoff followed by native host resume requires a human and host access; Mac GUI remains unverified |
| A22 | Actual no-display headless success, visible failure and headless recovery retained | Process-environment probe on WSL, not a separately booted headless server |
| A23 | Real repeat/update and preserved state/config, plus failure/recovery/disabled/conflict tests | Synthetic test upgrade versions are not published releases |
| A24 | Actual Codex/Claude candidate rollback/removal retains data and old payloads | No previously published compatible POSIX release exists to claim rollback to |
| A25 | 34-skill catalog/contracts and core workflow/checkpoint cases in native common CI | Full fresh-session agent task flow is model/access-dependent |
| A26 | Current Windows core/package/release and actual engine regression passed; native saved-data hashes match | Existing release acceptance remains closed at its original scope |

## Work intentionally left waiting

- Cursor model/MCP/pre/post-tool trials: **waiting for provider quota; no more model requests**.
- Codex/Claude/Copilot model trials retain their prior authentication-waiting status;
  this work did not sign in, copy credentials or request a model from another provider.
- Native GUI/Finder PATH and GUI runtime recovery on Mac, graphical Cursor surfaces,
  actual human handoff/resume and fresh native agent sessions require unavailable
  hardware/interactive access or human participation. Automated browser clicks are
  not presented as human participation.
- Alpine full Chromium remains a documented ABI capability limit; a different
  browser-distribution solution needs a separate decision. Core is not blocked by
  the distro name, and Linux support is not restricted to Ubuntu.

The remaining rows are not replaced by green fixture results. Issue #6 stays open
for those external acceptance prerequisites. No model request, npm release, main
merge, account/subscription change or user-data deletion was performed.
