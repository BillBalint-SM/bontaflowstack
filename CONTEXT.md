# BontaFlowStack domain

BontaFlowStack is a Windows x64 skill/plugin package for Codex, Claude Code,
Gemini CLI, GitHub Copilot CLI, Cursor IDE and OpenCode CLI, for business and product development,
design, implementation, testing, documentation and delivery.

A separate Claude Code package is generated from that canonical source for
Windows x64. It adds native session/subagent ownership, MCP calls and lifecycle
hooks while reusing the shared core;
see `docs/bontaflowstack/CLAUDE-CODE-PORT.md`. The user accepted excluding raster
image generation/editing from this port; image understanding and authored
HTML/SVG remain within scope.

The only current distribution route for the whole package is
`npx bontaflowstack@<exact-version> setup`; omitting `setup` also starts installation.
The published stable npm release is 1.1.0, built with `scripts/build-npm-package.mjs`.
It detects Codex and Claude Code, registers each installed host, persists versioned
files outside the npx cache, and prepares the shared pinned engines. Each plugin
pins the same state directory so Desktop environment redirection does not split
the new installation. Native host trust remains a human host action.
Registry integrity and an actual registry npx setup with both host CLIs were verified.
The registry's `latest` points to 1.1.0; `rc` retains the earlier prerelease. ZIP release records
describe historical releases with their original verification scope. See
`docs/bontaflowstack/RELEASE-PROCESS.md` for the current publishing route.

Release 1.1.0-rc.3 repairs Claude workspace ownership after cwd changes,
blocks PreToolUse on hook failures, and restores the shared removed-browser-scripts
section. Its current-documentation audit and scoped checks are recorded in
`docs/bontaflowstack/RELEASE-1.1.0-rc.3.md`. The user accepted this Codex/Claude Code
build and authorized npm/GitHub publication. This release is closed; do not carry
the earlier native-session acceptance item forward as a blocker or follow-up.

The `codex/host-expansion` branch implements the accepted 54-story/36-item
specification in `docs/bontaflowstack/HOST-EXPANSION-SPEC.md`. Progress and
practical evidence live in `docs/bontaflowstack/HOST-EXPANSION-IMPLEMENTATION.md`.
The user's 2026-10-13 clarification narrows repeated validation: verify shared
unchanged behavior once, then test material host differences and a representative
native journey. Reuse existing boundary evidence; do not expand a full per-host
model test matrix without a concrete change, failure or unverified difference.
The specification records this evidence-composition rule. Known failures still
require an honest outcome; inherited evidence is not native host verification.
Gemini extension build and real npm setup/repeat/upgrade are verified; its
installed skill/model journey hit the free API daily quota. Copilot package
discovery, native BFS status binding and real npm setup/repeat/upgrade are
verified, including disabled policy and user MCP/project skill conflict preservation.
The first model skill journey exposed an unclear core entry point; generated
skills now name that MCP call explicitly. Native Copilot activation, HOST and
preferences reads, session-bound status and an actual project health check passed.
Cursor packaging and real npm setup/repeat/upgrade are verified at the file and
engine boundaries. The IDE discovered 34 skills, five MCP tools and seven hooks,
but its MCP tools were unavailable while a same-name imported Claude plugin's tools
were exposed. Disabling
third-party imports exposed the native tools but also disabled plugin hooks in
Cursor 3.24.12; the user's status call therefore lacked its native binding.
A project-hook diagnostic is prepared only in the isolated Cursor test project;
its command/MCP preflight passed, and native IDE retry is pending. Automatic
coexistence remains unresolved. A new candidate separates the Cursor manifest
ID (`bontaflowstack-cursor`) and MCP server (`bfs-cursor`) from imported copies,
while retaining the managed directory. Package, hook/MCP boundary and setup
identity-migration/conflict tests passed; native IDE coexistence is still unverified.
Real Cursor npm setup/repeat/upgrade also passed with the separate identities
and a preserved existing bfs MCP entry. The user's managed test copy now has
candidate 9.9.9-cursor-identity.1, installed via local npm setup. Its new isolated
coexistence-project has no project hooks and awaits a human native status check.
OpenCode V1 packaging now discovers all 34 skills
and connects its MCP through the plugin config callback, without rewriting JSONC.
A native model status call returned the actual session/workspace and guard marker.
Real OpenCode npm setup/repeat/upgrade, cache-independent discovery, Impeccable,
JSONC and other-plugin preservation, disabled MCP and hidden skill conflicts passed.
The npm-installed OpenCode health journey also passed: native skill activation,
HOST/preferences reads, bound status and the fixture's actual test command.
Its HOST now spells out the preferences command after a model confused it with
a skill read. A later native memory/pause/resume probe was rejected by the provider
with a 403 FreeTierError before its first tool call. Upstream issue #51241 reports
free-model failures when bash is completely denied. With bash requiring approval
only in the test process, the actual npm-installed memory/pause/new-session/drift/
adopt/project-isolation journey now passed. No shell or file-edit call ran and
the stored configuration remained unchanged. One native file-read error was
recorded during save; all required assertions passed. Setup does not change user
permissions to accommodate the upstream free-model limitation.
The native OpenCode engine probe verified browser interaction, two rendered
PNG sizes and their native image attachments, then failed on a malformed
model-generated Impeccable argument list. The detector returned a real finding;
the BFS operation reported failure. The prompt now specifies documented args.
A single-call native retry timed out before any tool; the full journey was not
repeated. Browser/render evidence stands separately; the complete Impeccable
MCP path is still unverified (implementation log E56).
`HOST-CAPABILITIES.md` inventories all 34 skills/75 modes with host conditions,
evidence and explicit unverified/unavailable states. Its catalog coverage check
passed. The shared native context test now also runs Copilot: memory write/read,
pause, checkpoint read-back, drift and adoption in a new session, and isolation
of another non-Git project passed from an npm-installed candidate. The hostbuild
now separates skill reads, linked Markdown reads and preferences explicitly.
The shared MCP fix for completed Impeccable findings passed 30 host tests.
The subsequent npm-installed Copilot engine journey passed: real browser click,
two renders, PNG delivery to the model, verified CSS finding through MCP and
own-browser cleanup. Earlier HTML fixtures did not produce the expected finding;
the passing case uses a CSS fixture checked against the actual detector first.
The npm-installed Copilot plan-review/implement/health journey passed with a
recorded accepted basis, actual RED/GREEN tests, persisted workflow/output hashes
and independent code checks. It exposed a raw native apply_patch argument that
the hook had incorrectly parsed as JSON; guarded handling now passes six host
boundary tests and the native journey. Human browser handoff, cross-host isolation
and the other hosts' full plan/implement/verify journeys remain under validation.
Setup now persists each host's last confirmed installation phase and distinguishes
partial failures from registration and Cursor reload requirements. The partial
registration/retry and engine failure checks passed with 25 package/setup tests.
The real npm Copilot setup interruption/recovery passed in both the engine phase
and during its actual source-directory swap, followed by repeat, upgrade, cache
independence and conflict preservation. Shared Gemini/Copilot/Cursor source-copy
code now retains a failed rollback and recovers only an unchanged owned copy.
Modified recovery copies remain untouched; verified recovery staging is removed.
Other hosts' native registration interruption paths remain unverified.
Native model probes now retain bounded outcome metadata instead of host
transcripts; canary checks and a real Copilot status probe passed. Older local
evidence and setup logs have not been converted into a shareable export.
New setup command diagnostics now retain only exit codes and output sizes.
Canary checks and an actual OpenCode npm setup/repeat/upgrade passed with this
format, including 34 skills, Impeccable and preserved JSONC/foreign settings.
Other local fixture files and native host logs remain outside this minimized
format; whole test directories are not shareable diagnostic bundles.
The npm-installed Copilot interruption probe also passed: one native process
was killed during an active step, resumed with the same session ID, read back
its interrupted workflow and intact checkpoint, then completed a real test.
A second live session's workflow stayed unchanged throughout; releasing that
session afterward did not change the completed first workflow. This is scoped
to two Copilot sessions in one non-Git project.
The native Copilot Git-worktree journey also passed: shared project memory,
distinct workspace/session workflows, refused adoption from another worktree,
preserved ownership after a native shell cwd change, and read-only return to
the original session. Both worktrees and all saved records remained unchanged.
Its first run failed a fixture line-ending assertion; the corrected test compares
each checkout with its own initial bytes. Cross-host isolation remains unverified.
Two simultaneous npm-installed Copilot sessions also passed browser isolation:
after the first browser and CLI closed, the second retained its live page marker
and its own session cookie, then stopped only its own browser. Both native tool
traces were error-free. This used a local fixture, not real account sign-in or
cross-host handoff; those acceptance paths remain open.
None of the four new ports is accepted or published yet.
The implementation log now maps every one of the 54 stories and 36 work items
to its evidence and remaining gap under the reduced repetition policy. Completed
implementation items do not imply full port acceptance. A public Copilot-hook /
OpenCode-callback / MCP test proves shared project memory, distinct ownership
even for the same raw session name, mutual binding rejection, and isolated
session completion (E58); this is not two concurrent native model runs.
The diagnostic image counter now recognizes OpenCode image attachments without
retaining their contents; the two canary checks passed and join the shared gate.
The last full `node scripts/check.mjs` gate passed 153/153 with no failures
or skips (E59). Its recorded 236-file code fingerprint is
`28b84f27b2297291b880f5160eacb4a60ba5fd6de7dc5c2228139a5986c2efa8`.
This includes Codex/Claude regressions and adapter boundaries, not the open
native host journeys. Do not rerun it without a relevant code change or failure.
After that gate, the diagnostic helper and 23 acceptance result writers gained
a separate fixed-field `*.acceptance-evidence.json` companion (E60). Three
file-output canary checks and all caller syntax checks passed; eight existing
native evidence records were summarized without changing their bytes or running
their hosts again. Product code is unchanged. This closes the diagnostic-format
implementation gap in story 54. Only the documented command/native/acceptance
summaries are shareable; original continuation records and host logs are private.
The one final two-axis review of this worktree is recorded in the implementation
log. Four case-mismatched documentation links were corrected; three local-link
checks, the four exact filename comparisons and setup syntax passed. No further
runtime defect was established by that review. Cursor setup/HOST now explain
the native plugin identity, local-import policy and marketplace precedence,
without pretending to have read the user's policy. The actual policy/conflict
detection and the already recorded native acceptance gaps remain open. Do not
repeat the full review or host matrix without a concrete new finding.

The later E61 Cursor check supersedes the pending coexistence status above.
The user authorized us to operate the IDE. After restoring third-party imports
and reloading the isolated coexistence-project, the local candidate and imported
BFS both appeared. The one native bfs-cursor/bfs_status call succeeded; its
expanded tool result matched the actual chat session/workspace and sandbox flag.
There are no project hooks in this fixture. Skill/motor journeys and detection
of blocked adminpolicy or an exact-name marketplace conflict remain unverified.
Draft PR #5 is open at https://github.com/BillBalint-SM/bontaflowstack/pull/5.
Its initial CI found two test-only Windows short-path comparisons (152/154).
The Cursor/OpenCode package fixtures now canonicalize their temporary roots;
the targeted tests passed 2/2. Both push and PR Windows Node 24 CI passed at
`fa0af7d` (runs 38468120988 and 38468127207).

E63 fixes a generated Cursor instruction mismatch: skills and references now
name the registered `bfs-cursor` MCP server. The new Cursor assertion failed
before the fix; all four host package checks passed afterward. A new local
npm candidate, `9.9.9-cursor-skill.1`, was installed through npx and reloaded.
E64 passed the installed memory skill's write/readback journey in a new Cursor
Agent chat (Grok 4.6 Medium, 58 seconds). The expanded native MCP history result
and an independent read-only core query matched. This closes the missing basic
Cursor skill/model path, not browser/render or adminpolicy acceptance. No npm
publication occurred; PR #5 remains draft for the recorded open requirements.

E65 records the native Cursor browse/render/Impeccable journey in that same
installed candidate and chat. Browser interaction, 1280x800 and 375x800 renders,
native image reads and the expected Impeccable warning completed; the first
browser was stopped. Four production preToolUse calls returned empty stdout
with exit code 0 and were blocked by failClosed; retries completed the journey.
The native log shows only PowerShell module-preparation CLIXML on stderr for
those calls, not an established cause. Do not claim a clean run or change the
guard based on that hypothesis. A later visible connect/goto/handoff succeeded;
the human button and resume verification remain pending. Both Windows Node 24
CI runs passed at b0d95e8 (38470164941 and 38470170746). No common-gate rerun is
needed for these evidence-only documentation updates.

E66 confirms the human handoff button with the user's screenshot and one
cookie-bearing POST in the own fixture log. The follow-up was submitted, but
Cursor exhausted its usage limit before tools: the native turn contains only
beforeSubmitPrompt and stop/error. Resume, a fresh snapshot and own browser
stop remain unverified; preserve the current page without reload. Do not retry
the unavailable model or buy access. The Unicode package boundary check passed
through cmd and PowerShell; a direct 12-process probe also passed. Neither
reproduced the native hook output loss, and no product fix was made. Both
Windows Node 24 CI runs passed at a0c750a (38473262687 and 38473266910).

E67 replays Cursor's observed temporary-file input wrapper with synthetic data:
Windows PowerShell 5.1 changed all six Unicode inputs; PowerShell 7 preserved
all six. The installed Store PowerShell 7 also passed twelve ASCII calls. None
reproduced empty or late stdout. This is a separate transport limitation, not
the native E65 failure's established cause or a verified fix. No runtime change
was made. The reviewed official docs provide policy/marketplace rules but no
supported npm-to-IDE readback was identified; private cache data is insufficient
for stories 41/42. Both CI runs at 75b2dd6 passed. Preserve the human handoff
page and do not retry the quota-blocked Cursor model while access is unchanged.

E68 now passes the shared human browser handoff in native Copilot CLI 1.0.96:
actual user click and session cookie, same-session resume, fresh DOM read without
reload, own-browser stop, unchanged configuration and no failed tools. Earlier
timeout and malformed model status calls remain recorded as failed attempts.
The implementation log maps A01–A10 for Copilot and OpenCode using the agreed
shared-evidence rule; P05/P07 and O05/O07 are now complete at their documented
Windows/version limits, without publication. OpenCode's own malformed Impeccable
call is not relabeled successful. Runtime/hook/skill files match the tested
candidates; current HOST differences only concern installation guidance.
Gemini's model journey and Cursor's hook/policy/marketplace requirements remain
open. The full 54-story/36-item objective is not complete.

On 2026-10-14 the user accepted integrating the four new ports into GitHub and
requested six-platform public documentation, including Claude Code. The user
does not want local subscription/test limitations in product-facing copy;
direct problem reports to GitHub issues. Preserve original technical evidence
and failed observations without relabeling them as passes. This authorizes the
GitHub update, not an npm release or a claim of new runtime verification.

## Terms

- **BFS host:** one concrete application surface; CLI, IDE and cloud variants are separate compatibility targets.
- **BFS port:** the host-specific packaging, instructions, native context, event mapping and installation, with its compatibility evidence.
- **Capability profile:** the per-mode record of mandatory functions and available, unavailable or unverified extra capabilities.
- **Skill:** a public task entry point, defined by the catalog and its SKILL.md.
- **Mode:** an explicitly selected behavior within one skill, such as QA inspection or repair.
- **QA coverage:** the independent quick, full, regression or diff extent of a QA operation.
- **Workflow:** an ordered sequence of skills performed in the current chat.
- **Step:** one skill operation with input fingerprints, evidence, outputs and next action.
- **Checkpoint:** automatically saved step state or an additional manual context snapshot.
- **Project memory:** versioned decisions, facts, plans and learnings shared within a project, with source references and lifecycle status.
- **Essential context:** a bounded current view of project memory and resumable work; full stored content and history remain available by record ID.
- **Engine:** a separately installed browser, renderer or design capability invoked as a process.
- **Guard:** optional per-task command warnings and supported edit-path constraints.
- **Delivery evidence:** an observed result bound to the actual checked content.
- **Accepted basis:** the concrete plan, specification, selected design or scoped change explicitly accepted by the user, with identifiable content and acceptance criteria.
- **Task graph:** an explicitly requested dependency plan whose worker tasks have separate worktrees, owned workflows and write scopes; fresh integrated evidence releases dependents.
- **Prototype:** an isolated, disposable experiment answering a stated decision question; its result supplies evidence, not user acceptance or production completion.
- **Learning workspace:** an isolated runnable exercise evaluated against its stated learning goal; it does not complete product work.

## Decisions

The main package contains a Node.js standard-library core, a PowerShell launcher,
independently usable skills and two native hooks: PreToolUse and Stop.
Shared references and catalog entries define handoffs without dependencies on
another skill's internal directory. Optional engines are installed separately
from a checksum-pinned release. Legacy user data remains untouched; import is explicit.

The engine package implements browser sessions, rendering and local image comparison
with Node.js and separately installed dependencies. Image generation/editing uses
the current Codex image tool. The npm installer includes automatic
Impeccable CLI installation and persistent shared configuration for design-detect.
Google DESIGN.md remains an optional external prerequisite; neither operation is
required for ordinary design. The earlier rc.1 does not include this addition.

Skill names and modes are in `plugins/bontaflowstack/catalog.json`. The core
contract is `plugins/bontaflowstack/HOST.md`. Source and behavior checks run with
`node scripts/check.mjs`; actual browser integration has a separate explicit test.

General implementation uses the independent `bfs-implement` skill. It starts
from an accepted basis within a requested implementation scope and checkpoints
the actual decision and verified progress. Its skill instructions define when
to wait or return for acceptance of a material revision.

The accepted core-skill methodology keeps the existing BFS flow. Shared discovery
and planning references guide material decisions, domain collisions and verifiable
task dependencies. `bfs-implement` owns TDD; bug investigation supplies its verified
reproduction. Code review reports Standards and Spec separately on a frozen scope.
The methodology has native acceptance evidence in
`docs/bontaflowstack/CORE-SKILL-METHODOLOGY-REPORT.md`. Installation and delivery
status must be checked against the actual selected release and local plugin.

Requested parallel implementation reuses the existing workflow and delivery
evidence contracts. The task graph records ownership, dependencies and freshness;
the host performs worker dispatch and Git integration. Overlapping write scopes
run serially. Ordinary implementation has no mandatory orchestration phase.
Triage and wayfinding are read-only; practice uses a separate workspace.
