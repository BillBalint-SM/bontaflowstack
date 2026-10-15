import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { context, atomicWrite, readJson, changeJson, digest, fingerprints } from '../plugins/bontaflowstack/core/state.mjs';
import { workflow, stopWorkflows } from '../plugins/bontaflowstack/core/workflow.mjs';
import { memory, preferences } from '../plugins/bontaflowstack/core/memory.mjs';
import { guard, preTool, classify } from '../plugins/bontaflowstack/core/guard.mjs';
import { delivery, versionNext } from '../plugins/bontaflowstack/core/delivery.mjs';
import { engines } from '../plugins/bontaflowstack/core/engines.mjs';
import { issueCall } from '../plugins/bontaflowstack/core/call-binding.mjs';
import { checkLocalLinks } from '../scripts/check.mjs';
import { loadCatalog, resolveSkill, pluginRoot } from '../plugins/bontaflowstack/core/cli.mjs';

const catalog = loadCatalog();

test('PowerShell literal parser refuses variable and subexpression arguments', {skip:process.platform!=='win32'}, t=>{
  const {project}=fixture(t);
  for(const command of ['git $args','git "$(Get-Location)"'])assert.equal(classify(command,project,project,'powershell')?.decision,'ask');
  assert.equal(classify('git log --oneline',project,project,'powershell'),null);
});

test('guard does not certify an unknown shell as PowerShell or Bash', t => {
  const {project}=fixture(t);
  for(const shell of ['/bin/zsh','/bin/sh','/usr/bin/fish','unrecognized']) {
    const decision=classify('git status --short',project,project,shell);
    assert.equal(decision?.decision,'ask',shell);
    assert.match(decision.reason,/shell/i);
  }
  assert.equal(classify('git status --short',project,project,'/bin/bash'),null);
});

test('state roots follow the native platform and reject a relative override', t => {
  const {project,root,env}=fixture(t);
  const nativeEnv={...env,LOCALAPPDATA:path.join(root,'local'),XDG_STATE_HOME:path.join(root,'xdg-state')};
  delete nativeEnv.BFS_STATE_HOME;
  const result=context(project,nativeEnv);
  const expected=process.platform==='win32' ? path.join(nativeEnv.LOCALAPPDATA,'BontaFlowStack','state','v2')
    : process.platform==='linux' ? path.join(nativeEnv.XDG_STATE_HOME,'bontaflowstack','state','v2')
    : path.join(os.homedir(),'Library','Application Support','BontaFlowStack','state','v2');
  assert.equal(result.home,expected);
  assert.equal(fs.existsSync(result.home),false,'reading must not initialize state');
  assert.throws(()=>context(project,{...env,BFS_STATE_HOME:'relative-state'}),/absolute/);
  if(process.platform==='linux') {
    for(const value of ['', 'relative-xdg']) assert.equal(context(project,{...nativeEnv,XDG_STATE_HOME:value}).home,path.join(os.homedir(),'.local/state/bontaflowstack/state/v2'));
  }
});

test('private state creation preserves POSIX directory and file permissions', {skip:process.platform==='win32'}, t => {
  const {root,ctx}=fixture(t),directory=path.join(root,'private','nested'),file=path.join(directory,'state.json');
  const existing=path.join(root,'existing');fs.mkdirSync(existing,{mode:0o755});
  atomicWrite(file,{value:'private'});
  assert.equal(fs.statSync(directory).mode & 0o777,0o700);
  assert.equal(fs.statSync(path.dirname(directory)).mode & 0o777,0o700);
  assert.equal(fs.statSync(file).mode & 0o777,0o600);
  atomicWrite(path.join(existing,'state.json'),{value:'preserved directory'});
  assert.equal(fs.statSync(existing).mode & 0o777,0o755,'existing directories must not be chmodded');
  issueCall({...ctx,host:'copilot-cli',sessionId:'native-session',agentId:'native-agent'},'status',{});
  assert.equal(fs.statSync(path.join(ctx.home,'copilot-cli','calls')).mode & 0o777,0o700);
});
function hookCommand(event = 'PreToolUse') {
  const hook = readJson(path.join(pluginRoot,'hooks/hooks.json')).hooks[event][0].hooks[0];
  assert.match(hook.command,/^node /);
  return process.platform==='win32'
    ? ['powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-Command',hook.commandWindows.match(/ -Command "(.+)"$/)[1]]]
    : ['/bin/sh',['-c',hook.command]];
}

test('POSIX hook commands retain context and interrupted workflow contracts', {skip:process.platform==='win32'}, t => {
  const {ctx,project,env}=fixture(t),hooks=readJson(path.join(pluginRoot,'hooks/hooks.json')).hooks;
  const invoke=(event,input)=>spawnSync('/bin/sh',['-c',hooks[event][0].hooks[0].command],{
    cwd:project,env:{...env,PLUGIN_ROOT:pluginRoot,PATH:`${path.dirname(process.execPath)}${path.delimiter}${env.PATH || ''}`},
    input:JSON.stringify({cwd:project,session_id:ctx.taskId,hook_event_name:event,...input}),encoding:'utf8',timeout:10000});
  assert.match(hooks.PreToolUse[0].hooks[0].command,/^node /);
  const pre=invoke('PreToolUse',{tool_name:'Bash',tool_input:{command:'git status --short'}});
  assert.equal(pre.status,0,pre.stderr);
  assert.match(JSON.parse(pre.stdout).hookSpecificOutput.additionalContext,/BFS_GUARD_OBSERVED/);
  const work=workflow(ctx,'start',{goal:'POSIX interruption fixture',skills:['bfs-spec']},catalog);
  workflow(ctx,'begin',{id:work.id,step:'1'},catalog);
  const stop=invoke('Stop',{});
  assert.equal(stop.status,0,stop.stderr);
  assert.deepEqual(JSON.parse(stop.stdout),{});
  assert.equal(workflow(ctx,'resume',{id:work.id},catalog).steps[0].status,'interrupted');
});
function fixture(t) {
  const root = fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()),'bfs-core-'));
  const project = path.join(root,'project'); fs.mkdirSync(project);
  const env = { ...process.env, BFS_STATE_HOME:path.join(root,'state'), CODEX_THREAD_ID:'fixture-task' };
  const ctx = context(project,env);
  t.after(() => {
    assert.equal(path.dirname(root),fs.realpathSync(os.tmpdir()));
    assert.match(path.basename(root),/^bfs-core-/);
    fs.rmSync(root,{recursive:true,force:true});
  });
  return {root,project,env,ctx};
}
const expected = catalog.skills.map(s=>s.id);

function contextCommand(fixture, command = ['context','show']) {
  const result=spawnSync(process.execPath,[path.join(pluginRoot,'core/cli.mjs'),...command],{cwd:fixture.project,env:fixture.env,encoding:'utf8',windowsHide:true});
  assert.equal(result.status,0,result.stderr);
  return JSON.parse(result.stdout);
}

test('essential context retains fact and plan revisions while retiring completed or discarded records', t => {
  const f=fixture(t),{ctx,project}=f;
  fs.writeFileSync(path.join(project,'spec.md'),'First accepted plan');
  const first=memory(ctx,'put',{kind:'fact',key:'handoff',text:'Preserve headers and storage.',details:'Full fixture rationale retained outside the short context.',source:'user-stated',sourceRef:'Fixture user message',files:['spec.md']});
  const revision={kind:'fact',key:'handoff',text:'Preserve headers, storage and tabs.',source:'user-stated',sourceRef:'Later fixture user message',expectedId:first.id,files:['spec.md'],operationId:'update-handoff'};
  const changed=memory(ctx,'put',revision);
  assert.equal(memory(ctx,'put',revision).id,changed.id);
  assert.throws(()=>memory(ctx,'put',{...revision,workflowId:'other-work'}),/different/);
  assert.throws(()=>memory(ctx,'put',{...revision,operationId:'invalid-files',files:'spec.md'}),/array/);
  assert.throws(()=>memory(ctx,'put',{kind:'fact',key:'handoff',text:'Stale overwrite',source:'user-stated',expectedId:first.id}),/changed/);
  assert.deepEqual(memory(ctx,'history',{kind:'fact',key:'handoff'}).map(row=>row.text),[first.text,changed.text]);
  const plan=memory(ctx,'put',{kind:'plan',key:'delivery',text:'Deliver the selected change.',source:'user-stated',document:'spec.md'});
  fs.writeFileSync(path.join(project,'spec.md'),'A later changed plan');
  assert.equal(memory(ctx,'history',{kind:'plan',key:'delivery'})[0].details,'First accepted plan');
  assert.match(memory(ctx,'export').markdown,/First accepted plan/);
  fs.writeFileSync(path.join(project,'spec.md'),'First accepted plan');
  assert.ok(contextCommand(f).items.some(row=>row.id===changed.id));
  const closure={kind:'plan',key:'delivery',status:'completed',expectedId:plan.id,reason:'Fixture verification completed.',operationId:'complete-delivery'};
  const completed=memory(ctx,'status',closure);
  assert.equal(memory(ctx,'status',closure).id,completed.id);
  assert.throws(()=>memory(ctx,'status',{...closure,reason:'Different reason'}),/different/);
  memory(ctx,'status',{kind:'fact',key:'handoff',status:'discarded',expectedId:changed.id,reason:'Fixture user discarded this direction.'});
  assert.deepEqual(contextCommand(f).items,[]);
  assert.equal(memory(ctx,'history',{kind:'fact',key:'handoff'})[0].details,first.details);
  assert.equal(memory(ctx,'history',{kind:'plan',key:'delivery'}).at(-1).status,'completed');
});

test('skill reads include bounded essential context and identify changed source facts without erasing history', t => {
  const f=fixture(t),{ctx,project}=f;
  assert.equal(contextCommand(f).items.length,0);
  assert.equal(fs.existsSync(ctx.home),false);
  fs.writeFileSync(path.join(project,'spec.md'),'accepted version');
  const fact=memory(ctx,'put',{kind:'fact',key:'source',text:'The accepted source uses version one.',source:'observed',sourceRef:'Read spec.md',files:['spec.md']});
  for(let i=0;i<20;i++)memory(ctx,'put',{kind:'decision',key:'choice-'+i,text:'Essential choice '+i+' '+'.'.repeat(1000),source:'user-stated'});
  const read=contextCommand(f,['read','bfs-spec']);
  assert.equal(read.context.authorizesActions,false);
  assert.ok(read.context.items.length<=12);
  assert.ok(read.context.omitted.items>0);
  assert.ok(JSON.stringify(read.context).length<12000);
  for(let i=0;i<4;i++) {
    const work=workflow(ctx,'start',{goal:'Long journey '+i+' '+'.'.repeat(2000),skills:['bfs-spec']},catalog);
    workflow(ctx,'save',{goal:work.goal,workflowId:work.id,summary:'.'.repeat(5000),decisions:Array(10).fill('.'.repeat(2000)),remaining:Array(10).fill('.'.repeat(2000))},catalog);
  }
  assert.ok(JSON.stringify(contextCommand(f)).length<12000,'combined facts and journeys must remain bounded');
  fs.writeFileSync(path.join(project,'spec.md'),'changed version');
  const current=contextCommand(f);
  assert.ok(!current.items.some(row=>row.id===fact.id));
  assert.ok(current.stale.some(row=>row.id===fact.id));
  assert.equal(memory(ctx,'history',{kind:'fact',key:'source'})[0].text,fact.text);
});

test('native context refreshes on changes, clears retired data and preserves guard behavior on corrupt memory', t => {
  const {ctx,project}=fixture(t);
  const item=memory(ctx,'put',{kind:'decision',key:'direction',text:'Fixture selected direction.',source:'user-stated'});
  const event={hook_event_name:'PreToolUse',session_id:ctx.taskId,cwd:project,tool_name:'functions.exec_command',tool_input:{cmd:'git status'}};
  assert.match(preTool(ctx,event).hookSpecificOutput.additionalContext,/BFS_CONTEXT_DATA/);
  assert.doesNotMatch(preTool(ctx,event).hookSpecificOutput.additionalContext,/BFS_CONTEXT_DATA/);
  memory(ctx,'status',{kind:'decision',key:'direction',status:'discarded',expectedId:item.id,reason:'Fixture cancellation.'});
  const cleared=preTool(ctx,event).hookSpecificOutput.additionalContext;
  assert.match(cleared,/BFS_CONTEXT_DATA/);
  assert.doesNotMatch(cleared,/Fixture selected direction/);
  fs.writeFileSync(path.join(ctx.projectDir,'memory.json'),'{invalid');
  const failed=preTool(ctx,event).hookSpecificOutput;
  assert.match(failed.additionalContext,/BFS_CONTEXT_UNAVAILABLE/);
  assert.equal(failed.permissionDecision,undefined);
});

test('paused work survives another task and resumes with complete saved state and drift checks', t => {
  const f=fixture(t),{ctx,project,env}=f;
  fs.writeFileSync(path.join(project,'spec.md'),'accepted version');
  const first=workflow(ctx,'start',{goal:'Original delivery',skills:['bfs-spec','bfs-implement','bfs-health']},catalog);
  workflow(ctx,'begin',{id:first.id,step:'1'},catalog);
  workflow(ctx,'step',{id:first.id,step:'1',status:'completed',summary:'Accepted fixture spec',evidence:['Read fixture spec'],outputs:['spec.md'],decisions:['Fixture accepted this exact specification']},catalog);
  workflow(ctx,'begin',{id:first.id,step:'2',inputs:['spec.md']},catalog);
  const paused=workflow(ctx,'pause',{id:first.id,summary:'Implementation paused with the agreed spec.',remaining:['Implement the agreed output'],files:['spec.md']},catalog);
  assert.equal(paused.status,'paused');
  const snapshot=workflow(ctx,'resume',{id:paused.checkpointId},catalog);
  assert.equal(snapshot.workflowId,first.id);
  assert.equal(snapshot.workflow.steps[0].decisions[0],'Fixture accepted this exact specification');
  assert.deepEqual(snapshot.remaining,['Implement the agreed output']);
  assert.equal(workflow(ctx,'pause',{id:first.id,summary:'Saved the same paused work again.'},catalog).status,'paused');
  const other=context(project,{...env,CODEX_THREAD_ID:'another-task'});
  const second=workflow(other,'start',{goal:'Other review',skills:['bfs-review']},catalog);
  workflow(other,'begin',{id:second.id,step:'1'},catalog);
  workflow(other,'step',{id:second.id,step:'1',status:'completed',summary:'Other work checked',evidence:['Fixture review result']},catalog);
  assert.equal(workflow(other,'resume',{id:first.id},catalog).status,'paused');
  assert.ok(contextCommand(f).work.some(row=>row.id===first.id && row.status==='paused'));
  assert.ok(!contextCommand(f).work.some(row=>row.id===second.id));
  fs.writeFileSync(path.join(project,'spec.md'),'changed version');
  assert.equal(workflow(other,'resume',{id:first.id},catalog).drift.length,1);
  assert.equal(workflow(other,'adopt',{id:first.id,confirm:'resume'},catalog).status,'running');
  assert.throws(()=>workflow(other,'begin',{id:first.id,step:'2'},catalog),/stale/);
  fs.writeFileSync(path.join(project,'spec.md'),'accepted version');
  workflow(other,'begin',{id:first.id,step:'2',inputs:['spec.md']},catalog);
  workflow(other,'step',{id:first.id,step:'2',status:'completed',summary:'Original work delivered',evidence:['Fixture acceptance checked']},catalog);
  assert.equal(contextCommand(f).work.find(row=>row.id===first.id).summary,'Original work delivered');
  assert.deepEqual(contextCommand(f).work.find(row=>row.id===first.id).remaining,['bfs-health']);
  workflow(other,'begin',{id:first.id,step:'3'},catalog);
  workflow(other,'step',{id:first.id,step:'3',status:'completed',summary:'Checks passed',evidence:['Fixture final check']},catalog);
  assert.ok(!contextCommand(f).work.some(row=>row.id===first.id));
  assert.ok(!contextCommand(f).checkpoints.some(row=>row.workflowId===first.id));
  assert.equal(workflow(other,'resume',{id:paused.checkpointId},catalog).workflow.steps[0].decisions[0],'Fixture accepted this exact specification');
  const abandoned=workflow(other,'start',{goal:'Discarded direction',skills:['bfs-spec']},catalog);
  workflow(other,'discard',{id:abandoned.id,summary:'Fixture user discarded the direction.'},catalog);
  assert.ok(!contextCommand(f).work.some(row=>row.id===abandoned.id));
  assert.throws(()=>workflow(other,'begin',{id:abandoned.id,step:'1'},catalog),/discarded/i);
});

test('catalog exposes exactly the selected skills and preserves alias modes', () => {
  assert.deepEqual(fs.readdirSync(path.join(pluginRoot,'skills')).sort(),[...expected].sort());
  for (const skill of catalog.skills) {
    for (const target of skill.handoffs) assert.ok(expected.includes(target), `${skill.id} -> ${target}`);
    const file = path.join(pluginRoot,'skills',skill.id,'SKILL.md');
    const body = fs.readFileSync(file,'utf8');
    assert.ok(body.startsWith(`---\nname: ${skill.id}\n`));
    checkLocalLinks(file);
  }
  for (const name of Object.keys(catalog.aliases)) assert.ok(expected.includes(resolveSkill(name).id));
  assert.equal(resolveSkill('qa-only').mode,'inspect');
  assert.equal(resolveSkill('unfreeze').mode,'release');
  assert.equal(resolveSkill('bfs implement').id,'bfs-implement');
  assert.equal(resolveSkill('$bfs-router').id,'bfs-router');
  assert.equal(resolveSkill('$bfs-business-builder').id,'bfs-business-builder');
  assert.equal(resolveSkill('bfs-driver').id,'bfs-router');
  assert.equal(resolveSkill('business-driver').id,'bfs-business-builder');
  assert.throws(()=>resolveSkill('skillify'),/removed/);
});

test('implementation records an accepted basis, preserves waiting and detects changed inputs', t => {
  const {ctx,project}=fixture(t);
  fs.writeFileSync(path.join(project,'spec.md'),'Return the agreed greeting.');
  const started=workflow(ctx,'start',{goal:'Implement the greeting',route:'implementation'},catalog);
  assert.deepEqual(started.steps.map(step=>step.skill),['bfs-implement','bfs-health','bfs-review']);
  assert.equal(started.steps[0].mode,'implement');
  workflow(ctx,'begin',{id:started.id,step:'1',inputs:['spec.md']},catalog);
  workflow(ctx,'step',{id:started.id,step:'1',status:'waiting',summary:'Awaiting user acceptance of spec.md'},catalog);
  assert.equal(stopWorkflows(ctx).changed,0);
  assert.throws(()=>workflow(ctx,'begin',{id:started.id,step:'2'},catalog),/unresolved/);
  // Fixture data exercises storage, not authentication of a real user decision.
  const acceptance=workflow(ctx,'save',{goal:'Implement the greeting',summary:'Accepted greeting specification',decisions:['Fixture user: implement this version of spec.md'],files:['spec.md']},catalog);
  assert.equal(acceptance.files[0].sha256,digest('Return the agreed greeting.'));
  workflow(ctx,'begin',{id:started.id,step:'1',inputs:['spec.md']},catalog);
  fs.writeFileSync(path.join(project,'greeting.txt'),'Hello');
  workflow(ctx,'step',{id:started.id,step:'1',status:'completed',summary:'Greeting implemented',evidence:['Read greeting.txt: Hello'],outputs:['greeting.txt'],decisions:['Acceptance checkpoint: '+acceptance.id]},catalog);
  workflow(ctx,'begin',{id:started.id,step:'2'},catalog);
  fs.writeFileSync(path.join(project,'spec.md'),'Return a different greeting.');
  const resumed=workflow(ctx,'resume',{id:started.id},catalog);
  assert.ok(resumed.drift.some(change=>change.path==='spec.md'));
  assert.equal(resumed.steps[0].decisions[0],'Acceptance checkpoint: '+acceptance.id);
});

test('read-only operations do not initialize state and separate same-name projects', t => {
  const {root,env,ctx}=fixture(t);
  assert.deepEqual(memory(ctx,'list'),[]);
  assert.equal(preferences(ctx,'inspect').enabled,false);
  assert.deepEqual(workflow(ctx,'list',{},catalog),[]);
  assert.equal(engines(ctx,'status').installed,false);
  assert.equal(fs.existsSync(ctx.home),false);
  const other=path.join(root,'other','project'); fs.mkdirSync(other,{recursive:true});
  assert.notEqual(context(other,env).projectId,ctx.projectId);
  assert.equal(ctx.git,false);
});

test('workflow checkpoints bind file content, stop at stale inputs and resume in a new task', t => {
  const {ctx,project,env}=fixture(t);
  fs.writeFileSync(path.join(project,'brief.md'),'version one');
  const started=workflow(ctx,'start',{goal:'Specify the offer',skills:['bfs-business-builder','bfs-spec']},catalog);
  workflow(ctx,'begin',{id:started.id,step:'1',inputs:['brief.md']},catalog);
  workflow(ctx,'step',{id:started.id,step:'1',status:'completed',summary:'Brief checked',evidence:['Read the supplied brief and checked target audience'],outputs:['brief.md']},catalog);
  const resumed=workflow(context(project,{...env,CODEX_THREAD_ID:'next-task'}),'resume',{id:started.id},catalog);
  assert.equal(resumed.requiresAdoption,true); assert.deepEqual(resumed.drift,[]);
  fs.writeFileSync(path.join(project,'brief.md'),'version two');
  assert.throws(()=>workflow(ctx,'begin',{id:started.id,step:'2'},catalog),/stale/);
  assert.equal(workflow(ctx,'resume',{id:started.id},catalog).drift.length,1);
  const snapshot=workflow(ctx,'save',{goal:'Specify the offer',summary:'Saved draft',files:['brief.md'],remaining:['Review change']},catalog);
  assert.equal(readJson(snapshot.file).files[0].sha256,digest('version two'));
});

test('a changed input cannot be certified as a completed step', t => {
  const {ctx,project}=fixture(t);
  fs.writeFileSync(path.join(project,'code.js'),'one');
  const started=workflow(ctx,'start',{goal:'Review',skills:['bfs-review']},catalog);
  workflow(ctx,'begin',{id:started.id,step:'1',inputs:['code.js']},catalog);
  fs.writeFileSync(path.join(project,'code.js'),'two');
  assert.throws(()=>workflow(ctx,'step',{id:started.id,step:'1',status:'completed',summary:'Reviewed',evidence:['Observed the prior content']},catalog),/Inputs changed/);
  assert.equal(workflow(ctx,'resume',{id:started.id},catalog).steps[0].status,'running');
});

test('reopening a step invalidates downstream results and preserves selected modes and history', t => {
  const f=fixture(t),{ctx}=f;
  const started=workflow(ctx,'start',{goal:'Inspect then document',skills:[{skill:'bfs-qa',mode:'inspect'},'bfs-documentation']},catalog);
  for(const step of ['1','2']) {
    workflow(ctx,'begin',{id:started.id,step},catalog);
    workflow(ctx,'step',{id:started.id,step,status:'completed',summary:'Verified fixture result',evidence:['Test fixture completion'],decisions:['Prior fixture alternative '+step]},catalog);
  }
  workflow(ctx,'save',{workflowId:started.id,goal:started.goal,summary:'Historical completed work',decisions:['Prior snapshot alternative']},catalog);
  const reopened=workflow(ctx,'begin',{id:started.id,step:'1'},catalog);
  assert.equal(reopened.steps[0].mode,'inspect');
  assert.equal(reopened.steps[1].status,'pending');
  assert.equal(reopened.steps[1].history[0].status,'completed');
  assert.deepEqual(reopened.steps[1].history[0].decisions,['Prior fixture alternative 2']);
  assert.deepEqual(contextCommand(f).work[0].decisions,[]);
  assert.equal(contextCommand(f).work[0].summary,'');
  assert.equal(reopened.status,'running');
});

test('legacy context imports preserve bytes and never import permissions', t => {
  const {ctx,root}=fixture(t);
  const file=path.join(root,'old.md'), original='# Prior work\nDeployment was discussed.';
  fs.writeFileSync(file,original);
  assert.equal(workflow(ctx,'import-legacy',{file},catalog).preview,true);
  const result=workflow(ctx,'import-legacy',{file,goal:'Resume review',confirm:'import'},catalog);
  assert.equal(result.authorizationImported,false);
  assert.equal(workflow(ctx,'import-legacy',{file,goal:'Resume review',confirm:'import'},catalog).id,result.id);
  assert.equal(fs.readFileSync(file,'utf8'),original);
});

test('Git worktrees share memory while keeping workflow and task state separate', t => {
  const {ctx,env,project,root}=fixture(t);
  function git(args) { const r=spawnSync('git',['-C',project,...args],{encoding:'utf8',windowsHide:true});assert.equal(r.status,0,r.stderr);return r; }
  git(['init','-b','main']); git(['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','--allow-empty','-m','Initial fixture']);
  const linked=path.join(root,'linked'); git(['worktree','add','--detach',linked]);
  const one=context(project,env),two=context(linked,env);
  assert.equal(one.projectId,two.projectId); assert.notEqual(one.workspaceId,two.workspaceId);
  memory(one,'put',{kind:'decision',key:'shared',text:'Shared project choice',source:'user-stated'});
  assert.equal(memory(two,'list')[0].key,'shared');
  const checkpoint=workflow(one,'save',{goal:'Check context',summary:'Before commit'},catalog);
  git(['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','--allow-empty','-m','Next fixture']);
  assert.ok(workflow(one,'resume',{id:checkpoint.id},catalog).environmentChanges.some(change=>change.key==='head'));
});

test('stop marks only active steps in this task and preserves waiting work', t => {
  const {ctx,env,project}=fixture(t);
  const running=workflow(ctx,'start',{goal:'Active',skills:['bfs-spec']},catalog);
  workflow(ctx,'begin',{id:running.id,step:'1'},catalog);
  const waiting=workflow(ctx,'start',{goal:'Waiting',skills:['bfs-spec']},catalog);
  workflow(ctx,'begin',{id:waiting.id,step:'1'},catalog);
  workflow(ctx,'step',{id:waiting.id,step:'1',status:'waiting',summary:'Needs a product choice'},catalog);
  assert.equal(stopWorkflows(context(project,{...env,CODEX_THREAD_ID:'different'})).changed,0);
  assert.equal(stopWorkflows(ctx).changed,1);
  assert.equal(workflow(ctx,'resume',{id:running.id},catalog).status,'interrupted');
  assert.equal(workflow(ctx,'resume',{id:waiting.id},catalog).status,'waiting');
  assert.equal(stopWorkflows(ctx).changed,0);
});

test('atomic failure and write contention retain the previous bytes', t => {
  const {ctx}=fixture(t), file=path.join(ctx.home,'record.json');
  atomicWrite(file,{value:1}); const old=fs.readFileSync(file,'utf8');
  const realRename=fs.renameSync;
  t.mock.method(fs,'renameSync',()=>{throw new Error('injected disk failure');});
  assert.deepEqual(changeJson(file,null,current=>current),{value:1});
  assert.throws(()=>atomicWrite(file,{value:2}),/disk failure/);
  assert.equal(fs.readFileSync(file,'utf8'),old);
  fs.renameSync=realRename;
  fs.mkdirSync(`${file}.lock`);
  assert.throws(()=>changeJson(file,null,()=>({value:3})),/another process/);
  assert.equal(fs.readFileSync(file,'utf8'),old);
});

test('transient Windows lock and replacement errors are retried without losing the update', t => {
  const {ctx}=fixture(t), file=path.join(ctx.home,'record.json');
  const mkdir=fs.mkdirSync;
  let failures=0;
  fs.mkdirSync=(target,...args) => {
    if (target === `${file}.lock` && failures++ === 0) throw Object.assign(new Error('transient lock error'),{code:'EPERM'});
    return mkdir(target,...args);
  };
  try { assert.deepEqual(changeJson(file,null,()=>({value:1})),{value:1}); }
  finally { fs.mkdirSync=mkdir; }
  assert.equal(failures,2);
  assert.deepEqual(readJson(file),{value:1});
  const rename=fs.renameSync;
  let replacements=0;
  t.mock.method(fs,'renameSync',(source,target)=>{
    if(target===file && replacements++===0)throw Object.assign(new Error('transient replacement error'),{code:'EPERM'});
    return rename(source,target);
  });
  atomicWrite(file,{value:2});
  assert.equal(replacements,2);
  assert.deepEqual(readJson(file),{value:2});
});

test('memory keeps revisions, prunes exact IDs and imports legacy data without changing it', t => {
  const {ctx,root}=fixture(t);
  memory(ctx,'put',{kind:'learning',key:'retry',text:'first',source:'observed'});
  const second=memory(ctx,'put',{kind:'learning',key:'retry',text:'second',source:'user-stated'});
  assert.equal(memory(ctx,'search',{query:'second'})[0].text,'second');
  assert.equal(memory(ctx,'stats').records,2);
  memory(ctx,'prune',{ids:[second.id]});
  assert.equal(memory(ctx,'list')[0].text,'first');
  const legacy=path.join(root,'legacy.jsonl'), raw=JSON.stringify({insight:'Imported lesson',key:'old'})+'\n';
  fs.writeFileSync(legacy,raw);
  assert.equal(memory(ctx,'import-legacy',{file:legacy}).preview,true);
  memory(ctx,'import-legacy',{file:legacy,confirm:'import'});
  memory(ctx,'import-legacy',{file:legacy,confirm:'import'});
  assert.equal(memory(ctx,'stats').current,2);
  assert.equal(fs.readFileSync(legacy,'utf8'),raw);
});

test('legacy memory import preserves typed collections and rejects partial input', t => {
  const {ctx,root}=fixture(t), storeFile=path.join(ctx.projectDir,'memory.json');
  const formats=[
    ['typed.json',{decisions:[{text:'Decision'}],learnings:[{text:'Lesson'}]},['decision','learning']],
    ['decisions.json',{decisions:[{text:'Decision only'}]},['decision']],
    ['learnings.json',{learnings:[{text:'Lesson only'}]},['learning']],
    ['explicit.json',{decisions:[{text:'Explicit kind',kind:'learning'}]},['learning']],
    ['metadata.json',{learnings:[{text:'Structured legacy rationale',rationale:{reason:'Preserve imported metadata'},timestamp:{year:2020}}]},['learning']],
    ['records.json',{records:[{text:'Record',kind:'decision'}]},['decision']],
    ['context-types.json',{records:[{text:'Fact',kind:'fact'},{text:'Plan',kind:'plan'}]},['fact','plan']],
    ['array.json',[{decision:'Array decision'},{insight:'Array lesson'}],['decision','learning']],
    ['rows.jsonl','{"decision":"Line decision"}\n{"insight":"Line lesson"}\n',['decision','learning']]
  ];
  for (const [name,data,kinds] of formats) {
    const legacy=path.join(root,name), raw=typeof data==='string' ? data : JSON.stringify(data);
    fs.writeFileSync(legacy,raw);
    const before=fs.existsSync(storeFile) ? fs.readFileSync(storeFile,'utf8') : null;
    const preview=memory(ctx,'import-legacy',{file:legacy});
    assert.equal(preview.count,kinds.length,name);
    assert.deepEqual(preview.counts,Object.fromEntries([...new Set(['decision','learning',...kinds])].map(kind=>[kind,kinds.filter(k=>k===kind).length])),name);
    assert.deepEqual(preview.conflicts,[],name);
    assert.equal(fs.existsSync(storeFile) ? fs.readFileSync(storeFile,'utf8') : null,before,name);
    assert.equal(memory(ctx,'import-legacy',{file:legacy,confirm:'import'}).imported,kinds.length,name);
    const imported=fs.readFileSync(storeFile,'utf8');
    memory(ctx,'import-legacy',{file:legacy,confirm:'import'});
    assert.equal(fs.readFileSync(storeFile,'utf8'),imported,name);
    assert.deepEqual(readJson(storeFile).records.filter(row=>row.originalSource===preview.sourceHash).map(row=>row.kind),kinds,name);
    assert.equal(fs.readFileSync(legacy,'utf8'),raw,name);
  }
  const before=fs.readFileSync(storeFile,'utf8');
  for (const data of [{decisions:[{text:'Valid'}],learnings:[{}]}, {decisions:[],learnings:'invalid'},
    {records:[{text:'Record'}],decisions:[{text:'Decision'}]}, {decisions:[{text:'Invalid kind',kind:'other'}]}]) {
    const legacy=path.join(root,'invalid.json'), raw=JSON.stringify(data);fs.writeFileSync(legacy,raw);
    assert.throws(()=>memory(ctx,'import-legacy',{file:legacy,confirm:'import'}));
    assert.equal(fs.readFileSync(storeFile,'utf8'),before);
    assert.equal(fs.readFileSync(legacy,'utf8'),raw);
  }
});

test('legacy memory import exposes incompatible prior records without rewriting them', t => {
  const {ctx,root}=fixture(t), legacy=path.join(root,'legacy.json'), file=path.join(ctx.projectDir,'memory.json');
  const raw=JSON.stringify({decisions:[{text:'Original decision'}],learnings:[{text:'Original lesson'}]});
  fs.writeFileSync(legacy,raw);
  const key=`import-${digest(raw).slice(0,12)}-0`;
  const old=memory(ctx,'put',{key,kind:'learning',text:'Original decision',source:'imported'});
  const store=readJson(file);Object.assign(store.records[0],{originalSource:digest(raw),originalDate:null});atomicWrite(file,store);
  let before=fs.readFileSync(file,'utf8');
  assert.deepEqual(memory(ctx,'import-legacy',{file:legacy}).conflicts,[{id:old.id,key}]);
  assert.throws(()=>memory(ctx,'import-legacy',{file:legacy,confirm:'import'}),error=>error.message.includes(old.id));
  assert.equal(fs.readFileSync(file,'utf8'),before);
  memory(ctx,'prune',{ids:[old.id]});
  assert.equal(memory(ctx,'import-legacy',{file:legacy,confirm:'import'}).imported,2);
  const revision=memory(ctx,'put',{key,kind:'decision',text:'User edited this decision',source:'user-stated'});
  before=fs.readFileSync(file,'utf8');
  assert.deepEqual(memory(ctx,'import-legacy',{file:legacy}).conflicts,[{id:revision.id,key}]);
  assert.throws(()=>memory(ctx,'import-legacy',{file:legacy,confirm:'import'}),error=>error.message.includes(revision.id));
  assert.equal(fs.readFileSync(file,'utf8'),before);
  assert.equal(fs.readFileSync(legacy,'utf8'),raw);
});

test('legacy memory import checks source drift before updating the store', t => {
  const {ctx,root}=fixture(t), legacy=path.join(root,'legacy.json');
  fs.writeFileSync(legacy,JSON.stringify([{insight:'Import candidate'}]));
  memory(ctx,'put',{key:'existing',kind:'learning',text:'Keep this record',source:'user-stated'});
  const file=path.join(ctx.projectDir,'memory.json'), before=fs.readFileSync(file,'utf8');
  const read=fs.readFileSync;let reads=0;
  const mock=t.mock.method(fs,'readFileSync',(target,...args)=>target===legacy && ++reads===2 ? 'changed source' : read(target,...args));
  assert.throws(()=>memory(ctx,'import-legacy',{file:legacy,confirm:'import'}),/source changed/);
  mock.mock.restore();
  assert.equal(fs.readFileSync(file,'utf8'),before);
});

test('preferences are scoped, advisory, validated and require a selected proposal', t => {
  const {ctx}=fixture(t);
  assert.throws(()=>preferences(ctx,'set',{id:'publish-approval',question:'Publish?',options:['yes','no'],choice:'yes'}),/optional/);
  preferences(ctx,'set',{id:'detail-preference',question:'Depth?',options:['brief','full'],choice:'brief',scope:'user'});
  preferences(ctx,'set',{id:'detail-preference',question:'Depth?',options:['brief','full'],choice:'full'});
  assert.equal(preferences(ctx,'effective').values['detail-preference'].choice,'full');
  assert.throws(()=>preferences(ctx,'profile',{values:{autonomy:2}}),/Invalid/);
  const result=preferences(ctx,'propose',{kind:'profile',value:{values:{detail_preference:0.5}},source:'User requested balanced explanations'});
  assert.throws(()=>preferences(ctx,'apply',{id:result.proposals[0].id}),/confirm/);
  preferences(ctx,'apply',{id:result.proposals[0].id,confirm:'apply'});
  assert.equal(preferences(ctx,'inspect').profile.detail_preference,0.5);
});

test('question presentation preserves old stores, validates choices and inherits scoped overrides', t => {
  const {ctx}=fixture(t);
  const request={id:'question-presentation',question:'Panel or chat?',options:['prefer-panel','chat']};
  assert.equal(preferences(ctx,'effective').values[request.id],undefined);
  assert.equal(fs.existsSync(ctx.home),false);
  preferences(ctx,'set',{id:'detail-preference',question:'Depth?',options:['brief','full'],choice:'brief',scope:'user'});
  const file=path.join(ctx.home,'preferences.json'), old=fs.readFileSync(file,'utf8');
  assert.equal(preferences(ctx,'effective').values[request.id],undefined);
  assert.equal(fs.readFileSync(file,'utf8'),old);
  preferences(ctx,'set',{...request,choice:'prefer-panel'});
  assert.equal(preferences(ctx,'inspect',{scope:'user'}).values[request.id].choice,'prefer-panel');
  assert.equal(preferences(ctx,'inspect').values[request.id],undefined);
  const saved=fs.readFileSync(file,'utf8');
  assert.throws(()=>preferences(ctx,'set',{...request,options:['prefer-panel','other'],choice:'other'}),/question presentation/);
  assert.throws(()=>preferences(ctx,'set',{...request,options:['prefer-panel','chat','other'],choice:'chat'}),/question presentation/);
  assert.equal(fs.readFileSync(file,'utf8'),saved);
  preferences(ctx,'set',{...request,choice:'chat',scope:'project'});
  assert.equal(preferences(ctx,'effective').values[request.id].choice,'chat');
  preferences(ctx,'set',{...request,choice:'prefer-panel',scope:'task'});
  assert.equal(preferences(ctx,'effective').values[request.id].choice,'prefer-panel');
  preferences(ctx,'reset',{id:request.id,scope:'task'});
  assert.equal(preferences(ctx,'effective').values[request.id].choice,'chat');
  preferences(ctx,'reset',{id:request.id,scope:'project'});
  assert.equal(preferences(ctx,'effective').values[request.id].choice,'prefer-panel');
  preferences(ctx,'reset',{id:request.id});
  assert.equal(preferences(ctx,'effective').values[request.id],undefined);
  assert.equal(preferences(ctx,'inspect',{scope:'user'}).values['detail-preference'].choice,'brief');
  assert.equal(readJson(file).schema,1);
  const malformed=readJson(file);malformed.values[request.id]={choice:'other'};
  atomicWrite(file,malformed);
  assert.throws(()=>preferences(ctx,'effective'),/question presentation/);
});

test('retrying a memory operation after an uncertain result does not duplicate it', t => {
  const {ctx}=fixture(t), request={kind:'decision',key:'retry',text:'Confirmed choice',source:'user-stated',operationId:'request-1'};
  const first=memory(ctx,'put',request), again=memory(ctx,'put',request);
  assert.equal(first.id,again.id); assert.equal(memory(ctx,'stats').records,1);
  assert.throws(()=>memory(ctx,'put',{...request,text:'Different choice'}),/different/);
});

test('credential-shaped input and state links are rejected without data loss', t => {
  const {ctx,root}=fixture(t);
  assert.throws(()=>atomicWrite(path.join(ctx.home,'secret.json'),{api_key:'example'}),/Credential/);
  fs.mkdirSync(ctx.home,{recursive:true}); const outside=path.join(root,'outside'); fs.mkdirSync(outside);
  const linked=path.join(ctx.home,'linked'); fs.symlinkSync(outside,linked,process.platform==='win32'?'junction':'dir');
  assert.throws(()=>atomicWrite(path.join(linked,'note.json'),{value:1}),/link/);
  assert.equal(fs.existsSync(path.join(outside,'note.json')),false);
});

test('guard fixture enforces edit targets and independent toggles; fixture is not native proof', t => {
  const {ctx,project}=fixture(t); fs.mkdirSync(path.join(project,'src'));
  const event={hook_event_name:'PreToolUse',session_id:ctx.taskId,cwd:project,tool_name:'functions.exec_command',tool_input:{cmd:'git status'}};
  const observation=preTool(ctx,event).hookSpecificOutput.additionalContext;
  guard(ctx,'set',{observation,warnings:true,boundary:'src'});
  const denied=preTool(ctx,{...event,tool_name:'functions.apply_patch',tool_input:{command:'*** Begin Patch\n*** Add File: outside.txt\n+x\n*** End Patch'}});
  assert.equal(denied.hookSpecificOutput.permissionDecision,'deny');
  guard(ctx,'release',{observation});
  assert.equal(guard(ctx,'status').warnings,true); assert.equal(guard(ctx,'status').boundary,null);
});

test('guard recognizes destructive commands with global Git options and PowerShell aliases', {skip:process.platform!=='win32'}, t => {
  const {ctx,project,root}=fixture(t);
  assert.equal(classify('git -c core.pager=cat reset --hard',project,project).decision,'ask');
  const rootDelete=classify(`Remove-Item -LiteralPath '${project}' -Recurse -Force`,project,project);
  assert.equal(rootDelete.decision,'deny',JSON.stringify({rootDelete,project,canonical:ctx.workspace}));
  assert.match(rootDelete.reason,/project or an ancestor/);
  assert.equal(classify('ri src -Recurse',project,project).decision,'ask');
  assert.equal(classify('git status --short',project,project),null);
  assert.equal(classify('git status --short; git reset --hard',project,project).decision,'ask');
  assert.equal(classify('git status --short | Invoke-Expression',project,project).decision,'ask');
  const alias=path.join(root,'project-alias'); fs.symlinkSync(project,alias,process.platform==='win32'?'junction':'dir');
  assert.equal(classify(`Remove-Item -LiteralPath '${project}' -Recurse`,alias,alias).decision,'deny');
});

test('guard blocks a warning until the exact operation has a single-use confirmation', t => {
  const {ctx,project}=fixture(t);
  const event={hook_event_name:'PreToolUse',session_id:ctx.taskId,cwd:project,tool_name:'functions.exec_command',tool_input:{cmd:'git reset --hard'}};
  const observation=preTool(ctx,event).hookSpecificOutput.additionalContext;
  guard(ctx,'set',{observation,warnings:true});
  assert.equal(preTool(ctx,event).hookSpecificOutput.permissionDecision,'deny');
  const pending=guard(ctx,'status').pending;
  guard(ctx,'approve',{observation,id:pending.id,confirmation:'Fixture authorizes the exact simulated reset; no command executes in this test'});
  assert.equal(preTool(ctx,event).hookSpecificOutput.permissionDecision,undefined);
  assert.equal(preTool(ctx,event).hookSpecificOutput.permissionDecision,'deny');
});

test('guard covers destructive Git aliases and default worktree restores', t => {
  const {ctx,project}=fixture(t);
  const shell=process.platform==='win32'?'powershell':'bash';
  const event={hook_event_name:'PreToolUse',session_id:ctx.taskId,cwd:project,tool_name:'functions.exec_command',tool_input:{cmd:'git status --short',shell}};
  const observation=preTool(ctx,event).hookSpecificOutput.additionalContext;
  guard(ctx,'set',{observation,warnings:true});
  for (const cmd of ['git clean --force','git -C . clean --force','git restore file.txt','git restore -W file.txt',
    'git checkout -- file.txt','git checkout HEAD -- file.txt','git branch --delete --force fixture','git branch -df fixture']) {
    const call={...event,tool_input:{cmd,shell}};
    assert.equal(classify(cmd,project,project,shell)?.decision,'ask',cmd);
    assert.equal(preTool(ctx,call).hookSpecificOutput.permissionDecision,'deny',cmd);
    guard(ctx,'approve',{observation,id:guard(ctx,'status').pending.id,confirmation:'Fixture authorizes this exact simulated command; it is never executed'});
    assert.equal(preTool(ctx,call).hookSpecificOutput.permissionDecision,undefined,cmd);
    assert.equal(preTool(ctx,call).hookSpecificOutput.permissionDecision,'deny',cmd);
  }
  for (const cmd of ['git status --short','git clean --dry-run','git checkout fixture','git branch --list --force',
    'git restore --help','git restore --staged file.txt']) assert.equal(classify(cmd,project,project,shell),null,cmd);
});

test('delivery preserves command exit and rejects stale evidence', t => {
  const {ctx,project}=fixture(t);
  fs.writeFileSync(path.join(project,'input.txt'),'one');
  const failed=delivery(ctx,'evidence',{label:'nonzero',command:[process.execPath,'-e','process.exit(7)'],files:['input.txt']});
  assert.equal(failed.exitCode,7); assert.equal(failed.status,'failed');
  const passed=delivery(ctx,'evidence',{label:'read',command:[process.execPath,'-e','console.log("checked")'],files:['input.txt']});
  assert.equal(delivery(ctx,'verify',{id:passed.id}).valid,true);
  fs.writeFileSync(path.join(project,'input.txt'),'two');
  assert.equal(delivery(ctx,'verify',{id:passed.id}).valid,false);
  assert.equal(versionNext('1.2.3.4','micro'),'1.2.3.5');
  assert.equal(versionNext('1.2.3.4','minor'),'1.3.0.0');
});

test('PowerShell launcher resolves a renamed skill and reads from a fresh package path', {skip:process.platform!=='win32'}, t => {
  const {env,project}=fixture(t);
  const result=spawnSync('powershell.exe',['-NoProfile','-File',path.join(pluginRoot,'scripts/bfstack.ps1'),'-Command','catalog','-Action','resolve','bfstack'],{cwd:project,env,encoding:'utf8',windowsHide:true});
  assert.equal(result.status,0,result.stderr);
  assert.equal(JSON.parse(result.stdout).id,'bfs-router');
});

test('Node engine bridge preserves failures and isolates missing external design tools', t => {
  const {ctx,root}=fixture(t), engine=path.join(root,'engine');
  fs.mkdirSync(path.join(engine,'src'),{recursive:true});fs.mkdirSync(path.join(engine,'.browsers'));
  const source='process.stdout.write(JSON.stringify({session:process.env.BFS_ENGINE_SESSION}));process.exit(7);';
  fs.writeFileSync(path.join(engine,'src','probe.mjs'),source);
  const manifest={schema:1,name:'bontaflowstack-engines',version:'0.3.0',platform:`${process.platform}-${process.arch}`,browserDirectory:'.browsers',
    files:{'src/probe.mjs':digest(source)},commands:{browser:{program:'node',args:['src/probe.mjs'],requires:['src/probe.mjs']},
      'design-md':{program:'node',args:['src/probe.mjs'],requires:['src/probe.mjs'],environment:'BFS_TEST_MISSING_COMMAND'}}};
  const bytes=JSON.stringify(manifest);fs.writeFileSync(path.join(engine,'engine.json'),bytes);
  engines(ctx,'register',{root:engine,sha256:digest(bytes)});
  const state=engines(ctx,'status');assert.equal(state.capabilities.browser.ready,true);assert.equal(state.capabilities['design-md'].ready,false);
  assert.equal(state.capabilities.browser.status,'ready');assert.equal(state.runtime.status,'unverified');
  assert.equal(state.capabilities['design-md'].status,'unavailable');assert.ok(state.capabilities['design-md'].nextAction);
  assert.match(state.capabilities['design-md'].nextAction,/BFS_TEST_MISSING_COMMAND/);
  const result=engines(ctx,'browser',{args:['status']});assert.equal(result.exitCode,7);assert.equal(result.status,'failed');
  assert.ok(JSON.parse(result.stdout).session.startsWith(ctx.workspaceDir));
});

test('Impeccable uses persisted configuration, honors overrides and preserves detector exit meaning', t => {
  const {ctx,root}=fixture(t), engine=path.join(root,'impeccable-engine');
  fs.mkdirSync(path.join(engine,'src'),{recursive:true});fs.mkdirSync(path.join(engine,'.browsers'));
  const source='process.stdout.write(process.env.BFS_IMPECCABLE_COMMAND || "missing");process.exit(Number(process.argv.at(-1)) || 0);';
  fs.writeFileSync(path.join(engine,'src/probe.mjs'),source);
  const manifest={schema:1,name:'bontaflowstack-engines',version:'0.3.3',platform:`${process.platform}-${process.arch}`,browserDirectory:'.browsers',
    files:{'src/probe.mjs':digest(source)},commands:{'design-detect':{program:'node',args:['src/probe.mjs'],environment:'BFS_IMPECCABLE_COMMAND'}}};
  const bytes=JSON.stringify(manifest);fs.writeFileSync(path.join(engine,'engine.json'),bytes);
  engines(ctx,'register',{root:engine,sha256:digest(bytes)});
  const config={schema:1,version:'4.5.2',command:[process.execPath],sha256:digest(fs.readFileSync(process.execPath))};
  const previous=process.env.BFS_IMPECCABLE_COMMAND;
  delete process.env.BFS_IMPECCABLE_COMMAND;
  t.after(()=>{if(previous === undefined) delete process.env.BFS_IMPECCABLE_COMMAND; else process.env.BFS_IMPECCABLE_COMMAND=previous;});
  atomicWrite(path.join(ctx.home,'impeccable.json'),config);
  assert.equal(engines(ctx,'status').capabilities['design-detect'].ready,true);
  const result=engines(ctx,'design-detect',{args:['detect','2']});
  assert.deepEqual(JSON.parse(result.stdout),config.command);
  assert.equal(result.exitCode,2);assert.equal(result.status,'completed');
  assert.equal(engines(ctx,'design-detect',{args:['detect','1']}).status,'failed');
  assert.equal(engines(ctx,'design-detect',{args:['other','2']}).status,'failed');
  atomicWrite(path.join(ctx.home,'impeccable.json'),{...config,sha256:'0'.repeat(64)});
  assert.equal(engines(ctx,'status').capabilities['design-detect'].ready,false);
  process.env.BFS_IMPECCABLE_COMMAND=JSON.stringify([process.execPath,'custom']);
  assert.equal(engines(ctx,'status').capabilities['design-detect'].ready,true);
  assert.deepEqual(JSON.parse(engines(ctx,'design-detect').stdout),[process.execPath,'custom']);
});

test('native-hook command forwards UTF-8 stdin and returns the host contract', t => {
  const {env,project}=fixture(t);
  const payload={hook_event_name:'PreToolUse',session_id:env.CODEX_THREAD_ID,cwd:project,tool_name:'functions.exec_command',tool_input:{cmd:'git status'}};
  const result=spawnSync(...hookCommand(),{cwd:project,env:{...env,PLUGIN_ROOT:pluginRoot},input:JSON.stringify(payload),encoding:'utf8',windowsHide:true,timeout:15000});
  assert.equal(result.status,0,result.stderr);
  assert.match(JSON.parse(result.stdout).hookSpecificOutput.additionalContext,/BFS_GUARD_OBSERVED/);
});

test('native hook preserves inspection failure exit codes and Stop success', t => {
  const {env,project}=fixture(t);
  for (const [event,code] of [['PreToolUse',2],['Stop',0]]) {
    const payload={hook_event_name:event,session_id:env.CODEX_THREAD_ID,cwd:project,tool_name:'functions.exec_command',tool_input:null};
    const result=spawnSync(...hookCommand(event),{cwd:project,env:{...env,PLUGIN_ROOT:pluginRoot},input:JSON.stringify(payload),encoding:'utf8',windowsHide:true,timeout:8000});
    assert.equal(result.status,code,result.stderr || result.stdout);
    if(event==='PreToolUse') assert.match(JSON.parse(result.stdout).hookSpecificOutput.permissionDecisionReason,/Malformed native tool input/);
    else assert.deepEqual(JSON.parse(result.stdout),{});
  }
});

test('parallel native hooks refresh missing and stale observations and wait for a writer', async t => {
  const {env,project,root}=fixture(t);
  for(const mode of ['missing','stale','locked']) {
    const runEnv={...env,PLUGIN_ROOT:pluginRoot,BFS_STATE_HOME:path.join(root,mode)};
    const ctx=context(project,runEnv);
    const observed=path.join(ctx.workspaceDir,'tasks',`${ctx.taskId}.guard.json.observed.json`);
    if(mode==='stale') atomicWrite(observed,{taskId:ctx.taskId,workspaceId:ctx.workspaceId,at:'2000-01-01T00:00:00.000Z',package:'0.3.0'});
    let release=Promise.resolve();
    if(mode==='locked') {
      fs.mkdirSync(`${observed}.lock`,{recursive:true});
      release=new Promise(resolve=>setTimeout(()=>{ fs.rmdirSync(`${observed}.lock`); resolve(); },700));
    }
    const payload={hook_event_name:'PreToolUse',session_id:ctx.taskId,cwd:project,tool_name:'functions.exec_command',tool_input:{cmd:'git status'}};
    const results=await Promise.all(Array.from({length:8},()=>new Promise(resolve=>{
      const child=spawn(...hookCommand(),{cwd:project,env:runEnv,windowsHide:true,timeout:8000});
      let stdout='',stderr='';
      child.stdout.on('data',data=>stdout+=data); child.stderr.on('data',data=>stderr+=data);
      child.on('error',error=>resolve({error:error.message}));
      child.on('close',code=>resolve({code,stdout,stderr}));
      child.stdin.end(JSON.stringify(payload));
    })));
    await release;
    for(const result of results) {
      assert.equal(result.code,0,`${mode}: ${JSON.stringify(result)}`);
      assert.match(JSON.parse(result.stdout).hookSpecificOutput.additionalContext,/BFS_GUARD_OBSERVED/);
    }
    const saved=readJson(observed);
    assert.equal(saved.taskId,ctx.taskId); assert.equal(saved.workspaceId,ctx.workspaceId);
    assert.ok(Date.now()-Date.parse(saved.at)<10000);
    assert.equal(fs.existsSync(`${observed}.lock`),false);
  }
});
