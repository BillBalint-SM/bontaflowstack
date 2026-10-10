# BontaFlowStack

**Connected skills for turning business ideas into designed, tested and delivered products.**

BontaFlowStack works inside **Codex Desktop on Windows x64**. Describe your goal
in your own language. The plugin helps choose the next step, performs the requested
work, checks the result and keeps local progress for continuation.

It supports business and product planning, brand and interface direction, website
development, debugging, testing, documentation and delivery. Each skill also works
on its own when you already have its input.

## Install from GitHub (recommended)

You need Codex Desktop, Git and **Node.js 24 or newer**. The core uses no npm packages.

Install the `0.7.1` release with the Codex CLI in PowerShell:

```powershell
codex plugin marketplace add BillBalint-SM/bontaflowstack-workbook --ref v0.7.1
codex plugin add bontaflowstack@bontaflowstack
```

The marketplace tracks that release tag. To select a newer version, follow
[Update](docs/bontaflowstack/INSTALL-WINDOWS.md#update).

Start a new Codex chat in your project and ask:

```text
$bfs-router Set up BontaFlowStack for this project, including browser and design capabilities.
```

Review and trust the plugin's **PreToolUse** and **Stop** hooks through Codex's
`/hooks` interface. New or changed hook definitions need user trust before Codex
runs them. This enables task protection and interruption tracking; ordinary
workflow checkpoints are written by the core. [Hook setup](https://learn.chatgpt.com/docs/hooks#review-and-trust-hooks)

The setup mode checks the installation and adapts instructions in the current
project. Browser, render and design operations use
the separately installed [BontaFlowStack engines](https://github.com/BillBalint-SM/bontaflowstack-engines).
Their installer checks the pinned source archive, installs its locked dependencies
and Chromium, then registers the checked Node.js tools. Bun is not required.

Git Bash and jq are not required by the core.

[Installation and troubleshooting](docs/bontaflowstack/INSTALL-WINDOWS.md)

### Optional: source ZIP or local clone

For manual setup, download the source ZIP and SHA-256 file from
[GitHub Releases](https://github.com/BillBalint-SM/bontaflowstack-workbook/releases/tag/v0.7.1),
or use a local clone. Follow the
[source ZIP setup](docs/bontaflowstack/INSTALL-WINDOWS.md#optional-install-a-source-zip-or-local-clone).

### Set up a project

Open a new chat in the target project and ask `$bfs-router Set up BontaFlowStack
for this project.` The router checks the installed core and any requested optional
capabilities, then reads existing `AGENTS.md` and project guides. It creates only
missing `docs/agents/issue-tracker.md` and `docs/agents/domain.md` guides and
adds their missing `AGENTS.md` links. Existing instructions are preserved; a
second setup should make no file changes. The issue guide records where and how
to read, publish and update work. The domain guide points to the project's real
source of terms and decisions. Setup does not invent a glossary or ADR.

If the project does not identify its issue tracker or domain source, the router
asks for that choice before writing the dependent guide. For example: "Should
specifications go to GitHub Issues, local files, or no tracker? Where are the
project's domain terms and decisions kept?" After setup, check the router's
reported created/reused files, open their `AGENTS.md` links, and check `doctor`
for the capabilities you requested. [Detailed steps](docs/bontaflowstack/INSTALL-WINDOWS.md)

On first conversational setup, choose selection panels when available or chat
for BFS decision questions. Change or reset the saved choice with
`bfs-plan-tune`; explicit project and current-chat overrides are supported.
Without a saved choice, BFS prefers available panels and falls back to chat.
This preference does not control Codex's native approval dialogs.

## Start with a goal

| You want to… | Example request |
|---|---|
| Develop an idea | `$bfs-business-builder Help me shape an offer for independent consultants.` |
| Turn a brief into a plan | `$bfs-router Turn this brief into a specification and check the implementation plan.` |
| Implement an accepted plan | `$bfs-implement Implement the specification I accepted and verify its acceptance criteria.` |
| Compare visual directions | `$bfs-design-consultation Explore three directions using this brief and content.` |
| Build an approved page | `$bfs-design-html Implement the selected direction in this project and check the rendered page.` |
| Inspect a user journey | `$bfs-qa Inspect checkout at this URL and report reproducible issues.` |
| Diagnose and fix a bug | `$bfs-bug-issue-investigate Reproduce this failure, repair its cause and verify the fix.` |
| Finish a change | `$bfs-finisher Review, test and document this change, then prepare it for delivery.` |
| Resume later | `$bfs-load-context Find the latest saved workflow and show what remains.` |

Use `$bfs-router` when you want help choosing a route. Naming a skill goes directly
to that skill. Ask explicitly for publication or deployment when you want those
operations included. `bfs-guard` is user-invoked only: name `$bfs-guard` directly to
inspect or change its task protections, for example `$bfs-guard Show the current
protection status.` The router does not start it implicitly. Selecting any skill
or workflow does not by itself authorize publication, deployment, spending or
destructive changes.

## How workflows connect

The router loads and follows each relevant skill in the same chat. A completed
step passes its checked artifacts and settled decisions to the next step.
Missing information pauses only the dependent work. You can supply a document,
existing file or your own description instead of running an earlier skill.

### Plan and design

Turn an idea into a brief, specification and reviewed plan, or take a selected
visual direction through implementation and the relevant interface checks.

[![Planning and design routes: bfs-router selects bfs-business-builder, bfs-spec, bfs-autoplan and relevant plan reviews, or bfs-design-consultation, bfs-design-html and bfs-design-review or bfs-qa.](docs/diagrams/plan-and-design.svg)](docs/diagrams/plan-and-design.svg)

### Implement an accepted plan

Use **`$bfs-implement`** (BFS Implement) to build functionality from a plan,
specification, selected design or scoped change you have explicitly accepted.
It identifies the accepted version and your decision, implements checkable parts,
saves their verified progress and checks the result against your acceptance criteria.

Acceptance starts implementation when the requested workflow includes it.
Without clear acceptance, the skill waits. Material changes to scope, behavior
or design return to you for a decision; routine technical choices remain within
the accepted scope. Accepting a plan does not authorize publication or deployment.

The route is **accepted basis → bfs-implement → relevant checks → bfs-finisher when requested**.
The Codex agent performs the edits and commands; the skill guides that work and
the local core records its checkpoints.

### Check and deliver

Prepare a change for delivery, investigate a defect, or work directly in the
browser. Documentation follows the affected scope; deployment is included when
requested and uses existing configuration.

[![Delivery, debugging and browser routes: bfs-finisher uses bfs-review, project checks and bfs-documentation before requested deployment; bug investigation leads to requested repair and verification; browser work uses bfs-browse, bfs-scrape or bfs-benchmark.](docs/diagrams/check-and-deliver.svg)](docs/diagrams/check-and-deliver.svg)

There are three kinds of connection:

- **Results:** a business brief becomes input to a specification or design.
- **Capabilities:** QA, scraping, rendering and benchmarks share the browser engine.
- **Project data:** skills reuse the same design decisions, memory and workflow state.

### Save and resume

[![Continuation: a recorded step or manual bfs-save-context snapshot creates a local checkpoint; bfs-load-context checks saved results and changed files before bfs-router continues the work.](docs/diagrams/save-and-resume.svg)](docs/diagrams/save-and-resume.svg)

After every recorded step, the core writes and reads back a local checkpoint.
The Stop hook marks an unfinished active step interrupted. It never turns an
interruption into a successful result. Changed input files make old checks stale.
`bfs-save-context` adds a manual snapshot; `bfs-load-context` checks what changed before
continuing. Remembered decisions do not grant permission for new external actions.

Click an image to enlarge it. [Interactive diagrams and editable sources](docs/diagrams/README.md)
are included for local use.

## Skills

All installed skill names begin with `bfs-`. The Codex picker uses the
matching `BFS` title: `$bfs-router` is **BFS Router**, `$bfs-benchmark` is
**BFS Benchmark**, and `$bfs-save-context` is **BFS Save Context**. Use these
names for direct calls. Previous names remain catalog aliases through
`$bfs-router`.

| Area | Skills | What they do |
|---|---|---|
| Routing | `bfs-router` | Choose and run a skill or workflow; set up capabilities. |
| Business and specification | `bfs-business-builder`, `bfs-spec` | Clarify the customer problem, value and scope; write verifiable requirements. |
| Plan coordination | `bfs-autoplan`, `bfs-plan-tune` | Select relevant reviews; manage explicit preferences and local proposals. |
| Implementation | `bfs-implement` | Implement a user-accepted plan, spec or design; verify and checkpoint each part. |
| Prototyping | `bfs-prototype` | Run an isolated experiment to answer one decision question and preserve its evidence. |
| Triage and navigation | `bfs-triage`, `bfs-wayfinder` | Structure a reported problem; identify the next useful step from verified current work. |
| Learning | `bfs-learn` | Create an isolated runnable exercise or review actual practice evidence. |
| Plan reviews | `bfs-plan-ceo-review`, `bfs-plan-eng-review`, `bfs-plan-design-review`, `bfs-plan-devex-review` | Check business value, engineering, UI/UX and planned developer-facing interfaces. |
| Design | `bfs-design-consultation`, `bfs-design-html`, `bfs-design-review` | Compare directions, preserve your selection, implement and inspect the rendered result. |
| Browser and data | `bfs-browse`, `bfs-scrape`, `bfs-benchmark` | Browse or sign in visibly, extract verified data, measure page performance. |
| Quality | `bfs-bug-issue-investigate`, `bfs-review`, `bfs-cso-audit`, `bfs-health`, `bfs-qa` | Diagnose defects, inspect changes and security, run project checks and test web flows. |
| Documentation and delivery | `bfs-documentation`, `bfs-finisher`, `bfs-prod-deploy`, `bfs-landing-report`, `bfs-retro` | Maintain docs, prepare changes, use existing deployment configuration and report live delivery state. |
| Continuation and control | `bfs-bontaflow-memory`, `bfs-save-context`, `bfs-load-context`, `bfs-guard` | Keep project decisions and learnings, save/restore progress and apply optional task protections. |

### Combined modes

Source development adds portable handoff export/import and optional trace-based
retro reporting. These additions are included in 0.7.0.

- **bfs-design-consultation:** consultation, variants, Codex image generation and refinement.
- **bfs-browse:** page work, visible browser, manual login and continuation in the same session.
- **bfs-qa:** inspection and reporting by default; requested repair followed by retesting.
- **bfs-documentation:** one coverage assessment identifies both missing and outdated documentation.
- **bfs-bontaflow-memory:** typed decisions and learnings, search, revisions, exact-record pruning and export.
- **bfs-guard:** command warnings and an edit boundary can be enabled independently.
  Releasing the boundary keeps command warnings active.

The full mode and handoff definitions live in the [catalog](plugins/bontaflowstack/catalog.json).
Older names resolve through the router; only the catalog entries are installed.
Saved reusable browser automation, standalone developer-experience audits,
deployment provisioning are outside this version.

## Local data and optional tools

[Inspect, back up and remove local data](docs/bontaflowstack/LOCAL-DATA.md).

Core data stays in `%LOCALAPPDATA%\BontaFlowStack\state\v2`. Project memory is
shared across linked Git worktrees; workflow, task, browser and guard state are
separate. Non-Git project directories also work. Nothing automatically uploads
memory or installs a browser engine. Existing older data is preserved; selected
notes can be imported explicitly.

Guard requires working native hooks and reports its supported coverage: edit and
patch paths, plus recognized destructive shell commands. It is optional and is
not an operating-system sandbox. Arbitrary shell writes are outside its edit-boundary
coverage.

Image generation and editing use **Codex's image generation tool**, when available
in the current chat. BontaFlowStack does not request a separate image API key.
The local design tool creates comparison boards and records your chosen direction.

Optional prerequisites for specific design operations:

- [impeccable](https://github.com/pbakaus/impeccable): additional automated design checks.
- [Google DESIGN.md](https://github.com/google-labs-code/design.md): checking and exporting that specific design-document format. It can be used without Stitch; there is no built-in Stitch connection.

Neither is required for ordinary BontaFlowStack design work. Their source is not
included in either BontaFlowStack source package. The engine README explains how
to connect an installation. Browser profiles stay under
`~/.bontaflowstack/browser-profiles`, isolated by the task's session identity, so
Chromium also works with deeply nested Windows project paths.

## Develop and verify

```powershell
node scripts/check.mjs
node tests/engine.integration.mjs C:\path\to\bontaflowstack-engines
powershell -NoProfile -File scripts/build-package.ps1
powershell -NoProfile -File scripts/build-package.ps1 -Release
powershell -NoProfile -File scripts/test-package.ps1 -Archive C:\path\to\BontaFlowStack-version-source.zip
```

The first command checks the catalog-defined package and core behavior. The second uses
real Chromium for navigation, interactions, extraction, performance, screenshots,
HTML rendering and design comparison. The package builder writes a ZIP, SHA-256
and a per-file manifest; it records whether the source checkout was clean.
Release mode requires a clean checkout. The archive check verifies the inventory,
hashes and entrypoints from a fresh extraction with isolated state and no engines.
The Windows CI runs both release construction and archive verification.

[Manual agent and setup acceptance](docs/bontaflowstack/MANUAL-ACCEPTANCE.md) ·
`node scripts/measure-runtime.mjs` measures local hook latency and HOST response reuse.

[Native validation results and limits](docs/bontaflowstack/NATIVE-ACCEPTANCE-REPORT.md) ·
[Instruction size comparison](docs/bontaflowstack/SKILL-OPTIMIZATION-REPORT.md)

[Changelog](docs/bontaflowstack/CHANGELOG.md) ·
[Core command reference](plugins/bontaflowstack/references/commands.md) ·
[Execution contract](plugins/bontaflowstack/HOST.md)

## License

[MIT](LICENSE) — Copyright © 2026 Bálint Bilisics (BontaFlow).

This repository contains the BontaFlowStack core, skills and documentation.
Optional engines and separately installed applications are distributed separately.
