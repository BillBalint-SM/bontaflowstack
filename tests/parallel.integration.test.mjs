import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { context } from '../plugins/bontaflowstack/core/state.mjs';
import { tasks } from '../plugins/bontaflowstack/core/tasks.mjs';
import { workflow } from '../plugins/bontaflowstack/core/workflow.mjs';
import { loadCatalog } from '../plugins/bontaflowstack/core/catalog.mjs';
import { delivery } from '../plugins/bontaflowstack/core/delivery.mjs';

function git(cwd, ...args) {
  const result = spawnSync('git', args, { cwd, encoding:'utf8', windowsHide:true });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}
function fixture(t, name='parallel', customize=()=>{}) {
  const root=fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()),`bfs-${name}-`));
  t.after(()=>{assert.equal(path.dirname(root),fs.realpathSync(os.tmpdir()));fs.rmSync(root,{recursive:true,force:true});});
  const repo=path.join(root,'repo');fs.mkdirSync(repo);
  fs.writeFileSync(path.join(repo,'README.md'),'parallel fixture\n');
  fs.mkdirSync(path.join(repo,'tests'));
  fs.writeFileSync(path.join(repo,'tests','combined.test.mjs'),"import assert from 'node:assert/strict';import fs from 'node:fs';assert.equal(fs.readFileSync(new URL('../src/b.txt',import.meta.url),'utf8').trim(),'b');assert.equal(fs.readFileSync(new URL('../src/c.txt',import.meta.url),'utf8').trim(),'c');console.log('B+C integrated check passed');\n");
  git(repo,'init','--quiet');
  git(repo,'config','user.name','Acceptance');git(repo,'config','user.email','acceptance@localhost');
  git(repo,'add','.');
  git(repo,'-c','user.name=Acceptance','-c','user.email=acceptance@localhost','commit','--quiet','-m','fixture base');
  const env={...process.env,BFS_STATE_HOME:path.join(root,'state'),CODEX_THREAD_ID:'coordinator'};
  const coordinator=context(repo,env);
  const plan={schema:1,planId:'parallel-journey',goal:'Build A, parallel B/C, then D',acceptanceSource:'Accepted P-N journey in tasks/plan.md',tasks:[
    {id:'a',goal:'Create shared foundation',dependsOn:[],writePaths:['src/a.txt','tests/a.test.mjs'],inputs:['README.md'],acceptance:['A exists'],verification:['node tests/a.test.mjs']},
    {id:'b',goal:'Implement independent B',dependsOn:['a'],writePaths:['src/b.txt','tests/b.test.mjs'],inputs:['src/a.txt'],acceptance:['B works'],verification:['node tests/b.test.mjs']},
    {id:'c',goal:'Implement independent C',dependsOn:['a'],writePaths:['src/c.txt','tests/c.test.mjs'],inputs:['src/a.txt'],acceptance:['C works'],verification:['node tests/c.test.mjs']},
    {id:'d',goal:'Integrate both paths',dependsOn:['b','c'],writePaths:['src/d.txt','tests/d.test.mjs'],inputs:['src/b.txt','src/c.txt'],acceptance:['D sees both results'],verification:['node tests/d.test.mjs']}
  ]};
  customize(plan);
  tasks(coordinator,'create',{plan},loadCatalog());
  return {root,repo,env,coordinator,plan,catalog:loadCatalog()};
}
function worker(f,id,base) {
  const folder=path.join(f.root,`worktree-${id}`);
  git(f.repo,'worktree','add','--quiet','-b',`worker-${id}`,folder,base);
  const ctx=context(folder,{...f.env,CODEX_THREAD_ID:`worker-${id}`});
  const run=workflow(ctx,'start',{goal:`Implement ${id}`,skills:['bfs-implement']},f.catalog);
  tasks(ctx,'bind',{planId:f.plan.planId,taskId:id,workflowId:run.id},f.catalog);
  return {folder,ctx,run};
}
function implement(f,id,{checkPass=true}={}) {
  const status=tasks(f.coordinator,'status',{planId:f.plan.planId},f.catalog);
  const slot=status.tasks.find(row=>row.id===id);
  assert.equal(slot.status,'ready',`${id} should be ready`);
  const w=worker(f,id,slot.expectedBase);
  fs.mkdirSync(path.join(w.folder,'src'),{recursive:true});fs.mkdirSync(path.join(w.folder,'tests'),{recursive:true});
  fs.writeFileSync(path.join(w.folder,`src/${id}.txt`),`${id}\n`);
  fs.writeFileSync(path.join(w.folder,`tests/${id}.test.mjs`),`import assert from 'node:assert/strict';import fs from 'node:fs';assert.equal(fs.readFileSync(new URL('../src/${id}.txt',import.meta.url),'utf8').trim(),'${id}');console.log('${id} check passed');\n`);
  git(w.folder,'add',`src/${id}.txt`,`tests/${id}.test.mjs`);
  git(w.folder,'-c','user.name=Acceptance','-c','user.email=acceptance@localhost','commit','--quiet','-m',`worker ${id}`);
  const files=[`src/${id}.txt`,`tests/${id}.test.mjs`];
  workflow(w.ctx,'begin',{id:w.run.id,step:'1',inputs:files},f.catalog);
  const proof=delivery(w.ctx,'evidence',{workflowId:w.run.id,stage:'prepare',subject:{target:`task:${id}`,sourceRevision:git(w.folder,'rev-parse','HEAD'),provider:'local'},label:`${id} worker check`,files,command:[process.execPath,`tests/${id}.test.mjs`]});
  if(checkPass)assert.equal(proof.status,'completed',proof.stderr);
  workflow(w.ctx,'step',{id:w.run.id,step:'1',status:checkPass?'completed':'failed',summary:`${id} actual worker check`,evidence:[`delivery evidence ${proof.id}`]},f.catalog);
  if(checkPass)tasks(w.ctx,'record',{planId:f.plan.planId,taskId:id,summary:`${id} scoped commit`,evidenceId:proof.id},f.catalog);
  return {...w,proof,files,commit:git(w.folder,'rev-parse','HEAD')};
}
function integrate(f,id,folder,files,{checkPass=true,extraFiles=[],commandFiles=[`tests/${id}.test.mjs`]}={}) {
  const merged=spawnSync('git',['merge','--no-ff','--quiet',`worker-${id}`,'-m',`integrate ${id}`],{cwd:f.repo,encoding:'utf8',windowsHide:true});
  assert.equal(merged.status,0,merged.stderr);
  const live=git(f.repo,'rev-parse','HEAD');
  const run=workflow(f.coordinator,'start',{goal:`Verify integration ${id}`,skills:['bfs-health']},f.catalog);
  const evidenceFiles=[...new Set([...files,...extraFiles])];
  workflow(f.coordinator,'begin',{id:run.id,step:'1',inputs:evidenceFiles},f.catalog);
  const command=[process.execPath,'-e','process.exit(1)'];
  const selectedCommand=checkPass?[process.execPath,...commandFiles]:command;
  const proof=delivery(f.coordinator,'evidence',{workflowId:run.id,stage:'integrate',subject:{target:`task:${id}`,sourceRevision:live,provider:'local'},label:`${id} integrated check`,files:evidenceFiles,command:selectedCommand});
  workflow(f.coordinator,'step',{id:run.id,step:'1',status:checkPass?'completed':'failed',summary:`${id} actual integration check`,evidence:[`delivery evidence ${proof.id}`]},f.catalog);
  if(checkPass){
    const row=tasks(f.coordinator,'status',{planId:f.plan.planId},f.catalog).tasks.find(item=>item.id===id);
    const saved=JSON.parse(fs.readFileSync(path.join(f.coordinator.projectDir,'task-plans',`${f.plan.planId}.json`),'utf8'));
    const result=saved.tasks.find(item=>item.id===id).result;
    const evidence=JSON.parse(fs.readFileSync(path.join(f.coordinator.projectDir,'workspaces',result.workspaceId,'evidence',`${result.evidenceId}.json`),'utf8'));
    assert.equal(row.status,'recorded',`Worker result became ${row.status}: ${JSON.stringify({row,result,evidence})}`);
    tasks(f.coordinator,'integrate',{planId:f.plan.planId,taskId:id,workflowId:run.id,evidenceId:proof.id},f.catalog);
  }
  else assert.throws(()=>tasks(f.coordinator,'integrate',{planId:f.plan.planId,taskId:id,workflowId:run.id,evidenceId:proof.id},f.catalog),/completed current coordinator verification/);
  return {proof,live};
}

test('A integrates first, B/C use separate real worktrees, and D is ready only after serial integration of both',t=>{
  const f=fixture(t);
  const a=implement(f,'a');integrate(f,'a',a.folder,a.files);
  const ready=tasks(f.coordinator,'status',{planId:f.plan.planId},f.catalog).tasks;
  assert.deepEqual(ready.map(row=>[row.id,row.status]),[['a','integrated'],['b','ready'],['c','ready'],['d','blocked']]);
  const b=implement(f,'b'),c=implement(f,'c');
  assert.notEqual(b.ctx.workspace,c.ctx.workspace);
  assert.notEqual(b.run.id,c.run.id);
  assert.notEqual(b.commit,c.commit);
  integrate(f,'b',b.folder,b.files);
  assert.equal(tasks(f.coordinator,'status',{planId:f.plan.planId},f.catalog).tasks.find(row=>row.id==='d').status,'blocked');
  integrate(f,'c',c.folder,c.files,{extraFiles:b.files,commandFiles:['tests/b.test.mjs','tests/c.test.mjs','tests/combined.test.mjs']});
  assert.equal(tasks(f.coordinator,'status',{planId:f.plan.planId},f.catalog).tasks.find(row=>row.id==='d').status,'ready');
  const slot=tasks(f.coordinator,'status',{planId:f.plan.planId},f.catalog).tasks.find(row=>row.id==='d');
  const d=worker(f,'d',slot.expectedBase);
  assert.equal(tasks(f.coordinator,'status',{planId:f.plan.planId},f.catalog).tasks.find(row=>row.id==='d').status,'bound');
  assert.equal(fs.readFileSync(path.join(f.repo,'src/b.txt'),'utf8').trim(),'b');
  assert.equal(fs.readFileSync(path.join(f.repo,'src/c.txt'),'utf8').trim(),'c');
  assert.ok(fs.existsSync(d.folder));
});

test('overlapping declared scopes serialize safely and the later task starts from the latest integrated HEAD',t=>{
  const f=fixture(t,'parallel-serialization',plan=>{
    plan.tasks.find(row=>row.id==='b').writePaths=['src','tests'];
    plan.tasks.find(row=>row.id==='c').writePaths=['src','tests'];
  });
  const a=implement(f,'a');integrate(f,'a',a.folder,a.files);
  const before=tasks(f.coordinator,'status',{planId:f.plan.planId},f.catalog).tasks;
  assert.equal(before.find(row=>row.id==='b').status,'ready');
  assert.equal(before.find(row=>row.id==='c').status,'blocked');
  assert.equal(before.find(row=>row.id==='c').serializedBehind,'b');
  const b=implement(f,'b');integrate(f,'b',b.folder,b.files);
  const live=git(f.repo,'rev-parse','HEAD');
  const afterB=tasks(f.coordinator,'status',{planId:f.plan.planId},f.catalog).tasks;
  assert.equal(afterB.find(row=>row.id==='c').status,'ready');
  assert.equal(afterB.find(row=>row.id==='c').expectedBase,live);
  const c=implement(f,'c');assert.equal(git(c.folder,'rev-parse','HEAD^'),live,`Serialized worker C commit must descend directly from current integration HEAD. live=${live}, workerParent=${git(c.folder,'rev-parse','HEAD^')}, status=${JSON.stringify(afterB.find(row=>row.id==='c'))}`);
  integrate(f,'c',c.folder,[...c.files,...b.files],{extraFiles:[],commandFiles:['tests/b.test.mjs','tests/c.test.mjs','tests/combined.test.mjs']});
  assert.equal(tasks(f.coordinator,'status',{planId:f.plan.planId},f.catalog).tasks.find(row=>row.id==='d').status,'ready');
});

test('an actual Git conflict blocks downstream work and preserves the recorded worker branch',t=>{
  const f=fixture(t,'parallel-conflict');
  const a=implement(f,'a');integrate(f,'a',a.folder,a.files);
  const b=implement(f,'b');
  fs.writeFileSync(path.join(f.repo,'src/b.txt'),'coordinator change\n');git(f.repo,'add','src/b.txt');
  git(f.repo,'-c','user.name=Acceptance','-c','user.email=acceptance@localhost','commit','--quiet','-m','conflicting coordinator edit');
  const failed=spawnSync('git',['merge','--no-ff','worker-b','-m','conflict'],{cwd:f.repo,encoding:'utf8',windowsHide:true});
  assert.notEqual(failed.status,0);
  git(f.repo,'merge','--abort');
  assert.equal(git(b.folder,'rev-parse','HEAD'),b.commit);
  const rows=tasks(f.coordinator,'status',{planId:f.plan.planId},f.catalog).tasks;
  assert.ok(['recorded','stale'].includes(rows.find(row=>row.id==='b').status));
  assert.equal(rows.find(row=>row.id==='d').status,'blocked');
  assert.equal(fs.readFileSync(path.join(b.folder,'src/b.txt'),'utf8').trim(),'b');
  assert.equal(fs.readFileSync(path.join(f.repo,'src/b.txt'),'utf8').trim(),'coordinator change');
});

test('a failed actual integration check keeps the worker result unintegrated and D blocked',t=>{
  const f=fixture(t,'parallel-check-failure');
  const a=implement(f,'a');integrate(f,'a',a.folder,a.files);
  const b=implement(f,'b'),c=implement(f,'c');
  integrate(f,'b',b.folder,b.files);
  const {proof}=integrate(f,'c',c.folder,c.files,{checkPass:false});
  assert.equal(proof.status,'failed');
  const rows=tasks(f.coordinator,'status',{planId:f.plan.planId},f.catalog).tasks;
  assert.equal(rows.find(row=>row.id==='c').status,'recorded');
  assert.equal(rows.find(row=>row.id==='d').status,'blocked');
  assert.equal(git(c.folder,'rev-parse','HEAD'),c.commit);
  assert.equal(fs.readFileSync(path.join(f.repo,'src/c.txt'),'utf8').trim(),'c');
});

test('dirty worker data is preserved and cannot be hidden by a successful commit',t=>{
  const f=fixture(t,'parallel-dirty');
  const a=implement(f,'a');integrate(f,'a',a.folder,a.files);
  const slot=tasks(f.coordinator,'status',{planId:f.plan.planId},f.catalog).tasks.find(row=>row.id==='b');
  const b=worker(f,'b',slot.expectedBase);
  fs.mkdirSync(path.join(b.folder,'src'),{recursive:true});fs.mkdirSync(path.join(b.folder,'tests'),{recursive:true});
  fs.writeFileSync(path.join(b.folder,'src/b.txt'),'b\n');
  fs.writeFileSync(path.join(b.folder,'tests/b.test.mjs'),"import assert from 'node:assert/strict';import fs from 'node:fs';assert.equal(fs.readFileSync(new URL('../src/b.txt',import.meta.url),'utf8').trim(),'b');console.log('b check passed');\n");
  fs.writeFileSync(path.join(b.folder,'USER-DATA.txt'),'keep this local note byte-for-byte\n');
  const userData=fs.readFileSync(path.join(b.folder,'USER-DATA.txt'));
  git(b.folder,'add','src/b.txt','tests/b.test.mjs');
  git(b.folder,'-c','user.name=Acceptance','-c','user.email=acceptance@localhost','commit','--quiet','-m','worker b');
  const files=['src/b.txt','tests/b.test.mjs'];
  workflow(b.ctx,'begin',{id:b.run.id,step:'1',inputs:files},f.catalog);
  const proof=delivery(b.ctx,'evidence',{workflowId:b.run.id,stage:'prepare',subject:{target:'task:b',sourceRevision:git(b.folder,'rev-parse','HEAD'),provider:'local'},label:'B tests',files,command:[process.execPath,'tests/b.test.mjs']});
  workflow(b.ctx,'step',{id:b.run.id,step:'1',status:'completed',summary:'B check passes; unrelated note remains dirty',evidence:[`delivery evidence ${proof.id}`]},f.catalog);
  assert.throws(()=>tasks(b.ctx,'record',{planId:f.plan.planId,taskId:'b',summary:'must reject dirty worktree',evidenceId:proof.id},f.catalog),/worktree must be clean/);
  assert.deepEqual(fs.readFileSync(path.join(b.folder,'USER-DATA.txt')),userData);
  assert.equal(tasks(f.coordinator,'status',{planId:f.plan.planId},f.catalog).tasks.find(row=>row.id==='b').status,'bound');
});

test('tasks CLI keeps JSON results on stdout and reports invalid plans with a failing exit',t=>{
  const f=fixture(t,'parallel-cli');
  const input=path.join(f.root,'plan.json');fs.writeFileSync(input,JSON.stringify({plan:f.plan}));
  const cli=path.resolve('plugins/bontaflowstack/core/cli.mjs');
  const env={...f.env};delete env.CODEX_THREAD_ID;
  const success=spawnSync(process.execPath,[cli,'tasks','validate','--input',input],{cwd:f.repo,env,encoding:'utf8',windowsHide:true});
  assert.equal(success.status,0,success.stderr);assert.equal(success.stderr,'');
  const body=JSON.parse(success.stdout);assert.equal(body.valid,true);assert.deepEqual(body.order,['a','b','c','d']);
  const invalid=structuredClone(f.plan);invalid.tasks[1].dependsOn=['missing'];fs.writeFileSync(input,JSON.stringify({plan:invalid}));
  const failure=spawnSync(process.execPath,[cli,'tasks','validate','--input',input],{cwd:f.repo,env,encoding:'utf8',windowsHide:true});
  assert.equal(failure.status,1);assert.equal(failure.stdout,'');
  assert.match(JSON.parse(failure.stderr).error,/Unknown dependency missing in b/);
});
