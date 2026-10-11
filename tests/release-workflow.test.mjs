import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fixture} from './release-fixtures.mjs';
import {contractHash,digest} from '../scripts/release-gate.mjs';

const repo=path.resolve('.');
const run=(args)=>spawnSync(process.execPath,['scripts/release.mjs',...args],{cwd:repo,encoding:'utf8',windowsHide:true,timeout:60000});
const json=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const write=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value,null,2));};

test('real release CLI rejects missing/stale proof and promotes only checked bytes (synthetic inputs)',{skip:process.platform!=='win32'},()=>{
  const root=path.join(repo,'.tmp','release-workflow-'+randomUUID()),source=path.join(root,'source');
  fs.mkdirSync(source,{recursive:true});
  const docs='# Synthetic packaging fixture\n\n'+String.fromCharCode(96).repeat(3)+'powershell\nWrite-Output "syntax only"\n'+String.fromCharCode(96).repeat(3)+'\n';
  const content={
    'plugins/bontaflowstack/core/browser-host.mjs':'// Synthetic test product; never a real release.\n',
    'plugins/bontaflowstack/.codex-plugin/plugin.json':JSON.stringify({version:'0.7.5'}),
    '.agents/plugins/marketplace.json':JSON.stringify({plugins:[{source:{path:'./plugins/bontaflowstack'}}]}),
    'scripts/setup.ps1':'# Synthetic fixture\n','LICENSE':'Synthetic fixture','README.md':docs,'TELEPITES.md':docs,
    'docs/bontaflowstack/INSTALL-WINDOWS.md':docs,'docs/bontaflowstack/LOCAL-DATA.md':docs,
    'docs/bontaflowstack/CHANGELOG.md':docs,'docs/bontaflowstack/RELEASE-0.7.5.md':docs
  };
  for(const [name,value] of Object.entries(content))write(path.join(source,name),value);
  const candidateRoot=path.join(root,'candidate'),archive=path.join(candidateRoot,'BontaFlowStack-0.7.5.zip');
  let result=run(['prepare','--source',source,'--output',candidateRoot]);assert.equal(result.status,0,result.stderr);
  const f=fixture(),policy=json(path.join(repo,'release/policy.json'));
  f.raw.environment=policy.environment;
  f.raw.contractSha256=contractHash(['release/desktop-acceptance.md','release/desktop-fixture.html'].map(name=>fs.readFileSync(path.join(repo,name),'utf8')));
  f.raw.sourceArtifact.sha256=digest(fs.readFileSync(archive));
  f.raw.sourceArtifact.installedPluginFiles=2;
  for(const key of ['status','final_status']) {
    const status=JSON.parse(f.raw.nativeResults[key].content[0].text);
    status.runtimeSha256=digest(content['plugins/bontaflowstack/core/browser-host.mjs']);
    f.raw.nativeResults[key].content[0].text=JSON.stringify(status);
  }
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
  for(const [i,key] of ['before_capture','after_capture'].entries()) {
    const file=path.join(root,key+'.png');
    fs.writeFileSync(file,Buffer.concat([png,Buffer.from('\n'+i)]));
    f.raw.nativeResults[key].content[0].text=JSON.stringify({path:file});
  }
  const raw=path.join(root,'synthetic-native.json'),evidence=path.join(root,'evidence');
  const obsoleteRaw=path.join(root,'obsolete-native.json'),obsoleteEvidence=path.join(root,'obsolete-evidence');
  write(obsoleteRaw,{...f.raw,contractSha256:'0'.repeat(64)});
  result=run(['record','--candidate',archive,'--raw',obsoleteRaw,'--profile','full-access','--evidence',obsoleteEvidence]);
  assert.equal(result.status,1);assert.match(result.stderr,/DESKTOP_CONTRACT_STALE/);assert.equal(fs.existsSync(obsoleteEvidence),false);
  write(raw,f.raw);
  result=run(['record','--candidate',archive,'--raw',raw,'--profile','full-access','--evidence',evidence]);
  assert.equal(result.status,0,result.stderr);
  const receiptPath=path.join(evidence,'full-access/receipt.json'),original=json(receiptPath);
  let index=0;
  const reject=(options,code)=>{
    const out=path.join(root,'blocked-'+(++index)),report=path.join(root,'blocked-'+index+'.json');
    const call=run(['finalize','--candidate',archive,'--evidence',evidence,'--output',out,'--report',report,...options]);
    assert.equal(call.status,1,call.stdout);assert.equal(json(report).code,code,call.stderr);
    assert.equal(fs.existsSync(out),false,'A blocked command created release output');
  };
  fs.renameSync(receiptPath,receiptPath+'.saved');
  reject([],'DESKTOP_EVIDENCE_MISSING');
  fs.renameSync(receiptPath+'.saved',receiptPath);
  const stale=structuredClone(original);stale.inputs.files['plugins/bontaflowstack/core/browser-host.mjs']='f'.repeat(64);
  write(receiptPath,stale);reject([],'DESKTOP_INPUTS_STALE');write(receiptPath,original);
  const changedHost=structuredClone(policy);changedHost.environment.desktopVersion='different-build';
  const hostPolicy=path.join(root,'host-policy.json');write(hostPolicy,changedHost);
  reject(['--policy',hostPolicy],'DESKTOP_HOST_STALE');
  const matrix=structuredClone(policy);matrix.profiles.push({...matrix.profiles[0],id:'second-profile'});
  const matrixPath=path.join(root,'matrix.json');write(matrixPath,matrix);
  reject(['--policy',matrixPath],'DESKTOP_EVIDENCE_MISSING');
  const tracePath=path.join(evidence,'full-access/native.json'),traceText=fs.readFileSync(tracePath,'utf8');
  write(tracePath,{...JSON.parse(traceText),outcome:'failed'});reject([],'DESKTOP_TRACE_CHANGED');write(tracePath,traceText);
  const escaped=structuredClone(original);escaped.nativeFile='../../outside.json';write(receiptPath,escaped);
  reject([],'PATH_REJECTED');write(receiptPath,original);
  result=run(['finalize','--candidate',archive,'--evidence',evidence,'--output',path.join(root,'force'),'--force','true']);
  assert.equal(result.status,1);assert.match(result.stderr,/ARGUMENT_INVALID/);assert.equal(fs.existsSync(path.join(root,'force')),false);
  const legacyOut=path.join(root,'legacy'),legacyReport=path.join(root,'legacy.json');
  const env={...process.env};delete env.PSModulePath;
  result=spawnSync('powershell.exe',['-NoProfile','-File','scripts/build-package.ps1','-Release','-Candidate',archive,'-EvidenceDirectory',path.join(root,'missing'),'-OutputDirectory',legacyOut,'-Report',legacyReport],{cwd:repo,env,encoding:'utf8',windowsHide:true,timeout:60000});
  assert.equal(result.status,1);assert.equal(json(legacyReport).code,'DESKTOP_EVIDENCE_MISSING');assert.equal(fs.existsSync(legacyOut),false);
  const occupiedReport=path.join(root,'existing-report.json'),occupiedOutput=path.join(root,'existing-report-output');
  write(occupiedReport,{preserve:true});
  result=run(['finalize','--candidate',archive,'--evidence',evidence,'--output',occupiedOutput,'--report',occupiedReport]);
  assert.equal(result.status,1);assert.match(result.stderr,/OUTPUT_EXISTS/);
  assert.deepEqual(json(occupiedReport),{preserve:true});assert.equal(fs.existsSync(occupiedOutput),false);
  const output=path.join(root,'approved');
  result=run(['finalize','--candidate',archive,'--evidence',evidence,'--output',output]);assert.equal(result.status,0,result.stderr);
  assert.equal(digest(fs.readFileSync(path.join(output,'0.7.5/BontaFlowStack-0.7.5.zip'))),digest(fs.readFileSync(archive)));
  assert.equal(json(path.join(output,'0.7.5/RELEASE-RECEIPT.json')).outcome,'released');
  console.log(JSON.stringify({syntheticGateChecksOnly:true,blockedScenarios:10,noReleaseOutputOnBlock:true,unchangedArchivePromotion:true,root}));
});
