import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {checkLocalLinks} from '../scripts/check.mjs';

const repo=fileURLToPath(new URL('../',import.meta.url)),source=path.join(repo,'plugins/bontaflowstack');
const catalog=JSON.parse(fs.readFileSync(path.join(source,'catalog.json'),'utf8'));
const build=output=>spawnSync(process.execPath,[path.join(repo,'scripts/build-host-package.mjs'),'--host','gemini-cli','--output',output],{encoding:'utf8',windowsHide:true});

test('Gemini extension contains the complete skill catalog and native entry points without granting host permissions',t=>{
  const root=fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()),'bfs-gemini-package-')),output=path.join(root,'extension with spaces');
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const built=build(output);assert.equal(built.status,0,built.stderr);
  const manifest=JSON.parse(fs.readFileSync(path.join(output,'gemini-extension.json'),'utf8'));
  assert.deepEqual(Object.keys(manifest).sort(),['name','version','description','mcpServers','contextFileName'].sort());
  assert.equal(manifest.name,'bontaflowstack');assert.equal(manifest.version,catalog.version);
  assert.equal(manifest.contextFileName,'GEMINI.md');
  assert.deepEqual(manifest.mcpServers,{bfs:{command:'node',args:['${extensionPath}/core/gemini-host.mjs']}});
  for(const foreign of ['.codex-plugin','.claude-plugin','.mcp.json','policies'])assert.equal(fs.existsSync(path.join(output,foreign)),false,foreign);
  const hooks=JSON.parse(fs.readFileSync(path.join(output,'hooks/hooks.json'),'utf8')).hooks;
  assert.deepEqual(Object.keys(hooks).sort(),['SessionStart','BeforeAgent','BeforeTool','AfterTool','AfterAgent','SessionEnd'].sort());
  for(const [event,entries] of Object.entries(hooks)) {
    assert.equal(entries.length,1);assert.equal(entries[0].hooks.length,1);
    const hook=entries[0].hooks[0];assert.equal(hook.type,'command');assert.equal(hook.timeout,10000);
    assert.match(hook.command,/gemini-hook\.mjs/);assert.ok(hook.command.endsWith(` ${event}`));
    assert.ok(hook.command.includes('${extensionPath}'));
  }
  assert.equal(catalog.skills.length,34);
  const changed=new Set(['bfs-router','bfs-design-consultation','bfs-design-html']);
  for(const skill of catalog.skills) {
    const file=path.join(output,'skills',skill.id,'SKILL.md'),generated=fs.readFileSync(file,'utf8');
    assert.ok(generated.startsWith(`---\nname: ${skill.id}\n`));checkLocalLinks(file);
    assert.ok(generated.includes(`{"args":["read","${skill.id}"]}`));assert.match(generated,/`mcp_bfs_core`/);
    if(!changed.has(skill.id))assert.equal(generated.split('\n').slice(9).join('\n'),fs.readFileSync(path.join(source,'skills',skill.id,'SKILL.md'),'utf8').split('\n').slice(9).join('\n'));
    assert.doesNotMatch(generated,/Codex|Claude|CODEX_THREAD_ID|disable-model-invocation/);
    assert.equal(fs.existsSync(path.join(output,'skills',skill.id,'agents/openai.yaml')),false);
  }
  assert.match(fs.readFileSync(path.join(output,'skills/bfs-router/SKILL.md'),'utf8'),/`GEMINI.md`/);
  for(const file of ['HOST.md','GEMINI.md',...fs.readdirSync(path.join(output,'references')).filter(name=>name.endsWith('.md')).map(name=>`references/${name}`)]) {
    checkLocalLinks(path.join(output,file));assert.doesNotMatch(fs.readFileSync(path.join(output,file),'utf8'),/Codex|Claude|CODEX_THREAD_ID/);
  }
  const host=fs.readFileSync(path.join(output,'HOST.md'),'utf8');
  assert.match(host,/mcp_bfs_core/);assert.match(host,/timeout/i);assert.match(host,/AfterAgent/);
  const browser=fs.readFileSync(path.join(output,'references/browser.md'),'utf8');
  assert.ok(browser.includes(fs.readFileSync(path.join(source,'references/browser.md'),'utf8').match(/^## Removed browser scripts\n[\s\S]*?(?=^## )/m)[0]));
  const doctor=spawnSync(process.execPath,[path.join(output,'core/cli.mjs'),'doctor'],{encoding:'utf8',windowsHide:true,env:{...process.env,BFS_STATE_HOME:path.join(root,'state')}});
  assert.equal(doctor.status,0,doctor.stderr);assert.match(JSON.parse(doctor.stdout).hooks.reason,/Gemini/);
  const repeated=build(output);assert.notEqual(repeated.status,0);assert.match(repeated.stderr,/already exists/);
  assert.equal(fs.readFileSync(path.join(output,'HOST.md'),'utf8'),host,'refusing overwrite preserves the output');
});
