import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { context, atomicWrite, readJson, digest, within, noLinks } from '../plugins/bontaflowstack/core/state.mjs';
import { workflow, stopWorkflows } from '../plugins/bontaflowstack/core/workflow.mjs';
import { loadCatalog, pluginRoot } from '../plugins/bontaflowstack/core/catalog.mjs';
import { createFixtures, snapshot } from './acceptance-fixtures.mjs';

const catalog=loadCatalog();
function fixture(t) {
  const root=fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()),'bfs-reliability-'));
  const project=path.join(root,'project');fs.mkdirSync(project);
  const env={...process.env,BFS_STATE_HOME:path.join(root,'state'),CODEX_THREAD_ID:'fixture-task'};
  t.after(()=>{assert.equal(path.dirname(root),fs.realpathSync.native(os.tmpdir()));assert.match(path.basename(root),/^bfs-reliability-/);fs.rmSync(root,{recursive:true,force:true});});
  return {root,project,env,ctx:context(project,env)};
}
function cli(env,project,args,input={}) {
  const result=spawnSync(process.execPath,[path.join(pluginRoot,'core/cli.mjs'),...args,'--input','-'],{env,cwd:project,input:JSON.stringify(input),encoding:'utf8',windowsHide:true});
  return {...result,value:result.stdout?JSON.parse(result.stdout):null};
}

test('doctor keeps core usable without engines and explains requested capability recovery',t=>{
  const {project,env}=fixture(t);
  const core=cli(env,project,['doctor']);
  assert.equal(core.status,0);assert.equal(core.value.core.ready,true);
  assert.equal(core.value.core.status,'ready');
  assert.equal(core.value.platform,process.platform);assert.equal(core.value.arch,process.arch);
  if(process.platform==='linux')assert.ok(['glibc','unknown'].includes(core.value.libc));
  const browser=cli(env,project,['doctor','bfs-browse']);
  assert.equal(browser.status,1);assert.equal(browser.value.core.ready,true);
  assert.deepEqual(browser.value.missing,['browser']);
  const capability=browser.value.capabilities.browser;
  assert.equal(capability.ready,false);assert.equal(capability.status,'unavailable');
  assert.match(capability.reason,/not installed/);
  assert.match(capability.nextAction,/npx bontaflowstack@.* setup/);
});

test('QA settings survive storage, legacy reading and doctor without rewriting reads',t=>{
  const {ctx,project,env}=fixture(t);
  const row=workflow(ctx,'start',{goal:'Full repair',skills:[{skill:'bfs-qa',mode:'fix',coverage:'full'}]},catalog);
  assert.deepEqual([row.steps[0].mode,row.steps[0].coverage],['fix','full']);
  const file=path.join(ctx.workspaceDir,'workflows',`${row.id}.json`);
  assert.equal(workflow(ctx,'resume',{id:row.id},catalog).steps[0].coverage,'full');
  const ready=cli(env,project,['doctor','bfs-qa'],{mode:'fix',coverage:'full'});
  assert.equal(ready.status,1);assert.equal(ready.value.coverage,'full');assert.deepEqual(ready.value.missing,['browser']);
  for(const mode of ['quick','full','regression','diff','inspect','fix']) {
    const old={...row,steps:[{...row.steps[0],skill:mode==='full'?'qa':'bfs-qa',mode}]};delete old.steps[0].coverage;
    atomicWrite(file,old);const bytes=fs.readFileSync(file,'utf8');
    const saved=workflow(ctx,'resume',{id:row.id},catalog);
    assert.equal(saved.steps[0].skill,'bfs-qa');
    assert.equal(saved.steps[0].mode,mode==='fix'?'fix':'inspect');
    assert.equal(saved.steps[0].coverage,['inspect','fix'].includes(mode)?'quick':mode);
    assert.equal(fs.readFileSync(file,'utf8'),bytes);
  }
  assert.throws(()=>workflow(ctx,'start',{goal:'Conflict',skills:[{skill:'bfs-qa',mode:'full',coverage:'quick'}]},catalog),/Conflicting/);
  assert.throws(()=>workflow(ctx,'start',{goal:'Wrong skill',skills:[{skill:'bfs-health',coverage:'full'}]},catalog),/only supported/);
  for(const [coverage,key] of [['regression','baseline'],['diff','diffBase']]) {
    assert.throws(()=>workflow(ctx,'start',{goal:'Missing base',skills:[{skill:'bfs-qa',coverage}]},catalog),/baseline|base/);
    const saved=workflow(ctx,'start',{goal:'Comparison',skills:[{skill:'bfs-qa',coverage,[key]:'agreed-base'}]},catalog);
    assert.equal(workflow(ctx,'resume',{id:saved.id},catalog).steps[0][key],'agreed-base');
  }
  const legacyDoctor=cli(env,project,['doctor','bfs-qa'],{mode:'full'});
  assert.equal(legacyDoctor.value.mode,'inspect');assert.equal(legacyDoctor.value.coverage,'full');
});

test('all five routes accept later verified outputs and still detect external drift',t=>{
  const {ctx,project}=fixture(t);
  for(const route of Object.keys(catalog.workflows)) {
    fs.writeFileSync(path.join(project,'brief.md'),'stable approved input');
    fs.writeFileSync(path.join(project,'result.txt'),'initial');
    const row=workflow(ctx,'start',{goal:`Protocol probe ${route}`,route},catalog);
    for(const step of row.steps) {
      workflow(ctx,'begin',{id:row.id,step:step.id,inputs:['brief.md']},catalog);
      fs.writeFileSync(path.join(project,'result.txt'),`${route} verified revision ${step.id}`);
      workflow(ctx,'step',{id:row.id,step:step.id,status:'completed',summary:'Actual file read-back',outputs:['result.txt'],evidence:[fs.readFileSync(path.join(project,'result.txt'),'utf8')]},catalog);
    }
    const saved=workflow(ctx,'resume',{id:row.id},catalog);
    assert.equal(saved.status,'completed');assert.deepEqual(saved.drift,[]);
    assert.notEqual(saved.steps[0].outputs[0].sha256,saved.steps.at(-1).outputs[0].sha256);
    fs.writeFileSync(path.join(project,'result.txt'),'external modification');
    assert.equal(workflow(ctx,'resume',{id:row.id},catalog).drift.length,1);
    assert.throws(()=>workflow(ctx,'begin',{id:row.id,step:row.steps.at(-1).id},catalog),/stale/);
    fs.unlinkSync(path.join(project,'result.txt'));
    assert.equal(workflow(ctx,'resume',{id:row.id},catalog).drift.length,1);
  }
});

test('unverified repairs and changed stable inputs cannot replace evidence',t=>{
  const {ctx,project}=fixture(t);
  for(const status of ['failed','blocked','waiting','interrupted']) {
    fs.writeFileSync(path.join(project,'brief.md'),'stable');fs.writeFileSync(path.join(project,'result.txt'),'original');
    const row=workflow(ctx,'start',{goal:'Unverified repair',skills:['bfs-design-html','bfs-design-review','bfs-health']},catalog);
    workflow(ctx,'begin',{id:row.id,step:'1'},catalog);
    workflow(ctx,'step',{id:row.id,step:'1',status:'completed',summary:'Original checked',outputs:['result.txt'],evidence:['Read original fixture bytes']},catalog);
    workflow(ctx,'begin',{id:row.id,step:'2',inputs:['brief.md']},catalog);
    fs.writeFileSync(path.join(project,'result.txt'),'unverified repair');
    if(status==='interrupted') stopWorkflows(ctx);
    else workflow(ctx,'step',{id:row.id,step:'2',status,summary:'Not verified',outputs:['result.txt']},catalog);
    assert.equal(workflow(ctx,'resume',{id:row.id},catalog).drift.length,1);
    assert.throws(()=>workflow(ctx,'begin',{id:row.id,step:'3'},catalog),/unresolved/);
    workflow(ctx,'begin',{id:row.id,step:'1'},catalog);
    const reset=workflow(ctx,'resume',{id:row.id},catalog);
    assert.equal(reset.steps[1].status,'pending');assert.ok(reset.steps[1].history.length);
  }
});

test('read returns HOST once for a chat hash and reloads on mismatch or a new chat',t=>{
  const {env,project}=fixture(t);
  const first=cli(env,project,['read','bfs-implement']).value;
  assert.ok(first.host);assert.match(first.hostSha256,/^[a-f0-9]{64}$/);
  const second=cli(env,project,['read','bfs-health'],{knownHostSha256:first.hostSha256}).value;
  const third=cli(env,project,['read','bfs-review'],{knownHostSha256:first.hostSha256}).value;
  assert.equal(second.host,undefined);assert.equal(third.host,undefined);assert.ok(third.instructions);
  assert.ok(cli(env,project,['read','bfs-health'],{knownHostSha256:'0'.repeat(64)}).value.host);
  assert.ok(cli(env,project,['read','bfs-health']).value.host);
  assert.equal(cli(env,project,['read','bfs-health'],{knownHostSha256:'invalid'}).status,1);
});

test('manual fixture snapshots preserve custom content and exclude only runtime evidence',t=>{
  const {root}=fixture(t), folder=path.join(root,'cases');createFixtures(folder);
  const project=path.join(folder,'setup-existing'), initial=snapshot(project);
  assert.match(fs.readFileSync(path.join(project,'AGENTS.md'),'utf8'),/CUSTOM-RULE-123/);
  fs.mkdirSync(path.join(project,'.bfs-state'));fs.writeFileSync(path.join(project,'.bfs-state','runtime.json'),'{}');
  assert.deepEqual(snapshot(project),initial);
  fs.appendFileSync(path.join(project,'USER-NOTE.txt'),'changed');assert.notDeepEqual(snapshot(project),initial);
});

test('documented local removal keeps other projects and shared engines',t=>{
  const {root,env,ctx}=fixture(t),otherProject=path.join(root,'other-project');fs.mkdirSync(otherProject);
  const other=context(otherProject,env),profileBase=path.join(root,'test-user','.bontaflowstack','browser-profiles');
  const profiles=[ctx,other].map(c=>path.join(profileBase,digest(path.resolve(c.workspaceDir,'engine-sessions',c.taskId,'own-engine').toLowerCase())));
  for(const [i,c] of [ctx,other].entries()) {
    atomicWrite(path.join(c.projectDir,'memory.json'),{schema:1,records:[]});
    atomicWrite(path.join(c.workspaceDir,'tasks',`${c.taskId}.guard.json`),{schema:1,warnings:false,boundary:null});
    fs.mkdirSync(profiles[i],{recursive:true});fs.writeFileSync(path.join(profiles[i],'fixture.txt'),'isolated profile-shaped fixture');
  }
  atomicWrite(path.join(ctx.home,'engines.json'),{fixture:true});
  fs.mkdirSync(path.join(ctx.home,'engines'));fs.writeFileSync(path.join(ctx.home,'engines','fixture.txt'),'shared installation');
  const before=snapshot(other.projectDir),registration=fs.readFileSync(path.join(ctx.home,'engines.json'),'utf8');
  fs.cpSync(ctx.projectDir,path.join(root,'backup'),{recursive:true});
  assert.ok(fs.existsSync(path.join(root,'backup','memory.json')));
  for(const target of [ctx.projectDir,profiles[0]]) {
    assert.ok(within(root,target));noLinks(target);assert.match(path.basename(target),/^[a-f0-9]{64}$/);
    fs.rmSync(target,{recursive:true});
  }
  assert.equal(fs.existsSync(ctx.projectDir),false);assert.equal(fs.existsSync(profiles[0]),false);
  assert.deepEqual(snapshot(other.projectDir),before);assert.ok(fs.existsSync(profiles[1]));
  assert.equal(fs.readFileSync(path.join(ctx.home,'engines.json'),'utf8'),registration);
  assert.equal(fs.readFileSync(path.join(ctx.home,'engines','fixture.txt'),'utf8'),'shared installation');
});
