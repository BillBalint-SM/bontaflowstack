import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { requirePublishTag, validateRegistryRelease } from '../scripts/npm-release.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(repo, 'installers/npm/package.json'), 'utf8'));
const tag = pkg.version.includes('-') ? 'rc' : 'latest';

test('registry verification accepts npm object and singleton-array responses, rejects mismatches, and reports registry-assigned latest', () => {
  const receipt={name:'bontaflowstack',version:'1.1.0-rc.1',tag:'rc',integrity:'sha512-v4lb2TjygKPNUA7YCdOe/+rnJY5vq2WXSbvzZYGQVC2AiS1t1ncjYFM4akCphsxvePWxUkLGGlvQsE6/4OGh3g=='};
  const identity={name:receipt.name,version:receipt.version,'dist.integrity':receipt.integrity};
  const tags={rc:receipt.version};
  assert.doesNotThrow(()=>validateRegistryRelease(receipt,identity,tags));
  assert.doesNotThrow(()=>validateRegistryRelease(receipt,[identity],[tags]));
  for(const bad of [[],[identity,identity],{...identity,'dist.integrity':'changed'},{...identity,version:'0.0.0-stage'}]) {
    assert.throws(()=>validateRegistryRelease(receipt,bad,tags),/name\/version\/integrity/);
  }
  assert.throws(()=>validateRegistryRelease(receipt,identity,{rc:'0.0.0-stage'}),/dist-tag rc/);
  assert.equal(validateRegistryRelease(receipt,identity,tags).registryAssignedLatest,false);
  const observed=validateRegistryRelease(receipt,identity,{...tags,latest:receipt.version});
  assert.equal(observed.registryAssignedLatest,true);
  assert.deepEqual(observed.distTags,{...tags,latest:receipt.version});
  const stable = { ...receipt, version:'1.1.0', tag:'latest' };
  assert.equal(validateRegistryRelease(stable,{...identity,version:stable.version},{latest:stable.version}).registryAssignedLatest,false);
});

test('npm release policy requires rc for prereleases and latest for stable versions', () => {
  assert.doesNotThrow(() => requirePublishTag('1.1.0-rc.1', 'rc'));
  assert.throws(() => requirePublishTag('1.1.0-rc.1', 'latest'), /explicit npm dist-tag `rc`/);
  assert.doesNotThrow(() => requirePublishTag('1.1.0', 'latest'));
  assert.throws(() => requirePublishTag('1.1.0', 'rc'), /explicit npm dist-tag `latest`/);
});

test('prepare creates one immutable exact-version tarball and publish rejects tampered bytes before npm runs', { skip:process.platform !== 'win32' }, t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'bfs-npm-release-'));
  const artifact = path.join(temp, 'release');
  t.after(() => fs.rmSync(temp, { recursive:true, force:true }));

  const wrongReleaseTag = spawnSync(process.execPath, [path.join(repo, 'scripts/npm-release.mjs'), 'prepare', '--output', artifact, '--tag', tag, '--release-tag', 'v0.0.0-invalid'], {
    cwd:repo, encoding:'utf8', windowsHide:true
  });
  assert.notEqual(wrongReleaseTag.status, 0);
  assert.match(wrongReleaseTag.stderr, /Release tag must exactly match/);
  assert.equal(fs.existsSync(artifact), false);

  const prepared = spawnSync(process.execPath, [path.join(repo, 'scripts/npm-release.mjs'), 'prepare', '--output', artifact, '--tag', tag, '--release-tag', `v${pkg.version}`], {
    cwd:repo, encoding:'utf8', windowsHide:true
  });
  assert.equal(prepared.status, 0, prepared.stderr);
  const result = JSON.parse(prepared.stdout);
  const receipt = JSON.parse(fs.readFileSync(path.join(artifact, 'release.json'), 'utf8'));
  assert.equal(result.version, pkg.version);
  assert.equal(receipt.name, pkg.name);
  assert.equal(receipt.version, pkg.version);
  assert.equal(receipt.tag, tag);
  assert.equal(receipt.releaseTag, `v${pkg.version}`);
  assert.match(receipt.sha256, /^[a-f0-9]{64}$/);
  assert.match(receipt.integrity, /^sha512-[A-Za-z0-9+/]+=*$/);
  assert.ok(receipt.packedFiles.includes('hosts/codex/plugins/bontaflowstack/.codex-plugin/plugin.json'));
  assert.ok(receipt.packedFiles.includes('hosts/claude/.claude-plugin/plugin.json'));
  for (const host of ['gemini','copilot','cursor','opencode']) {
    assert.ok(receipt.packedFiles.includes(`bin/${host}.mjs`));
    assert.equal(receipt.packedFiles.filter(file => file.startsWith(`hosts/${host}/skills/`) && file.endsWith('/SKILL.md')).length, 34);
    assert.ok(receipt.packedFiles.some(file => file.startsWith(`hosts/${host}/engines/`) && file.endsWith('.zip')));
  }
  assert.equal(fs.existsSync(path.join(artifact, 'package')), false, 'only the published tarball and receipt are retained');

  for (const [field, value] of [['tag',tag === 'rc' ? 'latest' : 'rc'],['version','9.9.9']]) {
    const changed = { ...receipt, [field]:value };
    fs.writeFileSync(path.join(artifact, 'release.json'), `${JSON.stringify(changed)}\n`);
    const rejected = spawnSync(process.execPath, [path.join(repo, 'scripts/npm-release.mjs'), 'publish', '--artifact', artifact, '--tag', tag], {
      cwd:repo, encoding:'utf8', windowsHide:true
    });
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /Release receipt does not match/);
    assert.doesNotMatch(rejected.stderr, /ENEEDAUTH|EOTP|EPUBLISHCONFLICT/);
  }
  fs.writeFileSync(path.join(artifact, 'release.json'), `${JSON.stringify(receipt, null, 2)}\n`);
  fs.appendFileSync(path.join(artifact, receipt.tarball), 'tamper');
  const publish = spawnSync(process.execPath, [path.join(repo, 'scripts/npm-release.mjs'), 'publish', '--artifact', artifact, '--tag', tag], {
    cwd:repo, encoding:'utf8', windowsHide:true
  });
  assert.notEqual(publish.status, 0);
  assert.match(publish.stderr, /tarball changed after release preparation/);
  assert.doesNotMatch(publish.stderr, /ENEEDAUTH|EOTP|EPUBLISHCONFLICT/);
});
