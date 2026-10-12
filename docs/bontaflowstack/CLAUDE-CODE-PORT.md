# Claude Code port: scope and evidence

Source basis: public `BillBalint-SM/bontaflowstack` main and the local source
both resolved to `1ec7d3e9c78b40cf45d1b44b6217eeb30ba57dd7` on 2026-10-12.
The user requested the complete functional package, including its mechanics.
The user subsequently accepted excluding raster image generation/editing and
using Claude's own image understanding and code-generated HTML/SVG visuals.
The target is Windows x64, matching the source product.

This is a local port candidate, not a published release or a claim of native
Claude acceptance. The installed Claude Code was upgraded by the user from
2.1.220 to 2.1.296 during implementation. The last inspected authentication
status was `loggedIn: false`. The user reported a Claude Free account.

## Implementation boundaries

The generated Claude package reuses the canonical skills, references, catalog,
state stores and Node core. It replaces host configuration and host-specific
instructions at build time. The Codex manifest and hook registration remain
the canonical source installation's configuration.

Claude core calls use MCP so every stateful operation receives the same native
session/subagent/workspace identity as browser and guard operations. PreToolUse
issues a random, short-lived, single-use call record bound to the exact tool
and arguments; it returns that record's ID through `updatedInput`. The MCP
adapter validates and consumes the record. It never derives current ownership
from the MCP process's possibly stale startup session environment. Argument
rewriting by a real Claude host is a required native acceptance condition.

Task IDs are namespaced hashes of native session and agent IDs. Project memory
can be shared with Codex; task-owned workflows, guard state and browser sessions
are separate. A missing subagent ID on SubagentStop is an error, so it cannot
interrupt the parent task. Ordinary permission decisions remain with Claude.
Like the original guard, this is not an OS sandbox or a defense against a user
who can rewrite the plugin's local state.

Stop and StopFailure interrupt running owned workflow steps. Tool interruptions
use PostToolUseFailure when `is_interrupt` is true. SessionEnd covers recorded
owners; a later UserPromptSubmit or startup/resume recovers unfinished root
work. Successful SessionEnd removes its temporary owner registry and call records;
workflow history remains intact. A process crash or interrupt without a hook can leave an unverified running
record until recovery. Immediate user-interrupt delivery is not yet verified.

## Acceptance ledger

| Capability | Implementation / verification boundary |
| --- | --- |
| 34 skills, modes, aliases and routes | Generated from the canonical catalog; package checks validate content, links and explicit guard invocation. Native selection/skill behavior requires Claude transcripts. |
| Memory, preferences, essential context | Shared core with host-supplied context; core tests and Claude transport fixtures. |
| Workflow/checkpoint/pause/resume/adoption | Shared ownership and drift checks; cross-session/agent fixtures, lifecycle interruption fixtures. |
| Task graph, worktrees, integration evidence | Shared core and existing real Git integration tests; actual Claude worker dispatch remains unverified. |
| Guard | Native Edit/Write paths, Bash/PowerShell classification and exact one-use approvals. Bash accepts one literal command; complex/dynamic syntax requests inspection. |
| Browser/render/design comparison | Same pinned engine and Chromium sandbox. Claude transport fixtures are distinct from actual native Claude execution. |
| Installation and packaging | Generated Claude manifest, hooks and MCP configuration; see the installation guide. Local package validation does not establish model execution. |
| Image understanding and HTML/SVG | Host skill instructions; no claim that raster image generation is included. |
| Optional DESIGN.md / impeccable | Existing explicitly configured external tools; absence blocks only their optional operations. |
| Delivery and release | Existing evidence/version/queue core retained. This task does not publish, push, deploy or install globally. |

## Checks and limits

The initial unchanged source gate ran 75 tests: 74 passed and one failed because
the negative README fixture still searched for an obsolete table row. The
fixture now mutates the actual `bfs-router` row and still verifies that malformed
public skill lists fail. This was a pre-existing test-fixture mismatch.

`node scripts/check.mjs` includes the Claude package, hook/transport and guard
tests alongside the existing regression tests. The separate
`tests/claude-engine.integration.mjs` exercises the real local browser engine
using synthetic Claude hook inputs; its result must not be called a native
Claude run. Final observed results are in [the validation report](CLAUDE-CODE-VALIDATION.md).

Required remaining native evidence: installed-plugin discovery; PreToolUse
`updatedInput` on MCP calls; actual main/subagent IDs; /clear and resume; native
permissions and human project confirmation; user interrupt and stop; representative
skill execution and the browser handoff. These require usable Claude Code access.

Official contract references:
[plugins](https://code.claude.com/docs/en/plugins-reference),
[hooks](https://code.claude.com/docs/en/hooks),
[MCP](https://code.claude.com/docs/en/mcp),
[environment variables](https://code.claude.com/docs/en/env-vars),
[image capabilities](https://support.claude.com/en/articles/9002504-can-claude-produce-images).
