import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { setup, supportMatrix } from '../installers/npm/bin/setup.mjs';
import { dataRoot } from '../plugins/bontaflowstack/core/state.mjs';
import { extractArchive, zipEntries } from '../plugins/bontaflowstack/scripts/install-engines.mjs';

// Linux x64 phase 1 contract: setup runs through POSIX paths and launchers with Claude Code only.
// The host CLI is a fixture here; tests/linux-setup.integration.mjs runs the real CLI.
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), `bfs-linux-setup-${randomUUID()}-`));
const packageRoot = path.join(scratch, 'package');
const built = spawnSync(process.execPath, [path.join(repo, 'scripts', 'build-npm-package.mjs'), '--output', packageRoot], { cwd: repo, encoding: 'utf8', windowsHide: true });
assert.equal(built.status, 0, built.stderr || built.stdout);
const tool = path.join(packageRoot, 'node_modules/@impeccable/cli-linux-x64');
fs.mkdirSync(path.join(tool, 'bin'), { recursive: true });
fs.writeFileSync(path.join(tool, 'package.json'), JSON.stringify({ name: '@impeccable/cli-linux-x64', version: '0.1.14' }));
fs.writeFileSync(path.join(tool, 'bin/impeccable'), 'fixture Impeccable binary', { mode: 0o755 });
fs.writeFileSync(path.join(tool, 'LICENSE'), 'fixture license');
fs.mkdirSync(path.join(packageRoot, 'node_modules/impeccable'), { recursive: true });
fs.writeFileSync(path.join(packageRoot, 'node_modules/impeccable/package.json'), JSON.stringify({ name: 'impeccable', version: '4.5.2', optionalDependencies: { '@impeccable/cli-linux-x64': '0.1.14' } }));
after(() => fs.rmSync(scratch, { recursive: true, force: true }));

function makeEnv(label) {
  const home = path.join(scratch, label, 'home');
  fs.mkdirSync(path.join(home, '.local/bin'), { recursive: true });
  fs.writeFileSync(path.join(home, '.local/bin/claude'), 'fixture executable', { mode: 0o755 });
  return { ...process.env, HOME: home, XDG_DATA_HOME: '', BFS_STATE_HOME: '', PATH: path.join(scratch, label, 'bin') };
}
function runner(version = '2.1.296 (Claude Code)') {
  const state = { marketplaces: [], plugins: [] }, calls = [];
  const run = (command, args = [], options = {}) => {
    calls.push({ command, args: [...args], options });
    const name = path.basename(command);
    if (name === 'impeccable' && args[0] === '--version') return '4.0.0';
    if (name === 'npm' || name === 'git') return '1.0.0';
    if (name !== 'claude') return '';
    if (args.includes('--version')) return version;
    if (args.includes('marketplace') && args.includes('list')) return JSON.stringify(state.marketplaces);
    if (args.includes('plugin') && args.includes('list')) return JSON.stringify(state.plugins);
    if (args.includes('marketplace') && args.includes('add')) {
      const directory = args.find(value => path.isAbsolute(value));
      state.marketplaces.push({ name: 'bontaflowstack-npx', path: directory, source: 'directory' });
    }
    if (args.includes('install') || args.includes('update')) {
      const market = state.marketplaces[0];
      const manifest = JSON.parse(fs.readFileSync(path.join(market.path, '.claude-plugin/plugin.json'), 'utf8'));
      state.plugins = [{ id: 'bontaflowstack@bontaflowstack-npx', version: manifest.version, enabled: true, scope: 'user', readFromFolder: market.path }];
    }
    return '';
  };
  return { calls, run };
}
const options = (env, run, rest = {}) => ({ packageRoot, env, run, platform: 'linux', arch: 'x64', ...rest });

test('support matrix names Windows x64 with every host and Linux x64 with Claude Code only', () => {
  assert.deepEqual(supportMatrix.win32.arch, ['x64']);
  assert.deepEqual(supportMatrix.win32.hosts, ['codex', 'claude', 'gemini', 'copilot', 'cursor', 'opencode']);
  assert.deepEqual(supportMatrix.linux, { arch: ['x64'], label: 'Linux x64', hosts: ['claude'] });
});

test('unsupported platforms and architectures are refused with the matrix', async () => {
  const env = makeEnv('matrix'), mock = runner();
  for (const [platform, arch] of [['darwin', 'arm64'], ['linux', 'arm64'], ['win32', 'arm64']])
    await assert.rejects(setup(options(env, mock.run, { platform, arch })), /Windows x64 and Linux x64 only/);
  assert.equal(mock.calls.length, 0);
});

test('Linux refuses hosts that are not yet supported before touching anything', async () => {
  const env = makeEnv('hosts'), mock = runner();
  for (const host of ['codex', 'gemini', 'copilot', 'cursor', 'opencode', 'all'])
    await assert.rejects(setup(options(env, mock.run, { host })), /not yet supported on Linux x64\. Supported here: claude/, host);
  assert.equal(mock.calls.length, 0);
  assert.equal(fs.existsSync(path.join(env.HOME, '.local/share')), false);
});

test('Linux setup installs under XDG data, registers Claude Code and uses no PowerShell', async () => {
  const env = makeEnv('claude'), mock = runner();
  const result = await setup(options(env, mock.run));
  const data = path.join(env.HOME, '.local/share/BontaFlowStack');
  assert.deepEqual(result.hosts.map(item => item.host), ['claude']);
  assert.equal(result.hosts[0].registered, true);
  assert.equal(result.installationRoot, path.join(data, 'npm/versions', result.version));
  assert.equal(result.stateHome, path.join(data, 'state/v2'));
  assert.equal(JSON.parse(fs.readFileSync(path.join(result.hosts[0].pluginRoot, 'install-state.json'), 'utf8')).stateHome, result.stateHome);
  const config = JSON.parse(fs.readFileSync(path.join(result.stateHome, 'impeccable.json'), 'utf8'));
  assert.deepEqual(config.command, [path.join(result.stateHome, 'tools/impeccable/4.5.2/bin/impeccable')]);
  assert.equal(fs.statSync(config.command[0]).mode & 0o111, 0o111, 'the Impeccable binary stays executable');
  const engines = mock.calls.find(call => call.args.some(arg => arg.endsWith('install-engines.mjs')));
  assert.equal(engines.command, process.execPath);
  assert.equal(engines.options.env.BFS_STATE_HOME, result.stateHome);
  assert.ok(mock.calls.every(call => !/powershell|pwsh|\.ps1|\.exe$/i.test([call.command, ...call.args].join(' '))), 'no PowerShell or .exe launcher on Linux');
  assert.ok(mock.calls.some(call => call.command === path.join(env.HOME, '.local/bin/claude') && call.args.includes('install')));
  const progress = JSON.parse(fs.readFileSync(path.join(data, 'npm/setup-status.json'), 'utf8'));
  assert.equal(progress.status, 'completed');
  const repeat = await setup(options(env, mock.run));
  assert.equal(repeat.installationRoot, result.installationRoot);
});

test('Linux setup honours an absolute XDG_DATA_HOME and rejects a missing HOME', async () => {
  const env = makeEnv('xdg'), mock = runner();
  env.XDG_DATA_HOME = path.join(scratch, 'xdg-data');
  const result = await setup(options(env, mock.run));
  assert.ok(result.installationRoot.startsWith(path.join(env.XDG_DATA_HOME, 'BontaFlowStack')));
  delete env.HOME;
  await assert.rejects(setup(options(env, mock.run)), /HOME must be an absolute directory/);
});

test('Linux setup enforces the Claude Code minimum version and a missing host', async () => {
  const env = makeEnv('old');
  await assert.rejects(setup(options(env, runner('2.1.295 (Claude Code)').run)), /Update claude to 2\.1\.296/);
  const missing = makeEnv('missing');
  const mock = runner();
  const run = (command, ...rest) => path.basename(command) === 'claude' ? (() => { throw new Error('not installed'); })() : mock.run(command, ...rest);
  await assert.rejects(setup(options(missing, run)), /No supported host found/);
});

test('data root is LOCALAPPDATA when set, AppData on Windows and XDG elsewhere', () => {
  assert.equal(dataRoot({ LOCALAPPDATA: 'C:\\Data' }, 'win32', 'C:\\Users\\x'), 'C:\\Data');
  assert.equal(dataRoot({ LOCALAPPDATA: '/legacy' }, 'linux', '/home/x'), '/legacy');
  assert.equal(dataRoot({}, 'win32', 'C:\\Users\\x'), path.join('C:\\Users\\x', 'AppData', 'Local'));
  assert.equal(dataRoot({}, 'linux', '/home/x'), '/home/x/.local/share');
  assert.equal(dataRoot({ XDG_DATA_HOME: '/data' }, 'linux', '/home/x'), '/data');
  assert.equal(dataRoot({ XDG_DATA_HOME: 'relative' }, 'linux', '/home/x'), '/home/x/.local/share');
});

function zipOf(entries) {
  const locals = [], central = [];
  let offset = 0;
  for (const { name, data = '', method = 8, attributes = 0 } of entries) {
    const raw = Buffer.from(data), body = method === 8 ? zlib.deflateRawSync(raw) : raw, label = Buffer.from(name);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(method, 8); local.writeUInt32LE(body.length, 18); local.writeUInt32LE(raw.length, 22); local.writeUInt16LE(label.length, 26);
    const entry = Buffer.alloc(46); entry.writeUInt32LE(0x02014b50, 0); entry.writeUInt16LE(method, 10); entry.writeUInt32LE(body.length, 20); entry.writeUInt32LE(raw.length, 24); entry.writeUInt16LE(label.length, 28); entry.writeUInt32LE((attributes << 16) >>> 0, 38); entry.writeUInt32LE(offset, 42);
    locals.push(local, label, body); central.push(entry, label);
    offset += 30 + label.length + body.length;
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

test('engine archive extraction reads deflate and stored entries and rejects unsafe names', () => {
  const good = path.join(scratch, 'good.zip');
  fs.writeFileSync(good, zipOf([{ name: 'dir/' , method: 0 }, { name: 'dir/a.txt', data: 'alpha' }, { name: 'b.txt', data: 'beta', method: 0 }]));
  const target = path.join(scratch, 'extracted');
  extractArchive(good, target);
  assert.equal(fs.readFileSync(path.join(target, 'dir/a.txt'), 'utf8'), 'alpha');
  assert.equal(fs.readFileSync(path.join(target, 'b.txt'), 'utf8'), 'beta');
  for (const name of ['../escape.txt', '/abs.txt', 'a/../../b.txt', 'C:/x.txt']) {
    const bad = path.join(scratch, 'bad.zip');
    fs.writeFileSync(bad, zipOf([{ name, data: 'x' }]));
    assert.throws(() => extractArchive(bad, path.join(scratch, `bad-${randomUUID()}`)), /Unsafe archive entry/, name);
  }
  fs.writeFileSync(path.join(scratch, 'link.zip'), zipOf([{ name: 'l', data: 'target', attributes: 0xA1FF }]));
  assert.throws(() => extractArchive(path.join(scratch, 'link.zip'), path.join(scratch, 'link-out')), /Unsafe archive entry/);
  fs.writeFileSync(path.join(scratch, 'dup.zip'), zipOf([{ name: 'x', data: '1' }, { name: 'x', data: '2' }]));
  assert.throws(() => extractArchive(path.join(scratch, 'dup.zip'), path.join(scratch, 'dup-out')), /repeated archive entry/);
  assert.throws(() => zipEntries(Buffer.from('not a zip')), /not a valid ZIP/);
});

test('the bundled engine archive matches its lock and extracts to the expected engine source', () => {
  const plugin = path.join(repo, 'plugins/bontaflowstack');
  const lock = JSON.parse(fs.readFileSync(path.join(plugin, 'engines.lock.json'), 'utf8'));
  const archive = path.join(plugin, lock.bundledArchive);
  assert.equal(createHash('sha256').update(fs.readFileSync(archive)).digest('hex'), lock.sha256);
  const target = path.join(scratch, 'engine-source');
  extractArchive(archive, target);
  assert.equal(JSON.parse(fs.readFileSync(path.join(target, 'package.json'), 'utf8')).version, lock.version);
  for (const file of ['scripts/manifest.mjs', 'package-lock.json', 'src/browser.mjs']) assert.ok(fs.existsSync(path.join(target, file)), file);
});
