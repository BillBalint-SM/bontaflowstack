import test from 'node:test';
import assert from 'node:assert/strict';
import {canonical,digest,validateEvidence,validateVersionPromotion} from '../scripts/release-gate.mjs';
import {fixture} from './release-fixtures.mjs';

const metadata=['plugins/bontaflowstack/.codex-plugin/plugin.json','plugins/bontaflowstack/catalog.json'];
function promotionFixture() {
  const f=fixture(),basis=structuredClone(f.snapshot),snapshot=structuredClone(basis);
  snapshot.version='1.0.0';snapshot.archiveSha256='1'.repeat(64);
  const contents=new Map([[basis,{}],[snapshot,{}]]);
  for(const name of metadata) {
    for(const item of [basis,snapshot]) {
      const bytes=Buffer.from(JSON.stringify({schema:1,version:item.version,nested:{version:'unchanged'}},null,2)+'\n');
      contents.get(item)[name]=bytes;item.files[name]=digest(bytes);
    }
  }
  f.receipt.inputs.files={...basis.files};delete f.receipt.inputs.files['README.md'];
  f.raw.sourceArtifact.installedPluginFiles=Object.keys(basis.files).filter(p=>p.startsWith('plugins/bontaflowstack/')).length;
  f.receipt.nativeSha256=digest(canonical(f.raw));
  return {...f,basis,snapshot,contents,read:(item,name)=>contents.get(item)[name]};
}
const promote=f=>validateVersionPromotion(f.snapshot,f.basis,f.read);
const change=(f,name,text)=>{f.contents.get(f.snapshot)[name]=Buffer.from(text);f.snapshot.files[name]=digest(text);};

test('version-label promotion retains original native version and exact source hashes',()=>{
  const f=promotionFixture();
  const original=JSON.stringify(f.raw),receipt=JSON.stringify(f.receipt);
  const proof=validateEvidence(f.basis,f.receipt,f.raw,f.policy,f.policy.profiles[0]);
  const promoted=promote(f);
  assert.equal(proof.version,'0.7.5');assert.equal(promoted.toVersion,'1.0.0');
  assert.equal(promoted.desktopJourneyRerun,false);
  assert.deepEqual(promoted.changedPaths.sort(),metadata.sort());
  assert.equal(promoted.basisArchiveSha256,f.basis.archiveSha256);
  assert.equal(JSON.stringify(f.raw),original);assert.equal(JSON.stringify(f.receipt),receipt);
});
test('promotion rejects runtime, setup, marketplace, additions and deletions',()=>{
  for(const edit of [
    f=>f.snapshot.files['plugins/bontaflowstack/core/browser-host.mjs']='e'.repeat(64),
    f=>f.snapshot.files['scripts/setup.ps1']='e'.repeat(64),
    f=>f.snapshot.files['.agents/plugins/marketplace.json']='e'.repeat(64),
    f=>f.snapshot.files['plugins/bontaflowstack/core/new.mjs']='e'.repeat(64),
    f=>delete f.snapshot.files['plugins/bontaflowstack/core/browser-host.mjs']
  ]) {
    const f=promotionFixture();edit(f);
    assert.throws(()=>promote(f),e=>e.code==='PROMOTION_INPUTS_CHANGED');
  }
});
test('promotion rejects other metadata, nested labels, formatting changes and hash substitution',()=>{
  for(const edit of [
    s=>s.replace('"schema": 1','"schema": 2'),
    s=>s.replace('"unchanged"','"1.0.0"'),
    s=>s.replace('"version": "1.0.0"','"version": "1.0.1"'),
    s=>s.replace('\n','\r\n'),
    s=>s.replace('"schema": 1,','"schema": 1,\n  "version": "other",')
  ]) {
    const f=promotionFixture();change(f,metadata[0],edit(f.read(f.snapshot,metadata[0]).toString()));
    assert.throws(()=>promote(f),e=>e.code==='PROMOTION_METADATA_CHANGED');
  }
  const f=promotionFixture();f.contents.get(f.snapshot)[metadata[0]]=Buffer.from('{}');
  assert.throws(()=>promote(f),e=>e.code==='PROMOTION_INPUTS_CHANGED');
});
test('promotion requires both labels and distinct valid version; docs can change',()=>{
  let f=promotionFixture();f.snapshot.version=f.basis.version;
  assert.throws(()=>promote(f),e=>e.code==='PROMOTION_INVALID');
  f=promotionFixture();f.snapshot.version='1.0.0-preview';
  assert.throws(()=>promote(f),e=>e.code==='PROMOTION_INVALID');
  f=promotionFixture();f.snapshot.files[metadata[0]]=f.basis.files[metadata[0]];
  assert.throws(()=>promote(f),e=>e.code==='PROMOTION_INPUTS_CHANGED');
  f=promotionFixture();f.snapshot.files['README.md']='f'.repeat(64);assert.equal(promote(f).toVersion,'1.0.0');
});
test('the basis still needs authentic, current Desktop evidence; direct version reuse fails',()=>{
  const f=promotionFixture();
  assert.throws(()=>validateEvidence(f.snapshot,f.receipt,f.raw,f.policy,f.policy.profiles[0]),e=>e.code==='DESKTOP_VERSION_STALE');
  assert.throws(()=>validateEvidence(f.basis,null,f.raw,f.policy,f.policy.profiles[0]),e=>e.code==='DESKTOP_EVIDENCE_MISSING');
  const stale=structuredClone(f.receipt);stale.inputs.files['plugins/bontaflowstack/core/browser-host.mjs']='e'.repeat(64);
  assert.throws(()=>validateEvidence(f.basis,stale,f.raw,f.policy,f.policy.profiles[0]),e=>e.code==='DESKTOP_INPUTS_STALE');
});

