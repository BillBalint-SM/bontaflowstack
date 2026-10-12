import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { setup } from '../installers/npm/bin/setup.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), `bfs-universal-setup-${randomUUID()}-`));
const packageRoot = path.join(scratch, 'package');
const built = spawnSync(process.execPath, [path.join(repo, 'scripts', 'build-npm-package.mjs'), '--output', packageRoot], { cwd:repo, encoding:'utf8', windowsHide:true });
assert.equal(built.status, 0, built.stderr || built.stdout);
after(() => fs.rmSync(scratch, { recursive:true, force:true }));

function makeEnv(label = 'run') {
  const home = path.join(scratch, label);
  return {
    ...process.env,
    LOCALAPPDATA:path.join(home, 'LocalAppData'),
    USERPROFILE:path.join(home, 'UserProfile'),
    CODEX_HOME:path.join(home, 'Codex'),
    CLAUDE_CONFIG_DIR:path.join(home, 'Claude'),
    BFS_STATE_HOME:path.join(home, 'shared-state'),
    BFS_SETUP_FIXTURE_BIN:path.join(home, 'bin'),
  };
}

function runner(env, state = { codexMarketplaces:[], codexPlugins:[], claudeMarketplaces:[], claudePlugins:[] }, { native = true, available = ['codex','claude'] } = {}) {
  const calls = [];
  const codex = path.join(env.LOCALAPPDATA, 'OpenAI', 'Codex', 'bin', 'fixture', 'codex.exe');
  const claude = path.join(env.USERPROFILE, '.local', 'bin', 'claude.exe');
  if (native) {
    fs.mkdirSync(path.dirname(codex), { recursive:true });
    fs.mkdirSync(path.dirname(claude), { recursive:true });
    fs.writeFileSync(codex, 'fixture executable');
    fs.writeFileSync(claude, 'fixture executable');
  }
  const run = (command, args = [], options = {}) => {
    calls.push({ command, args:[...args], options });
    const raw = args.filter(arg => arg !== '--no-daemon');
    const lowerCommand = path.basename(command).toLowerCase();
    const commandLine = [command, ...raw].join('\0').toLowerCase();
    const host = lowerCommand.includes('codex') || commandLine.includes('codex.exe') || commandLine.includes('@openai\\codex') ? 'codex' : lowerCommand.includes('claude') || commandLine.includes('claude.exe') || commandLine.includes('@anthropic-ai\\claude-code') ? 'claude' : null;
    if (/^(?:where(?:\.exe)?|which)$/i.test(lowerCommand)) {
      const target = args.at(-1)?.toLowerCase().includes('codex') ? 'codex.exe' : 'claude.exe';
      return path.join(env.BFS_SETUP_FIXTURE_BIN, target);
    }
    if (!host) return '';
    if (!available.includes(host)) throw new Error(`${host} CLI is not installed in this fixture.`);
    if (raw.includes('--version')) return host === 'codex' ? 'codex-cli 0.162.0' : '2.1.296 (Claude Code)';
    const marketplaces = host === 'codex' ? state.codexMarketplaces : state.claudeMarketplaces;
    const plugins = host === 'codex' ? state.codexPlugins : state.claudePlugins;
    if (raw.includes('marketplace') && raw.includes('list') && raw.includes('--json')) {
      return JSON.stringify(host === 'codex' ? { marketplaces } : marketplaces);
    }
    if (raw.includes('plugin') && raw.includes('list') && raw.includes('--json')) {
      return JSON.stringify(host === 'codex' ? { installed:plugins } : plugins);
    }
    if (raw.includes('marketplace') && raw.includes('remove')) {
      const name = raw.find(value => value === 'bontaflowstack' || value === 'bontaflowstack-npx');
      const index = marketplaces.findIndex(item => item.name === name);
      if (index >= 0) marketplaces.splice(index, 1);
    }
    if (raw.includes('marketplace') && raw.includes('add')) {
      const directory = [...raw].reverse().find(value => path.isAbsolute(value) && fs.statSync(value, { throwIfNoEntry:false })?.isDirectory());
      const name = host === 'codex' ? 'bontaflowstack' : 'bontaflowstack-npx';
      const exists = marketplaces.find(item => item.name === name);
      if (exists) { exists.path = directory; exists.root = directory; exists.source = 'directory'; }
      else marketplaces.push({ name, path:directory, root:directory, source:'directory' });
    }
    if (raw.includes('install') || raw.includes('update') || raw.includes('enable') || raw.includes('add') && raw.includes('plugin') && !raw.includes('marketplace')) {
      const id = host === 'codex' ? 'bontaflowstack@bontaflowstack' : 'bontaflowstack@bontaflowstack-npx';
      const marketName = host === 'codex' ? 'bontaflowstack' : 'bontaflowstack-npx';
      const market = marketplaces.find(item => item.name === marketName);
      if (market?.path) {
        const pluginRoot = host === 'codex' ? path.join(market.path, 'plugins', 'bontaflowstack') : market.path;
        const manifestPath = path.join(pluginRoot, host === 'codex' ? '.codex-plugin/plugin.json' : '.claude-plugin/plugin.json');
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const record = { id, pluginId:id, name:'bontaflowstack', version:manifest.version, enabled:true, installed:true, scope:'user', marketplace:marketName, path:pluginRoot, pluginRoot, readFromFolder:pluginRoot };
        const previous = plugins.findIndex(item => item.id === id || item.pluginId === id);
        if (previous >= 0) plugins[previous] = record; else plugins.push(record);
      }
    }
    return '';
  };
  return { state, calls, run };
}

function options(env, run, rest = {}) {
  return { packageRoot, env, run, platform:'win32', arch:'x64', ...rest };
}

test('universal setup auto-registers both native hosts, pins shared state, and repeats safely', async t => {
  const env = makeEnv('both'), mock = runner(env);
  env.PSModulePath = 'powershell-seven-module-fixture';
  const first = await setup(options(env, mock.run));
  for (const call of mock.calls) assert.equal(call.options.env.PSModulePath, call.command === 'powershell.exe' ? undefined : env.PSModulePath);
  assert.equal(env.PSModulePath, 'powershell-seven-module-fixture');
  assert.equal(first.name, 'bontaflowstack');
  assert.equal(first.version, JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8')).version);
  assert.equal(first.stateHome, env.BFS_STATE_HOME);
  assert.deepEqual(first.hosts.map(item => item.host).sort(), ['claude','codex']);
  for (const host of first.hosts) {
    assert.ok(fs.statSync(host.pluginRoot).isDirectory());
    assert.ok(path.resolve(host.pluginRoot).startsWith(path.resolve(env.LOCALAPPDATA, 'BontaFlowStack', 'npm', 'versions')));
    assert.equal(JSON.parse(fs.readFileSync(path.join(host.pluginRoot, 'install-state.json'), 'utf8')).stateHome, env.BFS_STATE_HOME);
    const inventoryPath = host.host === 'codex' ? '.codex-plugin/plugin.json' : '.claude-plugin/plugin.json';
    assert.equal(JSON.parse(fs.readFileSync(path.join(host.pluginRoot, inventoryPath), 'utf8')).version, first.version);
  }
  const preserved = path.join(first.stateHome, 'projects', 'keep.json');
  fs.mkdirSync(path.dirname(preserved), { recursive:true });
  fs.writeFileSync(preserved, 'user state survives');
  const codexAddsBeforeRepeat = mock.calls.filter(call => call.command.toLowerCase().includes('codex') && call.args.includes('plugin') && call.args.includes('add') && !call.args.includes('marketplace')).length;
  const repeat = await setup(options(env, mock.run));
  assert.deepEqual(repeat.hosts.map(item => [item.host,item.pluginRoot]), first.hosts.map(item => [item.host,item.pluginRoot]));
  assert.equal(mock.calls.filter(call => call.command.toLowerCase().includes('codex') && call.args.includes('plugin') && call.args.includes('add') && !call.args.includes('marketplace')).length, codexAddsBeforeRepeat, 'an unchanged, enabled Codex plugin must not be re-added');
  assert.equal(fs.readFileSync(preserved, 'utf8'), 'user state survives');
  assert.ok(first.hosts.every(host => fs.existsSync(path.join(host.pluginRoot, 'catalog.json'))));
});

test('host selector installs only the requested host and explicit state env overrides absent config', async () => {
  const env = makeEnv('claude-only');
  const mock = runner(env);
  const result = await setup(options(env, mock.run, { host:'claude' }));
  assert.deepEqual(result.hosts.map(item => item.host), ['claude']);
  assert.equal(result.stateHome, env.BFS_STATE_HOME);
  assert.equal(mock.state.codexMarketplaces.length, 0);
  assert.equal(mock.state.claudePlugins[0]?.version, result.version);
});

test('auto mode registers one discovered host and rejects cleanly when no host is installed', async () => {
  const env = makeEnv('one-host'), one = runner(env, undefined, { available:['codex'] });
  const result = await setup(options(env, one.run));
  assert.deepEqual(result.hosts.map(item => item.host), ['codex']);
  assert.equal(one.state.codexPlugins[0]?.version, result.version);

  const noneEnv = makeEnv('no-hosts'), none = runner(noneEnv, undefined, { available:[] });
  await assert.rejects(setup(options(noneEnv, none.run)), /No supported host CLI found/);
  assert.equal(fs.existsSync(path.join(noneEnv.LOCALAPPDATA, 'BontaFlowStack', 'npm')), false);
});

test('foreign plugin namespaces, marketplace content, and unsupported selectors are preserved and refused', async () => {
  const env = makeEnv('foreign-plugin');
  const pluginMock = runner(env, { codexMarketplaces:[], codexPlugins:[{ id:'bontaflowstack@foreign', name:'bontaflowstack', enabled:true }], claudeMarketplaces:[], claudePlugins:[] });
  await assert.rejects(setup(options(env, pluginMock.run)), /BontaFlowStack|foreign|another/i);
  assert.equal(fs.existsSync(path.join(env.LOCALAPPDATA, 'BontaFlowStack')), false);

  const otherEnv = makeEnv('foreign-marketplace');
  const marketMock = runner(otherEnv, { codexMarketplaces:[{ name:'bontaflowstack', source:'directory', root:otherEnv.LOCALAPPDATA }], codexPlugins:[], claudeMarketplaces:[], claudePlugins:[] });
  await assert.rejects(setup(options(otherEnv, marketMock.run, { host:'codex' })), /marketplace|another|foreign/i);
  assert.equal(fs.existsSync(path.join(otherEnv.LOCALAPPDATA, 'BontaFlowStack')), false);
  await assert.rejects(setup(options(makeEnv('bad-selector'), runner(makeEnv('bad-selector')).run, { host:'claud' })), /host|codex|claude|all/i);
});

test('upgrade creates an immutable versioned copy and preserves unrelated plugins and prior payload', async () => {
  const env = makeEnv('upgrade'), mock = runner(env);
  const unrelatedCodex = { pluginId:'sample@other-market', enabled:false, installed:true };
  const unrelatedClaude = { id:'sample@other-market', scope:'user', enabled:false };
  mock.state.codexPlugins.push(unrelatedCodex);
  mock.state.claudePlugins.push(unrelatedClaude);
  const first = await setup(options(env, mock.run));
  const oldStateFile = path.join(first.stateHome, 'projects', 'pre-upgrade.json');
  fs.mkdirSync(path.dirname(oldStateFile), { recursive:true });
  fs.writeFileSync(oldStateFile, 'old pinned state remains');
  const upgradeRoot = path.join(scratch, 'upgrade-package');
  fs.cpSync(packageRoot, upgradeRoot, { recursive:true });
  const nextVersion = '9.9.9-test.1';
  const updateJson = file => {
    const json = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (Object.hasOwn(json, 'version')) json.version = nextVersion;
    if (Array.isArray(json.plugins)) for (const item of json.plugins) if (Object.hasOwn(item, 'version')) item.version = nextVersion;
    fs.writeFileSync(file, JSON.stringify(json, null, 2));
  };
  updateJson(path.join(upgradeRoot, 'package.json'));
  for (const [relative, host] of [['hosts/codex/plugins/bontaflowstack','codex'],['hosts/claude','claude']]) {
    const root = path.join(upgradeRoot, relative);
    updateJson(path.join(root, 'catalog.json'));
    updateJson(path.join(root, host === 'codex' ? '.codex-plugin/plugin.json' : '.claude-plugin/plugin.json'));
    if (host === 'claude') updateJson(path.join(root, '.claude-plugin/marketplace.json'));
  }
  fs.writeFileSync(path.join(upgradeRoot, 'new-release.txt'), 'new release payload');
  // Add the same synthetic release file to both hosts so their payload inventory remains well formed.
  for (const relative of ['hosts/codex/plugins/bontaflowstack','hosts/claude']) fs.writeFileSync(path.join(upgradeRoot, relative, 'new-release.txt'), 'new release payload');
  const selectedState = path.join(scratch, 'upgrade-state');
  env.BFS_STATE_HOME = selectedState;
  const upgraded = await setup(options(env, mock.run, { packageRoot:upgradeRoot }));
  assert.equal(upgraded.version, nextVersion);
  assert.equal(upgraded.stateHome, selectedState, 'an explicit state override applies to a new version');
  assert.notEqual(upgraded.hosts.find(item => item.host === 'codex').pluginRoot, first.hosts.find(item => item.host === 'codex').pluginRoot);
  assert.equal(fs.readFileSync(path.join(first.hosts.find(item => item.host === 'codex').pluginRoot, 'catalog.json'), 'utf8').includes(nextVersion), false);
  assert.equal(fs.readFileSync(path.join(upgraded.hosts.find(item => item.host === 'codex').pluginRoot, 'new-release.txt'), 'utf8'), 'new release payload');
  assert.equal(fs.readFileSync(path.join(upgraded.hosts.find(item => item.host === 'claude').pluginRoot, 'new-release.txt'), 'utf8'), 'new release payload');
  assert.ok(mock.state.codexPlugins.some(item => item.pluginId === unrelatedCodex.pluginId));
  assert.ok(mock.state.claudePlugins.some(item => item.id === unrelatedClaude.id));
  assert.equal(JSON.parse(fs.readFileSync(path.join(upgraded.hosts.find(item => item.host === 'codex').pluginRoot, 'install-state.json'), 'utf8')).stateHome, selectedState);
  assert.equal(JSON.parse(fs.readFileSync(path.join(upgraded.hosts.find(item => item.host === 'claude').pluginRoot, 'install-state.json'), 'utf8')).stateHome, selectedState);
  assert.equal(fs.readFileSync(oldStateFile, 'utf8'), 'old pinned state remains');
  delete env.BFS_STATE_HOME;
  const repeatWithoutOverride = await setup(options(env, mock.run, { packageRoot:upgradeRoot }));
  assert.equal(repeatWithoutOverride.stateHome, selectedState, 'the new installation-owned pin remains selected without the environment override');
});

test('engine preparation failure does not register hosts and same command can retry', async () => {
  const env = makeEnv('retry'), mock = runner(env);
  let fail = true;
  const run = (...args) => {
    const [command, argv] = args;
    if (fail && path.basename(command).toLowerCase().includes('powershell') && argv?.some(value => /install-engines\.ps1$/i.test(value))) throw new Error('engine preparation failed');
    return mock.run(...args);
  };
  await assert.rejects(setup(options(env, run)), /engine preparation failed/);
  assert.equal(mock.state.codexMarketplaces.length + mock.state.claudeMarketplaces.length, 0);
  assert.equal(mock.state.codexPlugins.length + mock.state.claudePlugins.length, 0);
  fail = false;
  const retried = await setup(options(env, run));
  assert.deepEqual(retried.hosts.map(item => item.host).sort(), ['claude','codex']);
});

test('same-version edits are preserved and rejected', async () => {
  const env = makeEnv('integrity'), mock = runner(env);
  const installed = await setup(options(env, mock.run));
  const codex = installed.hosts.find(item => item.host === 'codex');
  fs.writeFileSync(path.join(codex.pluginRoot, 'catalog.json'), 'local edit');
  await assert.rejects(setup(options(env, mock.run)), /differ|changed|integrity/i);
  assert.equal(fs.readFileSync(path.join(codex.pluginRoot, 'catalog.json'), 'utf8'), 'local edit');
});

test('unknown incomplete install roots are preserved and rejected', async () => {
  const env = makeEnv('unowned-root'), mock = runner(env);
  const root = path.join(env.LOCALAPPDATA, 'BontaFlowStack', 'npm');
  fs.mkdirSync(root, { recursive:true });
  fs.writeFileSync(path.join(root, 'keep.txt'), 'unowned data');
  await assert.rejects(setup(options(env, mock.run)), /Unrecognized installation directory/);
  assert.equal(fs.readFileSync(path.join(root, 'keep.txt'), 'utf8'), 'unowned data');
  assert.equal(mock.state.codexMarketplaces.length + mock.state.claudeMarketplaces.length, 0);
});

test('Codex marketplace with extra entries is preserved and rejected', async () => {
  const env = makeEnv('extra-marketplace'), mock = runner(env);
  const foreign = path.join(scratch, 'foreign-marketplace');
  const bundled = path.join(packageRoot, 'hosts', 'codex');
  fs.cpSync(bundled, foreign, { recursive:true });
  const file = path.join(foreign, '.agents', 'plugins', 'marketplace.json');
  const market = JSON.parse(fs.readFileSync(file, 'utf8'));
  market.plugins.push({ name:'unrelated', source:{ source:'local', path:'./plugins/unrelated' } });
  fs.writeFileSync(file, JSON.stringify(market));
  mock.state.codexMarketplaces.push({ name:'bontaflowstack', root:foreign });
  await assert.rejects(setup(options(env, mock.run, { host:'codex' })), /belongs to another installation/);
  assert.ok(fs.existsSync(path.join(foreign, '.agents', 'plugins', 'marketplace.json')));
  assert.equal(fs.existsSync(path.join(env.LOCALAPPDATA, 'BontaFlowStack')), false);
});

test('without BFS_STATE_HOME the first install pins the legacy LOCALAPPDATA fallback', async () => {
  const env = makeEnv('fallback'), mock = runner(env);
  delete env.BFS_STATE_HOME;
  const result = await setup(options(env, mock.run, { host:'claude' }));
  const expected = path.join(env.LOCALAPPDATA, 'BontaFlowStack', 'state', 'v2');
  assert.equal(result.stateHome, expected);
  assert.equal(JSON.parse(fs.readFileSync(path.join(result.hosts[0].pluginRoot, 'install-state.json'), 'utf8')).stateHome, expected);
});

test('a sole existing Codex Store data directory is selected and pinned', async () => {
  const env = makeEnv('store-state'), mock = runner(env);
  delete env.BFS_STATE_HOME;
  const storeName = 'OpenAI.Codex_8wekyb3d8bbwe';
  const store = path.join(env.LOCALAPPDATA, 'Packages', storeName, 'LocalCache', 'Local', 'BontaFlowStack', 'state', 'v2');
  fs.mkdirSync(store, { recursive:true });
  fs.writeFileSync(path.join(store, 'keep.json'), '{"preserve":true}');
  const result = await setup(options(env, mock.run, { host:'codex' }));
  assert.equal(result.stateHome, store);
  assert.equal(JSON.parse(fs.readFileSync(path.join(result.hosts[0].pluginRoot, 'install-state.json'), 'utf8')).stateHome, store);
  assert.equal(fs.readFileSync(path.join(store, 'keep.json'), 'utf8'), '{"preserve":true}');
});

test('multiple existing state stores fail before install; explicit override chooses one without changing either', async () => {
  const env = makeEnv('ambiguous-state'), mock = runner(env);
  delete env.BFS_STATE_HOME;
  const legacy = path.join(env.LOCALAPPDATA, 'BontaFlowStack', 'state', 'v2');
  const store = path.join(env.LOCALAPPDATA, 'Packages', 'OpenAI.Codex_8wekyb3d8bbwe', 'LocalCache', 'Local', 'BontaFlowStack', 'state', 'v2');
  fs.mkdirSync(legacy, { recursive:true });
  fs.mkdirSync(store, { recursive:true });
  fs.writeFileSync(path.join(legacy, 'legacy.json'), 'legacy');
  fs.writeFileSync(path.join(store, 'store.json'), 'store');
  await assert.rejects(setup(options(env, mock.run, { host:'claude' })), /Multiple existing BFS data stores/);
  assert.equal(fs.existsSync(path.join(env.LOCALAPPDATA, 'BontaFlowStack', 'npm')), false);
  assert.equal(mock.calls.some(call => call.command.toLowerCase().includes('claude') && call.args.some(value => value === '--version')), false, 'ambiguity is reported before querying or registering a host');
  const selected = path.join(env.LOCALAPPDATA, 'ChosenBfsState');
  env.BFS_STATE_HOME = selected;
  const result = await setup(options(env, mock.run, { host:'claude' }));
  assert.equal(result.stateHome, selected);
  assert.equal(fs.readFileSync(path.join(legacy, 'legacy.json'), 'utf8'), 'legacy');
  assert.equal(fs.readFileSync(path.join(store, 'store.json'), 'utf8'), 'store');
});

test('native host discovery finds Codex and Claude Node wrappers on a custom PATH', async () => {
  const env = makeEnv('custom-path');
  const custom = path.join(scratch, 'custom-cli-path');
  const codexWrapper = path.join(custom, 'node_modules', '@openai', 'codex', 'bin', 'codex.js');
  const claudeWrapper = path.join(custom, 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js');
  fs.mkdirSync(path.dirname(codexWrapper), { recursive:true });
  fs.mkdirSync(path.dirname(claudeWrapper), { recursive:true });
  fs.writeFileSync(codexWrapper, '// fixture CLI wrapper');
  fs.writeFileSync(claudeWrapper, '// fixture CLI wrapper');
  env.PATH = custom;
  env.APPDATA = path.join(scratch, 'custom-appdata');
  const mock = runner(env, undefined, { native:false });
  const result = await setup(options(env, mock.run));
  assert.deepEqual(result.hosts.map(item => item.host).sort(), ['claude','codex']);
  assert.ok(mock.calls.some(call => call.args.includes(codexWrapper) && call.args.includes('--version')));
  assert.ok(mock.calls.some(call => call.args.includes(claudeWrapper) && call.args.includes('--version')));
});

test('owned prior Claude prerelease registration is migrated while its files remain intact', async () => {
  const env = makeEnv('legacy-claude');
  const legacyRoot = path.join(env.LOCALAPPDATA, 'BontaFlowStack', 'claude-code');
  const legacyVersions = path.join(legacyRoot, 'versions');
  const prior = path.join(legacyVersions, '1.1.0-rc.0');
  fs.mkdirSync(legacyVersions, { recursive:true });
  fs.cpSync(path.join(packageRoot, 'hosts', 'claude'), prior, { recursive:true });
  const legacyMarketFile = path.join(prior, '.claude-plugin', 'marketplace.json');
  const legacyMarket = JSON.parse(fs.readFileSync(legacyMarketFile, 'utf8'));
  legacyMarket.name = 'bontaflowstack-npx';
  for (const plugin of legacyMarket.plugins) plugin.version = '1.1.0-rc.0';
  fs.writeFileSync(legacyMarketFile, JSON.stringify(legacyMarket));
  const legacyManifest = path.join(prior, '.claude-plugin', 'plugin.json');
  const manifest = JSON.parse(fs.readFileSync(legacyManifest, 'utf8'));
  manifest.version = '1.1.0-rc.0';
  fs.writeFileSync(legacyManifest, JSON.stringify(manifest));
  fs.writeFileSync(path.join(legacyRoot, 'installation.json'), JSON.stringify({ schema:1, package:'bontaflowstack' }));
  const state = { codexMarketplaces:[], codexPlugins:[], claudeMarketplaces:[{ name:'bontaflowstack-npx', source:'directory', path:prior }], claudePlugins:[{ id:'bontaflowstack@bontaflowstack-npx', scope:'user', enabled:true, version:'1.1.0-rc.0', readFromFolder:prior }] };
  const mock = runner(env, state);
  const migrated = await setup(options(env, mock.run, { host:'claude' }));
  assert.equal(migrated.hosts[0].pluginRoot, path.join(migrated.installationRoot, 'hosts', 'claude'));
  assert.equal(fs.readFileSync(path.join(prior, 'catalog.json'), 'utf8'), fs.readFileSync(path.join(packageRoot, 'hosts', 'claude', 'catalog.json'), 'utf8'));
  assert.ok(fs.existsSync(path.join(prior, '.claude-plugin', 'plugin.json')));
  assert.equal(state.claudePlugins.find(item => item.id === 'bontaflowstack@bontaflowstack-npx').version, migrated.version);
});

test('Codex marketplace rollback restores the prior release after registration failure, then retries', async () => {
  const env = makeEnv('codex-rollback');
  const root = path.join(env.LOCALAPPDATA, 'BontaFlowStack', 'npm');
  const oldMarket = path.join(root, 'versions', '1.0.0-previous', 'hosts', 'codex');
  fs.mkdirSync(path.dirname(oldMarket), { recursive:true });
  fs.cpSync(path.join(packageRoot, 'hosts', 'codex'), oldMarket, { recursive:true });
  fs.writeFileSync(path.join(root, 'installation.json'), JSON.stringify({ schema:1, package:'bontaflowstack', stateHome:env.BFS_STATE_HOME }));
  const state = {
    codexMarketplaces:[{ name:'bontaflowstack', root:oldMarket }],
    codexPlugins:[{ pluginId:'bontaflowstack@bontaflowstack', version:'1.0.0-previous', enabled:true, installed:true }],
    claudeMarketplaces:[], claudePlugins:[],
  };
  const mock = runner(env, state);
  let rejectPluginAdd = true;
  const failOnce = (command, args, options) => {
    if (rejectPluginAdd && path.basename(command).toLowerCase().includes('codex') && args.includes('plugin') && args.includes('add') && !args.includes('marketplace')) {
      rejectPluginAdd = false;
      throw new Error('synthetic Codex plugin registration failure');
    }
    return mock.run(command, args, options);
  };
  await assert.rejects(setup(options(env, failOnce, { host:'codex' })), /synthetic Codex plugin registration failure/);
  assert.equal(state.codexMarketplaces.find(item => item.name === 'bontaflowstack')?.root, oldMarket, 'failed upgrade restores the previous market root');
  assert.equal(fs.existsSync(path.join(oldMarket, '.agents', 'plugins', 'marketplace.json')), true, 'the prior release remains intact');
  const retry = await setup(options(env, mock.run, { host:'codex' }));
  assert.equal(retry.hosts[0].host, 'codex');
  assert.equal(state.codexMarketplaces.find(item => item.name === 'bontaflowstack')?.root, retry.hosts[0].marketplaceRoot);
});

test('installed host payloads remain available after the npm cache is removed', async () => {
  const env = makeEnv('cache-removal'), mock = runner(env);
  const installed = await setup(options(env, mock.run));
  const movedCache = `${packageRoot}-removed`;
  fs.renameSync(packageRoot, movedCache);
  assert.ok(installed.hosts.every(host => fs.existsSync(path.join(host.pluginRoot, 'catalog.json'))));
});
