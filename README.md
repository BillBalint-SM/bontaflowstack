# BontaFlowStack

**English** · [Magyar](TELEPITES.md)

### From the first idea to the work you can ship.

**34 connected skills for Codex Desktop.** Shape a product, design its interface,
build from an accepted plan, check it in a real browser, and pick up where you
left off—with project decisions and delivery evidence kept alongside the work.

[![Release](https://img.shields.io/github/v/release/BillBalint-SM/bontaflowstack)](https://github.com/BillBalint-SM/bontaflowstack/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Platform: Windows x64](https://img.shields.io/badge/Platform-Windows_x64-0078D6)
![Host: Codex Desktop](https://img.shields.io/badge/Host-Codex_Desktop-222222)

**[Download 1.0.0](https://github.com/BillBalint-SM/bontaflowstack/releases/tag/v1.0.0)**
· [Install in English](docs/bontaflowstack/INSTALL-WINDOWS.md)
· [What's in this release](docs/bontaflowstack/RELEASE-1.0.0.md)

## Bring the whole product journey into your project

You have an idea to test, a screen to improve, or a feature to finish.
BontaFlowStack gives Codex focused ways to carry that work forward:

- **Find the next useful step.** Turn a rough brief into a customer problem,
  specification, design direction, or implementation plan.
- **Keep decisions connected to the work.** Save accepted plans, project facts,
  progress and checkpoints, then recover them in a later session.
- **Build and inspect the result.** Implement an agreed scope, review the change,
  and exercise web journeys through the plugin's browser connection.
- **Stay involved where it matters.** Choose a design, take over a visible browser
  for sign-in, then hand control back to the agent.
- **Deliver with evidence.** Prepare documentation and Git delivery from the
  actual changed files and recorded checks.

Use one skill for a focused task, or let the router choose the next entry point.
You can ask in your own language.

## Start here

**Requirements:** Windows x64, Codex Desktop, Node.js 24+ with npm, and a Codex CLI
that supports plugin installation. Browser setup also needs internet access.
Git is needed for Git operations.

1. Download [BontaFlowStack-1.0.0.zip](https://github.com/BillBalint-SM/bontaflowstack/releases/download/v1.0.0/BontaFlowStack-1.0.0.zip)
   and its [SHA256 file](https://github.com/BillBalint-SM/bontaflowstack/releases/download/v1.0.0/BontaFlowStack-1.0.0.zip.sha256).
   Choose these release assets, rather than GitHub's automatic source-code archive.
2. Follow the [installation guide](docs/bontaflowstack/INSTALL-WINDOWS.md) to verify
   the checksum, extract into a permanent folder and register the local plugin.
3. Fully restart Codex Desktop, open your project and ask:

```text
$bfs-router Set up BontaFlowStack for this project, including browser, render and design capabilities. Use the installed 1.0.0 plugin.
```

Then bring it a real task:

```text
$bfs-router I want a booking page for my service business. Help me define the
first useful version, compare design directions, and plan the implementation.
```

The guide includes upgrades, rollback and expected results at every step.
Keep your preferred Codex permission profile; the documented Full Access route
does not require a switch to on-request.

## Pick the skill that fits

| Your next move | Start with | What the skill is for |
| --- | --- | --- |
| Explore an idea | `$bfs-business-builder` | Customer problem, product direction and a testable brief |
| Make a plan | `$bfs-spec`, `$bfs-autoplan` | Acceptance scenarios and coordinated plan review |
| Give it a visual direction | `$bfs-design-consultation` | Compare directions and define the selected design system |
| Build the interface | `$bfs-design-html` | Responsive HTML/components and rendered inspection |
| Implement an accepted change | `$bfs-implement` | Scoped implementation and verification |
| Work with a website | `$bfs-browse`, `$bfs-scrape` | Visible browser sessions, human handoff and checked extraction |
| Investigate or review | `$bfs-bug-issue-investigate`, `$bfs-review`, `$bfs-qa` | Diagnosis, code review and actual web journeys |
| Prepare delivery | `$bfs-documentation`, `$bfs-finisher` | Source-grounded docs, commits, pushes and PR operations |
| Resume later | `$bfs-save-context`, `$bfs-load-context` | Checkpoint recovery with drift detection |
| Choose what comes next | `$bfs-wayfinder` | Project status and the next useful step |

Explore all **34 skills** in the [catalog](plugins/bontaflowstack/catalog.json)
and the [command reference](plugins/bontaflowstack/references/commands.md).

## Skills

<details>
<summary>Browse all 34 skill entry points</summary>

| Skill | Purpose |
| --- | --- |
| `bfs-router` | Set up BFS or route a requested task to the matching skill or workflow. |
| `bfs-implement` | Implement an accepted plan, spec, design or scoped change and verify its acceptance criteria. |
| `bfs-business-builder` | Clarify a customer problem or product direction into a testable business brief. |
| `bfs-spec` | Draft or revise a project-grounded specification with observable acceptance scenarios. |
| `bfs-autoplan` | Coordinate relevant plan reviews and return a reconciled plan with open decisions. |
| `bfs-plan-ceo-review` | Review a plan for customer value, business fit and measurable success. |
| `bfs-plan-eng-review` | Review a plan against the codebase for architecture, correctness and implementation readiness. |
| `bfs-plan-design-review` | Review planned screens and journeys for usability, accessibility and coherent interaction states. |
| `bfs-plan-devex-review` | Review planned API, CLI, SDK and onboarding experiences for developer usability. |
| `bfs-plan-tune` | Inspect or configure optional BFS preferences, including panel/chat questions, and review adjustment proposals. |
| `bfs-design-consultation` | Define a visual identity, compare design directions or refine the selected design system. |
| `bfs-design-html` | Build or refine responsive HTML/components from an accepted design and verify rendered behavior. |
| `bfs-design-review` | Inspect a rendered interface for usability and visual defects, or repair and retest requested findings. |
| `bfs-browse` | Read or interact with a web page, open a visible session or resume human sign-in. |
| `bfs-scrape` | Extract checked page data as JSON or answer a page question with sources. |
| `bfs-benchmark` | Measure browser performance and report comparable baselines, regressions or trends. |
| `bfs-bug-issue-investigate` | Diagnose a reproducible bug, or fix its shared cause and verify the regression. |
| `bfs-review` | Review a code diff against requirements and callers, or repair and recheck requested defects. |
| `bfs-cso-audit` | Audit code or a change for reachable security risks and prioritized remediation. |
| `bfs-health` | Run existing project checks and report commands, results and verification limits. |
| `bfs-qa` | Test real web journeys and responsive states, or fix and retest requested defects. |
| `bfs-documentation` | Create or update source-verified project documentation, or report documentation gaps. |
| `bfs-finisher` | Prepare a verified change for delivery or perform requested commit, push and PR operations. |
| `bfs-prod-deploy` | Inspect, integrate or deploy a selected change and verify delivered revision and health. |
| `bfs-landing-report` | Report integration queue, version conflicts and check freshness without changing repository state. |
| `bfs-bontaflow-memory` | Read, revise, retire or inspect project decisions, facts, plans and learnings. |
| `bfs-save-context` | Save, pause or export verified work, or list existing checkpoints. |
| `bfs-load-context` | Recover checkpoint state, detect drift and resume from a verified next step. |
| `bfs-guard` | Inspect or explicitly change current-task command warnings and the project edit boundary. |
| `bfs-retro` | Review actual work traces for reusable lessons, distinguishing mechanical checks from judgment. |
| `bfs-prototype` | Run a small, disposable experiment to settle a concrete product or technical question and preserve the decision evidence. |
| `bfs-triage` | Turn a reported problem into an evidence-based, prioritized triage report and next route. |
| `bfs-wayfinder` | Find the next useful project step from current context, workflow and task status. |
| `bfs-learn` | Create an isolated runnable practice exercise or review its actual learning evidence. |

</details>

## A browser you can take over

Ask BFS to open a page visibly. When a site needs your input, take over the
browser, complete the step yourself, and ask the agent to resume. The packaged
`bfs-browser` connection uses the project selected in Codex and keeps Chromium's
sandbox enabled.

[See the browser workflow](plugins/bontaflowstack/references/browser.md).

## Your project's context stays local

The core uses Node.js standard-library modules. Decisions, workflow progress,
checkpoints and browser state live in a local state store; engine files are
installed separately. Existing project instructions are preserved during setup.

The ZIP includes the checksum-pinned **0.3.3 engine source archive**. Browser
dependencies and Chromium download during setup. Optional design integrations
can be added when their specific features are needed.

Read [local data, backup and removal](docs/bontaflowstack/LOCAL-DATA.md).
Optional hooks require Codex's normal trust approval; the guard is a scoped
warning/edit check, not an operating-system security boundary.

## What 1.0.0 is based on

This release promotes the validated 0.7.5 implementation to **1.0.0**, with new
release labels and user documentation. The release gate checks that the only
plugin changes are the two version fields; the remaining plugin files, engine,
setup and marketplace bytes must match the accepted package.

The retained practical evidence covers a ZIP-installed plugin in **actual Codex
Desktop on Windows x64, under Full Access**: project binding, visible Chromium,
human input, agent resumption, readback and cleanup. The recorded run used
0.7.5; it is preserved with its original version and environment, not relabeled
as a new 1.0.0 run.

[Evidence and compatibility scope](docs/bontaflowstack/RELEASE-1.0.0.md)
· [Changelog](docs/bontaflowstack/CHANGELOG.md)

## Help shape what comes next

Found a problem? [Open an issue](https://github.com/BillBalint-SM/bontaflowstack/issues)
with your plugin, Desktop and CLI versions, the operation you attempted, and its
actual error. Remove personal paths, credentials and private page content.

Contributions are welcome. For source architecture and contracts, start with
[HOST.md](plugins/bontaflowstack/HOST.md) and the
[core modules](plugins/bontaflowstack/core). Maintainer release procedures live in
the source repository's `docs/bontaflowstack/RELEASE-PROCESS.md`.

## License

[MIT](LICENSE). Built by Bálint Bilisics / BontaFlow.
