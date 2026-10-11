import crypto from 'node:crypto';

export const contractVersion=1;
export const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
export const canonical=value=>JSON.stringify(value,(_,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
export const contractHash=contents=>digest(canonical(contents.map(text=>text.replaceAll('\r\n','\n'))));
export const desktopInputs=files=>Object.fromEntries(Object.entries(files).filter(([name])=>name.startsWith('plugins/bontaflowstack/')||name==='.agents/plugins/marketplace.json'||name==='scripts/setup.ps1').sort(([a],[b])=>a.localeCompare(b)));

export class ReleaseError extends Error {
  constructor(code,stage,message,detail={}) {super(message);Object.assign(this,{code,stage,detail});}
}
export function requireRelease(condition,code,stage,message,detail={}) {
  if(!condition)throw new ReleaseError(code,stage,message,detail);
}
export function validatePolicy(policy) {
  requireRelease(policy?.schema===1&&policy.contractVersion===contractVersion,'POLICY_INVALID','policy','Unsupported release contract.');
  requireRelease(policy.environment?.application==='Codex Desktop'&&policy.environment.os==='windows-x64'&&
    [policy.environment.desktopVersion,policy.environment.cliVersion].every(x=>typeof x==='string'&&x.length>0),'POLICY_INVALID','policy','Pin the Desktop/CLI versions and Windows environment.');
  requireRelease(Array.isArray(policy.profiles)&&policy.profiles.length>0&&new Set(policy.profiles.map(x=>x.id)).size===policy.profiles.length,'POLICY_INVALID','policy','A nonempty, unique Desktop profile matrix is required.');
  for(const p of policy.profiles)requireRelease(/^[a-z][a-z0-9-]*$/.test(p.id)&&p.permissionProfile?.type&&['never','on-request','untrusted','on-failure'].includes(p.approvalPolicy),'POLICY_INVALID','policy','Invalid Desktop profile specification.');
}
function text(result,name) {
  requireRelease(result&&result.isError!==true&&Array.isArray(result.content),'NATIVE_STEP_FAILED',name,'Missing or failed native Desktop tool result.');
  const value=result.content.filter(x=>x.type==='text').map(x=>x.text).join('\n');
  requireRelease(value.length>0,'NATIVE_STEP_FAILED',name,'Native result is empty.');
  return value;
}
function json(result,name) {
  try{return JSON.parse(text(result,name));}catch(error){if(error instanceof ReleaseError)throw error;throw new ReleaseError('NATIVE_STEP_FAILED',name,'Native result is not valid JSON.');}
}
export function validateNative(raw,inputs,profile) {
  requireRelease(raw?.outcome==='passed'&&/actual Codex Desktop/.test(raw.scope||''),'DESKTOP_ORIGIN_REQUIRED','desktop-origin','A custom app-server result cannot replace actual Desktop evidence.');
  const results=raw.nativeResults;
  requireRelease(results&&typeof results==='object','DESKTOP_TRACE_MISSING','desktop-origin','Raw native tool results are required.');
  for(const [name,result] of Object.entries(results))text(result,name);
  const start=json(results.status,'status'),end=json(results.final_status,'final_status');
  requireRelease(start.transport==='host-mcp'&&start.project&&start.project===start.hostWorkspace&&start.bindingSource==='host-workspace','PROJECT_BINDING_FAILED','status','Desktop did not bind the host workspace.');
  requireRelease(start.taskId&&start.taskId===end.taskId&&start.project===end.project,'IDENTITY_CHANGED','status','Project or task identity changed during acceptance.');
  requireRelease(start.version===inputs.version&&end.version===inputs.version&&
    start.runtimeSha256===inputs.files['plugins/bontaflowstack/core/browser-host.mjs']&&end.runtimeSha256===start.runtimeSha256,
    'RUNTIME_MISMATCH','status','Native runtime does not match the validated package.');
  requireRelease(canonical(start.hostPermissionProfile)===canonical(profile.permissionProfile)&&canonical(end.hostPermissionProfile)===canonical(profile.permissionProfile)&&raw.permissionProfileChanged===false,
    'PROFILE_MISMATCH','status','Observed Desktop permission profile does not match the required profile.',{profile:profile.id,actual:start.hostPermissionProfile,expected:profile.permissionProfile});
  requireRelease(start.chromiumSandbox===true&&end.chromiumSandbox===true&&raw.chromiumSandboxEvidence?.chromiumLaunchNoNoSandboxFlag===true,'SANDBOX_EVIDENCE_MISSING','browser-launch','Chromium sandbox evidence is missing.');
  requireRelease(start.engine?.capabilities?.browser?.ready===true&&start.engine.version===raw.engineVersion,'ENGINE_NOT_READY','browser-launch','Installed browser engine is not ready.');
  requireRelease(json(results.connect,'connect').visible===true&&json(results.handoff,'handoff').visible===true,'VISIBLE_BROWSER_REQUIRED','connect','Visible browser launch/handoff was not demonstrated.');
  requireRelease(/Choose/.test(text(results.before_snapshot,'before_snapshot'))&&/Ready/.test(text(results.resume,'resume'))&&/Ready/.test(text(results.after_snapshot,'after_snapshot')),'HUMAN_JOURNEY_FAILED','resume','The Choose/Ready handoff/resume journey is incomplete.');
  const state=json(results.after_state,'after_state');
  requireRelease(state.result==='Ready'&&state.choice==='Ready'&&Number.isFinite(Date.parse(state.chosenAt))&&raw.humanInput?.confirmation==='Ready'&&raw.humanInput.agentClicked===false&&raw.humanInput.agentModifiedPageState===false,'HUMAN_JOURNEY_FAILED','human-input','Actual human confirmation and readback are required.');
  requireRelease(raw.screenshotsVisuallyInspected===true&&json(results.before_capture,'before_capture').path&&json(results.after_capture,'after_capture').path,'SCREENSHOT_REQUIRED','capture','Both captured and visually inspected screenshots are required.');
  requireRelease(json(results.stop,'stop').status==='stopped'&&end.browser==='stopped','BROWSER_NOT_STOPPED','stop','Owned browser cleanup is not demonstrated.');
  requireRelease(Number.isFinite(Date.parse(raw.completedAt))&&Date.parse(raw.completedAt)>=Date.parse(state.chosenAt)&&Date.parse(raw.completedAt)<=Date.now()+300000,'EVIDENCE_DATE_INVALID','desktop-origin','Invalid or future acceptance timestamp.');
  requireRelease(raw.sourceArtifact?.sha256===inputs.archiveSha256&&raw.sourceArtifact.extractionAndInstalledHashesVerifiedBeforeRestart===true&&raw.sourceArtifact.installedPluginFiles===Object.keys(inputs.files).filter(x=>x.startsWith('plugins/bontaflowstack/')).length,'INSTALLATION_EVIDENCE_MISMATCH','installation','The raw result must identify the installed ZIP and its checked plugin inventory.');
  return {version:start.version,profile:profile.id,engine:start.engine.version,completedAt:raw.completedAt};
}
export function validateEvidence(snapshot,receipt,raw,policy,profile) {
  validatePolicy(policy);
  requireRelease(receipt?.schema===1&&receipt.contractVersion===contractVersion,'DESKTOP_EVIDENCE_MISSING','desktop-evidence','A recorded Desktop acceptance is required.',{profile:profile.id});
  requireRelease(receipt.client==='codex-desktop-native-tools','DESKTOP_ORIGIN_REQUIRED','desktop-evidence','Only actual Desktop native tool evidence is eligible.');
  requireRelease(receipt.contractSha256===policy.contractSha256&&/^[a-f0-9]{64}$/.test(policy.contractSha256||''),'DESKTOP_CONTRACT_STALE','desktop-evidence','The native acceptance procedure or fixture changed.');
  requireRelease(canonical(receipt.environment)===canonical(policy.environment),'DESKTOP_HOST_STALE','desktop-evidence','Desktop or CLI environment differs from the supported release matrix.',{expected:policy.environment,actual:receipt.environment,profile:profile.id});
  requireRelease(canonical(receipt.profile)===canonical(profile),'DESKTOP_PROFILE_STALE','desktop-evidence','The recorded profile differs from the release profile.',{expected:profile,actual:receipt.profile});
  requireRelease(receipt.inputs?.version===snapshot.version,'DESKTOP_VERSION_STALE','desktop-evidence','Plugin version differs from the native acceptance.');
  const current=desktopInputs(snapshot.files),previous=receipt.inputs.files||{};
  const changed=[...new Set([...Object.keys(current),...Object.keys(previous)])].filter(name=>current[name]!==previous[name]);
  requireRelease(changed.length===0,'DESKTOP_INPUTS_STALE','desktop-evidence','Desktop-dependent package files changed; rerun only the affected Desktop journey.',{profile:profile.id,changedPaths:changed});
  requireRelease(digest(canonical(raw))===receipt.nativeSha256,'DESKTOP_TRACE_CHANGED','desktop-evidence','Recorded native results have changed.');
  requireRelease(raw.contractSha256===receipt.contractSha256,'DESKTOP_CONTRACT_STALE','desktop-evidence','Raw observations belong to a different acceptance procedure.');
  requireRelease(canonical(raw.environment)===canonical(receipt.environment)&&raw.approvalPolicy===profile.approvalPolicy,'DESKTOP_ENVIRONMENT_UNPROVEN','desktop-evidence','The observed native environment must support the receipt, not be inferred from current policy.');
  const result=validateNative(raw,receipt.inputs,profile);
  return {...result,reusedFromArchiveSha256:receipt.inputs.archiveSha256,candidateArchiveSha256:snapshot.archiveSha256,documentationOnlyReuse:receipt.inputs.archiveSha256!==snapshot.archiveSha256};
}
