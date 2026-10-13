import {writeAcceptanceEvidence} from './fixtures/native-evidence.mjs';
// Native IDE probe: prepare, run the printed prompt in Cursor, then check <root>.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

const [mode,rootArgument]=process.argv.slice(2);
const write=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
if(mode==='prepare') {
  assert.equal(process.platform,'win32');
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'bfs-cursor-probe-'));
  const project=path.join(root,'project with spaces'),evidence=path.join(root,'evidence');
  const plugin=path.join(os.homedir(),'.cursor','plugins','local',path.basename(root));
  assert.ok(!fs.existsSync(plugin),'Probe must not replace an existing plugin');
  for(const dir of [project,evidence,path.join(plugin,'.cursor-plugin'),path.join(plugin,'hooks'),path.join(plugin,'skills','bfs-native-probe')])fs.mkdirSync(dir,{recursive:true});
  fs.copyFileSync(fileURLToPath(new URL('./fixtures/native-probe.mjs',import.meta.url)),path.join(plugin,'probe.mjs'));
  write(path.join(plugin,'.cursor-plugin','plugin.json'),{name:path.basename(root).toLowerCase(),version:'0.0.1',description:'Isolated BFS native IDE contract probe'});
  write(path.join(plugin,'mcp.json'),{mcpServers:{bfsprobe:{command:process.execPath,args:['${CURSOR_PLUGIN_ROOT}/probe.mjs','server',evidence]}}});
  // Cursor command hooks use its Windows shell; quote paths containing spaces.
  const quoted=value=>'"'+value.replaceAll('"','\\"')+'"';
  write(path.join(plugin,'hooks','hooks.json'),{version:1,hooks:Object.fromEntries(['sessionStart','preToolUse','postToolUse','stop','sessionEnd'].map(event=>[event,[{command:[process.execPath,path.join(plugin,'probe.mjs'),'cursor-hook',evidence,event].map(quoted).join(' '),timeout:10,failClosed:true}]]))});
  const prompt='Use the bfs-native-probe skill. Call the bfsprobe ping MCP tool exactly once with value="probe". Do not call other tools or invent _bfsProbe. Report its exact result.';
  fs.writeFileSync(path.join(plugin,'skills','bfs-native-probe','SKILL.md'),'---\nname: bfs-native-probe\ndescription: Run the read-only BFS native contract probe when explicitly requested.\n---\n\nCall bfsprobe ping once with value="probe". The native hook supplies _bfsProbe; never generate it yourself. Report the exact tool response.\n');
  write(path.join(root,'probe.json'),{project,evidence,plugin,prompt});
  console.log(JSON.stringify({root,project,plugin,prompt},null,2));
}else if(mode==='check') {
  const root=fs.realpathSync(rootArgument),config=JSON.parse(fs.readFileSync(path.join(root,'probe.json'),'utf8'));
  assert.equal(path.dirname(root),fs.realpathSync(os.tmpdir()));assert.match(path.basename(root),/^bfs-cursor-probe-/);
  const events=fs.readFileSync(path.join(config.evidence,'events.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
  const call=events.find(event=>event.kind==='mcp-call' && event.bound);
  assert.ok(call,'Cursor did not deliver a native hook-bound MCP call');assert.equal(call.cwd,config.project);
  const before=events.find(event=>event.kind==='preToolUse' && event.toolName==='MCP:ping' && event.sessionId===call.sessionId);
  assert.ok(before?.callId);assert.ok(before.workspaceRoots.includes(config.project));
  assert.ok(events.some(event=>event.kind==='postToolUse' && event.callId===before.callId));
  write(path.join(config.evidence,'result.json'),{platform:process.platform,arch:process.arch,version:before.version,events});
  writeAcceptanceEvidence(path.join(config.evidence,'result.json'));
  console.log('BFS_CURSOR_NATIVE_BINDING_OK');
}else throw new Error('Usage: node tests/cursor-probe.mjs prepare | check <root>');
