import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {PassThrough} from 'node:stream';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {claudeHook} from '../plugins/bontaflowstack/core/claude-hook.mjs';
import {nativeContext,claudeToolName,consumeCall} from '../plugins/bontaflowstack/core/claude-context.mjs';
import {createClaudeHost,serveClaudeHost} from '../plugins/bontaflowstack/core/claude-host.mjs';
import {guard} from '../plugins/bontaflowstack/core/guard.mjs';
import {workflow} from '../plugins/bontaflowstack/core/workflow.mjs';
import {loadCatalog} from '../plugins/bontaflowstack/core/catalog.mjs';

function fixture(t) {
  const root=fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()),'bfs-claude-'));
  const project=path.join(root,'project');fs.mkdirSync(project);
  const env={...process.env,BFS_STATE_HOME:path.join(root,'state')};delete env.CLAUDE_CODE_SESSION_ID;
  const event=(extra={})=>({session_id:'session-a',cwd:project,hook_event_name:'PreToolUse',tool_name:'Read',tool_input:{file_path:'brief.md'},...extra});
  const bound=(name,args={},extra={})=>claudeHook(event({tool_name:claudeToolName(name),tool_input:args,...extra}),env).hookSpecificOutput.updatedInput;
  const host=createClaudeHost({env});
  t.after(async()=>{await host.close();assert.equal(path.dirname(root),fs.realpathSync(os.tmpdir()));assert.match(path.basename(root),/^bfs-claude-/);fs.rmSync(root,{recursive:true,force:true});});
  return {root,project,env,event,bound,host};
}

test('native session, agent and workspace own core calls; inherited Codex identity is ignored',async t=>{
  const f=fixture(t),call=(args,input={},extra={})=>f.host.call('core',f.bound('core',{args,input},extra));
  const first=await call(['workflow','start'],{goal:'Native context fixture',skills:['bfs-health']});
  assert.match(first.taskId,/^claude-[0-9a-f]{64}$/);
  assert.notEqual(first.taskId,process.env.CODEX_THREAD_ID);
  await call(['workflow','begin'],{id:first.id,step:'1'});
  await assert.rejects(call(['workflow','begin'],{id:first.id,step:'1'},{agent_id:'worker-a'}),/adopt/);
  await assert.rejects(call(['workflow','begin'],{id:first.id,step:'1'},{session_id:'session-b'}),/adopt/);
  const read=await call(['read','bfs-health']);assert.equal(read.context.workspaceId,first.workspaceId);
  const second=await call(['workflow','start'],{goal:'Agent fixture',skills:['bfs-health']},{agent_id:'worker-a'});
  assert.notEqual(first.taskId,second.taskId);
  await call(['memory','put'],{kind:'fact',key:'shared',text:'Observed fixture',source:'observed'});
  const memory=await call(['memory','list'],{},{session_id:'session-b'});assert.equal(memory[0].text,'Observed fixture');
});

test('call binding rejects missing, altered, expired and replayed calls',async t=>{
  const f=fixture(t);
  await assert.rejects(f.host.call('status',{}),/binding is missing/);
  const signed=f.bound('core',{args:['workflow','list']});
  await assert.rejects(f.host.call('core',{...signed,args:['memory','list']}),/arguments changed/);
  await f.host.call('core',signed);
  await assert.rejects(f.host.call('core',signed),/already consumed/);
  const reordered=f.bound('core',{args:['catalog','list'],input:{mode:'unused',skill:'unused'}});
  await f.host.call('core',{input:{skill:'unused',mode:'unused'},args:reordered.args,_bfsCall:reordered._bfsCall});
  const expired=f.bound('status'),file=path.join(f.env.BFS_STATE_HOME,'claude-code','calls',`${expired._bfsCall}.json`);
  const data=JSON.parse(fs.readFileSync(file,'utf8'));data.createdAt-=300001;fs.writeFileSync(file,JSON.stringify(data));
  assert.throws(()=>consumeCall('status',expired,f.env),/expired/);
  assert.throws(()=>claudeHook(f.event(),{...f.env,CLAUDE_CODE_SESSION_ID:'wrong'}),/identity mismatch/);
});

test('hook preserves native permissions and guard denial; binding does not grant approval',async t=>{
  const f=fixture(t),event=f.event(),ctx=nativeContext(event,f.env);
  const result=claudeHook(event,f.env);assert.equal(result.hookSpecificOutput.permissionDecision,undefined);
  guard(ctx,'set',{boundary:f.project,observation:`BFS_GUARD_OBSERVED task=${ctx.taskId} workspace=${ctx.workspaceId}`});
  const denied=claudeHook(f.event({tool_name:'Write',tool_input:{file_path:path.join(f.root,'outside.txt'),content:'must not write'}}),f.env);
  assert.equal(denied.hookSpecificOutput.permissionDecision,'deny');assert.equal(denied.hookSpecificOutput.updatedInput,undefined);
  assert.equal(fs.existsSync(path.join(f.root,'outside.txt')),false);
  const allowed=claudeHook(f.event({tool_name:claudeToolName('status'),tool_input:{}}),f.env);
  assert.equal(allowed.hookSpecificOutput.permissionDecision,undefined);assert.ok(allowed.hookSpecificOutput.updatedInput._bfsCall);
});

test('lifecycle interrupts only running owned work and recovers previous interrupted turns',async t=>{
  const f=fixture(t),catalog=loadCatalog();
  const create=extra=>{const ctx=nativeContext(f.event(extra),f.env);claudeHook(f.event(extra),f.env);const record=workflow(ctx,'start',{goal:'Lifecycle fixture',skills:['bfs-health']},catalog);workflow(ctx,'begin',{id:record.id,step:'1'},catalog);return {ctx,record};};
  const main=create({}),worker=create({agent_id:'worker-a'}),other=create({session_id:'other-session'});
  assert.throws(()=>claudeHook(f.event({hook_event_name:'SubagentStop'}),f.env),/requires the native agent_id/);
  assert.equal(workflow(main.ctx,'resume',{id:main.record.id},catalog).status,'running');
  claudeHook(f.event({hook_event_name:'SubagentStop',agent_id:'worker-a'}),f.env);
  assert.equal(workflow(worker.ctx,'resume',{id:worker.record.id},catalog).status,'interrupted');
  assert.equal(workflow(main.ctx,'resume',{id:main.record.id},catalog).status,'running');
  claudeHook(f.event({hook_event_name:'PostToolUseFailure',is_interrupt:false}),f.env);
  assert.equal(workflow(main.ctx,'resume',{id:main.record.id},catalog).status,'running');
  claudeHook(f.event({hook_event_name:'UserPromptSubmit'}),f.env);
  assert.equal(workflow(main.ctx,'resume',{id:main.record.id},catalog).status,'interrupted');
  assert.equal(workflow(other.ctx,'resume',{id:other.record.id},catalog).status,'running');
  const abandoned=f.bound('status');
  claudeHook(f.event({hook_event_name:'SessionEnd'}),f.env);
  assert.equal(fs.existsSync(path.join(f.env.BFS_STATE_HOME,'claude-code','calls',`${abandoned._bfsCall}.json`)),false);
  const sessions=fs.readdirSync(path.join(f.env.BFS_STATE_HOME,'claude-code','sessions')).map(name=>JSON.parse(fs.readFileSync(path.join(f.env.BFS_STATE_HOME,'claude-code','sessions',name),'utf8')));
  assert.deepEqual(sessions.map(session=>session.sessionId),['other-session']);
  assert.equal(workflow(other.ctx,'resume',{id:other.record.id},catalog).status,'running');
});

test('hook and MCP process entrypoints exchange a bound call; invalid hook input fails closed',async t=>{
  const f=fixture(t),core=fileURLToPath(new URL('../plugins/bontaflowstack/core/',import.meta.url));
  const options={cwd:f.project,env:f.env,encoding:'utf8',windowsHide:true,timeout:10000};
  const hook=spawnSync(process.execPath,[path.join(core,'claude-hook.mjs'),'PreToolUse'],{...options,input:JSON.stringify(f.event({tool_name:claudeToolName('status'),tool_input:{}}))});
  assert.equal(hook.status,0,hook.stderr);const bound=JSON.parse(hook.stdout).hookSpecificOutput.updatedInput;
  const requests=[{jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-06-18',capabilities:{}}},{jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'status',arguments:bound}}];
  const host=spawnSync(process.execPath,[path.join(core,'claude-host.mjs')],{...options,input:requests.map(request=>JSON.stringify(request)).join('\n')+'\n'});
  assert.equal(host.status,0,host.stderr);const replies=host.stdout.trim().split('\n').map(line=>JSON.parse(line));
  assert.equal(replies.length,2);assert.equal(replies[1].result.isError,undefined);
  assert.equal(JSON.parse(replies[1].result.content[0].text).sessionId,'session-a');
  const invalid=spawnSync(process.execPath,[path.join(core,'claude-hook.mjs'),'PreToolUse'],{...options,input:JSON.stringify(f.event({hook_event_name:'Stop'}))});
  assert.equal(invalid.status,2);assert.equal(JSON.parse(invalid.stdout).hookSpecificOutput.permissionDecision,'deny');
});

test('browser project binding preserves refusal, native workspace and independent owners',async t=>{
  const f=fixture(t),outside=path.join(f.root,'outside');fs.mkdirSync(outside);
  await assert.rejects(f.host.call('select_project',f.bound('select_project',{path:outside})),/not approved/);
  const inside=path.join(f.project,'inside');fs.mkdirSync(inside);
  await f.host.call('select_project',f.bound('select_project',{path:inside}));
  assert.equal((await f.host.call('status',f.bound('status'))).project,inside);
  assert.equal((await f.host.call('status',f.bound('status',{}, {agent_id:'other-agent'}))).project,f.project);
  await assert.rejects(f.host.call('browser',f.bound('browser',{args:['screenshot',path.join(outside,'escape.png')]})),/inside/);
  await assert.rejects(f.host.call('core',f.bound('core',{args:['hook','stop']})),/not exposed/);
  await assert.rejects(f.host.call('core',f.bound('core',{args:['engine','browser','goto','about:blank']})),/native browser/);
});

test('native core help describes MCP input and only the exposed command surfaces',async t=>{
  const f=fixture(t),help=await f.host.call('core',f.bound('core',{args:['help']}));
  assert.match(help.usage,/MCP core/);assert.equal(help.commands.hook,undefined);
  assert.equal(help.commands.engine.split('|').includes('browser'),false);
  assert.equal(help.commands.engine.split('|').includes('render'),false);
});

test('stdio exposes all tools, rejects unbound requests, and uses native per-call identity',async t=>{
  const f=fixture(t),input=new PassThrough(),output=new PassThrough(),pending=new Map();let buffer='',id=0;
  output.on('data',chunk=>{buffer+=chunk;let newline;while((newline=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,newline);buffer=buffer.slice(newline+1);const response=JSON.parse(line);pending.get(response.id)?.(response);pending.delete(response.id);}});
  const running=serveClaudeHost(input,output,f.env);
  const send=(method,params={})=>new Promise(resolve=>{const key=++id;pending.set(key,resolve);input.write(JSON.stringify({jsonrpc:'2.0',id:key,method,params})+'\n');});
  try {
    const init=await send('initialize',{protocolVersion:'2025-06-18',capabilities:{}});assert.equal(init.result.serverInfo.name,'bontaflowstack-claude');
    const listed=await send('tools/list');assert.deepEqual(listed.result.tools.map(tool=>tool.name),['core','status','select_project','browser','render']);
    assert.equal((await send('tools/call',{name:'status',arguments:{}})).result.isError,true);
    const result=await send('tools/call',{name:'status',arguments:f.bound('status',{}, {session_id:'after-clear'})});
    assert.equal(result.result.isError,undefined);assert.equal(JSON.parse(result.result.content[0].text).sessionId,'after-clear');
  }finally{input.end();await running;}
});
