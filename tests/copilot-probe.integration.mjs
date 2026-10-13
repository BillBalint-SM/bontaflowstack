import {writeAcceptanceEvidence} from './fixtures/native-evidence.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

for(const behavior of (process.env.BFS_PROBE_BEHAVIOR || 'pass').split(','))test(`native Copilot hook/MCP contract: ${behavior}`,{skip:process.env.BFS_RUN_COPILOT_PROBE!=='1'},()=>{
  assert.ok(['pass','deny','crash','timeout'].includes(behavior));
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'bfs-copilot-probe-'));
  const plugin=path.join(root,'plugin with spaces'),project=path.join(root,'project'),evidence=path.join(root,'evidence');
  for(const directory of [plugin,project,evidence,path.join(plugin,'com.github.copilot','hooks')])fs.mkdirSync(directory,{recursive:true});
  const write=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
  fs.copyFileSync(fileURLToPath(new URL('./fixtures/native-probe.mjs',import.meta.url)),path.join(plugin,'probe.mjs'));
  write(path.join(plugin,'plugin.json'),{$schema:'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json',name:'bfs-probe',version:'0.0.1',description:'Isolated native host contract probe'});
  write(path.join(plugin,'mcp.json'),{$schema:'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json',mcpServers:{bfsprobe:{type:'stdio',command:process.execPath,args:['${PLUGIN_ROOT}/probe.mjs','server',evidence]}}});
  write(path.join(plugin,'com.github.copilot','hooks','hooks.json'),{version:1,hooks:Object.fromEntries(['sessionStart','preToolUse','postToolUse','agentStop','sessionEnd'].map(event=>[event,[{type:'command',exec:process.execPath,args:['${PLUGIN_ROOT}/probe.mjs','copilot-hook',evidence,event,behavior],timeoutSec:behavior==='timeout' && event==='preToolUse'?5:10}]]))});
  const cli=process.env.BFS_COPILOT_CLI || path.join(process.env.APPDATA,'npm','node_modules','@github','copilot','npm-loader.js');
  assert.ok(fs.existsSync(cli),`Copilot CLI entry not found: ${cli}`);
  const result=spawnSync(process.execPath,[cli,'--plugin-dir',plugin,'--no-custom-instructions','--disable-builtin-mcps','--no-auto-update','--no-remote','--no-remote-export','--output-format','json','--allow-tool','bfsprobe(ping)','-p','Call the bfsprobe ping MCP tool exactly once with value="probe". Do not call any other tool or retry an error. Report its exact result.'],{cwd:project,encoding:'utf8',windowsHide:true,timeout:90000,maxBuffer:8*1024*1024});
  // Keep only the probe events and outcome; host transcripts may contain unrelated account metadata.
  const events=fs.existsSync(path.join(evidence,'events.jsonl'))?fs.readFileSync(path.join(evidence,'events.jsonl'),'utf8').trim().split('\n').map(JSON.parse):[];
  const version=spawnSync(process.execPath,[cli,'--version'],{encoding:'utf8',windowsHide:true,timeout:15000});
  assert.equal(version.status,0,version.stderr);
  const summary={version:version.stdout.trim(),platform:process.platform,arch:process.arch,behavior,exitCode:result.status,events};
  write(path.join(evidence,'result.json'),summary);console.log(`Probe evidence: ${path.join(evidence,'result.json')}`);
  writeAcceptanceEvidence(path.join(evidence,'result.json'));
  assert.equal(result.status,0,result.error?.message || result.stderr);
  assert.ok(events.some(event=>event.kind==='preToolUse'),'Native preToolUse must actually run');
  if(['deny','crash'].includes(behavior)) {
    assert.equal(events.filter(event=>event.kind==='mcp-call').length,0,'Denied or crashed hook must stop MCP execution');return;
  }
  if(behavior==='timeout') {
    const calls=events.filter(event=>event.kind==='mcp-call');assert.ok(calls.length,'Measure native timeout fail-open behavior');
    assert.ok(calls.every(event=>event.bound===false),'A timed-out hook must not supply a binding');return;
  }
  assert.ok(events.some(event=>event.kind==='mcp-call' && event.bound),'No bound native call; inspect the retained probe events');
  const call=events.find(event=>event.kind==='mcp-call');
  assert.equal(call.cwd,project);assert.ok(events.some(event=>event.kind==='preToolUse' && event.sessionId===call.sessionId));
});
