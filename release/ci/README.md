# GitHub release-gate proof inputs

These are frozen inputs for the GitHub-hosted release-gate acceptance, not new
Desktop tests. The valid ZIP is the previously delivered 0.7.5 archive. The stale
ZIP is the isolated negative control with only the Desktop-dependent
`plugins/bontaflowstack/scripts/bfstack.ps1` changed; never distribute it.

`inputs.json` pins both archives and the exact existing native evidence files.
The private receipt and native trace are supplied by the repository Actions
secret `BFS_RELEASE_DESKTOP_PROOF_075`: base64 of gzip of a JSON object containing
the original UTF-8 strings under `receipt.json` and `native.json`. The content is
not redacted, regenerated or retagged. The existing public screenshots are
copied into the temporary bundle and checked by the production gate.

The secret is passed only to the prepare step. Neither the private bundle nor
the extracted source is uploaded as an artifact. The diagnostics contain the
gate result, expected failure code and ZIP hash, not the private trace.

`release-gate-proof.yml` exercises the same `finalize-release` action as the
production workflow. Only the assertion harness continues after an expected
negative-control failure; the production action preserves the nonzero exit.
All three assertion jobs must pass. Only the valid scenario may upload a release
artifact, and its bytes must equal the pinned valid ZIP.

Pushes to `codex/release-gate-proof-*` run this dedicated proof without the
ordinary core/product test job. Other pushes and pull requests keep the normal
checks. No browser, engine setup or Desktop test is run by this workflow.
