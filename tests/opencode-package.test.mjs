import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {checkLocalLinks} from '../scripts/check.mjs';

test('OpenCode package loads every skill and configures its bound MCP without changing host policy',async t=>{
  const repo=fileURLToPath(new URL('../',import.meta.url)),root=fs.mkdtempSync(path.join(os.tmpdir(),'bfs-opencode-package-')),output=path.join(root,"plugin's $path with spaces");
  t.after(()=>{assert.equal(path.dirname(root),fs.realpathSync.native(os.tmpdir()));fs.rmSync(root,{recursive:true,force:true});});
  const built=spawnSync(process.execPath,[path.join(repo,'scripts/build-host-package.mjs'),'--host','opencode-cli','--output',output],{encoding:'utf8',windowsHide:true});assert.equal(built.status,0,built.stderr);
  const read=file=>JSON.parse(fs.readFileSync(path.join(output,file),'utf8')),manifest=read('package.json'),catalog=read('catalog.json');
  assert.equal(manifest.name,'bontaflowstack');assert.equal(manifest.version,catalog.version);assert.equal(manifest.type,'module');assert.equal(manifest.dependencies,undefined);
  assert.equal(catalog.skills.length,34);
  for(const skill of catalog.skills){const file=path.join(output,'skills',skill.id,'SKILL.md'),text=fs.readFileSync(file,'utf8');checkLocalLinks(file);assert.match(text,/`bfs_core`/);assert.ok(text.includes(`{"args":["read","${skill.id}"]}`));assert.doesNotMatch(text,/Codex|Claude|Gemini|Copilot|Cursor|CODEX_THREAD_ID/);}
  for(const file of ['HOST.md',...fs.readdirSync(path.join(output,'references')).filter(file=>file.endsWith('.md')).map(file=>`references/${file}`)]){checkLocalLinks(path.join(output,file));assert.doesNotMatch(fs.readFileSync(path.join(output,file),'utf8'),/Codex|Claude|Gemini|Copilot|Cursor|CODEX_THREAD_ID/);}
  for(const file of ['plugin.json','mcp.json','hooks','.codex-plugin','.claude-plugin','.cursor-plugin','gemini-extension.json','.mcp.json','com.github.copilot'])assert.equal(fs.existsSync(path.join(output,file)),false,file);
  fs.writeFileSync(path.join(output,'install-state.json'),JSON.stringify({schema:1,stateHome:path.join(root,'state')}));
  const {BontaFlowStack}=await import(pathToFileURL(path.join(output,'plugin.mjs'))),hooks=await BontaFlowStack({directory:root});
  const foreign={type:'remote',url:'https://example.invalid/mcp',enabled:false},config={mcp:{foreign},skills:{paths:['custom-skills'],urls:[]},permission:{'*':'ask',bash:'deny'},shell:'powershell'};
  await hooks.config(config);await hooks.config(config);
  assert.deepEqual(config.mcp.foreign,foreign);assert.deepEqual(config.permission,{'*':'ask',bash:'deny'});assert.deepEqual(config.skills,{paths:['custom-skills',path.join(output,'skills')],urls:[]});
  assert.deepEqual(config.mcp.bfs,{type:'local',command:['node',path.join(output,'core/opencode-host.mjs')],enabled:true});
  const call={tool:'bfs_status',sessionID:'ses-package',callID:'call-package'},args={};await hooks['tool.execute.before'](call,{args});assert.equal(typeof args._bfsCall,'string');
  const result=spawnSync(process.execPath,[config.mcp.bfs.command[1]],{cwd:root,encoding:'utf8',windowsHide:true,timeout:15000,input:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'status',arguments:args}})+'\n'});
  assert.equal(result.status,0,result.stderr);const response=JSON.parse(result.stdout).result;assert.equal(response.isError,undefined,response.content[0].text);const status=JSON.parse(response.content[0].text);assert.equal(status.host,'opencode-cli');assert.equal(status.sessionId,call.sessionID);assert.equal(status.hostWorkspace,root);
  for(const server of [{enabled:false},{type:'local',command:['foreign.exe'],enabled:true}]) {
    const conflict=await BontaFlowStack({directory:root}),config={mcp:{bfs:server},permission:{'*':'deny'},skills:{paths:['keep-skills']}};
    const original=JSON.stringify(config);await assert.rejects(conflict.config(config),/conflicts/);assert.equal(JSON.stringify(config),original);
    const args={};await assert.rejects(conflict['tool.execute.before'](call,{args}),/configuration did not complete/);assert.deepEqual(args,{});
  }
});
