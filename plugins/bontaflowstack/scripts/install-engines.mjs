#!/usr/bin/env node
// POSIX (Linux x64) counterpart of install-engines.ps1. Windows keeps using the PowerShell script.
// Verifies the bundled engine source archive, builds it in a staging directory
// (npm ci, Playwright Chromium, manifest), stamps the host platform and registers it.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fail = message => { throw new Error(message); };
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const within = (root, target) => target.startsWith(root + path.sep);

// Minimal ZIP reader (stored and deflate entries) so no external unzip tool is needed.
export function zipEntries(buffer) {
  let end = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) if (buffer.readUInt32LE(i) === 0x06054b50) { end = i; break; }
  if (end < 0) fail('Engine archive is not a valid ZIP file.');
  const count = buffer.readUInt16LE(end + 10);
  let offset = buffer.readUInt32LE(end + 16);
  const entries = [];
  for (let i = 0; i < count; i++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) fail('Corrupt ZIP directory.');
    const method = buffer.readUInt16LE(offset + 10), compressed = buffer.readUInt32LE(offset + 20), size = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28), extra = buffer.readUInt16LE(offset + 30), comment = buffer.readUInt16LE(offset + 32);
    const attributes = buffer.readUInt32LE(offset + 38) >>> 16, local = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength).replaceAll('\\', '/');
    entries.push({ name, method, compressed, size, attributes, local });
    offset += 46 + nameLength + extra + comment;
  }
  return entries;
}
function entryData(buffer, entry) {
  const at = entry.local;
  if (buffer.readUInt32LE(at) !== 0x04034b50) fail(`Corrupt ZIP entry: ${entry.name}`);
  const start = at + 30 + buffer.readUInt16LE(at + 26) + buffer.readUInt16LE(at + 28);
  const raw = buffer.subarray(start, start + entry.compressed);
  const data = entry.method === 0 ? raw : entry.method === 8 ? zlib.inflateRawSync(raw) : fail(`Unsupported ZIP method for ${entry.name}`);
  if (data.length !== entry.size) fail(`ZIP entry size differs: ${entry.name}`);
  return data;
}
export function extractArchive(archive, destination) {
  const buffer = fs.readFileSync(archive), entries = zipEntries(buffer), seen = new Set();
  let total = 0;
  for (const entry of entries) {
    const name = entry.name;
    if (name.startsWith('/') || /(^|\/)\.\.?(\/|$)|:|\0/.test(name) || (entry.attributes & 0xF000) === 0xA000) fail(`Unsafe archive entry: ${name}`);
    const target = path.resolve(destination, name);
    if (!within(destination, target) || seen.has(target)) fail(`Invalid or repeated archive entry: ${name}`);
    seen.add(target);
    total += entry.size;
    if (total > 536870912 || seen.size > 10000) fail('Engine source archive exceeds the supported size.');
  }
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of entries) {
    const target = path.resolve(destination, entry.name);
    if (entry.name.endsWith('/')) { fs.mkdirSync(target, { recursive: true }); continue; }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, entryData(buffer, entry), { flag: 'wx' });
  }
}
function noLinkAncestors(file) {
  for (let part = file; ; part = path.dirname(part)) {
    if (fs.lstatSync(part, { throwIfNoEntry: false })?.isSymbolicLink()) fail(`Path contains a link: ${part}`);
    if (path.dirname(part) === part) break;
  }
}
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.error) fail(`Cannot run ${command}: ${result.error.message}`);
  return result.status;
}

export function installEngines({ archive, checksum, env = process.env, platform = process.platform, arch = process.arch } = {}) {
  if (platform !== 'linux' || arch !== 'x64') fail('install-engines.mjs supports Linux x64; use install-engines.ps1 on Windows x64.');
  if (Number(process.versions.node.split('.')[0]) < 24) fail('Install Node.js 24+ first.');
  const lock = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'engines.lock.json'), 'utf8'));
  if (lock.schema !== 1 || !/^\d+\.\d+\.\d+$/.test(lock.version)) fail('Invalid engine release record.');
  let expected;
  if (archive) {
    if (!/^[a-fA-F0-9]{64}$/.test(checksum || '')) fail('A local archive requires its explicit SHA-256.');
    archive = path.resolve(archive); expected = checksum.toLowerCase();
  } else {
    if (!/^engines\/[a-zA-Z0-9._-]+\.zip$/.test(lock.bundledArchive || '') || !/^[a-f0-9]{64}$/.test(lock.sha256)) fail('Invalid bundled engine archive record.');
    archive = path.resolve(pluginRoot, lock.bundledArchive); expected = lock.sha256;
    if (!within(pluginRoot, archive)) fail('Bundled engine archive escapes the plugin.');
    noLinkAncestors(archive);
    if (!fs.statSync(archive, { throwIfNoEntry: false })?.isFile()) fail('The package is missing its bundled engine source archive.');
  }
  const stateHome = path.resolve(env.BFS_STATE_HOME || fail('BFS_STATE_HOME must be set; the npm setup provides it.'));
  const installBase = path.join(stateHome, 'engines');
  const installRoot = path.join(installBase, `${lock.version}-${expected.slice(0, 16)}`);
  noLinkAncestors(installRoot);
  fs.mkdirSync(installBase, { recursive: true });
  if (sha256(fs.readFileSync(archive)) !== expected) fail('Engine archive checksum does not match. No source was executed.');
  const manifestFile = root => path.join(root, 'engine.json');
  if (!fs.existsSync(manifestFile(installRoot))) {
    if (fs.existsSync(installRoot)) fail(`An incomplete installation exists at ${installRoot}. Inspect it before retrying; it was preserved.`);
    const staging = path.join(installBase, `.staging-${randomUUID()}`);
    extractArchive(archive, staging);
    const childEnv = { ...env, PLAYWRIGHT_BROWSERS_PATH: path.join(staging, '.browsers') };
    const stagingFail = message => fail(`${message} Staging files were preserved at ${staging}.`);
    if (run('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: staging, env: childEnv }) !== 0) stagingFail('Dependency installation failed.');
    if (run(process.execPath, [path.join(staging, 'node_modules/playwright/cli.js'), 'install', 'chromium'], { cwd: staging, env: childEnv }) !== 0) stagingFail('Chromium installation failed. On a minimal Linux image run `npx playwright install-deps chromium` as root first.');
    if (run(process.execPath, [path.join(staging, 'scripts/manifest.mjs')], { cwd: staging, env: childEnv, stdio: ['ignore', 'ignore', 'inherit'] }) !== 0) stagingFail('Engine verification failed.');
    // The archived manifest generator is Windows-first and writes a fixed platform; record the real one.
    const generated = JSON.parse(fs.readFileSync(manifestFile(staging), 'utf8'));
    if (generated.version !== lock.version) stagingFail('Built engine version differs from the selected release.');
    generated.platform = `${platform}-${arch}`;
    fs.writeFileSync(manifestFile(staging), `${JSON.stringify(generated, null, 2)}\n`);
    fs.renameSync(staging, installRoot);
  }
  const metadata = JSON.parse(fs.readFileSync(manifestFile(installRoot), 'utf8'));
  if (metadata.version !== lock.version || metadata.platform !== `${platform}-${arch}`) fail('Built engine differs from the selected release or platform.');
  const cli = path.join(pluginRoot, 'core/cli.mjs');
  const request = JSON.stringify({ root: installRoot, sha256: sha256(fs.readFileSync(manifestFile(installRoot))) });
  if (run(process.execPath, [cli, 'engine', 'register', '--input', '-'], { input: request, stdio: ['pipe', 'inherit', 'inherit'], env }) !== 0) fail('Engine verification or registration failed.');
  if (run(process.execPath, [cli, 'engine', 'status'], { env }) !== 0) fail('Engine status check failed.');
  return { installRoot, version: lock.version };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2), option = name => args[args.indexOf(name) + 1];
    installEngines({ archive: args.includes('--archive') ? option('--archive') : undefined, checksum: args.includes('--sha256') ? option('--sha256') : undefined });
  } catch (error) {
    console.error(`BontaFlowStack engines: ${error.message}`);
    process.exitCode = 1;
  }
}
