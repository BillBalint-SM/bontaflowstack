# Shared browser usage on Claude Code

Inspect engine file readiness with `core` arguments `doctor bfs-browse` or use `bfs` `status`. Browser work uses the plugin's `bfs` MCP connection: call its `browser` tool with `args: ["goto", "https://example.com"]`. Read the actual `args: ["--help"]` result before unfamiliar commands or flags. Inspect tool errors and the actual result.

The `bfs` `status` tool reports connection, project, task, browser, and engine state. It does not certify a browser launch. The host supplies session and workspace identity. `select_project` can bind a directory inside the host workspace; a directory outside it requires human confirmation through MCP elicitation. Never pass or invent an identity. If the connection is unavailable, report the blocker. Keep Chromium's sandbox enabled and requested local input/output files inside the selected project.

Useful operations:

| Need | Commands |
| --- | --- |
| Read a page | `goto`, `snapshot`, `text`, `html`, `links`, `data` |
| Interact | `click`, `fill`, `select`, keyboard/scroll commands from help |
| Inspect | `console`, `network`, `js`, `eval`, accessibility/DOM commands |
| Capture | `screenshot`, `responsive`, `pdf` |
| Measure | `perf`, bounded page expressions |
| Session | `tabs`, `newtab`, `tab`, `closetab`, `connect`, `handoff`, `resume`, `stop` |

Element references come from fresh snapshots. Re-read after navigation or changes that replace the DOM. Capture and inspect real screenshots when checking visual output. Keep errors separate from extracted datasets.

Visible sign-in uses the engine's documented connect/handoff/resume path. The user enters credentials in the browser; verify access afterwards.
