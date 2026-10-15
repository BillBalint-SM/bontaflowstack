import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const core=fileURLToPath(new URL('../plugins/bontaflowstack/core/',import.meta.url));
function fixture(t) {
  const root=fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()),'bfs-cursor-'));
  const project=path.join(root,'project with spaces');fs.mkdirSync(project);
  const nativeRoot=process.platform==='win32'?'/'+project.replaceAll('\\','/'):project;
  const options={cwd:project,env:{...process.env,BFS_STATE_HOME:path.join(root,'state')},encoding:'utf8',windowsHide:true,timeout:15000};
  const hook=(kind,extra={})=>spawnSync(process.execPath,[path.join(core,'cursor-hook.mjs'),kind],{...options,input:'\uFEFF'+JSON.stringify({conversation_id:'session-a',session_id:'session-a',workspace_roots:[nativeRoot],cursor_version:'3.24.12',hook_event_name:kind,...extra})});
  const bind=(name,args={},extra={})=>{
    const result=hook('preToolUse',{tool_name:`MCP:bfs_${name}`,tool_input:args,tool_use_id:'native-call',...extra});
    assert.equal(result.status,0,result.stderr);const output=JSON.parse(result.stdout);
    assert.equal(output.permission,undefined,'BFS must retain native permission');return output.updated_input;
  };
  const rpc=requests=>{
    const result=spawnSync(process.execPath,[path.join(core,'cursor-host.mjs')],{...options,input:requests.map((request,index)=>JSON.stringify({jsonrpc:'2.0',id:index+1,...request})).join('\n')+'\n'});
    assert.equal(result.status,0,result.stderr);return result.stdout.trim().split('\n').map(JSON.parse);
  };
  const call=(name,args={},extra={})=>{
    const response=rpc([{method:'tools/call',params:{name:`bfs_${name}`,arguments:bind(name,args,extra)}}])[0];
    assert.equal(response.result.isError,undefined,response.result.content[0].text);return JSON.parse(response.result.content[0].text);
  };
  t.after(()=>{assert.equal(path.dirname(root),fs.realpathSync.native(os.tmpdir()));assert.match(path.basename(root),/^bfs-cursor-/);fs.rmSync(root,{recursive:true,force:true});});
  return {root,project,nativeRoot,options,hook,bind,rpc,call};
}

test('Cursor native workspace and conversation own uniquely named BFS MCP calls',t=>{
  const f=fixture(t),start=f.hook('sessionStart');assert.equal(start.status,0,start.stderr);
  const bound=f.bind('status');assert.equal(typeof bound._bfsCall,'string');
  const responses=f.rpc([
    {method:'initialize',params:{protocolVersion:'2025-06-18',capabilities:{}}},
    {method:'tools/list'},
    {method:'tools/call',params:{name:'bfs_status',arguments:bound}},
    {method:'tools/call',params:{name:'bfs_status',arguments:bound}},
    {method:'tools/call',params:{name:'bfs_status',arguments:{}}},
    {method:'tools/call',params:{name:'status',arguments:{}}}
  ]);
  assert.equal(responses[0].result.serverInfo.name,'bontaflowstack-cursor');
  assert.deepEqual(responses[1].result.tools.map(tool=>tool.name),['bfs_core','bfs_status','bfs_select_project','bfs_browser','bfs_render']);
  assert.equal(responses[2].result.isError,undefined);
  const status=JSON.parse(responses[2].result.content[0].text);
  assert.equal(status.host,'cursor-ide');assert.equal(status.sessionId,'session-a');assert.equal(status.hostWorkspace,f.project);
  assert.match(status.taskId,/^cursor-[a-f0-9]{64}$/);
  for(const reply of responses.slice(3))assert.equal(reply.result.isError,true);
  const foreign=f.hook('preToolUse',{tool_name:'MCP:status',tool_input:{},tool_use_id:'foreign-call'});
  assert.equal(foreign.status,0,foreign.stderr);assert.equal(JSON.parse(foreign.stdout).updated_input,undefined);
  assert.match(f.call('core',{args:['help']}).usage,/MCP bfs_core/);
});

test('Cursor chats share project memory but keep workflow ownership through a failed tool and resume',t=>{
  const f=fixture(t),outside=path.join(f.root,'outside');fs.mkdirSync(outside);
  const run=(args,input={},extra={})=>f.call('core',{args,input},extra);
  run(['memory','put'],{kind:'fact',key:'fixture',text:'Persistent IDE project fact',source:'observed'});
  const workflow=run(['workflow','start'],{goal:'Owned IDE work',skills:['bfs-health']});run(['workflow','begin'],{id:workflow.id,step:'1'});
  const other={conversation_id:'session-b',session_id:'session-b'};
  assert.equal(run(['memory','list'],{},other)[0].text,'Persistent IDE project fact');
  assert.equal(f.call('status',{}, {cwd:outside}).hostWorkspace,f.project);
  const foreign=f.rpc([{method:'tools/call',params:{name:'bfs_core',arguments:f.bind('core',{args:['workflow','begin'],input:{id:workflow.id,step:'1'}},other)}}])[0];
  assert.equal(foreign.result.isError,true);assert.match(foreign.result.content[0].text,/adopt/);
  const failed=f.hook('postToolUseFailure',{tool_name:'Shell',tool_input:{command:'example'},failure_type:'error',is_interrupt:false});
  assert.equal(failed.status,0,failed.stderr);assert.equal(run(['workflow','resume'],{id:workflow.id}).status,'interrupted');
  const bound=f.bind('status');const ended=f.hook('sessionEnd',{reason:'window_closed'});assert.equal(ended.status,0,ended.stderr);
  assert.equal(f.rpc([{method:'tools/call',params:{name:'bfs_status',arguments:bound}}])[0].result.isError,true);
  assert.equal(run(['workflow','resume'],{id:workflow.id},other).requiresAdoption,true);
  assert.equal(run(['memory','list'],{},other)[0].text,'Persistent IDE project fact');
});

test('Cursor native edit and shell guards reject invalid context and retain host approval',t=>{
  const f=fixture(t),allowed=path.join(f.project,'allowed');fs.mkdirSync(allowed);
  f.call('core',{args:['guard','status']});
  const observed=f.hook('postToolUse',{tool_name:'MCP:bfs_core',tool_input:{args:['guard','status']},tool_output:'{}'});
  assert.equal(observed.status,0,observed.stderr);
  const marker=JSON.parse(observed.stdout).additional_context.match(/BFS_GUARD_OBSERVED task=\S+ workspace=\S+/)?.[0];assert.ok(marker);
  f.call('core',{args:['guard','set'],input:{boundary:allowed,warnings:true,observation:marker}});
  for(const tool_name of ['Write','Edit']) {
    const denied=f.hook('preToolUse',{tool_name,tool_input:{file_path:path.join(f.root,'outside.txt'),content:'must not write'}});
    assert.equal(denied.status,0,denied.stderr);assert.equal(JSON.parse(denied.stdout).permission,'deny');
  }
  const denied=f.hook('preToolUse',{tool_name:'Shell',tool_input:{command:'Remove-Item -LiteralPath ./target.txt',working_directory:f.project}});
  assert.equal(denied.status,0,denied.stderr);assert.equal(JSON.parse(denied.stdout).permission,'deny');
  const allowedCall=f.hook('preToolUse',{tool_name:'Shell',tool_input:{command:'git status --short',working_directory:f.project}});
  assert.equal(allowedCall.status,0,allowedCall.stderr);assert.equal(JSON.parse(allowedCall.stdout).permission,process.platform==='win32'?undefined:'deny');
  if(process.platform!=='win32')assert.match(JSON.parse(allowedCall.stdout).agent_message,/shell|inspect/i);
  for(const extra of [{session_id:'different'},{workspace_roots:[]},{workspace_roots:[f.nativeRoot,f.nativeRoot]},{conversation_id:'../forged'}]) {
    const invalid=f.hook('preToolUse',{tool_name:'MCP:bfs_status',tool_input:{},...extra});
    assert.equal(invalid.status,2);assert.equal(JSON.parse(invalid.stdout).permission,'deny');
  }
  const workflow=f.call('core',{args:['workflow','start'],input:{goal:'Recover lost close hook',skills:['bfs-health']}});
  f.call('core',{args:['workflow','begin'],input:{id:workflow.id,step:'1'}});
  const next=f.hook('beforeSubmitPrompt',{prompt:'Resume after lost close'});assert.equal(next.status,0,next.stderr);
  assert.equal(JSON.parse(next.stdout).continue,undefined);
  assert.equal(f.call('core',{args:['workflow','resume'],input:{id:workflow.id}}).status,'interrupted');
});

test('Cursor stop recovers owned work across native workspaces without stopping another chat',t=>{
  const f=fixture(t),linked=path.join(f.root,'linked');
  const git=args=>{const result=spawnSync('git',['-C',f.project,...args],{encoding:'utf8',windowsHide:true});assert.equal(result.status,0,result.stderr);};
  git(['init']);git(['-c','user.name=BFS Test','-c','user.email=bfs@example.invalid','-c','commit.gpgsign=false','commit','--allow-empty','-m','fixture']);
  git(['worktree','add','--detach',linked,'HEAD']);
  const otherRoot={workspace_roots:[process.platform==='win32'?'/'+linked.replaceAll('\\','/'):linked]},otherChat={conversation_id:'session-b',session_id:'session-b'};
  const start=extra=>{
    const record=f.call('core',{args:['workflow','start'],input:{goal:'Owned worktree step',skills:['bfs-health']}},extra);
    f.call('core',{args:['workflow','begin'],input:{id:record.id,step:'1'}},extra);return record;
  };
  const main=start({}),otherWorkspace=start(otherRoot),otherSession=start(otherChat);
  const finished=f.hook('stop',{status:'aborted'});assert.equal(finished.status,0,finished.stderr);
  const resume=(record,extra={})=>f.call('core',{args:['workflow','resume'],input:{id:record.id}},extra);
  assert.equal(resume(main).status,'interrupted');assert.equal(resume(otherWorkspace,otherRoot).status,'interrupted');
  assert.equal(resume(otherSession,otherChat).status,'running');assert.notEqual(main.workspaceId,otherWorkspace.workspaceId);
});
