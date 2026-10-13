import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {checkLocalLinks} from '../scripts/check.mjs';

test('Cursor package exposes all skills, prefixed MCP tools and native hooks from a portable Windows path',t=>{
  const repo=fileURLToPath(new URL('../',import.meta.url)),canonical=path.join(repo,'plugins/bontaflowstack');
  const root=fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(),'bfs-cursor-package-'))),output=path.join(root,"plugin's $literal %PATH% with spaces"),project=path.join(root,'project');fs.mkdirSync(project);
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const built=spawnSync(process.execPath,[path.join(repo,'scripts/build-host-package.mjs'),'--host','cursor-ide','--output',output],{encoding:'utf8',windowsHide:true});assert.equal(built.status,0,built.stderr);
  const read=file=>JSON.parse(fs.readFileSync(path.join(output,file),'utf8'));
  const manifest=read('.cursor-plugin/plugin.json'),catalog=read('catalog.json');
  assert.equal(manifest.name,'bontaflowstack-cursor');assert.equal(manifest.version,catalog.version);assert.equal(catalog.skills.length,34);
  assert.deepEqual(read('mcp.json'),{mcpServers:{'bfs-cursor':{command:'node',args:['${CURSOR_PLUGIN_ROOT}/core/cursor-host.mjs']}}});
  const {version,hooks}=read('hooks/hooks.json');assert.equal(version,1);
  assert.deepEqual(Object.keys(hooks).sort(),['sessionStart','sessionEnd','beforeSubmitPrompt','preToolUse','postToolUse','postToolUseFailure','stop'].sort());
  for(const [event,entries] of Object.entries(hooks)) {
    assert.equal(entries.length,1);assert.equal(entries[0].timeout,10);assert.equal(entries[0].failClosed,event==='preToolUse'?true:undefined);
    const script=Buffer.from(entries[0].command.split(' -EncodedCommand ')[1],'base64').toString('utf16le');
    assert.match(script,/\$env:CURSOR_PLUGIN_ROOT/);assert.match(script,/cursor-hook\.mjs/);assert.ok(script.includes(` ${event};`));
  }
  for(const skill of catalog.skills) {
    const file=path.join(output,'skills',skill.id,'SKILL.md'),text=fs.readFileSync(file,'utf8');checkLocalLinks(file);
    assert.ok(text.includes("the installed plugin's `bfs-cursor` MCP `bfs_core` tool"),'Cursor skill must name its registered MCP server');
    assert.ok(text.includes(`{"args":["read","${skill.id}"]}`));assert.match(text,/`bfs_core`/);assert.doesNotMatch(text,/Codex|Claude|Gemini|Copilot|CODEX_THREAD_ID/);
    if(!['bfs-router','bfs-design-consultation','bfs-design-html'].includes(skill.id))assert.equal(text.split('\n').slice(9).join('\n'),fs.readFileSync(path.join(canonical,'skills',skill.id,'SKILL.md'),'utf8').split('\n').slice(9).join('\n'));
  }
  for(const file of ['HOST.md',...fs.readdirSync(path.join(output,'references')).filter(file=>file.endsWith('.md')).map(file=>`references/${file}`)]) {checkLocalLinks(path.join(output,file));assert.doesNotMatch(fs.readFileSync(path.join(output,file),'utf8'),/Codex|Claude|Gemini|Copilot|CODEX_THREAD_ID/);}
  for(const file of ['plugin.json','marketplace.json','.codex-plugin','.claude-plugin','gemini-extension.json','.mcp.json','com.github.copilot'])assert.equal(fs.existsSync(path.join(output,file)),false,file);
  if(process.platform!=='win32')return;
  const options={cwd:project,env:{...process.env,CURSOR_PLUGIN_ROOT:output,BFS_STATE_HOME:path.join(root,'state')},encoding:'utf8',windowsHide:true,timeout:20000};
  const event={hook_event_name:'preToolUse',conversation_id:'cursor-package-session',workspace_roots:[project],cwd:project,tool_name:'MCP:bfs_status',tool_input:{}};
  const hook=spawnSync('cmd.exe',['/d','/s','/c',hooks.preToolUse[0].command],{...options,input:JSON.stringify(event)});assert.equal(hook.status,0,hook.stderr);
  const bound=JSON.parse(hook.stdout);assert.equal(bound.permission,undefined);assert.equal(typeof bound.updated_input._bfsCall,'string');
  const rpc=spawnSync(process.execPath,[path.join(output,'core/cursor-host.mjs')],{...options,input:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'bfs_status',arguments:bound.updated_input}})+'\n'});assert.equal(rpc.status,0,rpc.stderr);
  const result=JSON.parse(rpc.stdout).result;assert.equal(result.isError,undefined,result.content[0].text);const status=JSON.parse(result.content[0].text);assert.equal(status.host,'cursor-ide');assert.equal(status.sessionId,event.conversation_id);assert.equal(status.hostWorkspace,project);
});
