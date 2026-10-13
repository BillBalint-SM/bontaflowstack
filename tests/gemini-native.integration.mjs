import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {writeNativeEvidence,writeAcceptanceEvidence} from './fixtures/native-evidence.mjs';

test('native Gemini loads the BFS adapter and binds its actual MCP status call',{skip:process.env.BFS_RUN_GEMINI_NATIVE!=='1'},()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'bfs-gemini-native-')),project=path.join(root,'project with spaces');
  fs.mkdirSync(path.join(project,'.gemini'),{recursive:true});
  const core=fileURLToPath(new URL('../plugins/bontaflowstack/core/',import.meta.url)),state=path.join(root,'state');
  const quote=value=>`'${value.replaceAll("'","''")}'`;
  fs.writeFileSync(path.join(project,'.gemini','settings.json'),JSON.stringify({
    mcpServers:{bfs:{command:process.execPath,args:[path.join(core,'gemini-host.mjs')],env:{BFS_STATE_HOME:state}}},
    hooks:Object.fromEntries(['SessionStart','BeforeAgent','BeforeTool','AfterTool','AfterAgent','SessionEnd'].map(event=>[event,[{hooks:[{type:'command',command:`& ${[process.execPath,path.join(core,'gemini-hook.mjs'),event].map(quote).join(' ')}`,timeout:10000}]}]]))
  },null,2));
  const policy=path.join(root,'test-policy.toml');
  fs.writeFileSync(policy,'[[rule]]\nmcpName = "bfs"\ntoolName = "status"\ndecision = "allow"\npriority = 100\n');
  const cli=process.env.BFS_GEMINI_CLI || path.join(process.env.APPDATA,'npm','node_modules','@google','gemini-cli','bundle','gemini.js'),model=process.env.BFS_GEMINI_MODEL || 'gemini-3.6-flash';
  const result=spawnSync(process.execPath,[cli,'--policy',policy,'-m',model,'-o','stream-json','-p','Call mcp_bfs_status exactly once with no arguments. Do not use another tool. Report its host and sessionId.'],{cwd:project,env:{...process.env,BFS_STATE_HOME:state},encoding:'utf8',windowsHide:true,timeout:90000,maxBuffer:8*1024*1024});
  const diagnostic=writeNativeEvidence(path.join(root,'native-evidence.json'),result);
  assert.equal(result.status,0,JSON.stringify(diagnostic));
  const events=result.stdout.trim().split('\n').map(JSON.parse),init=events.find(event=>event.type==='init');
  const call=events.find(event=>event.type==='tool_use' && event.tool_name==='mcp_bfs_status');
  assert.ok(call,'Missing BFS status call');
  const returned=events.find(event=>event.type==='tool_result' && event.tool_id===call.tool_id);
  assert.ok(returned,'Missing native tool result');assert.equal(returned.status,'success',JSON.stringify(diagnostic));
  const data=JSON.parse(returned.output);
  assert.equal(data.host,'gemini-cli');assert.equal(data.hostWorkspace,project);assert.equal(data.sessionId,init.session_id);
  const version=spawnSync(process.execPath,[cli,'--version'],{encoding:'utf8',windowsHide:true,timeout:15000});assert.equal(version.status,0,version.stderr);
  const file=path.join(root,'result.json');
  fs.writeFileSync(file,JSON.stringify({version:version.stdout.trim(),model,host:data.host,sessionId:data.sessionId,workspace:project,taskId:data.taskId,tool:call.tool_name},null,2)+'\n');
  writeAcceptanceEvidence(file);
  console.log(`Native adapter evidence: ${file}`);
});
