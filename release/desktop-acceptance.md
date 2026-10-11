# Native Desktop acceptance contract (v1)

This is the human/agent step of the release workflow. Use only the installed
plugin's actual Codex Desktop native MCP tools. A separate app-server harness,
direct shell browser, synthetic fixture result or CLI MCP session is ineligible.

Before starting, run release check. If the runtime inputs, procedure and required
host/profile match existing accepted evidence, reuse it. Do not repeat a closed
valid journey merely because the ZIP contains new documentation.

For each profile required in release/policy.json, retain contractSha256 from the
release check JSON report before beginning. This identifies this procedure and
fixture, independent of Git's LF/CRLF checkout normalization.

1. Install the candidate ZIP through the official Codex plugin commands using a
   separate test setup as appropriate. Verify its SHA256 and all installed
   plugin files against PACKAGE.json. Record the actual installed ZIP SHA256.
2. Fully reload Desktop's plugin connection after installation. Record the
   observed Desktop app build, its actual app-server CLI version, Windows x64
   and the effective chat approval policy. Do not copy expected policy values
   into an observation. Keep the user's requested profile.
3. In a real project chat, call native bfs-browser status. Retain the original
   tool result under nativeResults.status. Check host-workspace binding, project
   and task, runtime version/hash, engine readiness and permission profile.
4. Start the checked-in loopback page with node scripts/release.mjs fixture.
   Use native browser connect with its returned URL. Save the result as connect.
   Take snapshot (before_snapshot), capture a PNG (before_capture), view it, and
   call handoff. Save all original results; do not rewrite an error as success.
5. Ask the human to click Choose. Wait for their actual Ready reply. Do not click
   on their behalf or mutate the page state with JavaScript.
6. Call native resume, snapshot (after_snapshot), and read-only js (after_state):
   JSON.stringify({title:document.title,url:location.href,result:document.querySelector('#result').textContent,choice:document.body.dataset.choice,chosenAt:document.body.dataset.chosenAt})
   Capture and view the Ready PNG (after_capture).
7. Call native stop and then status (final_status). Stop only the owned fixture
   server. Retain a failed step/timeout as a failure with its original output.
8. Save the raw acceptance object described below and run release record with
   the exact tested ZIP. This validates and freezes the proof, not the browser.
   Run release check/finalize afterwards; record alone never releases an archive.

Raw acceptance fields (the reference shape is exercised by release-gate tests):

- scope must identify actual Codex Desktop use; outcome is passed only on success.
- environment: application "Codex Desktop", os "windows-x64", desktopVersion and
  cliVersion from actual observations; approvalPolicy from the tested chat.
- contractSha256: the procedure/fixture hash recorded before this acceptance.
  Record rejects a missing or different hash instead of assigning today's hash.
- completedAt, engineVersion, permissionProfileChanged:false.
- sourceArtifact: sha256 of the installed ZIP, installedPluginFiles count,
  extractionAndInstalledHashesVerifiedBeforeRestart:true only after that check.
- nativeResults: the unchanged status, connect, before_snapshot, before_capture,
  handoff, resume, after_snapshot, after_state, after_capture, stop, final_status
  MCP result objects. Keep any isError flags. Every result is checked.
- humanInput: actual confirmation "Ready", agentClicked:false and
  agentModifiedPageState:false.
- screenshotsVisuallyInspected:true only after viewing both captures.
- chromiumSandboxEvidence.chromiumLaunchNoNoSandboxFlag:true only after inspecting
  the owned Chromium launch command and finding no --no-sandbox switch.

Capture paths in the raw results must still resolve when record is called.
Record copies their bytes into an immutable evidence bundle. It retains the raw
results, including local paths: treat that bundle as private until reviewed.

For the existing 0.7.5 evidence, the app/CLI versions and approval policy were
already preserved in RELEASE-EVIDENCE.json. An explicitly attributed import may
add those observations to a COPY of the original raw report. Preserve both
original file hashes. For this first migration only, compare the archived steps
and fixture against this contract and record that review with its hash in the
import metadata. This is an explicit migration of existing observations, not a
new Desktop run. Never relabel old observations with a new policy version or a
changed behavioral acceptance procedure.

This contract checks recorded evidence and content freshness. It is not a
cryptographic attestation from Codex and cannot detect deliberately fabricated
records by a maintainer who can edit both evidence and policy. Review the actual
tool conversation and human reply before accepting a newly recorded bundle.
