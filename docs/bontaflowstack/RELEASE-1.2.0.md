# BontaFlowStack 1.2.0 — six agent platforms

Release date: 2026-10-14. Package: `bontaflowstack@1.2.0`.
Source tag: `v1.2.0`; npm channel: `latest`.

```powershell
npx bontaflowstack@1.2.0 setup
```

## Included platforms

The npm package includes **Codex, Claude Code, Gemini CLI, GitHub Copilot CLI,
Cursor IDE and OpenCode CLI**, with 34 skills in each adapter on Windows x64.

Setup detects installed hosts, retains versioned adapters outside the npm cache,
prepares the browser/render engine and Impeccable, and configures shared project
memory with separate session ownership. Use `--host codex`, `claude`, `gemini`,
`copilot`, `cursor` or `opencode` to select one; `--host all` requires all six.
Reload the Cursor IDE window after setup.

The installer preserves existing host configuration and project data. See
[platforms](PLATFORMS.md), [Windows setup](INSTALL-WINDOWS.md),
[Claude Code](INSTALL-CLAUDE-CODE.md) and [local data](LOCAL-DATA.md).

## Source and package verification

This release packages the six-platform implementation integrated in
`b413e8459f25f5cf30aa67d5cecf4e1a12cd635d`, updates version labels and user
documentation, and extends the publication inventory check to require all six
adapters, their 34 skills and bundled engines. Host runtime behavior is unchanged
from that integrated implementation.

The [implementation record](HOST-EXPANSION-IMPLEMENTATION.md) retains the scope
of prior native and shared-engine checks. The release checks below concern
the actual distributable and do not relabel prior host tests.

Publication results and the exact package identity are recorded after registry
verification. Historical releases retain their own reports and tags.

### Local release checks

- Ten current documentation files passed local file/anchor checks;
  `git diff --check` passed.
- `node scripts/check.mjs` ran 154 tests: 151 passed initially, with three setup
  fixture failures caused by discovering this machine's installed Cursor.
  The fixture now isolates its application paths. The affected
  `node --test tests/npm-setup.test.mjs` rerun passed 26/26; the other 128 checks
  passed in the original run. Logs remain in `.tmp/120-full-check.log` and
  `.tmp/120-setup-recheck.log`.
- The included package/release tests exercise real `npm pack`, six adapter
  inventories, 34 skills per adapter, stable dist-tag policy and rejection of
  altered release receipts or tarball bytes.

## Report a problem

[Open an issue](https://github.com/BillBalint-SM/bontaflowstack/issues/new) with
the BFS version, host and version, setup command, reproduction steps and actual
error. Remove credentials, private content and personal paths from logs.
