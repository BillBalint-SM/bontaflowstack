# BontaFlowStack 1.1.0-rc.2 — npm publication

Published on 2026-10-13 with the user's explicit approval for npm and the matching
GitHub source/tag. The single installation command is:

```powershell
npx bontaflowstack@1.1.0-rc.2 setup
```

[npm package](https://www.npmjs.com/package/bontaflowstack/v/1.1.0-rc.2)
· [exact source tag](https://github.com/BillBalint-SM/bontaflowstack/tree/v1.1.0-rc.2)
· [Impeccable implementation and local evidence](IMPECCABLE-SETUP.md)

## Published identity

- Source commit: `32e71122fce18b847a675efbd4efc6370fbb166b`.
- Annotated tag: `v1.1.0-rc.2`, resolving to that source commit.
- npm dist-tag: `rc` points to `1.1.0-rc.2`. `latest` remains on the earlier
  `1.1.0-rc.1`; it was not changed during this publication. Both are prereleases.
- Tarball SHA-256:
  `6772c0965b59165b4c32baad4611d89120a121e926405a6f832415b379ac4442`.
- npm integrity:
  `sha512-aVh1f4A43G+cbP5QY9cLTZFLkGUEikw/98vSMttajonH1ALKWakWPcIqoyC5a/EieoJ8kX721i3ABO6lbFBOTg==`.

The publisher uploaded the already tested tarball from
`artifacts/npm/1.1.0-rc.2`, not a rebuilt package. The receipt, local hash,
registry integrity and a downloaded registry tarball agree. npm requested browser
authentication, which the user completed; the subsequent registry verification
returned `outcome: verified`. No repeat publication or dist-tag repair was needed.
The source branch and tag were pushed normally and verified through remote refs.

## Observed checks

- Final local source gate: **115 passed, 0 failed**. Package and setup tests
  include command persistence, override precedence, retry and modified-file
  preservation. The review covered `fc2775c..32e7112` against the requested
  automatic setup behavior: Standards PASS and Spec PASS for that checked scope.
  Both passes were performed by the same agent; no independent review is claimed.
- Windows/Node 24 GitHub CI succeeded for the
  [exact source tag](https://github.com/BillBalint-SM/bontaflowstack/actions/runs/38330228847)
  and the [source plus local verification report](https://github.com/BillBalint-SM/bontaflowstack/actions/runs/38330228518).
- The exact prepared tarball passed actual npx setup before publication.
- After publication, `bontaflowstack@1.1.0-rc.2` was installed from the public
  registry using actual npx and both native host CLIs in isolated host profiles.
  Repeated setup passed. This check reused the previously verified shared engine
  state; it does not claim another fresh engine build.
- After moving that test's npm cache away, fresh processes from both installed
  adapters reported `design-detect` ready and ran Impeccable against a CSS fixture,
  returning the actual `overused-font` finding and exit 2 with completed status.
  Neither `BFS_IMPECCABLE_COMMAND` nor `BFS_STATE_HOME` was set for those processes.
- The isolated test registrations were removed. The user's normal host profiles
  were not used for the installation test. The published payload remains unchanged
  by the later repository documentation update.

Local publication evidence: `.tmp/rc2-registry-verification.json` and
`.tmp/rc2-registry-b511b069-99a5-448d-b8bd-c36098d52fde/result.json`.

## Limits

Authenticated Claude model-session acceptance, live URL detector scans and npm
Trusted Publisher/OIDC publishing were not tested in this release. This is an RC;
successful package installation does not establish those separate behaviors.
