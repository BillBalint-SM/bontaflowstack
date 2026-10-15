import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {zip} from './fixtures/zip.mjs';

test('Node engine installer verifies source, retains failed staging and safely retries',t=>{
  const folder=fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()),'bfs-node-install-'));
  t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));
  const plugin=fileURLToPath(new URL('../plugins/bontaflowstack/',import.meta.url));
  const lock=JSON.parse(fs.readFileSync(path.join(plugin,'engines.lock.json'),'utf8'));
  const attempts=path.join(folder,'attempts'),stateHome=path.join(folder,'state'),archive=path.join(folder,'fixture.zip');
  const body=`import fs from 'node:fs';const file=process.env.BFS_INSTALL_FIXTURE_ATTEMPTS;
    const n=fs.existsSync(file)?Number(fs.readFileSync(file))+1:1;fs.writeFileSync(file,String(n));
    if(n===1)process.exit(17);
    fs.writeFileSync('engine.json',JSON.stringify({schema:1,name:'bontaflowstack-engines',version:'${lock.version}',platform:process.platform+'-'+process.arch,files:{},commands:{}}));`;
  const bytes=zip([{name:'scripts/build.mjs',body}]);fs.writeFileSync(archive,bytes);
  const hash=createHash('sha256').update(bytes).digest('hex');
  const run=sha=>spawnSync(process.execPath,[path.join(plugin,'scripts/install-engines.mjs'),'--archive',archive,'--sha256',sha],{
    env:{...process.env,BFS_STATE_HOME:stateHome,BFS_INSTALL_FIXTURE_ATTEMPTS:attempts},encoding:'utf8',timeout:30000});
  const corrupt=run('0'.repeat(64));assert.notEqual(corrupt.status,0);assert.match(corrupt.stderr,/checksum/);assert.equal(fs.existsSync(attempts),false);
  const first=run(hash);assert.notEqual(first.status,0);assert.match(first.stderr,/Engine build failed \(17\)/);
  const base=path.join(stateHome,'engines');assert.equal(fs.readdirSync(base).filter(name=>name.startsWith('.staging-')).length,1);
  assert.equal(fs.existsSync(path.join(stateHome,'engines.json')),false,'failed build must not register');
  const next=run(hash);assert.equal(next.status,0,next.stderr);
  const registered=JSON.parse(fs.readFileSync(path.join(stateHome,'engines.json'),'utf8'));
  assert.equal(registered.version,lock.version);assert.equal(fs.readFileSync(attempts,'utf8'),'2');
  assert.equal(fs.readdirSync(base).filter(name=>name.startsWith('.staging-')).length,1,'failed stage is retained');
  assert.ok(fs.statSync(path.join(registered.root,'engine.json')).isFile());
  const repeat=run(hash);assert.equal(repeat.status,0,repeat.stderr);assert.equal(fs.readFileSync(attempts,'utf8'),'2','verified installation is reused');
});
