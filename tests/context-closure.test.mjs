import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { context, digest, readJson, atomicWriteText } from '../plugins/bontaflowstack/core/state.mjs';
import { workflow } from '../plugins/bontaflowstack/core/workflow.mjs';
import { memory } from '../plugins/bontaflowstack/core/memory.mjs';
import { delivery } from '../plugins/bontaflowstack/core/delivery.mjs';
import { loadCatalog, pluginRoot } from '../plugins/bontaflowstack/core/catalog.mjs';
import { essentialContext } from '../plugins/bontaflowstack/core/context.mjs';

function fixture(t,gitProject=false) {
  const root=fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()),'bfs-closure-'));
  t.after(()=>{assert.equal(path.dirname(root),fs.realpathSync.native(os.tmpdir()));fs.rmSync(root,{recursive:true,force:true});});
  const project=path.join(root,'source');fs.mkdirSync(project);
  fs.writeFileSync(path.join(project,'plan.md'),'Accepted complete plan');
  if(gitProject)for(const args of [['init','--quiet'],['add','plan.md'],['-c','user.name=Acceptance','-c','user.email=acceptance@localhost','commit','--quiet','-m','fixture base']]) {
    const r=spawnSync('git',args,{cwd:project,encoding:'utf8',windowsHide:true});assert.equal(r.status,0,r.stderr);
  }
  const env={...process.env,BFS_STATE_HOME:path.join(root,'state'),CODEX_THREAD_ID:'closure-task'};
  return {root,project,env,ctx:context(project,env)};
}
function cli(f,action,input,cwd=f.project) {
  const r=spawnSync(process.execPath,[path.join(pluginRoot,'core/cli.mjs'),'workflow',action,'--input','-'],{cwd,env:f.env,input:JSON.stringify(input),encoding:'utf8',windowsHide:true});
  return {...r,value:r.status===0 ? JSON.parse(r.stdout) : null};
}
function exported(t,gitProject=false) {
  const f=fixture(t,gitProject),catalog=loadCatalog(),w=workflow(f.ctx,'start',{goal:'Continue accepted change',skills:['bfs-implement']},catalog);
  workflow(f.ctx,'begin',{id:w.id,step:'1',inputs:['plan.md']},catalog);
  const first=memory(f.ctx,'put',{kind:'plan',key:'full-plan',text:'Original',details:'Complete old plan',source:'user-stated'});
  memory(f.ctx,'put',{kind:'plan',key:'full-plan',expectedId:first.id,text:'Revised',details:'Complete revised plan',source:'user-stated'});
  workflow(f.ctx,'pause',{id:w.id,summary:'Paused after inspection',remaining:['Implement exact accepted behavior']},catalog);
  const output=path.join(f.root,'handoff.md'),r=cli(f,'export',{id:w.id,memory:[{kind:'plan',key:'full-plan'}],output});
  assert.equal(r.status,0,r.stderr);assert.ok(fs.readFileSync(output,'utf8').includes('```bfs-handoff-json'));
  return {...f,w,output};
}

test('handoff CLI preserves full histories across projects, previews without writes and retries import',t=>{
  const f=exported(t),target=path.join(f.root,'target');fs.mkdirSync(target);fs.writeFileSync(path.join(target,'plan.md'),'Different source');
  const targetCtx=context(target,f.env),preview=cli(f,'import-handoff',{file:f.output},target);
  assert.equal(preview.status,0,preview.stderr);assert.equal(preview.value.preview,true);assert.equal(fs.existsSync(targetCtx.workspaceDir),false);assert.equal(preview.value.drift.length,1);
  const imported=cli(f,'import-handoff',{file:f.output,confirm:'import'},target);assert.equal(imported.status,0,imported.stderr);
  assert.equal(imported.value.authorizationImported,false);assert.equal(imported.value.projectId,targetCtx.projectId);assert.notEqual(imported.value.id,f.w.id);
  assert.equal(imported.value.handoff.memory.length,2);assert.equal(imported.value.handoff.memory[0].details,'Complete old plan');
  assert.equal(cli(f,'import-handoff',{file:f.output,confirm:'import'},target).value.id,imported.value.id);
  assert.equal(memory(targetCtx,'stats').records,0);assert.equal(workflow(targetCtx,'list',{},loadCatalog()).length,0);
  const resumed=workflow(targetCtx,'resume',{id:imported.value.id},loadCatalog());assert.equal(resumed.drift.length,1);assert.equal(resumed.verification,'historical');
  assert.ok(essentialContext(targetCtx).checkpoints.some(c=>c.id===imported.value.id));
  const continuation=workflow(targetCtx,'start',{goal:'A differently named continuation',sourceCheckpointId:imported.value.id,skills:['bfs-review']},loadCatalog());
  workflow(targetCtx,'begin',{id:continuation.id,step:'1'},loadCatalog());
  workflow(targetCtx,'step',{id:continuation.id,step:'1',status:'completed',summary:'Verified continuation',evidence:['Actual review completed']},loadCatalog());
  assert.equal(essentialContext(targetCtx).checkpoints.length,0);
  assert.equal(workflow(targetCtx,'resume',{id:imported.value.id},loadCatalog()).handoff.memory.length,2);
});

test('portable handoff enters a real new Git clone under fresh local identities',t=>{
  const f=exported(t,true),target=path.join(f.root,'clone');
  const cloned=spawnSync('git',['clone','--quiet',f.project,target],{encoding:'utf8',windowsHide:true});assert.equal(cloned.status,0,cloned.stderr);
  const targetCtx=context(target,f.env);assert.equal(targetCtx.git,true);assert.notEqual(targetCtx.projectId,f.ctx.projectId);
  const imported=cli(f,'import-handoff',{file:f.output,confirm:'import'},target);assert.equal(imported.status,0,imported.stderr);
  assert.equal(imported.value.projectId,targetCtx.projectId);assert.equal(imported.value.workspaceId,targetCtx.workspaceId);
  assert.equal(imported.value.handoff.origin.projectId,f.ctx.projectId);assert.equal(imported.value.verification,'historical');assert.equal(imported.value.drift.length,0);
  const recovered=workflow(targetCtx,'resume',{id:imported.value.id},loadCatalog());assert.ok(recovered.environmentChanges.some(row=>row.key==='workspace'));
  assert.equal(memory(targetCtx,'stats').records,0);
});

test('handoff rejects traversal, extra blocks, credentials and invalid payload without rewriting prior state',t=>{
  const f=exported(t),original=fs.readFileSync(f.output,'utf8'),payload=JSON.parse(original.match(/```bfs-handoff-json\n([\s\S]*?)\n```/)[1]);
  const mutated=(change)=>{const p=structuredClone(payload);change(p);delete p.payloadSha256;p.payloadSha256=digest(JSON.stringify(p));return '# Handoff\n\n```bfs-handoff-json\n'+JSON.stringify(p)+'\n```\n';};
  for(const bad of [original+'\n```bfs-handoff-json\n{}\n```\n',mutated(p=>p.origin.projectId='invalid'),mutated(p=>p.workflow.steps=[1]),mutated(p=>p.checkpoint.files[0].path='../outside'),mutated(p=>p.checkpoint.files=[{}]),mutated(p=>p.checkpoint.files=['plan.md']),mutated(p=>p.memory[0].api_key='sensitive'),mutated(p=>p.schema=99),'```bfs-handoff-json\nnot json\n```', 'x'.repeat(8*1024*1024+1),Buffer.from([0xff,0xfe])]) {
    fs.writeFileSync(f.output,bad);const r=cli(f,'import-handoff',{file:f.output,confirm:'import'});assert.notEqual(r.status,0);assert.ok(!r.stderr.includes('sensitive'));
  }
  fs.writeFileSync(f.output,original);const before=readJson(path.join(f.ctx.projectDir,'memory.json'));
  const failed=cli(f,'export',{id:f.w.id,output:f.output,next:'Different next'});assert.notEqual(failed.status,0);assert.equal(fs.readFileSync(f.output,'utf8'),original);
  assert.deepEqual(readJson(path.join(f.ctx.projectDir,'memory.json')),before);
});

test('handoff keeps closed work historical and supports old standalone non-Git checkpoints',t=>{
  const f=fixture(t),catalog=loadCatalog(),w=workflow(f.ctx,'start',{goal:'Discarded',skills:['bfs-review']},catalog);
  workflow(f.ctx,'discard',{id:w.id,summary:'User abandoned this direction'},catalog);
  const out=cli(f,'export',{id:w.id});assert.equal(out.status,0,out.stderr);const file=path.join(f.root,'closed.md');fs.writeFileSync(file,out.value.markdown);
  const target=path.join(f.root,'new');fs.mkdirSync(target);const restored=cli(f,'import-handoff',{file,confirm:'import'},target);assert.equal(restored.status,0,restored.stderr);
  assert.equal(essentialContext(context(target,f.env)).checkpoints.length,0);
  const discarded=workflow(f.ctx,'resume',{id:w.id},catalog);
  const checkpointExport=cli(f,'export',{id:discarded.checkpointId});assert.equal(checkpointExport.status,0,checkpointExport.stderr);
  fs.writeFileSync(file,checkpointExport.value.markdown);
  assert.equal(cli(f,'import-handoff',{file,confirm:'import'},target).value.sourceStatus,'discarded');
  const old=workflow(f.ctx,'save',{goal:'Old standalone',summary:'Continue from old data',files:['plan.md']},catalog);
  assert.equal(cli(f,'export',{id:old.id}).status,0);
});

test('concurrent handoff imports converge on one immutable checkpoint',async t=>{
  const f=exported(t),target=path.join(f.root,'concurrent');fs.mkdirSync(target);
  const run=()=>new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[path.join(pluginRoot,'core/cli.mjs'),'workflow','import-handoff','--input','-'],{cwd:target,env:f.env,windowsHide:true});
    let stdout='',stderr='';child.stdout.on('data',v=>stdout+=v);child.stderr.on('data',v=>stderr+=v);
    child.once('error',reject);child.once('close',code=>{try{assert.equal(code,0,stderr);resolve(JSON.parse(stdout));}catch(error){reject(error);}});
    child.stdin.end(JSON.stringify({file:f.output,confirm:'import'}));
  });
  const [a,b]=await Promise.all([run(),run()]);assert.equal(a.id,b.id);
  assert.equal(workflow(context(target,f.env),'checkpoints',{},loadCatalog()).length,1);
});

test('handoff output created by another writer during export stays intact',t=>{
  const f=fixture(t),file=path.join(f.root,'new-output.md'),sync=fs.fsyncSync;
  fs.fsyncSync=fd=>{sync(fd);fs.writeFileSync(file,'Concurrent user content');};
  try{assert.throws(()=>atomicWriteText(file,'Exported handoff'));}finally{fs.fsyncSync=sync;}
  assert.equal(fs.readFileSync(file,'utf8'),'Concurrent user content');
  atomicWriteText(file,'Explicit replacement',{overwrite:true});assert.equal(fs.readFileSync(file,'utf8'),'Explicit replacement');
});

test('delivery report separates local completion, requested stages and latest failed/pending evidence',t=>{
  const f=fixture(t),w=workflow(f.ctx,'start',{goal:'Local change',skills:['bfs-finisher']},loadCatalog());
  const subject={target:'fixture',sourceRevision:'source-1',provider:'fixture',revision:'rev-1',version:'1.0.0'};
  const record=(stage,script)=>delivery(f.ctx,'evidence',{workflowId:w.id,stage,subject,label:stage,files:['plan.md'],command:[process.execPath,'-e',script]});
  record('prepare','console.log("checks pass")');const report=()=>delivery(f.ctx,'report',{workflowId:w.id,subject,stages:['prepare','verify']});
  assert.equal(report().stages.prepare.status,'COMPLETED');assert.equal(report().stages.publish.status,'NOT-REQUESTED');assert.equal(report().stages.verify.status,'MISSING');
  record('verify','console.log(JSON.stringify({status:"completed",provider:"fixture",target:"fixture",revision:"rev-1",version:"1.0.0"}))');
  assert.equal(report().stages.verify.status,'COMPLETED');assert.equal(report().liveVerified,false);
  record('verify','console.log(JSON.stringify({status:"pending",provider:"fixture",target:"fixture"}))');assert.equal(report().stages.verify.status,'PENDING');
  record('verify','process.exit(7)');assert.equal(report().stages.verify.status,'FAILED');
  fs.writeFileSync(path.join(f.project,'plan.md'),'Changed');assert.equal(report().stages.prepare.status,'STALE');
});

test('delivery current verification requires a new explicit query and detects delivered revision mismatch',t=>{
  const f=fixture(t),w=workflow(f.ctx,'start',{goal:'Verify delivery',skills:['bfs-prod-deploy']},loadCatalog());
  const subject={target:'fixture',provider:'fixture',sourceRevision:'source-1',revision:'rev-1'};
  const query=revision=>[process.execPath,'-e',`console.log(JSON.stringify({status:'completed',target:'fixture',provider:'fixture',revision:'${revision}'}))`];
  const e=delivery(f.ctx,'evidence',{workflowId:w.id,stage:'deploy',subject,label:'Query delivery',files:['plan.md'],command:query('rev-1')});
  assert.equal(delivery(f.ctx,'verify',{id:e.id}).valid,false);
  const good=delivery(f.ctx,'verify',{id:e.id,command:query('rev-1')});assert.equal(good.valid,true);assert.equal(good.liveVerified,true);assert.notEqual(good.probeId,e.id);
  const bad=delivery(f.ctx,'verify',{id:e.id,command:query('rev-2')});assert.equal(bad.valid,false);assert.equal(bad.status,'MISMATCH');
  const plain=delivery(f.ctx,'evidence',{workflowId:w.id,stage:'verify',subject,label:'URL only',files:['plan.md'],command:[process.execPath,'-e','console.log("https://example.test/release")']});
  assert.equal(delivery(f.ctx,'verify',{id:plain.id}).liveVerified,false);
  fs.writeFileSync(path.join(f.project,'plan.md'),'Changed after original verification');
  const stale=delivery(f.ctx,'verify',{id:e.id,command:query('rev-1')});assert.equal(stale.valid,false);assert.equal(stale.status,'STALE');
  assert.equal(delivery(f.ctx,'report',{workflowId:w.id,subject,stages:['verify']}).stages.verify.status,'STALE');
});

test('delivery CLI rejects foreign workflow binding before execution and reports unavailable provider',t=>{
  const f=fixture(t),w=workflow(f.ctx,'start',{goal:'CLI proof',skills:['bfs-prod-deploy']},loadCatalog()),marker=path.join(f.project,'should-not-exist');
  const run=(action,input,env=f.env)=>spawnSync(process.execPath,[path.join(pluginRoot,'core/cli.mjs'),'delivery',action,'--input','-'],{cwd:f.project,env,input:JSON.stringify(input),encoding:'utf8',windowsHide:true});
  const subject={target:'fixture',sourceRevision:'source-1',provider:'fixture',revision:'rev-1'};
  const wrong=run('evidence',{label:'Wrong task',workflowId:w.id,stage:'verify',subject,files:['plan.md'],command:[process.execPath,'-e',`require('fs').writeFileSync(${JSON.stringify(marker)},'unexpected')`]}, {...f.env,CODEX_THREAD_ID:'other-task'});
  assert.notEqual(wrong.status,0);assert.equal(fs.existsSync(marker),false);
  const e=run('evidence',{label:'Unavailable query',workflowId:w.id,stage:'verify',subject,files:['plan.md'],command:[path.join(f.root,'missing-provider')]});assert.notEqual(e.status,0);assert.equal(JSON.parse(e.stdout).status,'failed');
  const report=run('report',{workflowId:w.id,subject,stages:['verify']});assert.equal(report.status,0,report.stderr);assert.equal(JSON.parse(report.stdout).stages.verify.status,'FAILED');
  assert.equal(JSON.parse(report.stdout).liveVerified,false);
  const unidentified=run('evidence',{label:'No selected delivery identity',workflowId:w.id,stage:'verify',subject:{target:'fixture',provider:'fixture',sourceRevision:'source-1'},files:['plan.md'],command:[process.execPath,'-e','console.log(JSON.stringify({status:"completed",provider:"fixture",target:"fixture"}))']});
  assert.equal(unidentified.status,0,unidentified.stderr);
  const incomplete=run('verify',{id:JSON.parse(unidentified.stdout).id,command:[process.execPath,'-e','console.log(JSON.stringify({status:"completed",provider:"fixture",target:"fixture"}))']});
  assert.notEqual(incomplete.status,0);assert.equal(JSON.parse(incomplete.stdout).status,'UNKNOWN');assert.equal(JSON.parse(incomplete.stdout).liveVerified,false);
});
