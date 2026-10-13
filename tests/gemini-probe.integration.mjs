import {writeAcceptanceEvidence} from './fixtures/native-evidence.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

for(const behavior of (process.env.BFS_PROBE_BEHAVIOR || 'pass').split(','))test(`native Gemini hook/MCP contract: ${behavior}`,{skip:process.env.BFS_RUN_GEMINI_PROBE!=='1'},()=>{
  assert.ok(['pass','deny','crash','timeout'].includes(behavior));
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'bfs-gemini-probe-'));
  const project=path.join(root,'project with spaces'),evidence=path.join(root,'evidence');
  for(const directory of [path.join(project,'.gemini'),evidence])fs.mkdirSync(directory,{recursive:true});
  const write=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
  const probe=path.join(root,'probe.mjs');fs.copyFileSync(fileURLToPath(new URL('./fixtures/native-probe.mjs',import.meta.url)),probe);
  const quote=value=>`'${value.replaceAll("'","''")}'`;
  write(path.join(project,'.gemini','settings.json'),{
    mcpServers:{bfsprobe:{command:process.execPath,args:[probe,'server',evidence]}},
    hooks:Object.fromEntries(['SessionStart','BeforeTool','AfterTool','AfterAgent','SessionEnd'].map(event=>[event,[{hooks:[{type:'command',command:`& ${[process.execPath,probe,'gemini-hook',evidence,event,behavior].map(quote).join(' ')}`,timeout:behavior==='timeout'?5000:10000}]}]]))
  });
  const cli=process.env.BFS_GEMINI_CLI || path.join(process.env.APPDATA,'npm','node_modules','@google','gemini-cli','bundle','gemini.js');
  assert.ok(fs.existsSync(cli),`Gemini CLI entry not found: ${cli}`);
  const policy=path.join(root,'probe-policy.toml');
  fs.writeFileSync(policy,'[[rule]]\nmcpName = "bfsprobe"\ntoolName = "ping"\ndecision = "allow"\npriority = 100\n');
  const model=process.env.BFS_GEMINI_MODEL || 'gemini-3.6-flash';
  const result=spawnSync(process.execPath,[cli,'--policy',policy,'-m',model,'-o','json','-p','Call the mcp_bfsprobe_ping MCP tool exactly once with value="probe". Do not call any other tool or retry an error. Report its exact result.'],{cwd:project,encoding:'utf8',windowsHide:true,timeout:90000,maxBuffer:8*1024*1024});
  const events=fs.existsSync(path.join(evidence,'events.jsonl'))?fs.readFileSync(path.join(evidence,'events.jsonl'),'utf8').trim().split('\n').map(JSON.parse):[];
  const version=spawnSync(process.execPath,[cli,'--version'],{encoding:'utf8',windowsHide:true,timeout:15000});assert.equal(version.status,0,version.stderr);
  write(path.join(evidence,'result.json'),{version:version.stdout.trim(),model,behavior,platform:process.platform,arch:process.arch,exitCode:result.status,events});console.log(`Probe evidence: ${path.join(evidence,'result.json')}`);
  writeAcceptanceEvidence(path.join(evidence,'result.json'));
  assert.equal(result.status,0,result.error?.message || result.stderr);
  if(behavior!=='pass') {
    assert.ok(events.some(event=>event.kind==='BeforeTool' && event.toolName==='mcp_bfsprobe_ping'),'The native tool hook must run');
    assert.equal(events.filter(event=>event.kind==='mcp-call' && event.bound).length,0,'A failed hook must never produce a bound call');
    if(behavior==='timeout') {
      assert.ok(events.some(event=>event.kind==='mcp-call' && !event.bound),'Measure the host timeout behavior');
      assert.match(result.stdout,/Missing native hook argument binding/);
    }else {
      assert.equal(events.filter(event=>event.kind==='mcp-call').length,0,'Native denial must prevent the MCP call');
      assert.match(result.stdout,behavior==='deny'?/BFS_PROBE_DENIED/:/BFS_PROBE_CRASH/);
    }
    return;
  }
  assert.ok(events.some(event=>event.kind==='mcp-call' && event.bound),'No bound native call; inspect the retained probe events');
  const call=events.find(event=>event.kind==='mcp-call');assert.equal(call.cwd,project);
  assert.ok(events.some(event=>event.kind==='BeforeTool' && event.sessionId===call.sessionId));
});
