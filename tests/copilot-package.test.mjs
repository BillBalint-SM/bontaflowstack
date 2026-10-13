import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {checkLocalLinks} from '../scripts/check.mjs';

test('Copilot package uses Agent Plugins 1.0 and its own hooks while preserving all skills',t=>{
  const repo=fileURLToPath(new URL('../',import.meta.url)),source=path.join(repo,'plugins/bontaflowstack');
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'bfs-copilot-package-')),output=path.join(temp,'package');
  t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
  const built=spawnSync(process.execPath,[path.join(repo,'scripts/build-host-package.mjs'),'--host','copilot-cli','--output',output],{encoding:'utf8',windowsHide:true});
  assert.equal(built.status,0,built.stderr);
  const catalog=JSON.parse(fs.readFileSync(path.join(output,'catalog.json'),'utf8'));
  const manifest=JSON.parse(fs.readFileSync(path.join(output,'plugin.json'),'utf8'));
  assert.equal(manifest.$schema,'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json');
  assert.equal(manifest.name,'bontaflowstack');assert.equal(manifest.version,catalog.version);
  const marketplace=JSON.parse(fs.readFileSync(path.join(output,'marketplace.json'),'utf8'));
  assert.deepEqual(marketplace,{name:'bontaflowstack-npx',owner:{name:'BontaFlow'},plugins:[{name:'bontaflowstack',source:'.',version:catalog.version}]});
  for(const field of ['hooks','skills','mcpServers'])assert.equal(manifest[field],undefined);
  const mcp=JSON.parse(fs.readFileSync(path.join(output,'mcp.json'),'utf8'));
  assert.deepEqual(mcp,{$schema:'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json',mcpServers:{bfs:{type:'stdio',command:'node',args:['${PLUGIN_ROOT}/core/copilot-host.mjs']}}});
  const hooks=JSON.parse(fs.readFileSync(path.join(output,'com.github.copilot/hooks/hooks.json'),'utf8'));
  assert.equal(hooks.version,1);
  assert.deepEqual(Object.keys(hooks.hooks).sort(),['sessionStart','userPromptSubmitted','preToolUse','postToolUse','postToolUseFailure','agentStop','sessionEnd'].sort());
  for(const [event,entries] of Object.entries(hooks.hooks))assert.deepEqual(entries,[{type:'command',exec:'node',args:['${PLUGIN_ROOT}/core/copilot-hook.mjs',event],timeoutSec:10}]);
  for(const file of ['.codex-plugin','.claude-plugin','.mcp.json','gemini-extension.json','GEMINI.md','hooks/hooks.json'])assert.equal(fs.existsSync(path.join(output,file)),false,file);
  assert.equal(catalog.skills.length,34);
  for(const skill of catalog.skills) {
    const file=path.join(output,'skills',skill.id,'SKILL.md'),text=fs.readFileSync(file,'utf8');
    checkLocalLinks(file);assert.doesNotMatch(text,/Codex|Claude|Gemini|CODEX_THREAD_ID/);
    assert.ok(text.includes(`{"args":["read","${skill.id}"]}`));assert.match(text,/installed plugin's `bfs` MCP `core` tool/);
    if(!['bfs-router','bfs-design-consultation','bfs-design-html'].includes(skill.id))assert.equal(text.split('\n').slice(9).join('\n'),fs.readFileSync(path.join(source,'skills',skill.id,'SKILL.md'),'utf8').split('\n').slice(9).join('\n'));
    assert.equal(fs.existsSync(path.join(output,'skills',skill.id,'agents/openai.yaml')),false);
  }
  for(const file of ['HOST.md',...fs.readdirSync(path.join(output,'references')).filter(file=>file.endsWith('.md')).map(file=>`references/${file}`)]) {
    checkLocalLinks(path.join(output,file));assert.doesNotMatch(fs.readFileSync(path.join(output,file),'utf8'),/Codex|Claude|Gemini|CODEX_THREAD_ID/);
  }
  const host=fs.readFileSync(path.join(output,'HOST.md'),'utf8');assert.match(host,/bfs-core/);assert.match(host,/preToolUse/);assert.match(host,/timeout/);
  const doctor=spawnSync(process.execPath,[path.join(output,'core/cli.mjs'),'doctor'],{encoding:'utf8',windowsHide:true,env:{...process.env,BFS_STATE_HOME:path.join(temp,'state')}});
  assert.equal(doctor.status,0,doctor.stderr);assert.match(JSON.parse(doctor.stdout).hooks.reason,/Copilot/);
});
