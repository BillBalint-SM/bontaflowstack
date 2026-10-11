import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const plugin=path.resolve('plugins/bontaflowstack');

test('portable MCP entry and bundled engine match their release records',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(plugin,'.codex-plugin/plugin.json'),'utf8'));
  const connection=JSON.parse(fs.readFileSync(path.join(plugin,manifest.mcpServers),'utf8')).mcpServers['bfs-browser'];
  assert.equal(connection.command,'node');assert.equal(connection.cwd,'.');
  assert.deepEqual(connection.args,['core/browser-host.mjs']);
  assert.deepEqual(connection.env_vars,['BFS_STATE_HOME']);
  assert.ok(fs.statSync(path.join(plugin,connection.args[0])).isFile());
  const lock=JSON.parse(fs.readFileSync(path.join(plugin,'engines.lock.json'),'utf8'));
  assert.equal(lock.version,'0.3.3');
  const bytes=fs.readFileSync(path.join(plugin,lock.bundledArchive));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),lock.sha256);
});

test('bundled installer rejects escaped, missing and checksum-mismatched archives before execution',()=>{
  const folder=path.resolve('.tmp','host-package-'+randomUUID());
  const scripts=path.join(folder,'scripts');fs.mkdirSync(scripts,{recursive:true});
  const installer=path.join(scripts,'install-engines.ps1');fs.copyFileSync(path.join(plugin,'scripts/install-engines.ps1'),installer);
  fs.mkdirSync(path.join(folder,'engines'));fs.writeFileSync(path.join(folder,'engines/invalid.zip'),'not executable source');
  const state=path.join(folder,'state');
  const env={...process.env,BFS_STATE_HOME:state};
  // Windows PowerShell must resolve its own modules, not inherit pwsh 7 modules through Node.
  delete env.PSModulePath;
  for(const [bundledArchive,expected] of [['../escape.zip',/Invalid bundled/],['engines/missing.zip',/missing its bundled/],['engines/invalid.zip',/checksum does not match/]]) {
    fs.writeFileSync(path.join(folder,'engines.lock.json'),JSON.stringify({schema:1,version:'0.3.3',bundledArchive,sha256:'0'.repeat(64)}));
    const result=spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',installer],{env,encoding:'utf8',windowsHide:true,timeout:30000});
    assert.equal(result.status,1,result.stdout);assert.match(result.stderr,expected);
    assert.equal(fs.existsSync(path.join(state,'engines.json')),false);
    assert.equal(fs.existsSync(path.join(state,'engines','0.3.3-'+'0'.repeat(16))),false);
  }
});

test('release packaging rejects skipped checks before running package checks',()=>{
  const result=spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File','scripts/build-package.ps1','-Release','-SkipChecks'],{encoding:'utf8',windowsHide:true,timeout:10000});
  assert.equal(result.status,1);assert.match(result.stderr,/Release packaging requires the package checks/);
});
