import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const installer = path.join(repo, 'installers', 'npm');
const manifest = JSON.parse(fs.readFileSync(path.join(installer, 'package.json'), 'utf8'));

function npmCliPath() {
  const candidates = [
    process.env.npm_execpath,
    process.env.APPDATA && path.join(process.env.APPDATA, 'npm', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')
  ].filter(Boolean);
  return candidates.find(file => fs.statSync(file, { throwIfNoEntry:false })?.isFile());
}

test('npm builder packages both exact-version host plugins and only installable files', { skip:process.platform !== 'win32' }, t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'bfs-npm-package-'));
  const output = path.join(temp, 'package');
  const packDestination = path.join(temp, 'packed');
  fs.mkdirSync(packDestination);
  t.after(() => fs.rmSync(temp, { recursive:true, force:true }));

  const built = spawnSync(process.execPath, [path.join(repo, 'scripts', 'build-npm-package.mjs'), '--output', output], {
    cwd:repo, encoding:'utf8', windowsHide:true
  });
  assert.equal(built.status, 0, built.stderr);
  assert.deepEqual(JSON.parse(built.stdout).hosts, ['codex','claude']);
  assert.equal(JSON.parse(built.stdout).version, manifest.version);
  const packedPackage = JSON.parse(fs.readFileSync(path.join(output, 'package.json'), 'utf8'));
  assert.equal(manifest.private, true, 'unbuilt installer sources must not be publishable');
  assert.equal(manifest.version, '1.1.0');
  assert.equal(packedPackage.private, undefined);
  assert.deepEqual(packedPackage.bin, { bontaflowstack:'bin/setup.mjs' });
  assert.equal(packedPackage.engines.node, '>=24');
  assert.deepEqual(packedPackage.os, ['win32']);
  assert.deepEqual(packedPackage.cpu, ['x64']);
  assert.deepEqual(packedPackage.dependencies, {impeccable:'4.5.2'});
  assert.equal(packedPackage.scripts, undefined);

  const codex = path.join(output, 'hosts', 'codex', 'plugins', 'bontaflowstack');
  const claude = path.join(output, 'hosts', 'claude');
  const codexCatalog = JSON.parse(fs.readFileSync(path.join(codex, 'catalog.json'), 'utf8'));
  const codexManifest = JSON.parse(fs.readFileSync(path.join(codex, '.codex-plugin', 'plugin.json'), 'utf8'));
  const codexMarketplace = JSON.parse(fs.readFileSync(path.join(output, 'hosts', 'codex', '.agents', 'plugins', 'marketplace.json'), 'utf8'));
  const claudeCatalog = JSON.parse(fs.readFileSync(path.join(claude, 'catalog.json'), 'utf8'));
  const claudeManifest = JSON.parse(fs.readFileSync(path.join(claude, '.claude-plugin', 'plugin.json'), 'utf8'));
  const claudeMarketplace = JSON.parse(fs.readFileSync(path.join(claude, '.claude-plugin', 'marketplace.json'), 'utf8'));
  assert.equal(codexManifest.version, manifest.version);
  assert.equal(codexCatalog.version, manifest.version);
  assert.equal(claudeManifest.version, manifest.version);
  assert.equal(claudeCatalog.version, manifest.version);
  assert.equal(codexMarketplace.name, 'bontaflowstack', 'Codex marketplace identity remains stable for existing installs');
  assert.equal(claudeMarketplace.name, 'bontaflowstack-npx');
  assert.equal(claudeMarketplace.plugins[0].version, manifest.version);
  assert.equal(codexCatalog.skills.length, 34);
  assert.equal(claudeCatalog.skills.length, 34);

  const codexHost = fs.readFileSync(path.join(codex, 'HOST.md'), 'utf8');
  const claudeHost = fs.readFileSync(path.join(claude, 'HOST.md'), 'utf8');
  assert.ok(codexHost.includes(`npx bontaflowstack@${manifest.version} setup`));
  assert.ok(claudeHost.includes(`npx bontaflowstack@${manifest.version} setup`));
  assert.ok(codexHost.indexOf('## Install and verify') < codexHost.indexOf('## Task scope and results'));
  assert.ok(claudeHost.indexOf('## Install and verify') < claudeHost.indexOf('## Task scope and results'));

  const npmCli = npmCliPath();
  assert.ok(npmCli, 'npm-cli.js must be available to verify the real npm tarball');
  const packed = spawnSync(process.execPath, [npmCli, 'pack', '--json', '--pack-destination', packDestination], {
    cwd:output, encoding:'utf8', windowsHide:true
  });
  assert.equal(packed.status, 0, packed.stderr);
  const packResult = JSON.parse(packed.stdout);
  const packedDetails = Array.isArray(packResult) ? packResult[0] : packResult[manifest.name] ?? Object.values(packResult)[0];
  assert.ok(packedDetails?.files, 'npm pack JSON must report the packaged file list');
  const files = packedDetails.files.map(file => file.path);
  for (const required of [
    'package.json', 'README.md', 'LICENSE', 'bin/setup.mjs',
    'hosts/codex/.agents/plugins/marketplace.json',
    'hosts/codex/plugins/bontaflowstack/.codex-plugin/plugin.json',
    'hosts/codex/plugins/bontaflowstack/.mcp.json',
    'hosts/codex/plugins/bontaflowstack/hooks/hooks.json',
    'hosts/claude/.claude-plugin/plugin.json', 'hosts/claude/.claude-plugin/marketplace.json',
    'hosts/claude/.mcp.json', 'hosts/claude/hooks/hooks.json'
  ]) assert.ok(files.includes(required), `npm tarball is missing ${required}`);
  for (const host of ['codex','claude']) {
    const prefix = host === 'codex' ? 'hosts/codex/plugins/bontaflowstack' : 'hosts/claude';
    assert.equal(files.filter(file => file.startsWith(`${prefix}/skills/`) && file.endsWith('/SKILL.md')).length, 34);
    assert.ok(files.some(file => file.startsWith(`${prefix}/engines/`) && file.endsWith('.zip')), `${host} plugin is missing the engine archive`);
  }
  assert.ok(files.every(file => /^(?:package\.json|README\.md|LICENSE|bin\/|hosts\/)/.test(file)), 'npm tarball escaped the package whitelist');
  assert.ok(files.every(file => !/(?:^|\/)(?:tests?|evidence|artifacts|\.tmp|docs)(?:\/|$)/i.test(file)), 'npm tarball contains test or evidence material');

  const occupied = spawnSync(process.execPath, [path.join(repo, 'scripts', 'build-npm-package.mjs'), '--output', output], {
    cwd:repo, encoding:'utf8', windowsHide:true
  });
  assert.notEqual(occupied.status, 0);
  assert.match(occupied.stderr, /Output already exists/);
});
