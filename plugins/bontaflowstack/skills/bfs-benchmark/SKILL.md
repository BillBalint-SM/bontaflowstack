---
name: bfs-benchmark
description: "Measure browser performance and report comparable baselines, regressions or trends."
---

# BFS Benchmark

Load [HOST.md](../../HOST.md) via `read bfs-benchmark`; follow its hash-based read protocol.
Modes: `quick`, `baseline`, `compare`, `trend`. Use quick for one sample, baseline to save measurements, compare against a baseline, and trend to read stored series. Default: `quick`.

1. Select the pages and measurement mode. Quick uses one labelled sample; a baseline or comparison uses three samples under equivalent conditions.
2. Record browser, viewport, cache, network, authentication and revision when known. Diff-aware coverage comes from an explicit base and verified changed pages.
3. Read real navigation, paint and resource entries through the plugin's host MCP `browser` tool with `args:["perf"]` or `js`, following the shared browser contract. Serialize entries with toJSON when needed.
4. Calculate TTFB from responseStart minus requestStart; retain interactive/load timings, FCP, request counts and observable transfer sizes. Measure LCP with a buffered PerformanceObserver and a bounded wait. Missing measurements remain unknown.
5. Report medians for repeated samples and compare only matching coverage and conditions. A zero baseline produces an unavailable percentage, not infinity. Apply user budgets first; otherwise label a suggested threshold as a heuristic.
6. Save raw samples and a report to the agreed project directory. Only an explicit baseline operation replaces the selected baseline, preserving its previous copy.
7. Check calculations against samples.

A local browser measurement is not field Core Web Vitals evidence. Trend mode reads compatible stored measurements without starting a browser or modifying the application.

Output: Raw samples, checked calculations, report path, slow resources, verified regressions and investigation hypotheses.

## References

- [capabilities](../../references/capabilities.md): before checking or using optional engines/image/design tools.
- [commands](../../references/commands.md): when constructing a core request.
- [browser](../../references/browser.md): before browsing, login, rendering or web measurements.
