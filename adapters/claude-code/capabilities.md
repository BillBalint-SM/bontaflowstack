# Optional capabilities on Claude Code

Use `core` with `args: ["doctor"]` or the `bfs` `status` tool to inspect readiness. Install optional engines only through the documented engine installer. Missing browser capability blocks browser work, not text planning, memory, or source review.

The engine bridge checks registered manifests and entry files and isolates engine state by project and task. The Claude hook/MCP adapter supplies the real session identity; never invent or copy a task ID. Human login uses a visible browser and continuation in that session; stop only resources owned by the task.

Browser and rendering use the installed plugin's `bfs` MCP tools. Engine doctor checks local files but does not prove the browser can launch. Read [browser](browser.md) before browser or render work. No host permission is granted by setup, a skill, or engine registration.

Claude can inspect supplied images when image understanding is available. Raster image generation and editing are outside this package's accepted scope. Use supplied assets or author HTML/SVG visuals; the local design engine can render and compare them and records only the user's actual selection.

The npm setup installs and configures Impeccable for `design-detect` in shared state. No `BFS_IMPECCABLE_COMMAND` setting is required. Use its findings when relevant to the task. Google DESIGN.md remains an optional external prerequisite. Ordinary design does not require either tool.
