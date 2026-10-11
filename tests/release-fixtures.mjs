import {canonical,digest,desktopInputs} from '../scripts/release-gate.mjs';

// Synthetic protocol fixtures test the gate; they are never Desktop acceptance evidence.
export function fixture() {
  const hash='a'.repeat(64),runtime='b'.repeat(64);
  const policy={schema:1,contractVersion:1,environment:{application:'Codex Desktop',os:'windows-x64',desktopVersion:'test-desktop',cliVersion:'test-cli'},profiles:[{id:'full-access',approvalPolicy:'never',permissionProfile:{type:'disabled'}}]};
  const snapshot={version:'0.7.5',archiveSha256:hash,files:{'plugins/bontaflowstack/core/browser-host.mjs':runtime,'scripts/setup.ps1':'c'.repeat(64),'README.md':'d'.repeat(64)}};
  const status={transport:'host-mcp',project:'test-project',hostWorkspace:'test-project',bindingSource:'host-workspace',taskId:'test-task',version:'0.7.5',runtimeSha256:runtime,hostPermissionProfile:{type:'disabled'},chromiumSandbox:true,engine:{version:'0.3.3',capabilities:{browser:{ready:true}}},browser:'stopped'};
  const result=value=>({content:[{type:'text',text:typeof value==='string'?value:JSON.stringify(value)}]});
  const time=new Date().toISOString();
  const raw={scope:'Synthetic fixture representing actual Codex Desktop fields; never usable as real acceptance',outcome:'passed',engineVersion:'0.3.3',completedAt:time,permissionProfileChanged:false,chromiumSandboxEvidence:{chromiumLaunchNoNoSandboxFlag:true},humanInput:{confirmation:'Ready',agentClicked:false,agentModifiedPageState:false},screenshotsVisuallyInspected:true,sourceArtifact:{sha256:hash,extractionAndInstalledHashesVerifiedBeforeRestart:true,installedPluginFiles:1},nativeResults:{
    status:result(status),final_status:result(status),connect:result({visible:true}),handoff:result({visible:true}),
    before_snapshot:result('Choose'),resume:result('Ready'),after_snapshot:result('Ready'),
    after_state:result({result:'Ready',choice:'Ready',chosenAt:time}),before_capture:result({path:'before.png'}),after_capture:result({path:'after.png'}),stop:result({status:'stopped'})
  }};
  policy.contractSha256='9'.repeat(64);raw.contractSha256=policy.contractSha256;raw.environment=structuredClone(policy.environment);raw.approvalPolicy='never';
  const receipt={schema:1,contractVersion:1,contractSha256:policy.contractSha256,client:'codex-desktop-native-tools',environment:structuredClone(policy.environment),profile:structuredClone(policy.profiles[0]),inputs:{version:snapshot.version,archiveSha256:hash,files:desktopInputs(snapshot.files)},nativeSha256:digest(canonical(raw))};
  return {snapshot,raw,receipt,policy};
}
