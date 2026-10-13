---
name: bfs-design-html
description: "Build or refine responsive HTML/components from an accepted design and verify rendered behavior."
---

# BFS Design HTML

Load [HOST.md](../../HOST.md) via `read bfs-design-html`; follow its hash-based read protocol.
Modes: `implement`, `refine`. Use implement for a new UI and refine for changes to an existing implementation. Default: `implement`.

1. Identify the accepted input, target files, existing framework, content and reusable design tokens. Reuse the supplied direction and relevant project conventions.
2. Plan the small implementation around information hierarchy, meaningful content, components, responsive states and interactions.
3. Implement semantic structure, usable keyboard controls, visible focus, labels, appropriate contrast and reduced-motion behavior. Keep application files in the requested project.
4. Use native CSS for ordinary layout. If measured text layout is specifically required, obtain the optional engine pretext resource and its license, or use an already installed project dependency.
5. Render desktop and narrow layouts through the plugin's host MCP `render` tool, or use its `browser` tool for live interaction, following the shared browser contract. Inspect screenshots and page errors; check overflow, text wrapping and the requested controls.
6. Repair demonstrated in-scope defects and repeat the affected checks. The npm setup supplies Impeccable through design-detect; use its findings when relevant and verify each against the actual interface.

Pass checked outputs to bfs-design-review when that review is requested.

For image-to-code work, inspect the supplied image with the host's image viewing capability and distinguish visible properties from inferred behavior. Requested image generation or editing uses Codex's image tool through bfs-design-consultation, without separate API credentials.

Output: Output paths, source direction, implemented states and rendered/interaction evidence.

## References

- [capabilities](../../references/capabilities.md): before checking or using optional engines/image/design tools.
- [commands](../../references/commands.md): when constructing a core request.
- [browser](../../references/browser.md): before browsing, login, rendering or web measurements.
