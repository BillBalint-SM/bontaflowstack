#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const installer = path.join(repo, 'installers', 'npm');
const packageJson = JSON.parse(fs.readFileSync(path.join(installer, 'package.json'), 'utf8'));
const sharedContract = '## Task scope and results\n';

function usage() {
  return 'Usage: node scripts/build-npm-package.mjs --output <new-directory>';
}

function runBuilder(script, output, label, args = []) {
  const result = spawnSync(process.execPath, [path.join(repo, 'scripts', script), ...args, '--output', output], {
    cwd:repo, encoding:'utf8', windowsHide:true
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `${label} generation failed`);
}

function setVersion(plugin, version, host) {
  const catalogPath = path.join(plugin, 'catalog.json');
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  catalog.version = version;
  fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);

  const manifestPath = path.join(plugin, {codex:'.codex-plugin/plugin.json',claude:'.claude-plugin/plugin.json',gemini:'gemini-extension.json',copilot:'plugin.json',cursor:'.cursor-plugin/plugin.json',opencode:'package.json'}[host]);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.version = version;
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  if (host === 'claude' || host === 'copilot') {
    const marketplacePath = path.join(plugin, host === 'claude' ? '.claude-plugin/marketplace.json' : 'marketplace.json');
    const marketplace = JSON.parse(fs.readFileSync(marketplacePath, 'utf8'));
    marketplace.name = 'bontaflowstack-npx';
    for (const entry of marketplace.plugins) entry.version = version;
    fs.writeFileSync(marketplacePath, `${JSON.stringify(marketplace, null, 2)}\n`);
  }
  return catalog;
}

function npmSetupSection(host) {
  const installed = {claude:'Claude Code registers the plugin in user scope.',codex:'Codex registers the local marketplace and enables the plugin.',gemini:'Gemini CLI installs a copy of the durable extension through its native installer; preserve its consent and skill-access prompts.',copilot:'GitHub Copilot CLI registers a local marketplace and loads its durable plugin source; preserve native permission and enablement policies.',cursor:'Cursor IDE receives real files in its local plugin directory. Reload the relevant IDE window and verify the plugin in Customize; file placement alone does not establish active loading. Preserve unsaved work and native policy.',opencode:'OpenCode CLI loads the durable V1 plugin through its global local-plugin directory. Its config callback adds MCP and skills in memory; existing JSON/JSONC files and permission settings remain unchanged.'}[host];
  const checks = {claude:'the `bfs` MCP status and core doctor tools',codex:'the `bfs-browser` MCP status tool and the bundled core CLI doctor',gemini:'`mcp_bfs_status` and `mcp_bfs_core` with `args:["doctor"]`',copilot:'the installed plugin\'s `bfs` MCP status and core doctor tools',cursor:'the `bfs_status` and `bfs_core` tools with `args:["doctor"]`',opencode:'`bfs_status` and `bfs_core` with `args:["doctor"]`'}[host];
  return `## Install and verify\n\nThis package is installed with \`npx ${packageJson.name}@${packageJson.version} setup\`. The setup command keeps adapters outside the npm cache and configures every detected host unless a host was explicitly selected. ${installed} Start a new session in each configured host after setup or update.\n\nInspect native readiness in the host using ${checks}. Installed files and manifests do not establish native skill, hook or MCP behavior; exercise each actual host session before claiming those work.\n\nTo remove a host registration, use that host's plugin or extension controls. Durable plugin versions and BFS project data remain available for recovery.\n\n`;
}

function replaceInstallSection(hostFile, host) {
  const contents = fs.readFileSync(hostFile, 'utf8');
  const section = /^## Install and verify\n[\s\S]*?(?=^## Task scope and results\n)/m;
  if (section.test(contents)) {
    fs.writeFileSync(hostFile, contents.replace(section, npmSetupSection(host)));
  } else {
    const boundary = contents.indexOf(sharedContract);
    if (boundary < 0) throw new Error(`Could not locate shared HOST contract in ${hostFile}`);
    fs.writeFileSync(hostFile, `${contents.slice(0, boundary)}${npmSetupSection(host)}${contents.slice(boundary)}`);
  }
}

function build(outputValue) {
  if (!outputValue) throw new Error(usage());
  const output = path.resolve(outputValue);
  if (fs.existsSync(output)) throw new Error(`Output already exists; choose a new directory: ${output}`);
  const setupEntry = path.join(installer, 'bin', 'setup.mjs');
  if (!fs.statSync(setupEntry, { throwIfNoEntry:false })?.isFile()) throw new Error('Universal setup entry is missing: installers/npm/bin/setup.mjs');

  const parent = path.dirname(output);
  fs.mkdirSync(parent, { recursive:true });
  const stage = fs.mkdtempSync(path.join(parent, `.${path.basename(output)}-${randomUUID()}-`));
  try {
    const codexPlugin = path.join(stage, 'hosts', 'codex', 'plugins', 'bontaflowstack');
    const claudePlugin = path.join(stage, 'hosts', 'claude');
    const geminiPlugin = path.join(stage, 'hosts', 'gemini');
    const copilotPlugin = path.join(stage, 'hosts', 'copilot');
    const cursorPlugin = path.join(stage, 'hosts', 'cursor');
    const opencodePlugin = path.join(stage, 'hosts', 'opencode');
    fs.mkdirSync(path.dirname(codexPlugin), { recursive:true });
    fs.mkdirSync(path.join(stage, 'hosts', 'codex', '.agents', 'plugins'), { recursive:true });
    fs.copyFileSync(path.join(repo, '.agents', 'plugins', 'marketplace.json'), path.join(stage, 'hosts', 'codex', '.agents', 'plugins', 'marketplace.json'));
    fs.cpSync(path.join(repo, 'plugins', 'bontaflowstack'), codexPlugin, { recursive:true, errorOnExist:true, force:false });
    runBuilder('build-claude-package.mjs', claudePlugin, 'Claude plugin');
    runBuilder('build-host-package.mjs', geminiPlugin, 'Gemini extension', ['--host','gemini-cli']);
    runBuilder('build-host-package.mjs', copilotPlugin, 'Copilot plugin', ['--host','copilot-cli']);
    runBuilder('build-host-package.mjs', cursorPlugin, 'Cursor plugin', ['--host','cursor-ide']);
    runBuilder('build-host-package.mjs', opencodePlugin, 'OpenCode plugin', ['--host','opencode-cli']);

    const codexCatalog = setVersion(codexPlugin, packageJson.version, 'codex');
    setVersion(claudePlugin, packageJson.version, 'claude');
    setVersion(geminiPlugin, packageJson.version, 'gemini');
    setVersion(copilotPlugin, packageJson.version, 'copilot');
    setVersion(cursorPlugin, packageJson.version, 'cursor');
    setVersion(opencodePlugin, packageJson.version, 'opencode');
    replaceInstallSection(path.join(codexPlugin, 'HOST.md'), 'codex');
    replaceInstallSection(path.join(claudePlugin, 'HOST.md'), 'claude');
    replaceInstallSection(path.join(geminiPlugin, 'HOST.md'), 'gemini');
    replaceInstallSection(path.join(copilotPlugin, 'HOST.md'), 'copilot');
    replaceInstallSection(path.join(cursorPlugin, 'HOST.md'), 'cursor');
    replaceInstallSection(path.join(opencodePlugin, 'HOST.md'), 'opencode');

    fs.cpSync(path.join(installer, 'bin'), path.join(stage, 'bin'), { recursive:true, errorOnExist:true, force:false });
    fs.copyFileSync(path.join(installer, 'README.md'), path.join(stage, 'README.md'));
    fs.copyFileSync(path.join(repo, 'LICENSE'), path.join(stage, 'LICENSE'));
    const { private: sourceOnly, ...publishedPackage } = packageJson;
    fs.writeFileSync(path.join(stage, 'package.json'), `${JSON.stringify(publishedPackage, null, 2)}\n`);

    if (fs.existsSync(output)) throw new Error(`Output appeared while building; choose a new directory: ${output}`);
    fs.renameSync(stage, output);
    return { output, package:packageJson.name, version:packageJson.version, skillCount:codexCatalog.skills.length, hosts:['codex','claude','gemini','copilot','cursor','opencode'] };
  } catch (error) {
    fs.rmSync(stage, { recursive:true, force:true });
    throw error;
  }
}

try {
  const argv = process.argv.slice(2);
  if (argv.length !== 2 || argv[0] !== '--output' || !argv[1]) throw new Error(usage());
  process.stdout.write(`${JSON.stringify(build(argv[1]))}\n`);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
