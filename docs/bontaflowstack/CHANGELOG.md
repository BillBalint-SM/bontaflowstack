# Changelog

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
  [context-closure report](CONTEXT-CLOSURE-REPORT.md). Engine 0.3.1 is unchanged.

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
  and limits in [the methodology report](CORE-SKILL-METHODOLOGY-REPORT.md).
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
- Validation: 35 automated checks, 19 matched native A/B cases, two desktop setup chats with human panel/chat answers, and five focused sessions for the follow-up fixes. See [native results and limits](NATIVE-ACCEPTANCE-REPORT.md).
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
