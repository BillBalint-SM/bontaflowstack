# Optional capabilities

Use `doctor` or `engine status` to inspect readiness. Install engines only through
the explicit engine installer. Missing browser capability blocks browser work,
not text planning, memory or source review.

The bridge checks registered manifests and entry files and isolates engine state
by project/task. Use the inherited `CODEX_THREAD_ID`, never an invented identity.
Human login uses a visible browser and continuation in that session; stop only
owned processes/tabs. Read [browser](browser.md) before browser or render work.
Browser/render additionally require the plugin's separately enabled `bfs-browser`
host MCP connection. Engine doctor checks files; it does not prove that connection
is enabled or Chromium can launch. Connection status and a requested actual
operation establish those respective results. No host permission is granted by
setup, a skill or engine registration.

Image generation/editing uses the current Codex image tool without a separate
API key. Check availability in the chat, not through engine doctor. The local
design engine compares images and records only the actual user selection.

The npm setup installs and configures Impeccable for `design-detect` in shared
state; no `BFS_IMPECCABLE_COMMAND` setting is required. Use its findings when
relevant to the task. Google DESIGN.md remains an optional external prerequisite.
Ordinary design needs neither tool nor Stitch.
