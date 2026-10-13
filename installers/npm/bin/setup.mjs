#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const defaultPackageRoot = path.resolve(import.meta.dirname, '..');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const layout = {
  codex: { plugin: 'codex/plugins/bontaflowstack', marketplace: 'bontaflowstack' },
  claude: { plugin: 'claude', marketplace: 'bontaflowstack-npx' },
};

function runCommand(command, args, { env, inherit = false } = {}) {
  const result = spawnSync(command, args, {
    env, encoding: 'utf8', windowsHide: true,
    stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'], maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error) throw new Error(`Cannot run ${command}: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${path.basename(command)} failed (${result.status ?? result.signal}). ${result.stderr?.trim() || result.stdout?.trim() || 'See the command output above.'}`);
  return result.stdout?.trim() || '';
}

function candidates(host, env) {
  const profile = env.USERPROFILE || os.homedir();
  const commands = [];
  const native = path.join(profile, '.local', 'bin', `${host}.exe`);
  if (fs.existsSync(native)) commands.push([native]);
  if (host === 'codex') {
    const bundled = path.join(env.LOCALAPPDATA, 'OpenAI', 'Codex', 'bin');
    if (fs.existsSync(bundled)) {
      for (const entry of fs.readdirSync(bundled).map(name => path.join(bundled, name, 'codex.exe')).filter(file => fs.existsSync(file)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)) commands.push([entry]);
    }
  }
  for (const directory of new Set([env.APPDATA && path.join(env.APPDATA, 'npm'), path.dirname(process.execPath), ...(env.PATH || env.Path || '').split(path.delimiter)])) {
    if (!directory) continue;
    const wrapper = path.join(directory.replace(/^"|"$/g, ''), 'node_modules', ...(host === 'codex' ? ['@openai', 'codex', 'bin', 'codex.js'] : ['@anthropic-ai', 'claude-code', 'cli.js']));
    if (fs.existsSync(wrapper)) commands.push([process.execPath, wrapper]);
  }
  commands.push([`${host}.exe`]);
  return commands;
}

export async function setup({ packageRoot = defaultPackageRoot, env = process.env, run = runCommand, platform = process.platform, arch = process.arch, host = 'auto' } = {}) {
  if (platform !== 'win32' || arch !== 'x64') throw new Error('This release supports Windows x64 only.');
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('Install Node.js 24 or newer, including npm.');
  if (!env.LOCALAPPDATA || !path.isAbsolute(env.LOCALAPPDATA)) throw new Error('LOCALAPPDATA must be an absolute directory.');
  if (!['auto', 'codex', 'claude', 'all'].includes(host)) throw new Error('Host must be codex, claude or all.');
  const source = path.join(packageRoot, 'hosts');
  const { noLinks, digest, atomicWrite, readJson, requireValue } = await import(pathToFileURL(path.join(source, layout.codex.plugin, 'core/state.mjs')));
  const pkg = read(path.join(packageRoot, 'package.json'));
  requireValue(pkg.name === 'bontaflowstack' && /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9]+(?:[.-][a-zA-Z0-9]+)*)?$/.test(pkg.version), 'Invalid installer package identity or version.');
  for (const [name, details] of Object.entries(layout)) {
    const manifest = read(path.join(source, details.plugin, name === 'codex' ? '.codex-plugin/plugin.json' : '.claude-plugin/plugin.json'));
    requireValue(manifest.name === pkg.name && manifest.version === pkg.version, 'Plugin and installer release metadata differ.');
  }
  const codexMarket = read(path.join(source, 'codex/.agents/plugins/marketplace.json'));
  const claudeMarket = read(path.join(source, 'claude/.claude-plugin/marketplace.json'));
  const validCodexMarket = value => value?.name === layout.codex.marketplace && value.plugins?.length === 1 && value.plugins[0].name === pkg.name && value.plugins[0].source?.source === 'local' && value.plugins[0].source.path === './plugins/bontaflowstack';
  requireValue(validCodexMarket(codexMarket) && claudeMarket.name === layout.claude.marketplace && claudeMarket.plugins?.length === 1 && claudeMarket.plugins[0].name === pkg.name && claudeMarket.plugins[0].version === pkg.version && claudeMarket.plugins[0].source === '.', 'Invalid bundled marketplace.');

  function inventory(directory) {
    noLinks(directory);
    return fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry => {
      const file = path.join(directory, entry.name);
      noLinks(file);
      requireValue(entry.isFile() || entry.isDirectory(), `Unsupported package entry: ${file}`);
      return entry.isDirectory() ? inventory(file).map(([name, hash]) => [`${entry.name}/${name}`, hash]) : [[entry.name, digest(fs.readFileSync(file))]];
    });
  }
  const root = path.join(env.LOCALAPPDATA, 'BontaFlowStack', 'npm');
  const versions = path.join(root, 'versions');
  const installationRoot = path.join(versions, pkg.version);
  noLinks(installationRoot);
  const marker = path.join(root, 'installation.json');
  const ownership = readJson(marker);
  requireValue(!fs.existsSync(root) || ownership?.schema === 1 && ownership.package === pkg.name, `Unrecognized installation directory; files were preserved: ${root}`);
  const defaultState = path.join(env.LOCALAPPDATA, 'BontaFlowStack', 'state', 'v2');
  let stateHome = env.BFS_STATE_HOME || ownership?.stateHome;
  if (!stateHome) {
    const stores = [defaultState];
    const packages = path.join(env.LOCALAPPDATA, 'Packages');
    noLinks(packages);
    if (fs.existsSync(packages)) {
      for (const name of fs.readdirSync(packages).filter(name => name.startsWith('OpenAI.Codex_'))) stores.push(path.join(packages, name, 'LocalCache/Local/BontaFlowStack/state/v2'));
    }
    const existing = stores.filter(directory => { noLinks(directory); return fs.existsSync(directory) && fs.readdirSync(directory).length > 0; });
    requireValue(existing.length <= 1, `Multiple existing BFS data stores were preserved. Set BFS_STATE_HOME to the store you want to use, then rerun setup:\n${existing.join('\n')}`);
    stateHome = existing[0] || defaultState;
  }
  requireValue(path.isAbsolute(stateHome), 'BFS_STATE_HOME must be an absolute directory.');
  noLinks(stateHome);
  const pin = `${JSON.stringify({ schema: 1, stateHome }, null, 2)}\n`;
  const expected = inventory(source);
  for (const details of Object.values(layout)) {
    const file = `${details.plugin}/install-state.json`;
    requireValue(!expected.some(([name]) => name === file), 'Published package must not contain machine-specific install state.');
    expected.push([file, digest(pin)]);
  }
  const sameInventory = directory => JSON.stringify(inventory(directory).sort()) === JSON.stringify([...expected].sort());

  const commandEnv = { ...env, BFS_STATE_HOME: stateHome, PATH: `${path.dirname(process.execPath)}${path.delimiter}${env.PATH || env.Path || ''}` };
  const powershellEnv = { ...commandEnv };
  // Windows PowerShell must discover its own modules instead of inheriting PowerShell 7 modules through Node.
  for (const key of Object.keys(powershellEnv)) if (key.toLowerCase() === 'psmodulepath') delete powershellEnv[key];
  const invoke = (command, args, inherit = false) => run(command, args, { env: command === 'powershell.exe' ? powershellEnv : commandEnv, inherit });
  const hosts = [];
  for (const name of Object.keys(layout).filter(name => ['auto', 'all', name].includes(host))) {
    let executable, versionText;
    for (const candidate of candidates(name, env)) {
      try { versionText = invoke(candidate[0], [...candidate.slice(1), '--version']); executable = candidate; break; }
      catch { /* Try the next installed CLI location. */ }
    }
    if (!executable) {
      requireValue(host === 'auto', `${name} CLI was not found. Install the host and rerun setup.`);
      continue;
    }
    const version = versionText.match(/(?:^|codex-cli )(\d+)\.(\d+)\.(\d+)/)?.slice(1).map(Number);
    requireValue(version && (name === 'codex' ? version[0] > 0 || version[1] >= 162 : version[0] > 2 || version[0] === 2 && (version[1] > 1 || version[1] === 1 && version[2] >= 296)), `Update ${name} before setup (Codex 0.162.0+, Claude Code 2.1.296+).`);
    const cli = (args, inherit = false) => invoke(executable[0], [...executable.slice(1), ...(name === 'codex' ? ['--no-daemon'] : []), ...args], inherit);
    const marketplaces = JSON.parse(cli(['plugin', 'marketplace', 'list', '--json']));
    const plugins = JSON.parse(cli(['plugin', 'list', '--json']));
    const markets = name === 'codex' ? marketplaces.marketplaces : marketplaces;
    const installed = name === 'codex' ? plugins.installed : plugins;
    requireValue(Array.isArray(markets) && Array.isArray(installed), `Unexpected ${name} CLI list format.`);
    const details = layout[name], configured = markets.find(item => item.name === details.marketplace);
    const prior = name === 'codex' ? configured?.root : configured?.path;
    const marketplaceRoot = path.join(installationRoot, 'hosts', name);
    const pluginRoot = path.join(installationRoot, 'hosts', details.plugin);
    const pluginId = `${pkg.name}@${details.marketplace}`;
    if (configured) {
      requireValue(typeof prior === 'string' && path.isAbsolute(prior), `Invalid ${name} marketplace path; it was preserved.`);
      noLinks(prior);
      if (name === 'codex') {
        requireValue(validCodexMarket(readJson(path.join(prior, '.agents/plugins/marketplace.json'))) && readJson(path.join(prior, 'plugins/bontaflowstack/.codex-plugin/plugin.json'))?.name === pkg.name, `Marketplace ${details.marketplace} belongs to another installation; it was preserved.`);
      } else {
        const legacyRoot = path.join(env.LOCALAPPDATA, 'BontaFlowStack', 'claude-code');
        const legacy = readJson(path.join(legacyRoot, 'installation.json'));
        const managed = ownership && path.dirname(path.dirname(path.dirname(path.resolve(prior)))) === versions;
        const previousInstaller = legacy?.schema === 1 && legacy.package === pkg.name && path.dirname(path.resolve(prior)) === path.join(legacyRoot, 'versions');
        const previousMarket = readJson(path.join(prior, '.claude-plugin/marketplace.json'));
        requireValue(configured.source === 'directory' && (managed || previousInstaller) && previousMarket?.name === details.marketplace && previousMarket.plugins?.length === 1 && previousMarket.plugins[0].name === pkg.name && previousMarket.plugins[0].source === '.' && readJson(path.join(prior, '.claude-plugin/plugin.json'))?.name === pkg.name, `Marketplace ${details.marketplace} belongs to another installation; it was preserved.`);
      }
    }
    requireValue(!installed.some(item => (item.id || item.pluginId)?.startsWith('bontaflowstack@') && ((item.id || item.pluginId) !== pluginId || name === 'claude' && item.scope !== 'user')), `Another BontaFlowStack plugin or scope is installed; resolve it in ${name} before setup.`);
    hosts.push({ host: name, cli, prior, installed, pluginId, ...details, pluginRoot, marketplaceRoot });
  }
  requireValue(hosts.length, 'No supported host CLI found. Install Codex or Claude Code, then rerun the same command.');
  invoke('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'Get-Command npm.cmd,node,git -CommandType Application -ErrorAction Stop | Out-Null']);
  if (fs.existsSync(installationRoot)) {
    requireValue(sameInventory(path.join(installationRoot, 'hosts')), `Installed version ${pkg.version} differs from this package; files were preserved. Use a new release version.`);
  } else {
    if (!ownership) atomicWrite(marker, { schema: 1, package: pkg.name, stateHome });
    fs.mkdirSync(versions, { recursive: true });
    const stage = path.join(versions, `.staging-${randomUUID()}`);
    fs.cpSync(source, path.join(stage, 'hosts'), { recursive: true, force: false, errorOnExist: true });
    for (const details of Object.values(layout)) fs.writeFileSync(path.join(stage, 'hosts', details.plugin, 'install-state.json'), pin, { flag: 'wx' });
    requireValue(sameInventory(path.join(stage, 'hosts')), `Copied files differ; staging files were preserved at ${stage}`);
    fs.renameSync(stage, installationRoot);
  }
  // Prepare the shared engines before changing either active host registration.
  const core = path.join(installationRoot, 'hosts', layout.codex.plugin);
  // Keep the official platform binary and its license outside the disposable npm cache.
  const require = createRequire(path.join(packageRoot, 'package.json'));
  const impeccableManifest = require.resolve('impeccable/package.json');
  const impeccable = read(impeccableManifest);
  requireValue(impeccable.version === pkg.dependencies.impeccable, 'Unexpected Impeccable npm version; rerun setup with a clean npm cache.');
  const platformManifest = createRequire(impeccableManifest).resolve('@impeccable/cli-windows-x64/package.json');
  requireValue(read(platformManifest).version === impeccable.optionalDependencies['@impeccable/cli-windows-x64'], 'Unexpected Impeccable platform package.');
  const toolSource = path.dirname(platformManifest);
  const toolRoot = path.join(stateHome, 'tools', 'impeccable', impeccable.version);
  noLinks(toolRoot);
  const toolFiles = inventory(toolSource);
  const sameTool = directory => JSON.stringify(inventory(directory)) === JSON.stringify(toolFiles);
  if (fs.existsSync(toolRoot)) {
    requireValue(sameTool(toolRoot), `Impeccable installation differs; files were preserved at ${toolRoot}`);
  } else {
    fs.mkdirSync(path.dirname(toolRoot), { recursive:true });
    const stage = fs.mkdtempSync(path.join(path.dirname(toolRoot), '.staging-'));
    fs.cpSync(toolSource, stage, { recursive:true, force:false, errorOnExist:true });
    requireValue(sameTool(stage), `Impeccable copy differs; files were preserved at ${stage}`);
    fs.renameSync(stage, toolRoot);
  }
  const executable = path.join(toolRoot, 'bin/impeccable.exe');
  const engineVersion = invoke(executable, ['--version']);
  requireValue(/^\d+\.\d+\.\d+$/.test(engineVersion), 'Impeccable did not confirm a working executable.');
  const configFile = path.join(stateHome, 'impeccable.json');
  const configuration = { schema:1, version:impeccable.version, engineVersion, command:[executable], sha256:digest(fs.readFileSync(executable)) };
  const priorTool = readJson(configFile);
  const { externalCommand } = await import(pathToFileURL(path.join(core, 'core/engines.mjs')));
  if (priorTool) externalCommand({home:stateHome}, 'BFS_IMPECCABLE_COMMAND', {});
  atomicWrite(configFile, configuration);
  externalCommand({home:stateHome}, 'BFS_IMPECCABLE_COMMAND', commandEnv);
  invoke('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(core, 'scripts/install-engines.ps1')], true);
  invoke(process.execPath, [path.join(core, 'core/cli.mjs'), 'doctor', 'bfs-browse'], true);
  for (const target of hosts) {
    const { cli, prior, pluginId, marketplace, marketplaceRoot, pluginRoot } = target;
    if (target.host === 'codex') {
      const changed = prior && path.resolve(prior) !== marketplaceRoot;
      const alreadyActive = prior && !changed && target.installed.some(item => item.pluginId === pluginId && item.version === pkg.version && item.enabled === true && item.installed === true);
      if (changed) cli(['plugin', 'marketplace', 'remove', marketplace, '--json']);
      try {
        if (!alreadyActive) {
          cli(['plugin', 'marketplace', 'add', marketplaceRoot, '--json']);
          cli(['plugin', 'add', pluginId, '--json']);
        }
      } catch (error) {
        if (changed) {
          try {
            const current = JSON.parse(cli(['plugin', 'marketplace', 'list', '--json'])).marketplaces.find(item => item.name === marketplace);
            if (current) cli(['plugin', 'marketplace', 'remove', marketplace, '--json']);
            cli(['plugin', 'marketplace', 'add', prior, '--json']);
          } catch (restore) { throw new Error(`${error.message}\nCould not restore previous marketplace: ${restore.message}. Previous files remain at ${prior}. Rerun setup.`); }
        }
        throw error;
      }
      const active = JSON.parse(cli(['plugin', 'list', '--json'])).installed?.find(item => item.pluginId === pluginId);
      requireValue(active?.version === pkg.version && active.enabled === true && active.installed === true, 'Codex did not confirm the enabled release. Rerun setup or inspect the plugin settings.');
    } else {
      cli(['plugin', 'marketplace', 'add', marketplaceRoot, '--scope', 'user'], true);
      cli(['plugin', target.installed.some(item => item.id === pluginId) ? 'update' : 'install', pluginId, '--scope', 'user'], true);
      const active = JSON.parse(cli(['plugin', 'list', '--json'])).find(item => item.id === pluginId && item.scope === 'user');
      requireValue(active?.version === pkg.version && typeof active.readFromFolder === 'string' && path.resolve(active.readFromFolder) === pluginRoot, 'Claude did not confirm the selected version and persistent path. Rerun setup.');
      requireValue(active.enabled === true, 'The plugin remains disabled in Claude. Enable it in /plugin when you are ready.');
    }
    console.log(`BontaFlowStack ${pkg.version}: ${target.host} registered.`);
  }
  if (ownership && ownership.stateHome !== stateHome) atomicWrite(marker, { schema: 1, package: pkg.name, stateHome });
  return { name: pkg.name, version: pkg.version, installationRoot, stateHome, hosts: hosts.map(({ host, pluginRoot, marketplaceRoot }) => ({ host, pluginRoot, marketplaceRoot })) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length === 1 && ['--help', '-h'].includes(args[0])) {
      console.log('Usage: npx bontaflowstack@<version> [setup] [--host codex|claude|all]\nAutomatically installs and configures every detected host and the shared engines.\nRequires Windows x64, Node.js 24+, npm, Git, and Codex 0.162.0+ or Claude Code 2.1.296+.');
    } else if (args.length === 1 && args[0] === '--version') {
      console.log(read(path.join(defaultPackageRoot, 'package.json')).version);
    } else {
      if (args[0] === 'setup') args.shift();
      if (args.length !== 0 && !(args.length === 2 && args[0] === '--host' && ['codex', 'claude', 'all'].includes(args[1]))) throw new Error('Unknown arguments. Use: npx bontaflowstack@<version> setup');
      const result = await setup({ host: args[1] || 'auto' });
      console.log(`BontaFlowStack ${result.version} installed at ${result.installationRoot}\nShared data: ${result.stateHome}\nStart a new host session and use bfs-router.`);
      if (result.hosts.some(item => item.host === 'codex')) console.log('Codex: review and trust the plugin hooks in /hooks when prompted. Setup does not bypass host trust.');
    }
  } catch (error) {
    console.error(`BontaFlowStack setup: ${error.message}`);
    process.exitCode = 1;
  }
}
