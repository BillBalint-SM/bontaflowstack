# BontaFlowStack 0.7.5 — release evidence

Release date: 2026-10-11. This is the final local distribution artifact.
Publication to a GitHub release, marketplace or other external service is separate.

## What is in this package

- All **109 plugin files**, byte-identical to the 0.7.5 candidate actually used in
  Codex Desktop, including its MCP host, skills, hooks, launcher and bundled engine.
- The unchanged local marketplace descriptor and root setup entry point.
- Updated Hungarian and English installation/update/rollback instructions.
- User documentation, license, workflow diagrams and this scoped evidence summary.

Internal repair logs, personal filesystem paths, task IDs, local state and unrelated
unverified checkout changes are excluded. The runtime source is included under
`plugins/bontaflowstack`; maintainer tests and the full development checkout are
not part of this installable distribution.

## Provenance

The validated candidate archive was `BontaFlowStack-0.7.5-source.zip`, SHA256:

`a3276a51b668495b7f7ed14b02bece4c740a5ba8e1652198ad35a6418edbe94e`

The installed browser host actually reported source SHA256:

`f6021750bed448960daa973d3048dcdc614b2e6636749e6e433b8472062bd0b8`

Bundled engine 0.3.3 source SHA256:

`f48d62c878894d537e163aa4ac1864495f4b167573fe6eb1f8e7067cda6b61a9`

These are source/runtime identifiers. The **final distribution ZIP has its own
checksum**, supplied in `BontaFlowStack-0.7.5.zip.sha256`. Do not compare that ZIP
against the candidate checksum above.

[PACKAGE.json](../../PACKAGE.json) inventories the final files and records reused
evidence. [RELEASE-EVIDENCE.json](RELEASE-EVIDENCE.json) contains the public result
summary and the hashes of the locally retained original evidence.

## Practical validation retained from earlier runs

| Scope | Observed result | Boundary |
| --- | --- | --- |
| Actual Codex Desktop, installed 0.7.5 plugin, Full Access | 12 native MCP calls; host workspace bound without a redundant project form; visible Chromium; human Choose click; Ready readback; resume; screenshot; stop | Windows x64 Desktop 26.1007.2314.0, CLI 0.162.0-alpha.17.2; one machine |
| Workspace metadata wire contract | Corrected fixtures failed twice before the repair and passed twice after reading sandboxCwd | Targeted protocol scenarios, not a new full suite |
| Bundled engine installation | The 0.3.3 engine was installed from the ZIP, with dependency/browser downloads and checksum registration | Engine source and installer remain byte-identical |
| Earlier configured connection and ZIP/custom-client browser checks | Previously recorded successful checks retained in their original scope | Those custom clients do not substitute for the real Desktop result above |

The user's actual click was read back as `Ready`, at
`2026-10-11T15:05:02.905Z`. The agent did not click or mutate the page to create
that result. [Before](release/desktop-before.png) and
[after](release/desktop-ready.png) screenshots were captured through the plugin
and visually inspected.

The host reported permission profile `type=disabled` (Full Access), and this
session used approval `never`. Chromium sandbox remained enabled in the plugin;
its actual launch command did not contain `--no-sandbox`. OS sandbox internals
were not audited.

## Final packaging checks

The finalization process checks the candidate ZIP and every candidate inventory
hash, compares every final plugin byte against that candidate, verifies the
bundled engine checksum, and checks the local links of the delivered Markdown.
It parses the new installation command examples without running them. Finally it
extracts the final archive into an empty directory and verifies its exact file
inventory and hashes. These are packaging checks, not repeated functional tests.

The product test campaigns, engine installation and human Desktop browser journey
were **not rerun**. The original generic source builder's clean-checkout/full-test
release mode was not invoked or weakened. This distribution is finalized directly
from the proven candidate with a restricted content list and documentation-only
overlays; it does not take runtime files from the dirty development checkout.

## Limits

Installation uses the official Codex CLI from the extracted local marketplace.
Desktop's graphical plugin-installation controls and another machine were not
practically tested. The independent Computer Use denial for controlling Codex's
own window is not resolved by the browser plugin fix.

Hosts must supply the Codex workspace metadata for automatic project binding.
An outside directory, or a host lacking that metadata, still requires supported
human confirmation. Optional integrations, every client version and every website
are not certified by the scoped checks above.

Start with [the English installation guide](INSTALL-WINDOWS.md) or
[the Hungarian guide](../../TELEPITES.md). If a required operation fails, keep its
actual error; do not report success from file readiness alone.

