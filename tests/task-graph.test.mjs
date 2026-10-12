import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { context } from '../plugins/bontaflowstack/core/state.mjs';
import { tasks } from '../plugins/bontaflowstack/core/tasks.mjs';
import { loadCatalog } from '../plugins/bontaflowstack/core/catalog.mjs';
import { workflow } from '../plugins/bontaflowstack/core/workflow.mjs';
import { delivery } from '../plugins/bontaflowstack/core/delivery.mjs';

function fixture(t) {
  const root=fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()),'bfs-task-graph-'));
  t.after(()=>{assert.equal(path.dirname(root),fs.realpathSync.native(os.tmpdir()));fs.rmSync(root,{recursive:true,force:true});});
  const repo=path.join(root,'repo');fs.mkdirSync(repo);fs.writeFileSync(path.join(repo,'plan.md'),'accepted\n');
  for(const args of [['init','--quiet'],['config','user.name','Acceptance'],['config','user.email','acceptance@localhost'],['add','plan.md'],['commit','--quiet','-m','base']]) {
    const r=spawnSync('git',args,{cwd:repo,encoding:'utf8',windowsHide:true});assert.equal(r.status,0,r.stderr);
  }
  const env={...process.env,BFS_STATE_HOME:path.join(root,'state'),CODEX_THREAD_ID:'coordinator'};
  return {root,repo,env,ctx:context(repo,env),catalog:loadCatalog()};
}
const graph=()=>({schema:1,planId:'parallel-plan',goal:'Build independent changes safely',acceptanceSource:'User-approved tasks/plan.md P01–P06',tasks:[
  {id:'a',goal:'First',dependsOn:[],writePaths:['src/a.mjs','tests/a.test.mjs'],inputs:['plan.md'],acceptance:['A works'],verification:['node --test tests/a.test.mjs']},
  {id:'b',goal:'Second',dependsOn:['a'],writePaths:['src/b.mjs'],inputs:['src/a.mjs'],acceptance:['B works'],verification:['node --test tests/b.test.mjs']}
]});

test('validate is read-only and rejects duplicate IDs, missing blockers, cycles and unsafe paths',t=>{
  const f=fixture(t),before=fs.existsSync(f.ctx.projectDir);
  const result=tasks(f.ctx,'validate',{plan:graph()},f.catalog);
  assert.equal(result.valid,true);assert.deepEqual(result.order,['a','b']);assert.equal(fs.existsSync(f.ctx.projectDir),before);
  for(const mutate of [p=>p.tasks[1].id='a',p=>p.tasks[1].dependsOn=['missing'],p=>p.tasks[0].dependsOn=['b'],p=>p.tasks[0].writePaths=['../outside'],p=>p.tasks[0].writePaths=['.git/config']]) {
    const bad=graph();mutate(bad);assert.throws(()=>tasks(f.ctx,'validate',{plan:bad},f.catalog));
  }
  const cycle=graph();cycle.tasks[0].dependsOn=['b'];assert.throws(()=>tasks(f.ctx,'validate',{plan:cycle},f.catalog),/a -> b -> a/);
  const overlap=graph();overlap.planId='serialized-plan';overlap.tasks[1].dependsOn=[];overlap.tasks[1].writePaths=['src/a.mjs'];assert.equal(tasks(f.ctx,'validate',{plan:overlap},f.catalog).valid,true);
  const ready=tasks(f.ctx,'create',{plan:overlap},f.catalog),rows=tasks(f.ctx,'status',{planId:ready.planId},f.catalog).tasks;
  assert.equal(rows[0].ready,true);assert.equal(rows[1].ready,false);assert.equal(rows[1].serializedBehind,'a');
  assert.equal(tasks(f.ctx,'list',{},f.catalog).find(row=>row.planId==='serialized-plan').status,'active');
  const sequential=graph();sequential.tasks[1].dependsOn=['a'];sequential.tasks[1].writePaths=['src/a.mjs'];assert.equal(tasks(f.ctx,'validate',{plan:sequential},f.catalog).valid,true);
});

test('create persists coordinator provenance and readiness waits for every dependency to integrate',t=>{
  const f=fixture(t),created=tasks(f.ctx,'create',{plan:graph()},f.catalog);
  assert.equal(created.planId,'parallel-plan');assert.equal(created.coordinatorTaskId,f.ctx.taskId);
  assert.equal(created.baseRevision,spawnSync('git',['rev-parse','HEAD'],{cwd:f.repo,encoding:'utf8'}).stdout.trim());
  let state=tasks(f.ctx,'status',{planId:'parallel-plan'},f.catalog);
  assert.deepEqual(state.tasks.map(row=>[row.id,row.status]),[['a','ready'],['b','blocked']]);
  if(process.platform==='win32'){
    assert.equal(tasks({...f.ctx,anchor:f.ctx.anchor.toLowerCase()},'status',{planId:'parallel-plan'},f.catalog).planId,'parallel-plan');
    assert.equal(tasks({...f.ctx,workspace:f.ctx.workspace.toLowerCase()},'adopt',{planId:'parallel-plan',confirm:'resume'},f.catalog).coordinatorTaskId,f.ctx.taskId);
  }
  assert.throws(()=>tasks(f.ctx,'create',{plan:graph()},f.catalog),'plan already exists');
  assert.throws(()=>tasks({...f.ctx,taskId:null},'create',{plan:graph()},f.catalog),/native task ID/);
  const file=path.join(f.ctx.projectDir,'task-plans','parallel-plan.json'),original=fs.readFileSync(file,'utf8');
  fs.writeFileSync(file,JSON.stringify({...JSON.parse(original),tasks:[null]}));assert.throws(()=>tasks(f.ctx,'status',{planId:'parallel-plan'},f.catalog),/Malformed stored task records/);
  fs.writeFileSync(file,original);
});

test('bind and record require the real isolated worktree, owner workflow and scoped clean commit',t=>{
  const f=fixture(t),plan=graph();plan.tasks=plan.tasks.slice(0,1);const stored=tasks(f.ctx,'create',{plan},f.catalog);
  const worktree=path.join(f.root,'worker'),added=spawnSync('git',['worktree','add','--quiet','-b','worker-a',worktree,stored.baseRevision],{cwd:f.repo,encoding:'utf8',windowsHide:true});assert.equal(added.status,0,added.stderr);
  const workerEnv={...f.env,CODEX_THREAD_ID:'worker-a'},worker=context(worktree,workerEnv);
  const run=workflow(worker,'start',{goal:'Implement task a',skills:['bfs-implement']},f.catalog);
  tasks(worker,'bind',{planId:plan.planId,taskId:'a',workflowId:run.id},f.catalog);
  const resumed=context(worktree,{...f.env,CODEX_THREAD_ID:'worker-a-resumed'});
  workflow(resumed,'adopt',{id:run.id,confirm:'resume'},f.catalog);
  tasks(resumed,'adopt',{planId:plan.planId,taskId:'a',workflowId:run.id,confirm:'resume'},f.catalog);
  assert.throws(()=>tasks(worker,'record',{planId:plan.planId,taskId:'a',summary:'forged',evidenceId:'forged'},f.catalog));
  spawnSync('git',['config','core.autocrlf','true'],{cwd:worktree,encoding:'utf8'});
  fs.writeFileSync(path.join(worktree,'plan.md'),'force checkout conversion\n');
  spawnSync('git',['checkout','--force','--','plan.md'],{cwd:worktree,encoding:'utf8'});
  assert.match(fs.readFileSync(path.join(worktree,'plan.md'),'utf8'),/\r\n/,'worker checkout should exercise CRLF conversion');
  assert.equal(spawnSync('git',['status','--porcelain'],{cwd:worktree,encoding:'utf8'}).stdout.trim(),'','CRLF conversion of a tracked input should remain clean');
  fs.mkdirSync(path.join(worktree,'src'));fs.mkdirSync(path.join(worktree,'tests'));fs.writeFileSync(path.join(worktree,'src','a.mjs'),'export const a = true;\n');
  fs.writeFileSync(path.join(worktree,'tests','a.test.mjs'),"import test from 'node:test'; import assert from 'node:assert/strict'; import {a} from '../src/a.mjs'; test('a',()=>assert.equal(a,true));\n");
  for(const args of [['add','src/a.mjs','tests/a.test.mjs'],['-c','user.name=Acceptance','-c','user.email=acceptance@localhost','commit','--quiet','-m','task a']]){
    const r=spawnSync('git',args,{cwd:worktree,encoding:'utf8',windowsHide:true});assert.equal(r.status,0,r.stderr);
  }
  const proof=delivery(resumed,'evidence',{workflowId:run.id,stage:'prepare',subject:{target:'task:a',sourceRevision:spawnSync('git',['rev-parse','HEAD'],{cwd:worktree,encoding:'utf8'}).stdout.trim(),provider:'local'},label:'Task a tests',files:['src/a.mjs','tests/a.test.mjs'],command:[process.execPath,'--test','tests/a.test.mjs']});
  workflow(resumed,'begin',{id:run.id,step:'1',inputs:['src/a.mjs','tests/a.test.mjs']},f.catalog);
  workflow(resumed,'step',{id:run.id,step:'1',status:'completed',summary:'Implemented a',evidence:[`delivery evidence ${proof.id}`]},f.catalog);
  const saved=tasks(resumed,'record',{planId:plan.planId,taskId:'a',summary:'Scoped task a commit',evidenceId:proof.id},f.catalog);
  assert.equal(saved.tasks[0].result.commit,spawnSync('git',['rev-parse','HEAD'],{cwd:worktree,encoding:'utf8'}).stdout.trim());
  assert.deepEqual(tasks(f.ctx,'status',{planId:plan.planId},f.catalog).tasks.map(row=>row.status),['recorded']);
  fs.writeFileSync(path.join(f.repo,'plan.md'),'modified without commit\n');
  assert.equal(tasks(f.ctx,'status',{planId:plan.planId},f.catalog).tasks[0].status,'stale','tracked input changes in the coordinator worktree must invalidate the recorded result');
});

test('only a completed coordinator check at the actual integrated HEAD unlocks dependent work',t=>{
  const f=fixture(t),plan=graph(),stored=tasks(f.ctx,'create',{plan},f.catalog);
  const worktree=path.join(f.root,'worker'),added=spawnSync('git',['worktree','add','--quiet','-b','worker-a',worktree,stored.baseRevision],{cwd:f.repo,encoding:'utf8',windowsHide:true});assert.equal(added.status,0,added.stderr);
  const worker=context(worktree,{...f.env,CODEX_THREAD_ID:'worker-a'}),run=workflow(worker,'start',{goal:'Implement task a',skills:['bfs-implement']},f.catalog);
  tasks(worker,'bind',{planId:plan.planId,taskId:'a',workflowId:run.id},f.catalog);
  fs.mkdirSync(path.join(worktree,'src'));fs.mkdirSync(path.join(worktree,'tests'));fs.writeFileSync(path.join(worktree,'src','a.mjs'),'export const a = true;\n');
  fs.writeFileSync(path.join(worktree,'tests','a.test.mjs'),"import test from 'node:test'; import assert from 'node:assert/strict'; import {a} from '../src/a.mjs'; test('a',()=>assert.equal(a,true));\n");
  for(const args of [['add','src/a.mjs','tests/a.test.mjs'],['-c','user.name=Acceptance','-c','user.email=acceptance@localhost','commit','--quiet','-m','task a']]){const r=spawnSync('git',args,{cwd:worktree,encoding:'utf8',windowsHide:true});assert.equal(r.status,0,r.stderr);}
  const workerProof=delivery(worker,'evidence',{workflowId:run.id,stage:'prepare',subject:{target:'task:a',sourceRevision:spawnSync('git',['rev-parse','HEAD'],{cwd:worktree,encoding:'utf8'}).stdout.trim(),provider:'local'},label:'Task a tests',files:['src/a.mjs','tests/a.test.mjs'],command:[process.execPath,'--test','tests/a.test.mjs']});
  workflow(worker,'begin',{id:run.id,step:'1',inputs:['src/a.mjs','tests/a.test.mjs']},f.catalog);workflow(worker,'step',{id:run.id,step:'1',status:'completed',summary:'done',evidence:[`delivery evidence ${workerProof.id}`]},f.catalog);
  const result=tasks(worker,'record',{planId:plan.planId,taskId:'a',summary:'task a',evidenceId:workerProof.id},f.catalog),merge=spawnSync('git',['merge','--no-ff','--quiet','worker-a','-m','integrate a'],{cwd:f.repo,encoding:'utf8',windowsHide:true});assert.equal(merge.status,0,merge.stderr);
  const checked=workflow(f.ctx,'start',{goal:'Verify integration',skills:['bfs-health']},f.catalog);workflow(f.ctx,'begin',{id:checked.id,step:'1',inputs:['src/a.mjs','tests/a.test.mjs']},f.catalog);
  const live=spawnSync('git',['rev-parse','HEAD'],{cwd:f.repo,encoding:'utf8'}).stdout.trim();
  const checkProof=delivery(f.ctx,'evidence',{workflowId:checked.id,stage:'integrate',subject:{target:'task:a',sourceRevision:live,provider:'local'},label:'Integrated task check',files:['src/a.mjs','tests/a.test.mjs'],command:[process.execPath,'--test','tests/a.test.mjs']});
  workflow(f.ctx,'step',{id:checked.id,step:'1',status:'completed',summary:'Integration checks pass',evidence:[`delivery evidence ${checkProof.id}`]},f.catalog);
  tasks(f.ctx,'integrate',{planId:plan.planId,taskId:'a',workflowId:checked.id,evidenceId:checkProof.id},f.catalog);
  const resumed=context(f.repo,{...f.env,CODEX_THREAD_ID:'coordinator-resumed'});
  tasks(resumed,'adopt',{planId:plan.planId,confirm:'resume'},f.catalog);
  assert.throws(()=>tasks(f.ctx,'integrate',{planId:plan.planId,taskId:'b',workflowId:checked.id,evidenceId:checkProof.id},f.catalog),/Only the plan coordinator/);
  assert.equal(tasks(resumed,'status',{planId:plan.planId},f.catalog).tasks.find(row=>row.id==='a').status,'integrated');
  assert.equal(tasks(resumed,'status',{planId:plan.planId},f.catalog).tasks.find(row=>row.id==='b').status,'ready');
  assert.equal(result.tasks[0].result.commit,spawnSync('git',['rev-parse','worker-a'],{cwd:f.repo,encoding:'utf8'}).stdout.trim());
  fs.writeFileSync(path.join(f.repo,'src','a.mjs'),'export const a = false;\n');
  for(const args of [['add','src/a.mjs'],['-c','user.name=Acceptance','-c','user.email=acceptance@localhost','commit','--quiet','-m','change integrated source']]){const r=spawnSync('git',args,{cwd:f.repo,encoding:'utf8',windowsHide:true});assert.equal(r.status,0,r.stderr);}
  const stale=tasks(resumed,'status',{planId:plan.planId},f.catalog).tasks;assert.equal(stale.find(row=>row.id==='a').status,'stale');assert.equal(stale.find(row=>row.id==='b').status,'blocked');
});

test('readiness closes when coordinator history no longer descends from the accepted base',t=>{
  const f=fixture(t);tasks(f.ctx,'create',{plan:graph()},f.catalog);
  const orphan=spawnSync('git',['checkout','--quiet','--orphan','unrelated'],{cwd:f.repo,encoding:'utf8',windowsHide:true});assert.equal(orphan.status,0,orphan.stderr);
  const clear=spawnSync('git',['rm','-rf','.'],{cwd:f.repo,encoding:'utf8',windowsHide:true});assert.equal(clear.status,0,clear.stderr);
  fs.writeFileSync(path.join(f.repo,'other.md'),'unrelated');
  for(const args of [['add','other.md'],['-c','user.name=Acceptance','-c','user.email=acceptance@localhost','commit','--quiet','-m','orphan']]){const r=spawnSync('git',args,{cwd:f.repo,encoding:'utf8',windowsHide:true});assert.equal(r.status,0,r.stderr);}
  const row=tasks(f.ctx,'status',{planId:'parallel-plan'},f.catalog).tasks[0];assert.equal(row.status,'blocked');assert.equal(row.ready,false);assert.match(row.reason,/no longer descends/);
});

test('independent overlapping scopes serialize without adding a dependency and rebase on current integration',t=>{
  const f=fixture(t),plan=graph();plan.tasks[1].dependsOn=[];plan.tasks[1].writePaths=['src/a.mjs','tests/a.test.mjs'];const stored=tasks(f.ctx,'create',{plan},f.catalog);
  const implement=({id,base,value})=>{
    const worktree=path.join(f.root,`worker-${id}`),branch=`worker-${id}`;
    const add=spawnSync('git',['worktree','add','--quiet','-b',branch,worktree,base],{cwd:f.repo,encoding:'utf8',windowsHide:true});assert.equal(add.status,0,add.stderr);
    const ctx=context(worktree,{...f.env,CODEX_THREAD_ID:branch}),run=workflow(ctx,'start',{goal:`Implement ${id}`,skills:['bfs-implement']},f.catalog);
    tasks(ctx,'bind',{planId:plan.planId,taskId:id,workflowId:run.id},f.catalog);
    fs.mkdirSync(path.join(worktree,'src'),{recursive:true});fs.mkdirSync(path.join(worktree,'tests'),{recursive:true});
    fs.writeFileSync(path.join(worktree,'src','a.mjs'),`export const a = ${value};\n`);
    fs.writeFileSync(path.join(worktree,'tests','a.test.mjs'),`import test from 'node:test'; import assert from 'node:assert/strict'; import {a} from '../src/a.mjs'; test('a',()=>assert.equal(a,${value}));\n`);
    for(const args of [['add','src/a.mjs','tests/a.test.mjs'],['-c','user.name=Acceptance','-c','user.email=acceptance@localhost','commit','--quiet','-m',`task ${id}`]]){const r=spawnSync('git',args,{cwd:worktree,encoding:'utf8',windowsHide:true});assert.equal(r.status,0,r.stderr);}
    const commit=spawnSync('git',['rev-parse','HEAD'],{cwd:worktree,encoding:'utf8'}).stdout.trim();
    const proof=delivery(ctx,'evidence',{workflowId:run.id,stage:'prepare',subject:{target:`task:${id}`,sourceRevision:commit,provider:'local'},label:`${id} tests`,files:['src/a.mjs','tests/a.test.mjs'],command:[process.execPath,'--test','tests/a.test.mjs']});
    workflow(ctx,'begin',{id:run.id,step:'1',inputs:['plan.md']},f.catalog);workflow(ctx,'step',{id:run.id,step:'1',status:'completed',summary:`${id} done`,evidence:[proof.id]},f.catalog);
    tasks(ctx,'record',{planId:plan.planId,taskId:id,summary:`${id} commit`,evidenceId:proof.id},f.catalog);return {worktree,commit};
  };
  const first=implement({id:'a',base:stored.baseRevision,value:'true'}),mergeA=spawnSync('git',['merge','--no-ff','--quiet','worker-a','-m','integrate a'],{cwd:f.repo,encoding:'utf8',windowsHide:true});assert.equal(mergeA.status,0,mergeA.stderr);
  const check=({id,target,paths:files})=>{
    const run=workflow(f.ctx,'start',{goal:`Check ${id} integration`,skills:['bfs-health']},f.catalog);workflow(f.ctx,'begin',{id:run.id,step:'1',inputs:files},f.catalog);
    const live=spawnSync('git',['rev-parse','HEAD'],{cwd:f.repo,encoding:'utf8'}).stdout.trim(),proof=delivery(f.ctx,'evidence',{workflowId:run.id,stage:'integrate',subject:{target,sourceRevision:live,provider:'local'},label:`${id} check`,files,command:[process.execPath,'--test','tests/a.test.mjs']});
    workflow(f.ctx,'step',{id:run.id,step:'1',status:'completed',summary:`${id} check pass`,evidence:[proof.id]},f.catalog);return {run,proof};
  };
  const checkedA=check({id:'a',target:'task:a',paths:['src/a.mjs','tests/a.test.mjs']});tasks(f.ctx,'integrate',{planId:plan.planId,taskId:'a',workflowId:checkedA.run.id,evidenceId:checkedA.proof.id},f.catalog);
  const rowsA=tasks(f.ctx,'status',{planId:plan.planId},f.catalog);assert.equal(rowsA.tasks.find(row=>row.id==='b').ready,true);assert.equal(rowsA.tasks.find(row=>row.id==='b').expectedBase,spawnSync('git',['rev-parse','HEAD'],{cwd:f.repo,encoding:'utf8'}).stdout.trim());
  const integrated=spawnSync('git',['rev-parse','HEAD'],{cwd:f.repo,encoding:'utf8'}).stdout.trim(),second=implement({id:'b',base:integrated,value:'false'});
  const mergeB=spawnSync('git',['merge','--no-ff','--quiet','worker-b','-m','integrate b'],{cwd:f.repo,encoding:'utf8',windowsHide:true});assert.equal(mergeB.status,0,mergeB.stderr);
  const checkedB=check({id:'b',target:'task:b',paths:['src/a.mjs','tests/a.test.mjs']});tasks(f.ctx,'integrate',{planId:plan.planId,taskId:'b',workflowId:checkedB.run.id,evidenceId:checkedB.proof.id},f.catalog);
  assert.deepEqual(tasks(f.ctx,'status',{planId:plan.planId},f.catalog).tasks.map(row=>row.status),['integrated','integrated']);
  assert.notEqual(first.commit,second.commit);
});
