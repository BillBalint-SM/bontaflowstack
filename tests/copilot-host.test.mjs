import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const core=fileURLToPath(new URL('../plugins/bontaflowstack/core/',import.meta.url));
function fixture(t) {
  const root=fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()),'bfs-copilot-'));
  const project=path.join(root,'project with spaces');fs.mkdirSync(project);
  const options={cwd:project,env:{...process.env,BFS_STATE_HOME:path.join(root,'state')},encoding:'utf8',windowsHide:true,timeout:15000};
  const hook=(kind,extra={})=>spawnSync(process.execPath,[path.join(core,'copilot-hook.mjs'),kind],{...options,input:JSON.stringify({sessionId:'session-a',cwd:project,timestamp:Date.now(),...extra})});
  const bind=(name,args={},extra={})=>{
    const result=hook('preToolUse',{toolName:`bfs-${name}`,toolArgs:args,...extra});
    assert.equal(result.status,0,result.stderr);const output=JSON.parse(result.stdout);
    assert.equal(output.permissionDecision,undefined,'BFS must retain native permission');return output.modifiedArgs;
  };
  const rpc=requests=>{
    const result=spawnSync(process.execPath,[path.join(core,'copilot-host.mjs')],{...options,input:requests.map((request,index)=>JSON.stringify({jsonrpc:'2.0',id:index+1,...request})).join('\n')+'\n'});
    assert.equal(result.status,0,result.stderr);return result.stdout.trim().split('\n').map(JSON.parse);
  };
  const call=(name,args={},extra={})=>{
    const response=rpc([{method:'tools/call',params:{name,arguments:bind(name,args,extra)}}])[0];
    assert.equal(response.result.isError,undefined,response.result.content[0].text);return JSON.parse(response.result.content[0].text);
  };
  t.after(()=>{assert.equal(path.dirname(root),fs.realpathSync.native(os.tmpdir()));assert.match(path.basename(root),/^bfs-copilot-/);fs.rmSync(root,{recursive:true,force:true});});
  return {root,project,options,hook,bind,rpc,call};
}

test('Copilot native session owns an argument-bound one-use MCP call',t=>{
  const f=fixture(t),start=f.hook('sessionStart',{source:'startup'});assert.equal(start.status,0,start.stderr);
  const bound=f.bind('status');assert.equal(typeof bound._bfsCall,'string');
  const responses=f.rpc([
    {method:'initialize',params:{protocolVersion:'2025-06-18',capabilities:{}}},
    {method:'tools/call',params:{name:'status',arguments:bound}},
    {method:'tools/call',params:{name:'status',arguments:bound}},
    {method:'tools/call',params:{name:'status',arguments:{}}}
  ]);
  assert.equal(responses[0].result.serverInfo.name,'bontaflowstack-copilot');
  assert.equal(responses[1].result.isError,undefined);
  const status=JSON.parse(responses[1].result.content[0].text);
  assert.equal(status.host,'copilot-cli');assert.equal(status.sessionId,'session-a');assert.equal(status.hostWorkspace,f.project);
  assert.match(status.taskId,/^copilot-[a-f0-9]{64}$/);assert.notEqual(status.taskId,process.env.CODEX_THREAD_ID);
  assert.equal(responses[2].result.isError,true);assert.match(responses[2].result.content[0].text,/consumed/);
  assert.equal(responses[3].result.isError,true);assert.match(responses[3].result.content[0].text,/binding is missing/);
  const modified=f.bind('core',{args:['memory','list']});modified.args=['status'];
  assert.equal(f.rpc([{method:'tools/call',params:{name:'core',arguments:modified}}])[0].result.isError,true);
});

test('native MCP preserves completed Impeccable findings and distinguishes scan failures',t=>{
  const f=fixture(t),engine=path.join(f.root,'engine'),hash=value=>createHash('sha256').update(value).digest('hex');
  fs.mkdirSync(path.join(engine,'src'),{recursive:true});fs.mkdirSync(path.join(engine,'.browsers'));
  const source='process.stdout.write("fixture detector output");process.exit(Number(process.argv.at(-1)));';
  fs.writeFileSync(path.join(engine,'src/detect.mjs'),source);
  const manifest=JSON.stringify({schema:1,name:'bontaflowstack-engines',version:'0.3.3',platform:`${process.platform}-${process.arch}`,browserDirectory:'.browsers',files:{'src/detect.mjs':hash(source)},commands:{'design-detect':{program:'node',args:['src/detect.mjs']}}});
  fs.writeFileSync(path.join(engine,'engine.json'),manifest);
  f.call('core',{args:['engine','register'],input:{root:engine,sha256:hash(manifest)}});
  for(const [action,code,failed] of [['detect',0,false],['detect',2,false],['detect',1,true],['other',2,true]]) {
    const result=f.rpc([{method:'tools/call',params:{name:'core',arguments:f.bind('core',{args:['engine','design-detect','--',action,String(code)]})}}])[0].result;
    const value=JSON.parse(result.content[0].text);assert.equal(value.exitCode,code);assert.equal(value.status,failed?'failed':'completed');assert.equal(result.isError,failed?true:undefined);
  }
});

test('Copilot interruption preserves shared memory and isolates work across sessions and cwd changes',t=>{
  const f=fixture(t),outside=path.join(f.root,'outside');fs.mkdirSync(outside);
  const run=(args,input={},extra={})=>f.call('core',{args,input},extra);
  run(['memory','put'],{kind:'fact',key:'fixture',text:'Persistent project fact',source:'observed'});
  const workflow=run(['workflow','start'],{goal:'Owned native work',skills:['bfs-health']});
  run(['workflow','begin'],{id:workflow.id,step:'1'});
  const other={sessionId:'session-b'},second=run(['workflow','start'],{goal:'Other native work',skills:['bfs-health']},other);
  run(['workflow','begin'],{id:second.id,step:'1'},other);
  assert.equal(f.call('status',{}, {cwd:outside}).hostWorkspace,f.project);
  assert.equal(run(['memory','list'],{},other)[0].text,'Persistent project fact');
  const foreign=f.rpc([{method:'tools/call',params:{name:'core',arguments:f.bind('core',{args:['workflow','begin'],input:{id:workflow.id,step:'1'}},other)}}])[0];
  assert.equal(foreign.result.isError,true);assert.match(foreign.result.content[0].text,/adopt/);
  const stopped=f.hook('agentStop',{cwd:outside,stopReason:'end_turn'});assert.equal(stopped.status,0,stopped.stderr);
  assert.equal(run(['workflow','resume'],{id:workflow.id}).status,'interrupted');
  assert.equal(run(['workflow','resume'],{id:second.id},other).status,'running');
  const bound=f.bind('status'),ended=f.hook('sessionEnd',{reason:'abort'});assert.equal(ended.status,0,ended.stderr);
  assert.equal(f.rpc([{method:'tools/call',params:{name:'status',arguments:bound}}])[0].result.isError,true);
  const restarted=f.hook('userPromptSubmitted',{prompt:'Continue'});assert.equal(restarted.status,0,restarted.stderr);
  assert.match(JSON.parse(restarted.stdout).additionalContext,/BFS_CONTEXT_DATA/);
  assert.equal(run(['memory','list'],{},other)[0].text,'Persistent project fact');
});

test('Copilot edit and PowerShell hooks enforce the guard without granting native permission',t=>{
  const f=fixture(t),allowed=path.join(f.project,'allowed');fs.mkdirSync(allowed);
  f.call('core',{args:['guard','status']});
  const observed=f.hook('postToolUse',{toolName:'bfs-core',toolArgs:{args:['guard','status']},toolResult:{resultType:'success',textResultForLlm:'checked'}});
  assert.equal(observed.status,0,observed.stderr);
  const marker=JSON.parse(observed.stdout).additionalContext.match(/BFS_GUARD_OBSERVED task=\S+ workspace=\S+/)?.[0];assert.ok(marker);
  f.call('core',{args:['guard','set'],input:{boundary:allowed,warnings:true,observation:marker}});
  for(const toolName of ['create','edit']) {
    const denied=f.hook('preToolUse',{toolName,toolArgs:JSON.stringify({path:path.join(f.root,'outside.txt'),new_str:'must not write'})});
    assert.equal(denied.status,0,denied.stderr);assert.equal(JSON.parse(denied.stdout).permissionDecision,'deny');
  }
  const denied=f.hook('preToolUse',{toolName:'powershell',toolArgs:{command:'Remove-Item -LiteralPath ./target.txt'}});
  assert.equal(denied.status,0,denied.stderr);assert.equal(JSON.parse(denied.stdout).permissionDecision,'deny');
  const allowedCall=f.hook('preToolUse',{toolName:'powershell',toolArgs:{command:'git status --short'}});
  assert.equal(allowedCall.status,0,allowedCall.stderr);assert.equal(JSON.parse(allowedCall.stdout).permissionDecision,undefined);
  const invalid=f.hook('preToolUse',{sessionId:'../forged',toolName:'bfs-status',toolArgs:{}});
  assert.notEqual(invalid.status,0);assert.equal(JSON.parse(invalid.stdout).permissionDecision,'deny');
  const workflow=f.call('core',{args:['workflow','start'],input:{goal:'Failing tool',skills:['bfs-health']}});
  f.call('core',{args:['workflow','begin'],input:{id:workflow.id,step:'1'}});
  const failed=f.hook('postToolUseFailure',{toolName:'powershell',toolArgs:{command:'example'},error:'Native tool failed'});
  assert.equal(failed.status,0,failed.stderr);
  assert.equal(f.call('core',{args:['workflow','resume'],input:{id:workflow.id}}).status,'interrupted');
});

test('Copilot raw apply_patch input retains patch-path guarding and native permission',t=>{
  const f=fixture(t),allowed=path.join(f.project,'allowed');fs.mkdirSync(allowed);
  f.call('core',{args:['guard','status']});
  const marker=JSON.parse(f.hook('postToolUse',{toolName:'bfs-status'}).stdout).additionalContext.match(/BFS_GUARD_OBSERVED task=\S+ workspace=\S+/)[0];
  f.call('core',{args:['guard','set'],input:{boundary:allowed,observation:marker}});
  const patch='*** Begin Patch\n*** Add File: allowed/test.txt\n+kept\n*** End Patch\n';
  for(const toolArgs of [patch,JSON.stringify({patch})]) {
    const response=f.hook('preToolUse',{toolName:'apply_patch',toolArgs});
    assert.equal(response.status,0,response.stderr);
    assert.deepEqual(JSON.parse(response.stdout),{},'inspect the patch without rewriting it or granting native permission');
  }
  for(const outside of [patch.replace('allowed/test.txt','../outside.txt'),patch.replace('*** Add File: allowed/test.txt','*** Update File: allowed/test.txt\n*** Move to: ../outside.txt')]) {
    const denied=f.hook('preToolUse',{toolName:'apply_patch',toolArgs:outside});
    assert.equal(denied.status,0,denied.stderr);assert.equal(JSON.parse(denied.stdout).permissionDecision,'deny');
  }
  const forged=f.hook('preToolUse',{toolName:'bfs-core',toolArgs:patch});
  assert.notEqual(forged.status,0);assert.equal(JSON.parse(forged.stdout).permissionDecision,'deny');
});

test('Copilot end-of-turn recovery interrupts owned work in each linked worktree',t=>{
  const f=fixture(t),linked=path.join(f.root,'linked');
  const git=args=>{const result=spawnSync('git',['-C',f.project,...args],{encoding:'utf8',windowsHide:true});assert.equal(result.status,0,result.stderr);};
  git(['init']);git(['-c','user.name=BFS Test','-c','user.email=bfs@example.invalid','-c','commit.gpgsign=false','commit','--allow-empty','-m','fixture']);
  git(['worktree','add','--detach',linked,'HEAD']);
  const start=extra=>{
    const record=f.call('core',{args:['workflow','start'],input:{goal:'Owned worktree step',skills:['bfs-health']}},extra);
    f.call('core',{args:['workflow','begin'],input:{id:record.id,step:'1'}},extra);return record;
  };
  const main=start({}),otherWorkspace=start({cwd:linked}),otherSession=start({sessionId:'session-b'});
  const finished=f.hook('agentStop',{stopReason:'end_turn'});assert.equal(finished.status,0,finished.stderr);
  const resume=(record,extra={})=>f.call('core',{args:['workflow','resume'],input:{id:record.id}},extra);
  assert.equal(resume(main).status,'interrupted');assert.equal(resume(otherWorkspace,{cwd:linked}).status,'interrupted');
  assert.equal(resume(otherSession,{sessionId:'session-b'}).status,'running');
  assert.notEqual(main.workspaceId,otherWorkspace.workspaceId);
});
