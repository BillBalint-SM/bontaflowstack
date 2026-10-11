# Shared browser usage

Inspect engine file readiness using `doctor bfs-browse`. Browser work uses the
installed plugin's separately enabled `bfs-browser` MCP connection: call its
`browser` tool with `{"args":["goto","https://example.com"]}`. Read its actual
`{"args":["--help"]}` result before unfamiliar commands or flags. Tool results
are the engine result directly; inspect `isError` and the actual content.

The `status` tool reports connection, project, task and engine readiness. It does
not certify a browser launch. Codex supplies the thread ID and, through
`codex/sandbox-state-meta`, the workspace selected in the host. `select_project`
can bind a directory inside that workspace without a second form. A directory
outside it requires human confirmation through the host;
never pass or invent an identity. A missing/disabled connection blocks browser
work until the user enables it through Codex's supported plugin/MCP settings.
Never retry its launch through the MXC shell or disable Chromium's sandbox.
The standalone `engine browser` CLI remains for environments where that launch
is supported; it is not the plugin's fallback for a denied host connection.

Useful operations:

| Need | Commands |
| --- | --- |
| Read a page | `goto`, `snapshot`, `text`, `html`, `links`, `data` |
| Interact | `click`, `fill`, `select`, keyboard/scroll commands from help |
| Inspect | `console`, `network`, `js`, `eval`, accessibility/DOM commands |
| Capture | `screenshot`, `responsive`, `pdf` |
| Measure | `perf`, bounded page expressions |
| Session | `tabs`, `newtab`, `tab`, `closetab`, `connect`, `handoff`, `resume`, `stop` |

Element references come from fresh snapshots. Re-read after navigation or
changes that replace the DOM. Capture and view real screenshots when checking
visual output. Keep errors separate from extracted datasets.

Visible sign-in uses the engine's documented connect/handoff/resume path. The
user enters credentials in the browser; the agent verifies access afterwards.
The host connection retains task state under its effective BFS state root and
uses a temporary Chromium profile. A new task starts separately. Stop ends the
browser's session-cookie lifetime; persistent cookies, local/session storage,
IndexedDB and tab URLs are restored from the task snapshot. Browser caches,
service-worker registrations and unsaved application memory are not retained.
Legacy home profiles are preserved and require a fresh login after upgrading.
Switching a headless session to visible via connect/handoff reloads its pages;
unsaved forms and in-memory application state are lost. Use connect before
those interactions when human access will be needed. Repeated handoff in an
already visible session does not reload it. Resume continues that session.

## Removed browser scripts

One-time page expressions and extraction files are supported. Stored reusable
browser-script discovery, generation and execution are removed.
For a request for that removed BFS feature, report it as unsupported. Do not
substitute a saved console script, test program or invented skill. Offer a
separate coding approach only as an option; create it when the user explicitly
requests that alternative outside the removed BFS workflow.

## Rendering and cleanup

Call `select_project` with the actual project absolute `path` when a subdirectory
is needed. For ordinary calls, an unbound connection uses the workspace supplied
by trusted host metadata automatically. Model-supplied tool arguments cannot
declare a trusted workspace. A bound project and host workspace cannot change
inside that connection; reconnect after switching workspaces.
For a directory outside the host workspace, or a client that does not supply
workspace metadata, `select_project` asks the human to confirm through MCP form
input. Decline, timeout or unsupported form input leaves it unbound. Never
fabricate confirmation or change the user's permission profile to obtain it.
`status` is available when unbound and reports that state, host workspace,
runtime version and source checksum. It does not certify browser readiness.
Custom `BFS_STATE_HOME` is forwarded through the packaged MCP `env_vars`;
the host must inherit that environment value when started, just as setup does.

Use this connection's `render` tool for local HTML: pass the file followed by `--screenshot`
and `--width`/`--height` options as shown by its `--help`. Inspect the resulting
file, dimensions and content. Tool success alone is not visual acceptance.
Requested input files and screenshot/PDF outputs must stay inside the host project.

Leave unrelated user tabs and processes intact. Stop only resources whose
ownership has been established for this task. Use `browser` with `args:["stop"]`;
host disconnection also closes the owned browser. Never kill unrelated processes.
