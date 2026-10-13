# Core command reference

Run from the selected project. JSON requests use `--input <file>` or `--input -`
on `node <plugin>/core/cli.mjs`. The PowerShell launcher takes `-Command`,
`-Action`, `-Skill` and `-InputFile`. `help` lists available actions.

## Catalog and readiness

For accepted parallel task graphs, `tasks list` discovers stored plan IDs without writes; `tasks validate/create` takes `plan`;
`tasks status` takes `planId`. Worker `tasks bind` selects `taskId` and its own
`workflowId`; `tasks record` supplies `summary` and actual `evidenceId`.
Coordinator `tasks integrate` selects `taskId`, its verification `workflowId`
and integration `evidenceId`. Read [parallel execution](parallel.md) for the
graph schema, ownership and freshness rules. These operations never spawn or merge.
New-chat continuation in the same workspace uses `tasks adopt` with `planId` and
`confirm: "resume"`; optional `taskId` and `workflowId` adopt an active worker binding
after its workflow adoption. Historical result owners and evidence remain unchanged.

- `catalog list`: current skills, modes, required capabilities and handoffs.
- `catalog resolve <name>`: canonical skill and alias mode.
- `read <name>`: instructions and `hostSha256`, with full HOST unless JSON `knownHostSha256` matches. Supply that hash only after loading full HOST in this chat. New chats omit it.
- `doctor [skill]`: core and selected readiness; JSON `mode` and QA `coverage` select the behavior. QA defaults to inspect/quick; all current coverage choices require browser.
- `engine status`: per-capability readiness without starting an engine.

## Essential context

`context show` derives the short current view from memory, workflows and
checkpoints. It includes current records, stale source notices, resumable work
and detail pointers. `read <skill>` includes this view automatically; native
PreToolUse injects it only when changed or first available. Reads create no stores.
The view is limited to 10,000 characters with omitted counts. Full stored text
and history remain accessible through `memory history` and `workflow resume`.
Recorded data supplies context, not authorization for external actions.

## Workflow

```json
{"goal":"Build the requested page","skills":["bfs-design-consultation","bfs-design-html","bfs-qa"]}
```

Send this to `workflow start`. Alternatively provide `route`: `idea`, `website`,
`implementation`, `repair` or `delivery`. Routes are ordered suggestions selected for the request.
An explicit selection may also be `{"skill":"bfs-qa","mode":"fix","coverage":"full"}`
instead of a string. QA retains both choices. Modes are inspect/fix; coverage is
quick/full/regression/diff. Regression requires a named `baseline` string; diff
requires a concrete `diffBase` string. Legacy quick/full/regression/diff modes
normalize to inspect with that coverage. Conflicting values are rejected.
Old records without coverage read with quick; reading does not rewrite them.
Coverage and comparison bases are QA-only fields.

The `implementation` route selects `bfs-implement`, `bfs-health`, then `bfs-review`.
Its implementation skill requires a concrete user-accepted basis before editing.
The agent verifies the actual user decision; starting a workflow is not approval.
For a multi-part implementation, keep one active implementation step and use
`workflow save` for each verified part. Complete the step with its final outputs
so intermediate revisions of the same file do not stale earlier step evidence.
The `idea` route still ends at plan review.

```json
{"id":"<returned-id>","step":"1","inputs":["brief.md"]}
```

Send to `workflow begin`. After executing and checking that step:

```json
{"id":"<returned-id>","step":"1","status":"completed","summary":"Direction selected","evidence":["User selected option B; DESIGN.md checked against the brief"],"outputs":["DESIGN.md"],"decisions":["Option B selected"],"next":"Implement the page"}
```

`workflow step` also accepts `failed`, `blocked` and `waiting`. These save the
actual result and suspend dependent work. File paths are project-relative.
`workflow list` and `workflow checkpoints` are read-only. `workflow resume`
takes `{"id":"..."}` and reports drift. `workflow adopt` additionally requires
`"confirm":"resume"` to continue from a different task in the same workspace.
Reopening a step preserves its prior result as history and resets dependent
steps to pending. Resume also reports changes to Git HEAD/branch and Node version.
Begin/resume check the current hash per path: a later completed output replaces
earlier historical hashes, while failed/blocked/waiting/interrupted outputs do
not certify a new version. Stable inputs still cannot change during completion.

`workflow save` creates an immutable manual checkpoint:

```json
{"goal":"Launch the page","summary":"Design complete","decisions":[],"remaining":["Implement the selected design"],"files":["DESIGN.md"]}
```

Add `workflowId` when the snapshot belongs to a workflow. For requested pause,
`workflow pause` accepts `id` and optional `summary`, `decisions`, `remaining`
and `files`; it creates an immutable snapshot containing the full saved workflow
and marks that workflow paused. Its result includes `checkpointId`. Other work
can proceed. Inspect `workflow resume`, then `workflow adopt` with
`confirm: resume` before continuing paused work in the same workspace. Drift
checks still apply. `workflow discard` accepts `id` and the actual cancellation
summary; it retains a snapshot and removes the work from the active view.
Discarded work cannot begin again; a new request starts a new workflow.

`workflow import-legacy` previews a selected text/Markdown snapshot using `file`.
Import with `goal` and `confirm: "import"`. It preserves the original bytes as
context only; no old permissions, guard policy or successful checks are imported.

## Memory

`memory list/search` accepts optional `query`, `kind`, `key`, `type` and `limit`.
It returns current active revisions; `includeInactive: true` includes retired ones.
`memory put` appends a revision of a key/kind pair:

```json
{"kind":"learning","key":"checkout-retry","type":"pitfall","text":"The checkout request must carry its existing operation ID on retry.","source":"observed","confidence":8,"files":["checkout.js"]}
```

Kinds are `decision`, `learning`, `fact` and `plan`. Sources are `user-stated`, `observed` and
`inferred`; imports use `imported`. `memory stats` reports revision/current
counts. `memory export` returns selected current records as Markdown, including
full details and provenance. `memory prune` takes exact `ids` and
keeps a backup; earlier revisions can become current after removing the latest.

Use `sourceRef` for the actual quotation or observation reference. `details`
retains full text outside the condensed context (up to 128,000 characters).
Alternatively, `document` reads and archives a selected UTF-8 workspace file and
binds its content fingerprint. `files` bind other supporting source files.
`expectedId` rejects an update based on an obsolete revision. Reuse an
`operationId` to retry the same put/status request after an uncertain result;
it returns the original saved revision. Different content with that ID fails.
`workflowId` links
a work-specific plan to its workflow; closed linked work leaves the context view.

`memory status` appends a lifecycle revision with `kind`, `key`, `expectedId`,
`status` (`active`, `completed` or `discarded`) and `reason`. It preserves the
original source fingerprints; reactivation cannot certify a changed source.
Retirement keeps all earlier content. `memory history` accepts `kind`/`key` and
returns chronological revisions, including retired ones, up to the selected limit
(default/max 10,000). Larger histories remain in the local store; no automatic
pruning occurs. Legacy records without status remain active.

`memory import-legacy` takes `file`, previews JSON/JSONL decision/learning
records, then imports with `confirm: "import"`. Verify the original project's
ownership first. Repeated import of the same bytes is idempotent.
Supported JSON shapes are an array, `records`, or `decisions` and/or `learnings`
arrays. Typed collections supply the default kind; an explicit valid kind wins.
Do not mix `records` with typed collections. Preview includes kind counts and
conflicting record IDs. Conflicts, invalid input or detected source drift stop
the import before changing memory; review existing records explicitly.

## Preferences

All operations accept `scope`: `user`, `project` (default) or `task`.
For `question-presentation` set/reset only, omitted scope defaults to `user`.
`inspect` reads that scope; `effective` shows user → project → task precedence.
`set` takes `id`, `question`, distinct `options` and a matching `choice`.
Eligible IDs: `plan-design-review-mode`, `plan-devex-review-mode`,
`detail-preference`, `question-presentation`. `reset` removes the exact ID at the selected scope.

`question-presentation` uses exactly the canonical options `prefer-panel` and
`chat`; both must be supplied to `set`. Labels shown to the user may be localized.
`prefer-panel` uses an available, permitted host question panel with chat fallback;
`chat` asks in chat. No saved choice means an unsaved `prefer-panel` default.
The first conversational setup offers this preference only when no effective
choice exists. Reads, direct skill invocation and resume do not offer setup.
Refresh effective preferences after changes; reset restores lower-scope inheritance.

```json
{"scope":"user","id":"question-presentation","question":"How would you like to answer BFS decision questions?","options":["prefer-panel","chat"],"choice":"chat"}
```

Send to `preferences set` only after the actual user choice. Inspect with
`preferences effective`; remove the user override with `preferences reset` and
`{"scope":"user","id":"question-presentation"}`. This setting does not control
native host approval dialogs or authorize actions.

`profile` takes `values` with declared 0..1 values for `scope_appetite`,
`risk_tolerance`, `detail_preference`, `autonomy`, `architecture_care`.
`enable` takes a boolean `enabled`. For enabled project tuning, `question`
records an eligible `id`, `question` and actual `answer`.

`stats` reads observations. `propose` takes `kind` (`preference`, `profile`,
`memory`), its operation payload in `value`, and a source quotation in `source`.
`apply` takes the chosen proposal `id` and `confirm: "apply"`. These are advisory
preferences, never answers to permissions or safety decisions.

## Guard

`guard status` is read-only. Mutations require `observation` containing the
matching marker from the actual native hook context.

```json
{"observation":"<actual BFS_GUARD_OBSERVED marker>","warnings":true,"boundary":"src"}
```

`guard set` changes only provided fields. `release` clears the boundary and
`off` clears both policies. A recognized destructive command is blocked and
returns a pending ID. After applicable user authorization for that exact
operation, `guard approve` takes the actual `observation`, pending `id` and
`confirmation` quoting that authorization. One unchanged retry is permitted for
five minutes. Changed inputs and project-root deletion are not covered.

## Engines

`engine register` takes the verified installation `root` and the exact engine
manifest `sha256` printed by its build. The explicit installer handles this.
`engine browser -- goto <url>` passes arguments as separate process arguments.
This is the standalone CLI interface. Installed plugin browser/render work uses
the separately enabled host MCP tools described in [browser](browser.md), with
`args` and optional text `stdin`; host tools return their result directly.
JSON input can instead provide `args`, optional text `stdin` and `timeoutMs`.
Other capabilities: `render`, `design`, `design-md`, `design-detect`, `pretext`.
Engine execution returns `exitCode`, `stdout`, `stderr` and status. Parse the
engine's actual output inside stdout before asserting a functional result.

Image generation/editing uses the host's Codex image tool. `engine design` is local:
`compare --images a.png,b.png --output board.html`, `select --board board.html
--index 2 --reason "the user's actual choice"`, `selection --board board.html`,
`gallery`, `diff` and `prompt`. A comparison never invents a selection.

The npm setup installs the pinned official Impeccable CLI and saves its command
in the shared state's `impeccable.json`. `engine design-detect -- detect --json
<file-or-directory>` runs it without manual configuration. An explicit
`BFS_IMPECCABLE_COMMAND` JSON executable array overrides that managed default.
Detector exit 2 means a completed scan with findings; exit 1 means a scan failure.
Always inspect the returned findings, not just the completed status.

`design-md` still requires a separately installed Google DESIGN.md tool and its
JSON executable array in `BFS_DESIGN_MD_COMMAND`. Google format support is
optional and does not require Stitch. `design-md check`
maps to the external `lint` command; `tokens` maps to `export --format dtcg`.
Pretext returns the entry module of the separately installed npm package; use it
as an ES module or the project's installed package, not as an inline browser bundle.

## Delivery

- `delivery status`: Git head, branch, changes; optional explicit `remote`.
- `delivery queue`: explicit `host` (`github`/`gitlab`) and `repository`.
- `delivery version`: `current` and `bump` (`major`, `minor`, `patch`, or `micro`
  for a four-part version); returns a proposal, not a reservation.
- `delivery config`: `environment` and optional project-relative `file`;
  reads existing named environments, with command arrays for deploy/status/health.
- `delivery evidence`: `label`, `command` argument array, actual input `files`
  and optional timeout; records real process exit and before/after input identity.
- `delivery verify`: evidence `id`; reports whether it still matches.

Merge and deployment use the actual selected host/project commands after the
skill checks scope and live state. Reading a configuration never executes it.

## Portable handoff

`workflow export` and `workflow import-handoff` use the [portable context contract](context.md).

`delivery report` and fresh external `delivery verify` use the [delivery evidence contract](delivery.md#evidence-and-freshness).
