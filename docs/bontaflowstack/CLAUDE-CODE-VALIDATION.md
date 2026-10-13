# Universal npm installer and Claude Code port validation — 2026-10-13

Initial rc.1 source: `cd2e21ef8f947e0196e600f679e5cb54c1ee4dc6`, tagged
`v1.1.0-rc.1` in the public repository. This does not establish completed
native Claude acceptance. The accepted scope excludes raster image
generation/editing; see [scope and mechanics](CLAUDE-CODE-PORT.md).

## Stable release 1.1.0

The [1.1.0 report](RELEASE-1.1.0.md) records version promotion, package comparison
and installation checks. Earlier results below retain their original versions
and scope.

## Published Claude repairs 1.1.0-rc.3

The [rc.3 report](RELEASE-1.1.0-rc.3.md) records the three audit repairs,
the current official Claude Code documentation review, and checks of all 34
skills, eight hooks, five MCP tools and 51 generated Markdown files. Actual CLI
manifest validation and MCP connection are distinguished from synthetic hook
tests. The user accepted the Codex/Claude Code build and authorized publication.
The rc.3 publication is closed; the earlier native acceptance item is not a
blocker or follow-up. Earlier release results below retain their original scope
and do not assign new work.

## Published Impeccable update 1.1.0-rc.2

Source `32e71122fce18b847a675efbd4efc6370fbb166b`, tag `v1.1.0-rc.2`,
adds automatic Impeccable CLI installation and shared configuration to npm setup.
The final local gate passed 115 tests. Registry integrity and exact-version npx
setup with both native host CLIs are recorded in the [rc.2 release report](RELEASE-1.1.0-rc.2.md).
Native authenticated Claude acceptance remains pending; the earlier rc.1
evidence below retains its original scope.

## Universal npm candidate 1.1.0-rc.1

The user selected npm as the single distribution route for the entire package,
including Codex and Claude Code. Each generated adapter contains 34 skills.
The candidate is published on npm. Registry integrity and an actual registry
npx installation with both host CLIs passed; see the [release report](RELEASE-1.1.0-rc.1.md).
The registry also assigned `latest` and rejected its removal with E400. The
version remains an RC with native acceptance pending.

| Check | Observed result | Boundary |
| --- | --- | --- |
| Initial complete source gate | 106 passed, 0 failed, exit 0 | `.tmp/npm-universal-check.log`; before the later Codex repeat fix. |
| Final complete source gate | 110 passed, 0 failed, 0 skipped, exit 0 | `.tmp/npm-release-final-check.log`; includes installer, install-state and release checks after the Codex repeat fix. |
| Both real host CLIs, direct setup call | Install/repeat/synthetic upgrade/uninstall passed | `.tmp/npm-setup-integration-a14014c9-0392-4e81-9141-8ad5fd646990/result.json`. This earlier test did not invoke npx or remove an npm cache; its report was corrected to say so. |
| Actual npm pack and npx entry | First install, no-argument repeat, synthetic `9.9.9-test.1` upgrade, cache/source removal, doctor and both uninstalls passed | `.tmp/npm-setup-integration-c7cd048e-95b8-4720-b9ad-2da27cb46659/result.json`; isolated host configuration, initially empty engine store, real engine/Chromium downloads. This is not a second published version. |
| Shared state pin | Both installed core doctors passed with `BFS_STATE_HOME` removed and a different `LOCALAPPDATA` | Same integration evidence; separate final smoke also checks the Codex cached plugin copy. |
| Fresh engine behavior | Seven browser/render/design checks completed | `.tmp/npm-universal-engine-check.log`; real sandboxed Chromium and engine 0.3.3, synthetic Claude transport. Evidence `.tmp/claude-engine-2026-10-12T23-03-36-712Z-e6ffd5a5-a9da-4046-b6b6-3846dd3c055f/`. |
| Exact release payload smoke | Twelve actual commands passed, exit 0 | `.tmp/npm final artifact smoke/result.json`; final tarball, actual npx with/without `setup`, both CLI listings, strict Claude manifests, doctor from both host copies including Codex cache, isolated uninstall. Reuses the freshly built engine and uses a path containing spaces. |
| Return from a newer synthetic version | Eight actual commands passed, exit 0 | `.tmp/npm final artifact smoke/rollback-result.json`; npx installed synthetic `9.9.9-test.1`, then the exact final `1.1.0-rc.1` payload; both CLIs confirmed the enabled older version. |
| Final focused installer checks | 16 passed, exit 0 | `.tmp/npm-final-installer-check.log`; includes failed-registration recovery, state selection and persistence, and the Windows PowerShell module-path regression assertion. |
| npm packaging and release rejection checks | Four checks passed | `.tmp/npm-universal-package-check.log`; real npm pack, both host manifests, shared HOST preservation, altered tarball/version/tag refusal. No test publishes a package. |
| Focused code review | No further concrete finding after repairs | Read-only review; not native session acceptance. |
| Public npm registry install | Nine commands passed, exit 0 | `.tmp/npm registry smoke/result.json`; exact-version registry npx command, fresh cache, both real host CLIs, shared-state doctors and isolated uninstalls. Reused the previously built engine; no authenticated model session. |
| Registry publication verification | Version, SHA-512 integrity and `rc` tag match | `.tmp/rc-registry-verified.json`; also reports the unexpected `latest` alias. |
| CI fixture repairs | 18 targeted tests passed, exit 0 | `.tmp/rc-ci-fixture-check.log`; real Git with global/system config disabled, canonical Windows paths and forced checkout conversion. |
| Actual Windows short-path replay | 18 targeted tests passed, exit 0 | `.tmp/rc-ci-native-temp-check.log`; 8.3 TEMP alias outside the repository, `realpathSync.native`, no global/system Git configuration. The first canonicalization attempt still failed on CI and was corrected. |
| Registry verifier repair | Three targeted tests passed, exit 0 | `.tmp/rc-registry-verifier-check.log`; actual npm 12 singleton-array response shape, mismatches and registry-assigned tags. |

The first real npx repeat exposed a Codex cache activation `Access is denied`
error when re-adding an unchanged enabled release. A regression assertion failed
before the repair. Setup now skips that unnecessary mutation only when the
marketplace path, version, installed state and enabled state already match; it
still reads back the final CLI state. The rerun passed. An intermediate source
gate ran 108 passing tests but exited 1 because its wrapper invoked the release
CLI without arguments. The wrapper was corrected to run the release tests;
the final 110-test gate above passed.

The exact candidate payload is 199,711 bytes, SHA-256
`f6fbd7a979f3b49d0eeccce07fd02da4303b0e93d2ba9bfbb0225376d0686280`.
This hash identifies the locally tested and now published package; its SHA-512
integrity matches the registry. The single user command is `npx bontaflowstack@1.1.0-rc.1 setup`.
Historical ZIP release evidence remains historical and is not transferred to npm.

## Earlier Claude-only npm checks — 2026-10-13

Selected package: `bontaflowstack`; local candidate: `1.0.0-alpha.1`.
The public npm registry returned 404 for the selected name when checked. This
does not reserve the name or verify publisher authorization.

| Check | Observed result | Boundary |
| --- | --- | --- |
| `node scripts/check.mjs` | 99 passed, 0 failed, 0 skipped; exit 0 | Log `.tmp/npm-final-check.log`; includes eight synthetic installer behavior cases, actual npm pack and a real PowerShell installer with a synthetic failing build. |
| Final `node --test tests/npm-package.test.mjs tests/claude-package.test.mjs` | 2 passed; exit 0 | Rechecked after final generated installation/doctor wording changes; shared HOST contract preservation, actual npm tarball content. Log `.tmp/npm-final-package-check.log`. |
| `node tests/npm-setup.integration.mjs` | Exit 0; all eight grouped checks passed | Real local-tarball npx setup, real CLI 2.1.296, initially empty engine store, actual npm dependency and Chromium downloads/build. Isolated config/state; `.tmp/npm-native-rcwVtO/result.json`. |
| Repeat and update through npx | Exit 0 | Update fixture changes version metadata to `1.0.0-alpha.1.1`; it is not a published release. Previous version and sentinel user data retained. |
| npx cache and source paths made unavailable | CLI list and durable engine doctor passed | Directories were renamed, not deleted. Confirms persistence and file/engine readiness; no model session ran. |
| Interrupted engine build recovery | First synthetic build failed with 17; retry succeeded | Actual shared PowerShell installer and checksum-verified synthetic ZIP. Failed staging preserved; final target published only after successful build. |
| Freshly installed engine browser/design integration | Seven checks passed; exit 0 | Actual sandboxed Chromium, render and design checks against the new engine installation; synthetic Claude transport. `.tmp/claude-engine-2026-10-12T22-22-25-021Z-70c2c47a-1768-4745-9552-ebce6678437a/`. |
| Final deliverable tarball through npx | Exit 0; install/list/doctor/strict manifests/uninstall/remove passed | Separate isolated config and path containing spaces; reused the engine built by the clean test. Logs `.tmp/npm-final-session/`. |

The actual clean setup reproduced a Windows PowerShell module-path failure when
launched via Node from PowerShell 7. The installer now lets its Windows PowerShell
children discover their own modules; caller and Claude environments are unchanged.
The regression failed before the fix and passed afterward. The initial direct
tarball npx invocation did not install anything on npm 12; integration uses the
explicit local-package form `npx --yes --package <archive> -- bontaflowstack setup`.
The future registry shorthand has not been tested against a published release.

Deliverable: `artifacts/npm/1.0.0-alpha.1/bontaflowstack-1.0.0-alpha.1.tgz`, with
an adjacent SHA-256 file. No npm publish, repository push, global Claude config
change or authenticated model session was performed.

## Earlier port checks — 2026-10-12

| Check | Observed result | Boundary |
| --- | --- | --- |
| `node scripts/check.mjs` | 89 passed, 0 failed, 0 skipped; exit 0 | Shared core, actual local Git integration, packaging, and synthetic Claude hook/MCP fixtures. Log: `.tmp/claude-final-check.log`. |
| `node tests/claude-package.test.mjs` after the final HOST wording change | Exit 0 | All 34 skills, generated paths/links, invocation policy, host-specific instructions and existing-output refusal. |
| `node tests/claude-engine.integration.mjs` | Seven checks passed; exit 0 | Installed engine 0.3.3, real sandboxed Chromium and local design engine; synthetic Claude transport. |
| Claude Code 2.1.296 `plugin validate .../.claude-plugin/plugin.json --strict` | Validation passed; exit 0 | Plugin manifest/schema. A directory argument selects the marketplace when both manifests exist, so both files were checked explicitly. |
| Claude Code 2.1.296 `plugin validate .../.claude-plugin/marketplace.json --strict` | Validation passed; exit 0 | Local marketplace manifest/schema. |
| CLI marketplace add, plugin install/list/update/uninstall, marketplace remove | Commands succeeded under a temporary `CLAUDE_CONFIG_DIR`; list showed enabled version 1.0.0 | Actual CLI installation lifecycle without model execution. Update reported the same folder-backed version was already current; replacing an installed older version was not tested. |
| `git diff --check` | Exit 0 | Whitespace validation. |

The real engine checks cover isolated browser owners, clicks, storage, screenshot
and PDF outputs inside the selected project, rejected outside-project output,
state restoration, rendered design comparison and persisted selection. The
selection was test input, not a human choice. The browser capture and comparison
board were also visually inspected. The evidence bundle is
`.tmp/claude-engine-2026-10-12T19-30-54-831Z-6be11c46-679b-43b2-a44c-b79f7686a74d/`.
The installed engine manifest SHA-256 is
`705399c566f2c1b00cd7bf893cdc645a240ccdd11fc5c9a530b7a3c6a7e72bea`.

Focused tests reproduced and verified fixes for the host-context dispatch,
completed-session registry cleanup and Claude-native help output. The initial
source gate had one obsolete README negative fixture; its target now matches
the actual table, and the full gate above passed. Bash guard tests cover Git
Bash drive paths and reject unsupported dynamic/compound/assignment syntax for
inspection. The guard is a bounded classifier, not a shell sandbox.

## Earlier verification scope (historical)

No authenticated Claude model session was run. CLI 2.1.296 was installed; the
last observed auth status was `loggedIn: false`. Native skill selection,
PreToolUse argument rewriting, main/subagent identity delivery, `/clear` and
resume, user interruption, host permission prompts and browser sign-in handoff
remain unverified. Synthetic events cannot establish those behaviors.

The earlier engine tests reused an existing engine; the npm tests above now
include a fresh download/build and real browser checks. Optional external
DESIGN.md remains untested. The subsequent, published rc.2 change adds and
tests automatic Impeccable installation and actual local detector execution
through both generated adapters; see [Impeccable setup](IMPECCABLE-SETUP.md).
The RC and source have now been published as recorded above. No persistent
installation into the user's actual Claude configuration was performed.

The isolated CLI test was uninstalled successfully. Its remaining temporary
configuration directory `.tmp/claude-isolated-config-20261012` was retained:
automatic command review rejected recursive cleanup with `blocked by policy`
without a more specific reason. It is excluded from the npm package.

Use [the installation guide](INSTALL-CLAUDE-CODE.md) for the current package.
