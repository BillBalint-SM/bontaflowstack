# BontaFlowStack 1.1.0-rc.1 — npm release evidence

Published on 2026-10-13 in Europe/Budapest (2026-10-12 UTC), with the user's
explicit approval for the npm RC and public GitHub main/tag publication.

```powershell
npx bontaflowstack@1.1.0-rc.1 setup
```

[npm package](https://www.npmjs.com/package/bontaflowstack/v/1.1.0-rc.1)
· [Exact source tag](https://github.com/BillBalint-SM/bontaflowstack/tree/v1.1.0-rc.1)
· [Installation](INSTALL-WINDOWS.md)

## Published identity

| Field | Verified value |
| --- | --- |
| Package / version | `bontaflowstack@1.1.0-rc.1` |
| Publisher | `bontaflow` |
| Requested npm tag | `rc` |
| Source commit | `cd2e21ef8f947e0196e600f679e5cb54c1ee4dc6` |
| Source tag | `v1.1.0-rc.1` |
| Tarball size | 199,711 bytes |
| SHA-256 | `f6fbd7a979f3b49d0eeccce07fd02da4303b0e93d2ba9bfbb0225376d0686280` |
| SHA-512 integrity | `sha512-v4lb2TjygKPNUA7YCdOe/+rnJY5vq2WXSbvzZYGQVC2AiS1t1ncjYFM4akCphsxvePWxUkLGGlvQsE6/4OGh3g==` |

The registry's version and integrity match the prepared, locally tested tarball.
The registry also assigned `latest` to this RC despite publication with `--tag rc`.
An authenticated `npm dist-tag rm bontaflowstack latest` returned E400; both
`rc` and `latest` therefore currently resolve to this prerelease. This observed
alias is not a stable-release or native-acceptance claim. Use the exact version
above. The publisher continues to reject explicit `latest` publication and all
stable versions until the native acceptance gate exists.

## Actual checks

- The complete prepublication source gate passed 110 tests, with no failures or skips.
- The exact tarball passed real local npx setup/repeat, both host registrations,
  strict Claude manifests, shared-state doctors and isolated uninstalls. A
  separate real test installed a newer synthetic version and returned to this RC.
- After publication, `npx --yes bontaflowstack@1.1.0-rc.1 setup` downloaded from
  public npm into a fresh cache and configured both real host CLIs in isolated
  profiles. Both reported this version enabled; the Codex cache copy and Claude
  installed copy passed doctor with a redirected environment. Both were then
  uninstalled from the temporary profiles. All nine commands passed.
- The registry test reused the engine previously built from an empty state
  store. It did not repeat that download or run an authenticated model session.
- Initial GitHub checks exposed four test failures: short Windows paths in two
  fixtures and missing Git committer identity in two merge tests. Only test
  fixtures needed correction. The targeted 18-test rerun passed with global and
  system Git configuration disabled, including explicit line-ending conversion.
  A second CI run showed that JavaScript `realpathSync` still retained Windows
  short names; the fixtures now use `realpathSync.native`. A local replay with
  a real 8.3 temporary-directory alias outside the repository passed all 18 tests.
- Actual npm responses also exposed singleton-array JSON output and delayed
  registry availability. The release verifier now handles both response shapes,
  retries availability, and reports all registry tags. Its three targeted checks
  passed, followed by successful real registry verification.

Local evidence retained in the publication worktree:
`.tmp/npm registry smoke/result.json`, `.tmp/rc-registry-verified.json`,
`.tmp/rc-ci-fixture-check.log`, `.tmp/rc-ci-native-temp-check.log`,
`.tmp/rc-registry-verifier-check.log`.
Earlier checks and failures remain in the [validation history](CLAUDE-CODE-VALIDATION.md).
Postpublication test/release-tool/documentation fixes on main do not change the
published tarball or move its source tag.

## Scope still requiring validation

Windows x64 and Node.js 24+ are the supported install scope. Actual CLI setup
and browser/render checks do not prove authenticated Claude skill execution,
native hook/MCP/subagent behavior or full interruption/resume journeys. Complete
native acceptance of the exact npm package on both hosts remains a stable-release
prerequisite. Claude raster image generation/editing is outside the accepted scope.

The first publication used local npm authentication. The Trusted Publisher
account configuration and an actual OIDC workflow publication have not been tested.
