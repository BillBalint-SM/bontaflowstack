# BontaFlowStack 1.0.0

Release date: 2026-10-11.

**34 connected skills for the journey from product idea to delivery, in Codex
Desktop.** This is the public 1.0.0 distribution of the validated 0.7.5
implementation.

[Download the release](https://github.com/BillBalint-SM/bontaflowstack/releases/tag/v1.0.0)
· [English installation](INSTALL-WINDOWS.md)
· [Magyar telepítés](../../TELEPITES.md)

## Included

- 34 skills for planning, business discovery, design, implementation, review,
  browser work, documentation, delivery and project memory.
- The packaged native `bfs-browser` MCP connection and its Full Access workspace binding.
- Engine 0.3.3 source archive, pinned by SHA256; npm dependencies and Chromium
  install during setup.
- English and Hungarian installation, update, rollback and troubleshooting guides.
- File inventory, SHA256 sidecar and a separate release-gate receipt.

Download `BontaFlowStack-1.0.0.zip` and `BontaFlowStack-1.0.0.zip.sha256`.
GitHub's automatic source-code archives are developer checkouts, not the finalized
distribution. Keep the matching `RELEASE-RECEIPT.json` with the ZIP.
`PACKAGE.json` records the prepared inventory; finalization preserves those exact
archive bytes, so the separate receipt records its release status.

## What changed from 0.7.5

Only the top-level version strings in the plugin manifest and catalog changed
inside the plugin, from 0.7.5 to 1.0.0. All other 107 plugin files, the root setup
script and marketplace descriptor remain byte-identical. The engine remains
0.3.3. The README, installation guides and release documentation were refreshed.

The versioned release process has a bounded version-label promotion check:
it validates the original Desktop evidence against the original package, then
compares the new package. Any other plugin, setup or marketplace change blocks
this reuse route. Missing, stale or changed original evidence still blocks
finalization. The release receipt records both archive hashes and both versions.

## Retained practical evidence

The [original public summary](RELEASE-EVIDENCE.json) intentionally still says
**0.7.5**, the version actually installed and used during the observed run.

| Evidence | Observed result |
| --- | --- |
| Client | Actual Codex Desktop 26.1007.2314.0; CLI 0.162.0-alpha.17.2; Windows x64 |
| Permissions | Full Access, host profile type disabled, approval policy never |
| Installed plugin | 0.7.5 from a ZIP; installed file hashes verified |
| Native use | 12 MCP calls; workspace binding; visible browser; human Choose → Ready; agent resume and readback; captures; owned browser stopped |
| Chromium | Sandbox enabled; no --no-sandbox launch flag observed |
| Completed | 2026-10-11 15:06:16 UTC |

[Before](release/desktop-before.png) · [After](release/desktop-ready.png)

Accepted 0.7.5 distribution SHA256:

`3628c15d1ab99e8c1d87b42523a62812d3c3500653f931fca2c32af6b06ad899`

Unchanged browser host SHA256:

`f6021750bed448960daa973d3048dcdc614b2e6636749e6e433b8472062bd0b8`

Unchanged bundled engine SHA256:

`f48d62c878894d537e163aa4ac1864495f4b167573fe6eb1f8e7067cda6b61a9`

These identify the evidence basis and components. Use the **1.0.0 sidecar** to
verify the download itself; its ZIP hash differs.

## Verification for this publication

The existing product campaigns, engine installation and human Desktop journey
are retained without rerunning them. New checks cover the version-promotion
logic, permitted and rejected deltas, candidate inventory, documentation links,
PowerShell example syntax, and the published assets' hashes.

The original three-case GitHub gate proof is retained at
[Actions run 38156928938](https://github.com/BillBalint-SM/bontaflowstack/actions/runs/38156928938).
It established the original missing/stale/valid-evidence behavior. It does not
claim to test the subsequently added version-label promotion path.

## Compatibility boundary

The observed Desktop run was on one Windows x64 machine with the versions above.
A new 1.0.0 native journey, another machine, graphical plugin installation, other
operating systems and later Codex versions were not practically tested for this
publication. The 1.0.0 reuse claim is limited to the checked version-only change
and unchanged implementation.

Installation uses the official Codex CLI local marketplace route. Hosts must
supply workspace metadata for automatic binding; outside directories still
require supported host confirmation. Browser setup needs network access.
Raw logs containing personal paths and local state are excluded.

For upgrades and rollback, follow the installation guide. Preserve your previous
package directory and local project data.