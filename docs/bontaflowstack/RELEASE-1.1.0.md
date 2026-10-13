# BontaFlowStack 1.1.0 — stable npm release

Published on 2026-10-13 with explicit user approval for a real stable npm release
and matching GitHub source/tag. The npm `latest` tag points to `1.1.0`.
The single installation command is:

```powershell
npx bontaflowstack@1.1.0 setup
```

## Changes and scope

The accepted Codex/Claude Code implementation is promoted to version 1.1.0.
The npm manifest, generated host versions, installation examples and current
release labels agree. Stable versions publish on `latest`; prereleases still
require `rc`. Exact-source, clean-checkout and tarball-integrity checks remain.
The manual GitHub npm workflow selects the same dist-tag from the package version.
No runtime dependency, skill or engine was changed.

Compared with the published rc.3 tarball, the 198-file inventory is unchanged.
189 files are byte-identical. Of the nine changed files, eight differ only by
`1.1.0-rc.3` → `1.1.0`; the ninth is the npm README with stable release wording.
Those eight are package.json, both catalogs, both plugin manifests, the Claude
marketplace and the two HOST installation examples. The earlier
[Claude contract audit and repair evidence](RELEASE-1.1.0-rc.3.md) retains its
original scope; version promotion is not a new audit of unchanged runtime behavior.

## Observed local verification

- `node scripts/check.mjs`: 118 tests passed, zero failures/skips on Windows x64,
  Node.js 26.8.1. Log: `.tmp/110-full-check.log`.
- `node --test tests/npm-release.test.mjs tests/npm-package.test.mjs`: four
  checks passed, including stable/prerelease tag policy, correct stable registry
  verification, exact-version packaging and tampered-receipt/tarball refusal.
- The actual workflow's PowerShell selection block passed stable, prerelease
  and mismatched-source-tag cases locally. Evidence:
  `.tmp/110-workflow-check/result.json`. GitHub OIDC publishing was not exercised.
- Payload comparison: `.tmp/110-payload-compare/result.json`.
- Actual npx upgrade from the public rc.3 to the exact local 1.1.0 tarball,
  with isolated Codex and Claude configuration: eleven command results matched
  expectations. Both host CLIs confirmed the enabled version and persistent path.
  Repeated setup passed; prior adapter files and a shared-state sentinel survived.
  Fresh processes used pinned state after moving the npm cache away and clearing
  the state/Impeccable environment overrides. Both doctors succeeded and the
  actual Impeccable detector returned the expected `overused-font` finding
  (exit 2). Isolated registrations and marketplaces were removed.
  Evidence: `.tmp/110-upgrade-fa05d5f6-8fc3-457f-b414-4e4a33e7bb44/result.json`.
  The check reused previously installed engine/Impeccable state; it does not
  claim a fresh dependency download/build.

## Published package identity

Version: `bontaflowstack@1.1.0`; dist-tag: `latest`; source tag: `v1.1.0`.
The tested tarball is 201,190 bytes. SHA-256:

```text
2473135b5d93dcbf243acd970d4d8d78e4e9763ef35bf2d477ce4fd53cd95186
```

npm SHA-512 integrity:

```text
sha512-eI+GKTVcZmYdm1VH0Jz1Y3BSHPaWeeK6g2aECHKALooVTcCau0GtTnYhNe2OVkkqtBC1hp1jrSyLKjYkDh4VgA==
```

The final `artifacts/npm/1.1.0/release.json` binds source commit
`a4025648c5c962a7b113a06b001c2ce14d81c308` and tag `v1.1.0` to these tested bytes.
The tarball prepared after committing was byte-identical to the upgrade-tested
preliminary tarball; the saved final tarball was then published without rebuilding.

[npm package](https://www.npmjs.com/package/bontaflowstack/v/1.1.0)
· [source tag](https://github.com/BillBalint-SM/bontaflowstack/tree/v1.1.0)

The user completed npm browser authentication. The publisher reported processing
delay, then verification succeeded within its bounded retries. Registry name,
version, SHA-512 integrity and `latest` matched the receipt; `rc` retains rc.3.
No repeat publication was attempted. The GitHub source and annotated tag were
pushed normally and their remote revisions matched the source receipt.
Verification evidence: `.tmp/110-registry-verification.json`.

## Public registry installation

The actual `npx bontaflowstack@1.1.0 setup` command and its no-argument repeat
passed in a fresh isolated Codex/Claude configuration and npm cache. The registry
tarball download matched the prepared SHA-256 and SHA-512 integrity. Both host
CLIs registered version 1.1.0. After moving that npm cache away, fresh adapter
processes resolved the persisted shared state, passed both doctors and produced
the expected Impeccable finding. All ten command results matched expectations;
test registrations and marketplaces were removed. As in the upgrade test, the
engine/Impeccable installation was reused. Evidence:
`.tmp/110-registry-32f9d5c8-efa2-4097-910f-e8053d49aa15/result.json`.

The scoped source review checked the release helper, callers, workflow, package
metadata, tests and documentation. Standards PASS and Spec PASS were performed
by the same agent; no independent review is claimed. Changed Markdown links and
`git diff --check` passed. The exact tarball comparison establishes that this
release retains the accepted runtime; no additional feature or runtime change
was introduced.

Windows/Node24 GitHub CI records for the source commit:
[source/main](https://github.com/BillBalint-SM/bontaflowstack/actions/runs/38378279145)
and [version tag](https://github.com/BillBalint-SM/bontaflowstack/actions/runs/38378279063).
