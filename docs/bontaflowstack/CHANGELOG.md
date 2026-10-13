# Changelog

## 1.1.0-rc.2 — prepared, publication pending

- Install the pinned official Impeccable CLI through the same npm setup for both
  hosts. Preserve its binary outside the npm cache and resolve its shared
  configuration in fresh sessions without a manual environment setting.
- Preserve explicit custom commands and modified installed files. Probe the
  executable before host registration and distinguish detector findings from
  scan failures. See [scope and verification](IMPECCABLE-SETUP.md).

## 1.1.0-rc.1 — universal npm release candidate, 2026-10-13

- Publish `npx bontaflowstack@1.1.0-rc.1 setup` as the single standard install
  route for Codex and Claude Code; omitting `setup` also starts installation.
- Detect installed hosts, register 34 skills per adapter, prepare shared pinned
  engines, and retain versioned files and shared state outside the npx cache.
- Add the Claude native session/subagent, hook and MCP adapter. Raster image
  generation/editing is excluded from Claude as agreed; authenticated native
  session acceptance remains pending, so this is an RC.
- Verify the public registry payload and actual registry npx installation with
  both host CLIs. See [release evidence and limits](RELEASE-1.1.0-rc.1.md),
  including the registry-assigned `latest` alias.

## 1.0.0 — public release, 2026-10-11

- Promote the validated 0.7.5 implementation to 1.0.0. Only the plugin manifest
  and catalog version labels change; the remaining 107 plugin files, bundled
  engine 0.3.3, root setup and marketplace stay byte-identical.
- Publish a GitHub Release with the installable ZIP, SHA256, release receipt,
  and English/Hungarian installation guides.
- Refresh the README around product journeys, all 34 skills, examples and a
  direct download path; update installation and troubleshooting for 1.0.0.
- Add a strictly bounded version-label promotion path to the existing release
  gate. Original Desktop evidence retains its observed 0.7.5 version and scope.
  See [1.0.0 evidence](RELEASE-1.0.0.md). Closed functional tests are not repeated.

## 0.7.5 — distribution package, 2026-10-11

- Correct the host workspace wire field to `sandboxCwd`. Version 0.7.4 used
  the Rust field name instead of the serialized camelCase name, so actual
  Desktop calls remained unbound. Its matching synthetic fixtures were wrong.
- Correct those two regression scenarios and expose host-provided permission
  metadata in status for actual Desktop acceptance. The corrected scenarios
  fail on 0.7.4 and pass on 0.7.5.
- ZIP-installed 0.7.5 passed actual Codex Desktop native browser use under Full
  Access: host workspace binding, visible launch, human Choose/Ready interaction,
  resume, capture and stop. See [release evidence](RELEASE-0.7.5.md) for provenance
  and scope. Closed tests were not repeated; graphical installation controls
  were not validated.
- Ship the final ZIP with unchanged validated plugin files, a SHA-256 inventory,
  and Hungarian/English installation, update and rollback guides. This creates a
  distributable artifact; it does not publish a GitHub release or tag.

## 0.7.4 — local candidate, 2026-10-11

- Request Codex host workspace metadata and bind the browser to that workspace
  or an explicitly selected subdirectory without a redundant project form.
  Outside directories retain the human confirmation requirement. Workspace
  changes and ownership changes are rejected within an existing connection.
- Expose unbound status, binding provenance, runtime version and source checksum
  for native Desktop verification. Chromium sandbox and project file checks
  are retained. Focused new protocol regressions passed; Desktop acceptance is
  recorded separately and must not be inferred from those tests.

## 0.7.3 — local candidate, 2026-10-11

- Full Access with `never` approval passed a separate eight-call native human
  browser acceptance. Correct profile-switch guidance and declare form-input
  support in the custom validation client; runtime browser code was unchanged.
  The result covers that client configuration, not every desktop/client version.
- Add a separately enabled host stdio MCP browser/render connection. Codex
  supplies thread identity; the human confirms the project through MCP form input.
  Requested file paths stay in that project. Relative plugin cwd starts the
  packaged entry, and optional BFS_STATE_HOME is explicitly forwarded.
  Workspace-git and Chromium's sandbox remain enabled.
- Bundle engine 0.3.3 source with a pinned checksum; setup still explicitly
  installs locked npm dependencies and Chromium. No unpublished remote release
  URL is required. Existing installations and legacy home profiles are preserved.
- Retain browser state in task snapshots with temporary Chromium runtime profiles.
- Native configured-MCP interaction/state/render/isolation acceptance passed.
  Fresh ZIP engine setup, native plugin discovery, human project confirmation,
  visible button interaction, handoff/resume, capture and stop also passed.
  MCP forms require a permitting host policy; the final run used on-request.
  This is not a published release.
- Draft packaging can use `-SkipChecks`, recorded as `checks: not-run` in
  PACKAGE.json. Release packaging rejects that option. Closed tests were not rerun.

## 0.7.2 — 2026-10-11

- Scope verification blockers to the current task's concrete dependencies.
  Unrelated limits remain historical notes; they neither reopen completed work
  nor trigger another test campaign. Untested behavior remains untested.
- Wayfinder reports closure when the requested goal is complete.
- Instruction-only patch with no new functional test campaign or full CI run.
  The engine pin remains 0.3.2.

## 0.7.1 — 2026-10-11

- Pin engine 0.3.2 and its published source archive checksum. The browser retains
  session cookies, including HttpOnly cookies, in memory across handoff relaunches
  and restores them before pages reload.
- The first headless-to-visible handoff still reloads pages; unsaved form values
  and JavaScript application memory are not retained.
- This release uses the prior focused regression evidence and a targeted B01
  installed-package rerun. Full CI and the full test campaign are intentionally
  not rerun. The Windows sandbox W01 prerequisite remains blocked after Codex
  restart by a runtime read/execute ACL sharing violation.

## 0.7.0 — 2026-10-01

- Added optional isolated prototypes with runnable decision questions and
  preserved experimental evidence.
- Added requested parallel task graphs, owned worktree/workflow bindings,
  freshness checks and verified serial integration before dependent tasks.
  Git object fingerprints avoid false staleness from Windows LF/CRLF conversion.
- Added independent triage, read-only wayfinding and isolated learning practice
  and review. Ordinary implementation retains its existing TDD flow.
- Native outcomes and remaining proof limits are recorded in the prototype,
  guard, remaining-acceptance and standalone-extension reports. Engine 0.3.1
  is unchanged; release build and archive results accompany the release assets.

## 0.6.1 — 2026-10-01

- Added portable, integrity-checked context handoffs that preserve selected
  histories and import as immutable checkpoints without replaying commands.
- Added workflow-linked delivery evidence with explicit freshness, identity and
  provider checks; stale or incomplete proof no longer certifies delivery.
- Added optional, evidence-backed retro reporting with learning provenance.
- Save/load skills now export, resume and branch checkpoints with reduced
  unnecessary save and status steps.
- Validation: 52 automated checks and the release ZIP smoke passed. Native
  session timeouts and coverage boundaries are recorded in the
  maintainer report `CONTEXT-CLOSURE-REPORT.md`. Engine 0.3.1 is unchanged.

## 0.6.0 — 2026-09-30

- Added versioned facts and full plans alongside decisions and learnings, with
  source fingerprints, lifecycle status, immutable history and checked updates.
- Skill reads and native hooks expose bounded essential context; completed and
  discarded work leaves the active view while full saved history remains available.
- Workflows can pause or discard with complete snapshots, then resume paused work
  after ownership and source-drift checks. Windows state writes retry transient locks.
- Existing skills now use material decision trees, domain clarification, public
  test boundaries and dependency-aware vertical tasks. TDD lives in bfs-implement;
  bug repair uses that procedure within the investigation step.
- Code review reports Standards and Spec separately against the same frozen scope.
- Validation: 43 automated checks and 32 native methodology sessions, with findings
  and limits in maintainer report `CORE-SKILL-METHODOLOGY-REPORT.md`.
- The context/closure extension (portable handoff, unified delivery proof and retro)
  remains a separate planned increment. Engine 0.3.1 is unchanged.

## 0.5.1 — 2026-09-30

- Fixed guard detection for destructive Git flag aliases, default worktree restores
  and explicit checkout paths. Read-only and staged-only cases retain their behavior.
- Legacy memory import preserves both typed collections, checks source drift
  before writing and reports conflicting prior record IDs without rewriting them.
  Existing imported data is not automatically migrated or pruned.
- Pinned engine 0.3.1: design choices are checked against current board/image hashes
  and cleared after board regeneration; HTTP headers survive browser relaunches.
- Documented that headless-to-visible handoff/connect reloads pages while retaining
  cookies, local/session storage, URLs and the selected tab. Unsaved form and
  in-memory application state require connect before interaction.

## 0.5.0 — 2026-09-30

- Added the `question-presentation` preference: `prefer-panel` (with chat fallback) or `chat`, using existing user/project/task preference storage.
- Conversational setup offers the choice after technical checks when no effective choice exists; unanswered questions do not block setup or save a default.
- All skills load effective preferences once per chat; `bfs-plan-tune` can change/reset the presentation and refresh it for subsequent questions.
- Shortened all 29 skills and synchronized descriptions with the catalog. Shared instructions define accepted basis, checkpoint, evidence and waiting; optional capability, guard and delivery details load through conditional references.
- Reduced combined instruction text from 11127 to 9921 words (10.8%), counting the relocated reference text. This measures text size, not runtime cost or latency.
- Clarified mode-specific memory and deployment steps, removed duplicate output requirements, and checked local reference links and section anchors.
- Fixed setup to read the guard reference before any technical checks, including core-only setup. Missing capabilities no longer suppress questions about required task inputs.
- Validation: 35 automated checks, 19 matched native A/B cases, two desktop setup chats with human panel/chat answers, and five focused sessions for the follow-up fixes. See maintainer report `NATIVE-ACCEPTANCE-REPORT.md` for the original scope and limits.
- Native guard enforcement, actual provider deployment and the remaining manual cases are not certified by those runs. After updating, start a new chat and review changed hook definitions through Codex's native trust interface when requested.

## 0.4.1 — 2026-09-30

- Fixed the successful ZIP smoke check's process exit code. The expected missing-browser check no longer leaves exit code 1 for the Windows CI shell wrapper.
- Supersedes 0.4.0 without changing its published tag or assets.

## 0.4.0 — 2026-09-30

### Added

- Independent QA action (`inspect` or `fix`) and coverage (`quick`, `full`, `regression` or `diff`), including compatible reading of older settings.
- A manual agent acceptance guide and repeatable project fixtures.
- Clean-checkout release builds, ZIP integrity and extracted-entrypoint checks, and Windows CI coverage for the release package.
- A local-data guide covering inspection, exports, backups and targeted removal.

### Fixed

- Workflow continuation now accepts the latest file output certified by a later completed step while retaining earlier evidence.
- Concurrent hooks recheck observation freshness under the lock; identical state writes are skipped.
- Read-only Git status checks avoid unnecessary command-warning overhead.

### Changed

- Direct, scoped implementation requests count as acceptance; material changes still require a user decision.
- Repeated skill reads can reuse HOST rules already loaded in the same chat using their SHA-256 hash.
- Catalog checks validate skill descriptions, aliases, routes and QA settings without separately maintained counts.

### Validation and limits

- The implementation passed 33 automated checks, ten manual agent scenarios, repeated setup checks in three projects, and all five workflow routes. The manual publication scenario used a local command substitute.
- Optional browser-engine session and navigation timeouts remain a known limitation. Some browser acceptance checks used Chrome or the Codex in-app browser; this does not certify every optional-engine integration.
- After updating the plugin, start a new chat to load the new instructions. If Codex requests hook trust, review it through `/hooks`; installation does not grant that trust.
