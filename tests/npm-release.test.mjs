import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { requireRcPublish } from '../scripts/npm-release.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(repo, 'installers/npm/package.json'), 'utf8'));

test('npm release policy requires explicit rc for prereleases and blocks stable promotion pending native evidence', () => {
  assert.doesNotThrow(() => requireRcPublish('1.1.0-rc.1', 'rc'));
  assert.throws(() => requireRcPublish('1.1.0-rc.1', 'latest'), /explicit npm dist-tag `rc`/);
  assert.throws(() => requireRcPublish('1.1.0', 'latest'), /Stable npm publishing is blocked/);
});

test('prepare creates one immutable exact-version tarball and publish rejects tampered bytes before npm runs', { skip:process.platform !== 'win32' }, t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'bfs-npm-release-'));
  const artifact = path.join(temp, 'release');
  t.after(() => fs.rmSync(temp, { recursive:true, force:true }));

  const wrongReleaseTag = spawnSync(process.execPath, [path.join(repo, 'scripts/npm-release.mjs'), 'prepare', '--output', artifact, '--tag', 'rc', '--release-tag', 'v1.1.0'], {
    cwd:repo, encoding:'utf8', windowsHide:true
  });
  assert.notEqual(wrongReleaseTag.status, 0);
  assert.match(wrongReleaseTag.stderr, /Release tag must exactly match/);
  assert.equal(fs.existsSync(artifact), false);

  const prepared = spawnSync(process.execPath, [path.join(repo, 'scripts/npm-release.mjs'), 'prepare', '--output', artifact, '--tag', 'rc', '--release-tag', `v${pkg.version}`], {
    cwd:repo, encoding:'utf8', windowsHide:true
  });
  assert.equal(prepared.status, 0, prepared.stderr);
  const result = JSON.parse(prepared.stdout);
  const receipt = JSON.parse(fs.readFileSync(path.join(artifact, 'release.json'), 'utf8'));
  assert.equal(result.version, pkg.version);
  assert.equal(receipt.name, pkg.name);
  assert.equal(receipt.version, pkg.version);
  assert.equal(receipt.tag, 'rc');
  assert.equal(receipt.releaseTag, `v${pkg.version}`);
  assert.match(receipt.sha256, /^[a-f0-9]{64}$/);
  assert.match(receipt.integrity, /^sha512-[A-Za-z0-9+/]+=*$/);
  assert.ok(receipt.packedFiles.includes('hosts/codex/plugins/bontaflowstack/.codex-plugin/plugin.json'));
  assert.ok(receipt.packedFiles.includes('hosts/claude/.claude-plugin/plugin.json'));
  assert.equal(fs.existsSync(path.join(artifact, 'package')), false, 'only the published tarball and receipt are retained');

  for (const [field, value] of [['tag','latest'],['version','9.9.9']]) {
    const changed = { ...receipt, [field]:value };
    fs.writeFileSync(path.join(artifact, 'release.json'), `${JSON.stringify(changed)}\n`);
    const rejected = spawnSync(process.execPath, [path.join(repo, 'scripts/npm-release.mjs'), 'publish', '--artifact', artifact, '--tag', 'rc'], {
      cwd:repo, encoding:'utf8', windowsHide:true
    });
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /Release receipt does not match/);
    assert.doesNotMatch(rejected.stderr, /ENEEDAUTH|EOTP|EPUBLISHCONFLICT/);
  }
  fs.writeFileSync(path.join(artifact, 'release.json'), `${JSON.stringify(receipt, null, 2)}\n`);
  fs.appendFileSync(path.join(artifact, receipt.tarball), 'tamper');
  const publish = spawnSync(process.execPath, [path.join(repo, 'scripts/npm-release.mjs'), 'publish', '--artifact', artifact, '--tag', 'rc'], {
    cwd:repo, encoding:'utf8', windowsHide:true
  });
  assert.notEqual(publish.status, 0);
  assert.match(publish.stderr, /tarball changed after release preparation/);
  assert.doesNotMatch(publish.stderr, /ENEEDAUTH|EOTP|EPUBLISHCONFLICT/);
});
