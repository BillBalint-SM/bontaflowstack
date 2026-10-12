# BontaFlowStack domain

BontaFlowStack is a Windows x64 plugin package for Codex and Claude Code, for business and product development,
design, implementation, testing, documentation and delivery.

A separate Claude Code package is generated from that canonical source for
Windows x64. It adds native session/subagent ownership, MCP calls and lifecycle
hooks while reusing the shared core. Native Claude acceptance is still pending;
see `docs/bontaflowstack/CLAUDE-CODE-PORT.md`. The user accepted excluding raster
image generation/editing from this port; image understanding and authored
HTML/SVG remain within scope.

The only current distribution route for the whole package is
`npx bontaflowstack@<exact-version> setup`; omitting `setup` also starts installation.
The published npm release candidate is 1.1.0-rc.1, built with `scripts/build-npm-package.mjs`.
It detects Codex and Claude Code, registers each installed host, persists versioned
files outside the npx cache, and prepares the shared pinned engines. Each plugin
pins the same state directory so Desktop environment redirection does not split
the new installation. Native host trust remains a human host action.
Registry integrity and an actual registry npx setup with both host CLIs were verified.
The registry also assigned `latest` to this prerelease and rejected its removal
with E400; that alias does not establish stable or native acceptance. ZIP release records describe historical releases;
they do not establish acceptance of this npm candidate. See
`docs/bontaflowstack/RELEASE-PROCESS.md` for the current publishing route.

## Terms

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
the current Codex image tool. Google DESIGN.md and impeccable are optional external
prerequisites for their specific operations; neither is required for ordinary design.

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
