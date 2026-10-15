import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const core=fileURLToPath(new URL('../plugins/bontaflowstack/core/',import.meta.url));
function fixture(t) {
  const root=fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()),'bfs-gemini-'));
  const project=path.join(root,'project with spaces');fs.mkdirSync(project);
  const env={...process.env,BFS_STATE_HOME:path.join(root,'state'),GEMINI_PROJECT_DIR:project};
  delete env.GEMINI_SESSION_ID;
  const options={cwd:project,env,encoding:'utf8',windowsHide:true,timeout:15000};
  const hook=(kind,extra={})=>spawnSync(process.execPath,[path.join(core,'gemini-hook.mjs'),kind],{...options,input:JSON.stringify({session_id:'session-a',cwd:project,hook_event_name:kind,...extra})});
  const bind=(name,args={},extra={})=>{
    const result=hook('BeforeTool',{tool_name:`mcp_bfs_${name}`,tool_input:args,...extra});
    assert.equal(result.status,0,result.stderr);
    const output=JSON.parse(result.stdout);assert.equal(output.decision,undefined,'BFS must not grant native permission');
    return output.hookSpecificOutput.tool_input;
  };
  const rpc=requests=>{
    const result=spawnSync(process.execPath,[path.join(core,'gemini-host.mjs')],{...options,input:requests.map((request,index)=>JSON.stringify({jsonrpc:'2.0',id:index+1,...request})).join('\n')+'\n'});
    assert.equal(result.status,0,result.stderr);return result.stdout.trim().split('\n').map(line=>JSON.parse(line));
  };
  const call=(name,args={},extra={})=>{
    const response=rpc([{method:'tools/call',params:{name,arguments:bind(name,args,extra)}}])[0];
    assert.equal(response.result.isError,undefined,response.result.content[0].text);return JSON.parse(response.result.content[0].text);
  };
  t.after(()=>{assert.equal(path.dirname(root),fs.realpathSync.native(os.tmpdir()));assert.match(path.basename(root),/^bfs-gemini-/);fs.rmSync(root,{recursive:true,force:true});});
  return {root,project,env,hook,bind,rpc,call};
}

test('Gemini hook supplies an argument-bound one-use MCP call with native session ownership',t=>{
  const f=fixture(t);
  const start=f.hook('SessionStart',{source:'startup'});assert.equal(start.status,0,start.stderr);
  const bound=f.bind('status');assert.equal(typeof bound._bfsCall,'string');
  const replies=f.rpc([
    {method:'initialize',params:{protocolVersion:'2025-06-18',capabilities:{}}},
    {method:'tools/list'},
    {method:'tools/call',params:{name:'status',arguments:bound}},
    {method:'tools/call',params:{name:'status',arguments:bound}},
    {method:'tools/call',params:{name:'status',arguments:{}}}
  ]);
  assert.equal(replies[0].result.serverInfo.name,'bontaflowstack-gemini');
  assert.deepEqual(replies[1].result.tools.map(tool=>tool.name),['core','status','select_project','browser','render']);
  assert.equal(replies[2].result.isError,undefined);
  const status=JSON.parse(replies[2].result.content[0].text);
  assert.equal(status.host,'gemini-cli');assert.equal(status.sessionId,'session-a');
  assert.equal(status.hostWorkspace,f.project);assert.match(status.taskId,/^gemini-[a-f0-9]{64}$/);
  assert.notEqual(status.taskId,process.env.CODEX_THREAD_ID);
  assert.equal(replies[3].result.isError,true);assert.match(replies[3].result.content[0].text,/consumed/);
  assert.equal(replies[4].result.isError,true);assert.match(replies[4].result.content[0].text,/binding is missing/);
});

test('Gemini memory is shared across sessions while interrupted workflows keep their native owner',t=>{
  const f=fixture(t),run=(args,input={},extra={})=>f.call('core',{args,input},extra);
  assert.equal(f.hook('SessionStart',{source:'startup'}).status,0);
  const workflow=run(['workflow','start'],{goal:'Save a checked native step',skills:['bfs-health']});
  run(['workflow','begin'],{id:workflow.id,step:'1'});
  run(['memory','put'],{kind:'fact',key:'fixture',text:'Shared project fact',source:'observed'});
  const other={session_id:'session-b'};
  assert.equal(run(['memory','list'],{},other)[0].text,'Shared project fact');
  const foreign=f.rpc([{method:'tools/call',params:{name:'core',arguments:f.bind('core',{args:['workflow','begin'],input:{id:workflow.id,step:'1'}},other)}}])[0];
  assert.equal(foreign.result.isError,true);assert.match(foreign.result.content[0].text,/adopt/);
  const interrupted=f.hook('BeforeAgent',{prompt:'Continue the saved work'});
  assert.equal(interrupted.status,0,interrupted.stderr);
  assert.match(JSON.parse(interrupted.stdout).hookSpecificOutput.additionalContext,/BFS_CONTEXT_DATA/);
  assert.equal(run(['workflow','resume'],{id:workflow.id}).status,'interrupted');
  const resumed=run(['workflow','resume'],{id:workflow.id},other);
  assert.equal(resumed.requiresAdoption,true);
  const pending=f.bind('status');
  const end=f.hook('SessionEnd',{reason:'exit'});assert.equal(end.status,0,end.stderr);
  const abandoned=f.rpc([{method:'tools/call',params:{name:'status',arguments:pending}}])[0];
  assert.equal(abandoned.result.isError,true);
  assert.equal(run(['memory','list'],{},other)[0].text,'Shared project fact');
});

test('Gemini edit and shell tools honor the native guard after cwd changes without granting permission',t=>{
  const f=fixture(t),allowed=path.join(f.project,'allowed'),outside=path.join(f.root,'outside');
  fs.mkdirSync(allowed);fs.mkdirSync(outside);
  f.call('core',{args:['guard','status']});
  const observed=f.hook('AfterTool',{tool_name:'mcp_bfs_core',tool_input:{args:['guard','status']},tool_response:{}});
  assert.equal(observed.status,0,observed.stderr);
  const marker=JSON.parse(observed.stdout).hookSpecificOutput.additionalContext.match(/BFS_GUARD_OBSERVED task=\S+ workspace=\S+/)?.[0];
  assert.ok(marker,'Guard marker must arrive through a supported context hook');
  f.call('core',{args:['guard','set'],input:{boundary:allowed,warnings:true,observation:marker}});
  for(const tool_name of ['write_file','replace']) {
    const denied=f.hook('BeforeTool',{cwd:outside,tool_name,tool_input:{file_path:'escape.txt',content:'must not write'}});
    assert.equal(denied.status,0,denied.stderr);assert.equal(JSON.parse(denied.stdout).decision,'deny');
  }
  const destructive=f.hook('BeforeTool',{tool_name:'run_shell_command',tool_input:{command:process.platform==='win32'?'Remove-Item -LiteralPath ./target.txt':'rm ./target.txt'}});
  assert.equal(destructive.status,0,destructive.stderr);assert.equal(JSON.parse(destructive.stdout).decision,'deny');
  const readonly=f.hook('BeforeTool',{tool_name:'run_shell_command',tool_input:{command:'git status --short'}});
  assert.equal(readonly.status,0,readonly.stderr);assert.equal(JSON.parse(readonly.stdout).decision,undefined);
  const dynamic=f.hook('BeforeTool',{tool_name:'run_shell_command',tool_input:{command:process.platform==='win32'?'git $args':'git "$ACTION"'}});
  assert.equal(dynamic.status,0,dynamic.stderr);assert.equal(JSON.parse(dynamic.stdout).decision,'deny');
  assert.equal(f.call('status',{}, {cwd:outside}).hostWorkspace,f.project);
  const invalid=f.hook('BeforeTool',{session_id:'../forged',tool_name:'mcp_bfs_status',tool_input:{}});
  assert.equal(invalid.status,2);assert.equal(JSON.parse(invalid.stdout).decision,'deny');
  assert.equal(fs.existsSync(path.join(outside,'escape.txt')),false);
});

test('Gemini turn completion interrupts only its running work across linked worktrees',t=>{
  const f=fixture(t),linked=path.join(f.root,'linked');
  const git=args=>{const result=spawnSync('git',['-C',f.project,...args],{encoding:'utf8',windowsHide:true});assert.equal(result.status,0,result.stderr);};
  git(['init']);git(['-c','user.name=BFS Test','-c','user.email=bfs@example.invalid','-c','commit.gpgsign=false','commit','--allow-empty','-m','fixture']);
  git(['worktree','add','--detach',linked,'HEAD']);
  const start=extra=>{
    const record=f.call('core',{args:['workflow','start'],input:{goal:'Owned worktree step',skills:['bfs-health']}},extra);
    f.call('core',{args:['workflow','begin'],input:{id:record.id,step:'1'}},extra);return record;
  };
  const main=start({}),otherWorkspace=start({cwd:linked}),otherSession=start({session_id:'session-b'});
  const finished=f.hook('AfterAgent',{prompt:'Task fixture',prompt_response:'Interrupted before completion',stop_hook_active:false});
  assert.equal(finished.status,0,finished.stderr);
  const resume=(record,extra={})=>f.call('core',{args:['workflow','resume'],input:{id:record.id}},extra);
  assert.equal(resume(main).status,'interrupted');assert.equal(resume(otherWorkspace,{cwd:linked}).status,'interrupted');
  assert.equal(resume(otherSession,{session_id:'session-b'}).status,'running');
  assert.notEqual(main.workspaceId,otherWorkspace.workspaceId);
});
