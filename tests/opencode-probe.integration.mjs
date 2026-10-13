import {writeAcceptanceEvidence} from './fixtures/native-evidence.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

for(const behavior of (process.env.BFS_PROBE_BEHAVIOR || 'pass').split(','))test(`native OpenCode V1 hook/MCP contract: ${behavior}`,{skip:process.env.BFS_RUN_OPENCODE_PROBE!=='1'},()=>{
  assert.ok(['pass','deny'].includes(behavior));
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'bfs-opencode-probe-'));
  const project=path.join(root,'project with spaces'),evidence=path.join(root,'evidence');
  for(const directory of [path.join(project,'.opencode','plugins'),evidence])fs.mkdirSync(directory,{recursive:true});
  const write=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
  const probe=path.join(root,'probe.mjs');fs.copyFileSync(fileURLToPath(new URL('./fixtures/native-probe.mjs',import.meta.url)),probe);
  fs.copyFileSync(fileURLToPath(new URL('./fixtures/opencode-probe.js',import.meta.url)),path.join(project,'.opencode','plugins','bfs-probe.js'));
  write(path.join(project,'opencode.json'),{$schema:'https://opencode.ai/config.json',share:'disabled',mcp:{bfsprobe:{type:'local',command:[process.execPath,probe,'server',evidence],enabled:true}},permission:{'*':'ask',bfsprobe_ping:'allow'}});
  const cli=process.env.BFS_OPENCODE_CLI || path.join(process.env.APPDATA,'npm','node_modules','opencode-ai','bin','opencode.exe');
  assert.ok(fs.existsSync(cli),`OpenCode CLI entry not found: ${cli}`);
  const result=spawnSync(cli,['run','--model','opencode/longcat-2.5-preview-free','--format','json','Call the bfsprobe_ping MCP tool exactly once with value="probe". Do not call any other tool or retry an error. Report its exact result.'],{cwd:project,env:{...process.env,BFS_PROBE_FOLDER:evidence,BFS_PROBE_BEHAVIOR:behavior},encoding:'utf8',windowsHide:true,timeout:90000,maxBuffer:8*1024*1024});
  const events=fs.existsSync(path.join(evidence,'events.jsonl'))?fs.readFileSync(path.join(evidence,'events.jsonl'),'utf8').trim().split('\n').map(JSON.parse):[];
  const version=spawnSync(cli,['--version'],{encoding:'utf8',windowsHide:true,timeout:15000});assert.equal(version.status,0,version.stderr);
  write(path.join(evidence,'result.json'),{version:version.stdout.trim(),api:'V1',platform:process.platform,arch:process.arch,behavior,exitCode:result.status,events});console.log(`Probe evidence: ${path.join(evidence,'result.json')}`);
  writeAcceptanceEvidence(path.join(evidence,'result.json'));
  assert.equal(result.status,0,'Native probe failed; inspect the retained probe events');
  if(behavior==='deny') {
    assert.ok(events.some(event=>event.kind==='tool.execute.before' && event.toolName==='bfsprobe_ping'),'Native callback must run');
    assert.equal(events.filter(event=>event.kind==='mcp-call').length,0,'A denied callback must stop the MCP call');
    assert.match(result.stdout,/BFS_PROBE_DENIED/);return;
  }
  assert.ok(events.some(event=>event.kind==='mcp-call' && event.bound),'No bound native call; inspect the retained probe events');
  const call=events.find(event=>event.kind==='mcp-call');assert.equal(call.cwd,project);
  assert.ok(events.some(event=>event.kind==='tool.execute.before' && event.sessionId===call.sessionId && typeof event.callId==='string'));
});
