# BontaFlowStack 1.1.0-rc.3 — prepared candidate

Prepared locally on 2026-10-13 for the requested Claude Code repairs and full
port audit. This version is **not published** to npm or GitHub. The published
installation command remains pinned to rc.2 until publication is authorized and
verified. Distribution remains one npm setup command for Codex and Claude Code.

## Three repairs

1. **Stable workspace after changing directories.** Native `CLAUDE_PROJECT_DIR`
   anchors the workspace; event `cwd` still resolves relative tool paths. A
   linked Git worktree of the same project retains separate workspace ownership.
   Per-call bindings and session cleanup preserve that choice, including with a
   stale MCP startup environment. Missing native project metadata is rejected.
   Outstanding bindings created by an older adapter must be retried after update.
2. **Blocking PreToolUse failures.** `onFailure: "block"` now covers failures
   outside the hook's own error handler. All eight hooks use the documented exec
   form, `command: "node"` plus `args`, avoiding shell parsing of plugin paths.
   Successful hooks still preserve Claude's native permission decision.
3. **Restored browser reference section.** The generated Claude browser reference
   includes the canonical `Removed browser scripts` section used by three skills.
   Package checks now validate anchors as well as file paths in every generated
   Markdown file, using the existing shared link checker.

The first targeted run reproduced the workspace and failure-policy defects.
After those repairs, the package check exposed the missing anchor. The final
targeted run passed all 12 checks. No new runtime dependency was added.

## Current official Claude Code contracts

Reviewed on 2026-10-13 against the official pages below and installed Claude Code
**2.1.296**. Copies of all seven documentation pages and their SHA-256 hashes are
preserved in the local audit evidence. Documentation claims and observed runtime
results have different scopes:

| Surface | Documentation and checked implementation | Practical evidence |
| --- | --- | --- |
| Plugin layout and manifest | [Plugin reference](https://code.claude.com/docs/en/plugins-reference): `.claude-plugin/plugin.json`, root `skills/`, `hooks/hooks.json`, `.mcp.json`, plugin-root expansion | Actual CLI strict validation of the explicit plugin manifest passed without errors or warnings. |
| Marketplace and installation | [Marketplace reference](https://code.claude.com/docs/en/plugins/marketplace-reference), [CLI reference](https://code.claude.com/docs/en/plugins/cli-reference): local source, stable marketplace identity, user scope | Actual CLI strict marketplace validation and isolated npm setup/repeat/uninstall. |
| All 34 skills | [Skills](https://code.claude.com/docs/en/skills): YAML frontmatter, names/descriptions, namespaced invocation, explicit-only guard skill | All entries and local links checked; all 34 packaged core reads returned Claude instructions. Those reads used synthetic native-hook input. |
| Eight hooks | [Hooks](https://code.claude.com/docs/en/hooks): event names, exec command/args, stable project environment, per-call input, `updatedInput`, error/denial/lifecycle contracts | Hook/process fixtures passed. `onFailure: "block"` is documented from 2.1.295 and the package requires 2.1.296+. Actual model-driven timeout/failure handling was not tested. |
| Five MCP tools | [MCP](https://code.claude.com/docs/en/mcp): stdio configuration, plugin tool namespace, schemas, native permissions and elicitation | Actual `claude --plugin-dir <extracted-plugin> mcp list` connected. Core/status/select_project/browser/render protocol tests passed. Native user elicitation was not exercised. |
| Session and subagent ownership | [Hooks](https://code.claude.com/docs/en/hooks), [Subagents](https://code.claude.com/docs/en/sub-agents): host session/agent identity and lifecycle | Synthetic main/subagent, replay, clear/stale-env, interruption and cleanup fixtures. BFS defines no custom Claude agent files. Native agent identity delivery remains unverified. |
| Shared instructions and optional capabilities | Generated HOST contract, references, catalog, workflow/memory/guard paths and accepted image scope | All 51 generated Markdown files passed file/anchor checks; packaged instructions were checked for remaining Codex-only runtime references. Actual browser/render/design checks are listed below. |

The CLI's `plugin validate skills --strict --json` returned an empty `contents`
array. Its zero exit code is **not** evidence that it inspected all skills.
The separate frontmatter, instruction and link checks establish that coverage.
Native skill selection and execution still require a signed-in Claude session.

## Observed verification

- Full local gate: `node scripts/check.mjs` passed **118 tests, 0 failed,
  0 skipped**, exit 0; `.tmp/rc3-full-check-final.log`. An earlier run failed
  because the npm package test still asserted rc.2; the release assertion was
  updated to rc.3 before this final run.
- Targeted regressions: `node --test tests/claude-host.test.mjs tests/claude-package.test.mjs`
  passed **12 checks**; `.tmp/rc3-targeted-green.log`.
- Real engine integration: `node tests/claude-engine.integration.mjs` passed
  **seven checks**, using engine 0.3.3 and sandboxed Chromium. Browser ownership,
  interaction, storage, capture/PDF, path refusal, restore, rendering and design
  comparison/selection were exercised through synthetic Claude hook input.
  Evidence: `.tmp/claude-engine-2026-10-13T01-22-59-402Z-419af6a1-c161-4f01-ba47-ea6735643ebb/`.
- Exact packed Claude audit: `.tmp/rc3-audit-k5GLn7/result.json` identifies the
  tested tarball, every skill, eight hooks, five tools, HOST hash, official
  documentation hashes and actual CLI validation/connection logs.
- Exact tarball through actual npx and both native host CLIs: install, repeated
  setup, both doctors and actual Impeccable `overused-font` findings passed.
  The test moved its npm cache away; fresh adapter processes had neither
  `BFS_STATE_HOME` nor `BFS_IMPECCABLE_COMMAND` set and used the persistent pin.
  Isolated host registrations and marketplaces were then removed. This reused
  previously verified engine/Impeccable state; it was not another fresh engine
  download/build. Evidence:
  `.tmp/impeccable-final-3b27dc5b-1d00-48b6-98c8-0218b51a3fc0/result.json`.

The first exact-tarball install failed while the Codex CLI activated its plugin
cache (`Access is denied`, OS error 5). The same command in the same isolated
profile succeeded on retry without source changes; the original failure log was
retained. Its cause has not been established, and a successful retry does not
prove the failure cannot recur. A subsequent first install into another fresh
isolated host profile passed all ten commands without retry; evidence:
`.tmp/impeccable-final-dacd48b0-9e54-48e0-b5b5-c04258c8ef40/result.json`.

The source review covered the changed Claude context, hooks, package generation,
callers, tests and release documentation against the three requested repairs.
Standards PASS and Spec PASS for this checked scope; both passes were performed
by the same agent, with no independent review claimed. Changed documentation
links and `git diff --check` passed. This review does not establish native
authenticated acceptance.

## Candidate and publication boundary

Version: `bontaflowstack@1.1.0-rc.3`; intended npm dist-tag: `rc`; local source
tag: `v1.1.0-rc.3`. The final release receipt in
`artifacts/npm/1.1.0-rc.3/release.json` binds the committed source to the tarball.
The tested payload SHA-256 is:

```text
2dcddcb8996b4d1270e081068fa35f7facebcbefcabc7d493ae075aa2b3a257a
```

Preparation runs real `npm pack`; the tarball is npm's internal artifact, not an
alternative user installation route. After authorized publication and registry
verification, the user command will be:

```powershell
npx bontaflowstack@1.1.0-rc.3 setup
```

## Remaining limits

No authenticated Claude model session was run. Native skill choice, hook input
rewriting, session/subagent identity delivery, `/clear`/resume, user interruption,
permission prompts and browser sign-in handoff remain unverified. Raster image
generation/editing remains excluded by the user's accepted scope. Tests ran on
Windows x64 with Node 26.8.1; this candidate has no new GitHub CI run or registry
installation check because it has not been pushed or published. Stable release
acceptance and npm Trusted Publisher/OIDC verification remain outstanding.
