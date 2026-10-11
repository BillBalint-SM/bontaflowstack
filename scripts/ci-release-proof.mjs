import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {digest} from './release-gate.mjs';

const [command,scenario]=process.argv.slice(2);
assert.ok(['prepare','verify'].includes(command)&&['missing','stale','valid'].includes(scenario),'Unknown proof operation or scenario');
const inputs=JSON.parse(fs.readFileSync('release/ci/inputs.json','utf8'));
const item=inputs[scenario==='stale'?'stale':'valid'];
const root='artifacts/ci-input',output='artifacts/ci-final',report='artifacts/ci-result.json';
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const hash=file=>digest(fs.readFileSync(file));
if(command==='prepare') {
  assert.equal(hash(item.file),item.sha256,'Reviewed fixture ZIP hash changed');
  fs.mkdirSync(root,{recursive:true});
  fs.copyFileSync(item.file,path.join(root,'candidate.zip'),fs.constants.COPYFILE_EXCL);
  if(scenario!=='missing') {
    let bundle;
    try {
      bundle=JSON.parse(gunzipSync(Buffer.from(process.env.BFS_RELEASE_DESKTOP_PROOF||'','base64'),{maxOutputLength:131072}).toString('utf8'));
    } catch { throw new Error('Desktop evidence secret is missing or invalid; private contents are never logged.'); }
    const folder=path.join(root,'evidence/full-access');fs.mkdirSync(folder,{recursive:true});
    for(const name of ['receipt.json','native.json']) {
      assert.equal(typeof bundle[name],'string','Missing private evidence file');
      assert.equal(digest(bundle[name]),inputs.evidence[name],'Private evidence does not match reviewed input');
      fs.writeFileSync(path.join(folder,name),bundle[name],{flag:'wx'});
    }
    for(const [source,destination] of [['desktop-before.png','before_capture.png'],['desktop-ready.png','after_capture.png']])
      fs.copyFileSync(path.join('docs/bontaflowstack/release',source),path.join(folder,destination),fs.constants.COPYFILE_EXCL);
  }
  console.log(JSON.stringify({scenario,candidateSha256:item.sha256,reusesExistingDesktopEvidence:scenario!=='missing',newDesktopTestRun:false}));
} else {
  const result=read(report),negative=scenario!=='valid';
  assert.equal(process.env.BFS_GATE_OUTCOME,negative?'failure':'success','Unexpected GitHub step outcome');
  assert.equal(result.candidateArchiveSha256,item.sha256,'Gate checked different candidate bytes');
  if(negative) {
    assert.equal(result.outcome,'blocked');
    assert.equal(result.code,scenario==='missing'?'DESKTOP_EVIDENCE_MISSING':'DESKTOP_INPUTS_STALE');
    if(scenario==='stale')assert.deepEqual(result.detail.changedPaths,['plugins/bontaflowstack/scripts/bfstack.ps1']);
    assert.equal(fs.existsSync(output),false,'Rejected evidence created release output');
  } else {
    assert.equal(result.outcome,'released');
    assert.equal(hash(path.join(output,'0.7.5/BontaFlowStack-0.7.5.zip')),item.sha256,'Published ZIP bytes differ');
    assert.equal(read(path.join(output,'0.7.5/RELEASE-RECEIPT.json')).archiveSha256,item.sha256);
  }
  const verification={scenario,assertions:'passed',gateOutcome:result.outcome,gateCode:result.code??null,archiveSha256:item.sha256,releaseOutputExists:fs.existsSync(output),runId:process.env.GITHUB_RUN_ID||null,runAttempt:process.env.GITHUB_RUN_ATTEMPT||null,commit:process.env.GITHUB_SHA||null,newDesktopTestRun:false,closedFunctionalTestsRerun:false};
  fs.writeFileSync('artifacts/ci-verification.json',JSON.stringify(verification,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(verification));
}
