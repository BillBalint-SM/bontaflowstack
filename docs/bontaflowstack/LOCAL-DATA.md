# Local data: inspect, back up and remove

This guide describes **BontaFlowStack 1.0.0 with engine 0.3.3**. Earlier engine
locations are identified as legacy so existing data can still be backed up or removed.

BFS retains local records until you explicitly remove them. Uninstalling the
plugin does not remove project state, optional engines or Chromium profiles.
There is no automatic memory upload or retention expiry. Legacy imports preserve
their original files. Generated reports/screenshots in the project are separate
user artifacts; removing runtime state does not remove those files.

## Find the effective locations

Run the tested plugin's `doctor` from the actual project. Its projectId and
workspaceId identify the following directories. `BFS_STATE_HOME` overrides the
root; otherwise use this process's `%LOCALAPPDATA%\BontaFlowStack\state\v2`.
Desktop packaging can redirect LOCALAPPDATA, so resolve it in the same host that
runs BFS rather than assuming another terminal's path.

| Location under the effective state root | Content / sharing |
|---|---|
| `preferences.json` | User preferences, shared by projects using this root |
| `engines.json` and `engines/` | Shared engine registration and installations |
| `projects/<projectId>/memory.json` and `memory.json.*.backup.json` | Explicit project decisions/learnings, revisions and prune backups |
| `projects/<projectId>/preferences.json` | Project preferences |
| `projects/<projectId>/workspaces/<workspaceId>/workflows/` | Ordered steps, hashes, summaries and evidence descriptions |
| Same workspace: `checkpoints/`, `evidence/` | Manual snapshots and delivery command evidence |
| Same workspace: `tasks/` | Task preferences, guard policy/pending grants and hook observations |
| Same workspace: `engine-sessions/<taskId>/own-engine/` | Browser service metadata, tabs/session storage, downloads and startup logs |
| Same workspace: `engine-sessions/<taskId>/host-browser/` (1.0.0) | MCP browser `tabs.json` snapshots and downloads; separate task ownership |

Linked Git worktrees share project memory and project preferences because project
identity uses the canonical Git common directory. Their workspace/task state is
separate. Non-Git identity uses the canonical selected directory. Moving a project
can leave state under its previous identity; identify that state before removing it.

For engine 0.3.2, legacy browser profiles are outside the state root, under the Node user's home:
`~/.bontaflowstack/browser-profiles/<profileId>`. They can retain cookies, login
sessions and local storage. For the pinned engine, profileId is SHA-256 of the
lowercase absolute `own-engine` session directory, encoded as UTF-8. Derive the
profile for each selected task before deleting its state; do not guess from the
task ID or delete all profiles. Changing BFS_STATE_HOME does not change the profile
base directory. Recheck the mapping in the installed engine when upgrading it.

Plugin 1.0.0 with engine 0.3.3 uses temporary Chromium profiles plus
task-owned snapshots. The [1.0.0 release evidence](RELEASE-1.0.0.md) explains
the reuse of the original 0.7.5 host MCP acceptance. Persistent cookies, local storage,
IndexedDB, session storage and tab URLs can be retained in snapshots; treat them
as private login data. Session cookies remain in memory until browser stop or
connection closure. Caches, service-worker registrations and unsaved application
memory are not retained. Legacy profiles are neither imported nor deleted;
upgrading requires a fresh login. Use the legacy mapping above for old profiles.

## Inspect and back up

- Use workflow list/checkpoints/resume, memory list/stats/export and preferences
  inspect to review records. These reads do not initialize missing stores.
- `memory export` returns Markdown for selected current records; the default list
  limits do not apply to export. It omits historical revisions and does not restore
  workflows, settings or browser sessions.
- For a full backup, stop affected browsers and finish/wait for active writes, then
  copy the selected project/workspace directories, selected profiles and any shared
  configuration you intentionally want to retain. Keep raw backup data private.
- Keep backups outside the removal targets. Preserve memory prune backups if you
  want recoverability; deleting only memory.json leaves those backups behind.

## Remove one workspace or a whole project

1. Save doctor output, the effective root, selected task IDs and profile paths.
   For Git use `git worktree list` to identify siblings sharing project data.
2. In BontaFlowStack 1.0.0, stop each owned browser using its MCP `browser` tool
   with `args:["stop"]` in its original chat/task. For a legacy CLI service,
   use `engine browser stop` in that service's original chat/task.
   If unavailable, inspect the owned service metadata/process and stop only that
   instance. An unrelated current task's stop command does not stop old sessions.
3. Make and verify the backup you need. Inspect active lock files; wait for their
   writers. An unexplained lock or malformed store needs investigation.
4. Choose workspace removal for just its workflows/task/browser state. Choose
   project removal only when shared memory and all its workspaces should go too.
   User preferences and shared engine installations remain separate choices.
5. Display and verify every absolute target before deletion. The state target
   must be the exact selected 64-character project/workspace directory beneath
   the resolved root. Reject reparse points in the target or its ancestors.
   A profile target must be the exact derived 64-character profile directory
   beneath the browser-profile base. Include only selected profiles.
6. Remove those verified targets using native PowerShell `Remove-Item -LiteralPath
   <verified-absolute-target> -Recurse`. Keep the operation in PowerShell; no
   wildcard target, root-wide cleanup or shell handoff is needed.
7. Check the selected targets are absent and another project's records plus shared
   engine registration/installations are unchanged. Remaining copied backups and
   project reports can be kept or removed separately by explicit choice.

Restoring a raw backup restores historical state, including guard metadata and
browser credentials. Read it first, check file drift, and recover actual user
authorization before any action. A backup is not new permission; engine status
checks the registered installation before using it.

The runnable lifecycle check in `tests/reliability.test.mjs` exercises removal of
one isolated project's state/profile-shaped directories while preserving another
project and shared engine data. It does not remove real user state or profiles.

## Portable handoff

BontaFlowStack 1.0.0 provides workflow export/import-handoff. A handoff includes the full selected memory histories, checkpoint/workflow and selected evidence, up to 8 MiB. Import stores one immutable historical checkpoint under the current identity without merging memory, guard settings or permissions. Code and other required artifacts travel separately. See [portable context](../../plugins/bontaflowstack/references/context.md).
