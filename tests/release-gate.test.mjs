import test from 'node:test';
import assert from 'node:assert/strict';
import {canonical,contractHash,digest,validateEvidence,validatePolicy} from '../scripts/release-gate.mjs';

import {fixture} from './release-fixtures.mjs';

const check=f=>validateEvidence(f.snapshot,f.receipt,f.raw,f.policy,f.policy.profiles[0]);
const rejected=(f,code)=>assert.throws(()=>check(f),error=>error.code===code);

test('missing Desktop evidence is rejected, never inferred from package status',()=>{
  const f=fixture();f.receipt=null;rejected(f,'DESKTOP_EVIDENCE_MISSING');
});
test('runtime change, addition, deletion and setup change invalidate Desktop evidence',()=>{
  for(const change of [
    f=>f.snapshot.files['plugins/bontaflowstack/core/browser-host.mjs']='e'.repeat(64),
    f=>f.snapshot.files['plugins/bontaflowstack/core/new.mjs']='e'.repeat(64),
    f=>delete f.snapshot.files['plugins/bontaflowstack/core/browser-host.mjs'],
    f=>f.snapshot.files['scripts/setup.ps1']='e'.repeat(64)
  ]) {const f=fixture();change(f);rejected(f,'DESKTOP_INPUTS_STALE');}
});
test('host, profile and plugin version drift are independently rejected',()=>{
  let f=fixture();f.policy.environment={...f.policy.environment,desktopVersion:'updated'};rejected(f,'DESKTOP_HOST_STALE');
  f=fixture();f.policy.profiles=[{...f.policy.profiles[0],approvalPolicy:'on-request'}];rejected(f,'DESKTOP_PROFILE_STALE');
  f=fixture();f.snapshot.version='0.7.6';rejected(f,'DESKTOP_VERSION_STALE');
});
test('modified trace and custom acceptance client cannot replace Desktop proof',()=>{
  let f=fixture();f.raw.outcome='failed';rejected(f,'DESKTOP_TRACE_CHANGED');
  f=fixture();f.receipt.client='custom-app-server';rejected(f,'DESKTOP_ORIGIN_REQUIRED');
});
test('failed raw tool result overrides a passing summary',()=>{
  const f=fixture();f.raw.nativeResults.connect.isError=true;f.receipt.nativeSha256=digest(canonical(f.raw));rejected(f,'NATIVE_STEP_FAILED');
});
test('missing human interaction or stopped state rejects acceptance',()=>{
  let f=fixture();f.raw.humanInput.agentClicked=true;f.receipt.nativeSha256=digest(canonical(f.raw));rejected(f,'HUMAN_JOURNEY_FAILED');
  f=fixture();f.raw.nativeResults.stop.content[0].text='{"status":"running"}';f.receipt.nativeSha256=digest(canonical(f.raw));rejected(f,'BROWSER_NOT_STOPPED');
});
test('unchanged product permits documentation-only evidence reuse',()=>{
  const f=fixture();f.snapshot.files['README.md']='e'.repeat(64);f.snapshot.archiveSha256='f'.repeat(64);
  const result=check(f);assert.equal(result.documentationOnlyReuse,true);assert.equal(result.profile,'full-access');
});
test('an empty profile matrix cannot disable the Desktop release gate',()=>{
  const f=fixture();f.policy.profiles=[];assert.throws(()=>validatePolicy(f.policy),error=>error.code==='POLICY_INVALID');
});

test('procedure drift and policy-only environment retagging are rejected',()=>{
  let f=fixture();f.policy.contractSha256='8'.repeat(64);rejected(f,'DESKTOP_CONTRACT_STALE');
  f=fixture();f.raw.contractSha256='8'.repeat(64);f.receipt.nativeSha256=digest(canonical(f.raw));rejected(f,'DESKTOP_CONTRACT_STALE');
  f=fixture();f.raw.environment.desktopVersion='different';f.receipt.nativeSha256=digest(canonical(f.raw));rejected(f,'DESKTOP_ENVIRONMENT_UNPROVEN');
});

test('Git line ending normalization preserves the acceptance contract',()=>{
  assert.equal(contractHash(['a\r\nb\r\n','c\r\n']),contractHash(['a\nb\n','c\n']));
  assert.notEqual(contractHash(['a\n','b']),contractHash(['a','\nb']));
});
