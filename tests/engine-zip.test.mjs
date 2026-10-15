import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {zip} from "./fixtures/zip.mjs";

test('engine archive extraction preserves content and rejects unsafe entries before writing',async t=>{
  const folder=fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()),'bfs-zip-'));
  t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));
  const {extractZip}=await import('../plugins/bontaflowstack/core/zip.mjs');
  const good=path.join(folder,'good');fs.mkdirSync(good);
  extractZip(zip([{name:'scripts/build.mjs',body:'verified source',mode:0o100755}]),good);
  assert.equal(fs.readFileSync(path.join(good,'scripts/build.mjs'),'utf8'),'verified source');
  if(process.platform!=='win32')assert.equal(fs.statSync(path.join(good,'scripts/build.mjs')).mode & 0o777,0o755);
  for(const entries of [
    [{name:'../escape.mjs'}],[{name:'/absolute'}],[{name:'a/../escape'}],[{name:'a\\..\\escape'}],
    [{name:'C:/escape'}],[{name:'link',mode:0o120777}],
    [{name:'CON.txt'}],[{name:'trailing.'}],[{name:'space /file'}],[{name:' '}],
    [{name:'duplicate'},{name:'duplicate'}],
    [{name:'parent'},{name:'parent/child'}],
  ]) {
    const target=fs.mkdtempSync(path.join(folder,'bad-'));
    assert.throws(()=>extractZip(zip([{name:'safe.mjs'},...entries]),target));
    assert.deepEqual(fs.readdirSync(target),[],'validation must finish before any source is written');
  }
  const corrupt=zip([{name:'corrupt'}]);corrupt[31]^=1;
  const target=fs.mkdtempSync(path.join(folder,'corrupt-'));
  assert.throws(()=>extractZip(corrupt,target));assert.deepEqual(fs.readdirSync(target),[]);
});

test('the actual bundled engine archive can be extracted without losing its host entry',async t=>{
  const folder=fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()),'bfs-bundled-zip-'));
  t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));
  const {extractZip}=await import('../plugins/bontaflowstack/core/zip.mjs');
  const plugin=new URL('../plugins/bontaflowstack/',import.meta.url),lock=JSON.parse(fs.readFileSync(new URL('engines.lock.json',plugin),'utf8'));
  extractZip(fs.readFileSync(new URL(lock.bundledArchive,plugin)),folder);
  assert.equal(JSON.parse(fs.readFileSync(path.join(folder,'package.json'),'utf8')).version,lock.version);
  assert.ok(fs.statSync(path.join(folder,'src/host-browser.mjs')).isFile());
});
