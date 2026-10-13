# BontaFlowStack

**English** · [Magyar](TELEPITES.md)

### From the first idea to the work you can ship.

**34 connected skills for Codex and Claude Code.** Shape a product, design its
interface, build from an accepted plan, check it in a real browser, and pick up
where you left off—with project decisions and delivery evidence kept alongside
the work.

[![npm RC](https://img.shields.io/npm/v/bontaflowstack/rc)](https://www.npmjs.com/package/bontaflowstack/v/1.1.0-rc.1)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Platform: Windows x64](https://img.shields.io/badge/Platform-Windows_x64-0078D6)
![Hosts: Codex and Claude Code](https://img.shields.io/badge/Hosts-Codex%20%2B%20Claude%20Code-222222)

**Published npm release candidate: `1.1.0-rc.1`.**
· [Install in English](docs/bontaflowstack/INSTALL-WINDOWS.md)
· [Telepítés magyarul](TELEPITES.md)

The next candidate, `1.1.0-rc.2`, adds automatic Impeccable installation and
shared configuration through the same setup command. Publication is pending;
see the [implementation and validation record](docs/bontaflowstack/IMPECCABLE-SETUP.md).

## Bring the whole product journey into your project

You have an idea to test, a screen to improve, or a feature to finish.
BontaFlowStack gives Codex and Claude Code focused ways to carry that work forward:

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

**Requirements:** Windows x64, Node.js 24+ with npm, Git, and at least one supported
host installed with its CLI on `PATH`: Codex or Claude Code. Install the published RC:

```powershell
npx bontaflowstack@1.1.0-rc.1 setup
```

Running the same pinned package without `setup` starts the same flow. By default,
setup detects Codex and/or Claude Code and configures every detected host. Use
`--host codex` or `--host claude` to select one, or `--host all` to require both.
It installs versioned host adapters outside the npm cache and prepares the
browser/render engine. Internet access is needed for engine dependencies and
Chromium; a signed-in host account is needed to run model-driven workflows.

After setup, start a fresh session. In Codex, open your project and ask:

```text
$bfs-router Help me plan a booking page for my service business. Start by clarifying the customer problem and the smallest useful first version.
```

In Claude Code, start with `/bontaflowstack:bfs-router`. The guide covers host
detection, updates, recovery and expected results. Setup does not grant hook
trust or change host permissions; review hooks through each host's normal trust
interface when prompted.

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
`bfs` browser connection uses the selected project and keeps Chromium's sandbox
enabled.

[See the browser workflow](plugins/bontaflowstack/references/browser.md).

## Your project's context stays local

The core uses Node.js standard-library modules. Decisions, workflow progress,
checkpoints and browser state live in a shared local state store; engine files are
installed separately. Setup pins the same state root for each detected host, so
their different Windows app storage paths do not split BFS data. Existing project
instructions are preserved.

The package includes the checksum-pinned **0.3.3 engine source archive**. Browser
dependencies and Chromium download during setup. Optional design integrations
can be added when their specific features are needed.

Read [local data, backup and removal](docs/bontaflowstack/LOCAL-DATA.md).
Optional hooks require each host's normal trust approval; setup does not bypass
it. The guard is a scoped warning/edit check, not an operating-system security
boundary.

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

## Current candidate and compatibility evidence

The combined npm installer **1.1.0-rc.1** is available from the public npm registry.
The command above is the single standard install route and passed an actual
registry installation with both host CLIs. See the [RC release report](docs/bontaflowstack/RELEASE-1.1.0-rc.1.md).
The earlier Codex 1.0.0 release and its
evidence remain historical and do not establish authenticated Claude session
behavior. Raster image generation/editing is outside the accepted Claude scope;
supplied-image understanding and authored HTML/SVG remain supported.

[Candidate and validation limits](docs/bontaflowstack/INSTALL-CLAUDE-CODE.md)
· [Historical 1.0.0 evidence](docs/bontaflowstack/RELEASE-1.0.0.md)

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
