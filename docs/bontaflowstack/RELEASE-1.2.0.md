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

Historical releases retain their own reports and tags.

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

## Published package identity

Published and verified on 2026-10-14. npm `latest` points to `1.2.0`;
the earlier `rc` channel remains at `1.1.0-rc.3`.

- Source commit and `v1.2.0` tag: `5531554edae0697607822e04bd421c3351e50232`.
- Archive: `bontaflowstack-1.2.0.tgz`, 461,461 bytes, 603 files.
- SHA-256: `7d46946633d1bf70b393eb7ca2e02c127898bf25b86103da58571e3162580bdd`.
- npm integrity: `sha512-gWV28i6Fk3qAoaFWHMBM5hSXazIbfkbO+7JR5DQXSpVmAtCEaaMdzZp7uM9meWHz7lonxI+BfvjlK5+NqHXL0Q==`.

The registry name, version, dist-tag and integrity matched the prepared artifact.
The independently downloaded registry archive matched its SHA-256. npm briefly
returned 404 while processing the accepted upload; verification succeeded without
republishing.

Actual registry `npx bontaflowstack@1.2.0 --version`, `--help` and
`setup --host codex` passed in an isolated Codex configuration. The installed
payload contained all six version-1.2.0 adapters with 34 skills each; the native
Codex plugin listing confirmed the enabled version. Doctor found the prepared
engine/Impeccable state, and the isolated registration was removed afterward.
This check reused existing isolated engine files; it did not run new model
sessions. Evidence: `.tmp/120-registry-5cfe5d14-4862-4e44-b695-98f882f660da/result.json`.

[npm package](https://www.npmjs.com/package/bontaflowstack/v/1.2.0)
· [Exact source](https://github.com/BillBalint-SM/bontaflowstack/tree/v1.2.0)

## Report a problem

[Open an issue](https://github.com/BillBalint-SM/bontaflowstack/issues/new) with
the BFS version, host and version, setup command, reproduction steps and actual
error. Remove credentials, private content and personal paths from logs.
