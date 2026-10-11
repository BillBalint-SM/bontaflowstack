---
name: bfs-scrape
description: "Extract checked page data as JSON or answer a page question with sources."
---

# BFS Scrape

Load [HOST.md](../../HOST.md) via `read bfs-scrape`; follow its hash-based read protocol.
Modes: `extract`, `answer`. Use extract for structured data and answer for a sourced response. Default: `extract`.

1. Establish the target page and required fields or question. This workflow covers one page per invocation; clarify broader crawling scope separately.
2. Use the plugin's host MCP `browser` tool under the shared browser contract to open and inspect the actual page. If login is needed, use bfs-browse's visible human sign-in path and resume the same session.
3. Identify fields with fresh snapshot, text, html, links or data output. Use a bounded page expression or eval file for JSON-serializable extraction; pass request values as data.
4. Parse the result and check required fields, types, item count, non-empty key values and source URL. A failed load or login screen is an extraction error.
5. Repair selectors only when the observed page supports the change. Preserve failed attempts and stop on a missing prerequisite.
6. Persist datasets only when requested; checkpoints store their reference and evidence.

For reusable browser-script requests, read the [removed-feature policy](../../references/browser.md#removed-browser-scripts). Page reads do not authorize submissions or record changes.

Output: Requested JSON or answer with provenance; keep diagnostics separate from data.

## References

- [capabilities](../../references/capabilities.md): before checking or using optional engines/image/design tools.
- [commands](../../references/commands.md): when constructing a core request.
- [browser](../../references/browser.md): before browsing, login, rendering or web measurements.
