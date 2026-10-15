#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { restoreSource, replaceSource } from './source-copy.mjs';
import { prepareGemini } from './gemini.mjs';
import { prepareCopilot } from './copilot.mjs';
import { findCursor, prepareCursor } from './cursor.mjs';
import { prepareOpenCode } from './opencode.mjs';

const defaultPackageRoot = path.resolve(import.meta.dirname, '..');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const layout = {
  codex: { plugin: 'codex/plugins/bontaflowstack', manifest:'.codex-plugin/plugin.json', marketplace: 'bontaflowstack' },
  claude: { plugin: 'claude', manifest:'.claude-plugin/plugin.json', marketplace: 'bontaflowstack-npx' },
  gemini: { plugin:'gemini', manifest:'gemini-extension.json' },
  copilot: { plugin:'copilot', manifest:'plugin.json' },
  cursor: { plugin:'cursor', manifest:'.cursor-plugin/plugin.json' },
  opencode: { plugin:'opencode', manifest:'package.json' },
};

function runCommand(command, args, { env, inherit = false } = {}) {
  let result,temporary;const descriptors=[],limit=8*1024*1024;
  try {
    const options={env,encoding:'utf8',windowsHide:true,stdio:inherit?'inherit':['ignore','pipe','pipe'],maxBuffer:limit};
    // Some native CLIs exit before Darwin pipe buffers drain; files keep their JSON complete.
    if(process.platform==='darwin' && !inherit) {
      temporary=fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()),'bfs-command-'));
      for(const name of ['stdout','stderr'])descriptors.push(fs.openSync(path.join(temporary,name),'wx',0o600));
      options.stdio=['ignore',...descriptors];
    }
    result=spawnSync(command,args,options);
    if(temporary)for(const name of ['stdout','stderr']) {
      const file=path.join(temporary,name);
      if(fs.statSync(file).size>limit)throw new Error(`${path.basename(command)} ${name} exceeded the 8 MiB capture limit`);
      result[name]=fs.readFileSync(file,'utf8');
    }
  } finally {
    for(const descriptor of descriptors)fs.closeSync(descriptor);
    if(temporary){for(const name of ['stdout','stderr'])if(fs.existsSync(path.join(temporary,name)))fs.unlinkSync(path.join(temporary,name));fs.rmdirSync(temporary);}
  }
  if (result.error) throw new Error(`Cannot run ${command}: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${path.basename(command)} failed (${result.status ?? result.signal}). ${result.stderr?.trim() || result.stdout?.trim() || 'See the command output above.'}`);
  // Gemini 0.63 sends extension-list JSON through its stderr logger.
  return result.stdout?.trim() || result.stderr?.trim() || '';
}

function candidates(host, env, platform) {
  if(platform!=='win32') {
    const profile=env.HOME || os.homedir(),commands=[];
    const directories=[path.join(profile,'.local/bin'),...(host==='opencode'?[path.join(profile,'.opencode/bin')]:[]),...(env.PATH || '').split(path.delimiter).filter(Boolean)];
    for(const directory of new Set(directories)) {
      const file=path.join(directory,host);
      try {if(fs.statSync(file).isFile()){fs.accessSync(file,fs.constants.X_OK);commands.push([file]);}} catch { /* Try the next native CLI. */ }
    }
    commands.push([host]);return commands;
  }
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
    const wrappers={codex:['@openai/codex/bin/codex.js'],claude:['@anthropic-ai/claude-code/cli.js'],gemini:['@google/gemini-cli/bundle/gemini.js','@google/gemini-cli/dist/index.js'],copilot:['@github/copilot/npm-loader.js'],opencode:['opencode-ai/bin/opencode.exe']}[host];
    for(const relative of wrappers) {
      const wrapper=path.join(directory.replace(/^"|"$/g,''),'node_modules',relative);
      if(fs.existsSync(wrapper))commands.push(host==='opencode'?[wrapper]:[process.execPath,wrapper]);
    }
  }
  commands.push([`${host}.exe`]);
  return commands;
}

export async function setup({ packageRoot = defaultPackageRoot, env = process.env, run = runCommand, platform = process.platform, arch = process.arch, host = 'auto' } = {}) {
  if (!['win32-x64','linux-x64','linux-arm64','darwin-x64','darwin-arm64'].includes(`${platform}-${arch}`)) throw new Error(`Unsupported BFS target: ${platform}-${arch}`);
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('Install Node.js 24 or newer, including npm.');
  if (platform==='win32' && (!env.LOCALAPPDATA || !path.isAbsolute(env.LOCALAPPDATA))) throw new Error('LOCALAPPDATA must be an absolute directory.');
  if (!['auto', ...Object.keys(layout), 'all'].includes(host)) throw new Error('Host must be codex, claude, gemini, copilot, cursor, opencode or all.');
  const source = path.join(packageRoot, 'hosts');
  const { noLinks, digest, atomicWrite, readJson, requireValue, dataPaths } = await import(pathToFileURL(path.join(source, layout.codex.plugin, 'core/state.mjs')));
  const pkg = read(path.join(packageRoot, 'package.json'));
  const { targetInfo } = await import(pathToFileURL(path.join(source,layout.codex.plugin,'core/engines.mjs')));
  requireValue(pkg.name === 'bontaflowstack' && /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9]+(?:[.-][a-zA-Z0-9]+)*)?$/.test(pkg.version), 'Invalid installer package identity or version.');
  for (const [name, details] of Object.entries(layout)) {
    const manifest = read(path.join(source, details.plugin, details.manifest));
    const names = name === 'cursor' ? ['bontaflowstack-cursor', pkg.name] : [pkg.name];
    requireValue(names.includes(manifest.name) && manifest.version === pkg.version, 'Plugin and installer release metadata differ.');
  }
  const codexMarket = read(path.join(source, 'codex/.agents/plugins/marketplace.json'));
  const claudeMarket = read(path.join(source, 'claude/.claude-plugin/marketplace.json'));
  const validCodexMarket = value => value?.name === layout.codex.marketplace && value.plugins?.length === 1 && value.plugins[0].name === pkg.name && value.plugins[0].source?.source === 'local' && value.plugins[0].source.path === './plugins/bontaflowstack';
  requireValue(validCodexMarket(codexMarket) && claudeMarket.name === layout.claude.marketplace && claudeMarket.plugins?.length === 1 && claudeMarket.plugins[0].name === pkg.name && claudeMarket.plugins[0].version === pkg.version && claudeMarket.plugins[0].source === '.', 'Invalid bundled marketplace.');
  const copilotMarket=read(path.join(source,'copilot/marketplace.json'));
  requireValue(copilotMarket.name==='bontaflowstack-npx' && copilotMarket.plugins?.length===1 && copilotMarket.plugins[0].name===pkg.name && copilotMarket.plugins[0].source==='.' && copilotMarket.plugins[0].version===pkg.version,'Invalid bundled Copilot marketplace.');

  function inventory(directory) {
    noLinks(directory);
    return fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry => {
      const file = path.join(directory, entry.name);
      noLinks(file);
      requireValue(entry.isFile() || entry.isDirectory(), `Unsupported package entry: ${file}`);
      return entry.isDirectory() ? inventory(file).map(([name, hash]) => [`${entry.name}/${name}`, hash]) : [[entry.name, digest(fs.readFileSync(file))]];
    });
  }
  const defaults=dataPaths(env,platform);
  const root = defaults.installRoot;
  const versions = path.join(root, 'versions',...(platform==='win32'?[]:[`${platform}-${arch}`]));
  const installationRoot = path.join(versions, pkg.version);
  noLinks(installationRoot);
  const marker = path.join(root, 'installation.json');
  const ownership = readJson(marker);
  requireValue(!fs.existsSync(root) || ownership?.schema === 1 && ownership.package === pkg.name, `Unrecognized installation directory; files were preserved: ${root}`);
  const defaultState = defaults.stateHome;
  let stateHome = env.BFS_STATE_HOME || ownership?.stateHome;
  if (!stateHome) {
    const stores = [defaultState];
    const packages = platform==='win32'?path.join(env.LOCALAPPDATA, 'Packages'):null;
    if(packages)noLinks(packages);
    if (packages && fs.existsSync(packages)) {
      for (const name of fs.readdirSync(packages).filter(name => name.startsWith('OpenAI.Codex_'))) stores.push(path.join(packages, name, 'LocalCache/Local/BontaFlowStack/state/v2'));
    }
    const existing = stores.filter(directory => { noLinks(directory); return fs.existsSync(directory) && fs.readdirSync(directory).length > 0; });
    requireValue(existing.length <= 1, `Multiple existing BFS data stores were preserved. Set BFS_STATE_HOME to the store you want to use, then rerun setup:\n${existing.join('\n')}`);
    stateHome = existing[0] || defaultState;
  }
  requireValue(path.isAbsolute(stateHome), 'BFS_STATE_HOME must be an absolute directory.');
  noLinks(stateHome);
  const pin = `${JSON.stringify({ schema: 1, stateHome }, null, 2)}\n`;
  function runtimeFilesFor(nodeExecutable) {
    const runtimeFiles=new Map();
    const shellQuote=value=>`'${value.replaceAll("'", "'\\''")}'`;
    const runtimeJson=(relative,update)=>{
      const file=path.join(source,relative);noLinks(file);
      const value=read(file);update(value);runtimeFiles.set(relative,`${JSON.stringify(value,null,2)}\n`);
    };
    if(platform!=='win32') {
      const node=shellQuote(nodeExecutable);
      for(const host of ['gemini','cursor'])runtimeJson(`${layout[host].plugin}/hooks/hooks.json`,value=>{
        for(const [event,entries] of Object.entries(value.hooks))for(const entry of entries) {
          const hooks=host==='gemini'?entry.hooks:[entry];
          for(const hook of hooks)hook.command=`${node} ${host==='gemini'?shellQuote(path.join(installationRoot,'hosts',layout[host].plugin,'core/gemini-hook.mjs')):'"$CURSOR_PLUGIN_ROOT/core/cursor-hook.mjs"'} ${event}`;
        }
      });
      for(const [host,relative] of [['cursor','mcp.json'],['gemini','gemini-extension.json']])runtimeJson(`${layout[host].plugin}/${relative}`,value=>{
        for(const server of Object.values(value.mcpServers)) {requireValue(server.command==='node','Unexpected bundled MCP runtime');server.command=nodeExecutable;}
      });
      if(platform==='darwin') {
        for(const [host,relative] of [['codex','.mcp.json']])runtimeJson(`${layout[host].plugin}/${relative}`,value=>{
          for(const server of Object.values(value.mcpServers)) {requireValue(server.command==='node','Unexpected bundled MCP runtime');server.command=nodeExecutable;}
        });
        runtimeJson(`${layout.codex.plugin}/hooks/hooks.json`,value=>{
          for(const entries of Object.values(value.hooks))for(const entry of entries)for(const hook of entry.hooks) {
            requireValue(hook.command.startsWith('node '),'Unexpected bundled Codex hook runtime');hook.command=node+hook.command.slice(4);
          }
        });
      }
    }
    return runtimeFiles;
  }
  const sourceInventory=inventory(source);
  function expectedFor(nodeExecutable) {
    const expected=sourceInventory.map(entry=>[...entry]);
    for(const [file,contents] of runtimeFilesFor(nodeExecutable)) {
      const entry=expected.find(([name])=>name===file);requireValue(entry,'Runtime configuration is missing from the package');entry[1]=digest(contents);
    }
    for(const details of Object.values(layout)) {
      const file=details.plugin+'/install-state.json';
      requireValue(!expected.some(([name])=>name===file),'Published package must not contain machine-specific install state.');expected.push([file,digest(pin)]);
    }
    return expected.sort();
  }
  const runtimeFiles=runtimeFilesFor(process.execPath),expected=expectedFor(process.execPath);
  const runtimeRecordFile=path.join(installationRoot,'runtime.json');
  let runtimeRecord=null,legacyNode;
  if(platform!=='win32') {
    noLinks(runtimeRecordFile);runtimeRecord=readJson(runtimeRecordFile);
    if(runtimeRecord)requireValue(runtimeRecord.schema===1 && runtimeRecord.package===pkg.name && runtimeRecord.version===pkg.version && runtimeRecord.platform===platform && runtimeRecord.arch===arch && runtimeRecord.stateHome===stateHome && Array.isArray(runtimeRecord.nodes) && runtimeRecord.nodes.length && runtimeRecord.nodes.every(node=>typeof node==='string' && path.isAbsolute(node) && !node.includes('\0')) && runtimeRecord.nodes.includes(runtimeRecord.activeNode),'Invalid owned runtime record; files were preserved.');
    else {
      const prior=readJson(path.join(root,'setup-status.json'));
      if(prior?.version===pkg.version && prior.platform===platform && prior.arch===arch && typeof prior.runtime?.nodeExecutable==='string' && path.isAbsolute(prior.runtime.nodeExecutable))legacyNode=prior.runtime.nodeExecutable;
    }
  }
  const nodes=[...new Set([process.execPath,...(runtimeRecord?.nodes || []),...(legacyNode?[legacyNode]:[])])];
  const knownExpected=nodes.map(expectedFor),same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
  const sameInventory=directory=>same(inventory(directory).sort(),expected);
  const validateRuntime=directory=>{const actual=inventory(directory).sort();requireValue(!!ownership && knownExpected.some(known=>same(actual,known)),'Installed payload differs from its generated runtime; files were preserved.');};
  const runtimeCopy={source:path.join(installationRoot,'hosts'),parent:installationRoot,prefix:'.runtime-swap-',validate:validateRuntime,noLinks,requireValue,inventory};
  if(platform!=='win32' && fs.existsSync(installationRoot)) {restoreSource(runtimeCopy);validateRuntime(runtimeCopy.source);}
  const knownInventories=(name,version)=>platform!=='win32' && version===pkg.version ? knownExpected.map(known=>known.filter(([file])=>file.startsWith(layout[name].plugin+'/')).map(([file,hash])=>[file.slice(layout[name].plugin.length+1),hash])) : [];
  const writeRuntimeRecord=activeNode=>{if(platform!=='win32')atomicWrite(runtimeRecordFile,{schema:1,package:pkg.name,version:pkg.version,platform,arch,stateHome,nodes,activeNode});};

  const commandEnv = { ...env, BFS_STATE_HOME: stateHome, PATH: `${path.dirname(process.execPath)}${path.delimiter}${env.PATH || env.Path || ''}` };
  const powershellEnv = { ...commandEnv };
  // Windows PowerShell must discover its own modules instead of inheriting PowerShell 7 modules through Node.
  for (const key of Object.keys(powershellEnv)) if (key.toLowerCase() === 'psmodulepath') delete powershellEnv[key];
  const invoke = (command, args, inherit = false) => run(command, args, { env: command === 'powershell.exe' ? powershellEnv : commandEnv, inherit });
  const hosts = [];
  for (const name of Object.keys(layout).filter(name => ['auto', 'all', name].includes(host))) {
    if(name==='cursor') {
      const app=findCursor(env,platform);
      requireValue(app || host==='auto','Cursor IDE was not found. Install the host and rerun setup.');
      if(!app)continue;
      const parts=app.version.match(/^(\d+)\.(\d+)\.(\d+)$/)?.slice(1).map(Number);
      requireValue(parts && (parts[0]>3 || parts[0]===3 && (parts[1]>24 || parts[1]===24 && parts[2]>=12)),'Update Cursor IDE to 3.24.12 or newer before setup.');
      hosts.push(prepareCursor({root,versions,pluginRoot:path.join(installationRoot,'hosts/cursor'),version:pkg.version,skillNames:read(path.join(source,'cursor/catalog.json')).skills.map(item=>item.id),inventory,readJson,noLinks,requireValue,owned:!!ownership,env:commandEnv,platform,knownInventories}));
      continue;
    }
    let executable, versionText;
    for (const candidate of candidates(name, env,platform)) {
      try { versionText = invoke(candidate[0], [...candidate.slice(1), '--version']); if(!/^(?:codex-cli |GitHub Copilot CLI )?\d+\.\d+\.\d+/.test(versionText))continue; executable = candidate; break; }
      catch { /* Try the next installed CLI location. */ }
    }
    if (!executable) {
      requireValue(host === 'auto', `${name} CLI was not found. Install the host and rerun setup.`);
      continue;
    }
    const version = versionText.match(/^(?:codex-cli |GitHub Copilot CLI )?(\d+)\.(\d+)\.(\d+)/)?.slice(1).map(Number);
    const minimum={codex:[0,162,0],claude:[2,1,296],gemini:[0,63,0],copilot:[1,0,96],opencode:[1,19,0]}[name];
    requireValue(version && (version[0]>minimum[0] || version[0]===minimum[0] && (version[1]>minimum[1] || version[1]===minimum[1] && version[2]>=minimum[2])), `Update ${name} to ${minimum.join('.')} or newer before setup.`);
    const cli = (args, inherit = false) => invoke(executable[0], [...executable.slice(1), ...(name === 'codex' ? ['--no-daemon'] : []), ...args], inherit);
    if(name==='gemini') {
      hosts.push(prepareGemini({cli,root,versions,pluginRoot:path.join(installationRoot,'hosts/gemini'),version:pkg.version,inventory,readJson,atomicWrite,noLinks,requireValue,owned:!!ownership,knownInventories}));
      continue;
    }
    if(name==='copilot') {
      hosts.push(prepareCopilot({cli,root,versions,pluginRoot:path.join(installationRoot,'hosts/copilot'),version:pkg.version,skillNames:read(path.join(source,'copilot/catalog.json')).skills.map(item=>item.id),inventory,readJson,noLinks,requireValue,owned:!!ownership,env:commandEnv}));
      continue;
    }
    if(name==='opencode') {
      hosts.push(prepareOpenCode({cli,versions,pluginRoot:path.join(installationRoot,'hosts/opencode'),skillNames:read(path.join(source,'opencode/catalog.json')).skills.map(item=>item.id),readJson,noLinks,requireValue,owned:!!ownership}));
      continue;
    }
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
        const legacyRoot = platform==='win32'?path.join(env.LOCALAPPDATA, 'BontaFlowStack', 'claude-code'):null;
        const legacy = legacyRoot?readJson(path.join(legacyRoot, 'installation.json')):null;
        const managed = ownership && path.dirname(path.dirname(path.dirname(path.resolve(prior)))) === versions;
        const previousInstaller = legacy?.schema === 1 && legacy.package === pkg.name && path.dirname(path.resolve(prior)) === path.join(legacyRoot, 'versions');
        const previousMarket = readJson(path.join(prior, '.claude-plugin/marketplace.json'));
        requireValue(configured.source === 'directory' && (managed || previousInstaller) && previousMarket?.name === details.marketplace && previousMarket.plugins?.length === 1 && previousMarket.plugins[0].name === pkg.name && previousMarket.plugins[0].source === '.' && readJson(path.join(prior, '.claude-plugin/plugin.json'))?.name === pkg.name, `Marketplace ${details.marketplace} belongs to another installation; it was preserved.`);
      }
    }
    requireValue(!installed.some(item => (item.id || item.pluginId)?.startsWith('bontaflowstack@') && ((item.id || item.pluginId) !== pluginId || name === 'claude' && item.scope !== 'user')), `Another BontaFlowStack plugin or scope is installed; resolve it in ${name} before setup.`);
    hosts.push({ host: name, cli, prior, installed, pluginId, ...details, pluginRoot, marketplaceRoot });
  }
  requireValue(hosts.length, 'No supported host found. Install Codex, Claude Code, Gemini CLI, GitHub Copilot CLI, Cursor IDE or OpenCode CLI, then rerun the same command.');
  if(platform==='win32')invoke('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'Get-Command npm.cmd,node,git -CommandType Application -ErrorAction Stop | Out-Null']);
  else {invoke(process.execPath,['--version']);invoke('npm',['--version']);invoke('git',['--version']);}
  if (!ownership) atomicWrite(marker, { schema: 1, package: pkg.name, stateHome });
  if(platform!=='win32' && fs.existsSync(installationRoot))writeRuntimeRecord(runtimeRecord?.activeNode || legacyNode || process.execPath);
  const progressFile=path.join(root,'setup-status.json');
  const progress={schema:1,package:pkg.name,version:pkg.version,...targetInfo(platform,arch),status:'running',phase:'files',hosts:hosts.map(({host})=>({host,status:'pending'}))};
  if(platform!=='win32')progress.runtime={nodeExecutable:process.execPath,nodeVersion:process.version,verified:'setup-process',recovery:{status:runtimeRecord?.activeNode && runtimeRecord.activeNode!==process.execPath || legacyNode && legacyNode!==process.execPath?'pending':'unchanged'},gui:{status:'unverified',reason:'A native GUI host session has not been verified by setup.'}};
  const saveProgress=()=>atomicWrite(progressFile,progress);
  saveProgress();
  try {
    if (fs.existsSync(installationRoot)) {
      if(platform!=='win32' && !sameInventory(runtimeCopy.source)) {
        writeRuntimeRecord(runtimeRecord?.activeNode || legacyNode || process.execPath);
        const stagingRoot=fs.mkdtempSync(path.join(installationRoot,'.runtime-build-'));
        const stage=path.join(stagingRoot,'next');
        fs.cpSync(source,stage,{recursive:true,errorOnExist:true,force:false});
        for(const [file,contents] of runtimeFiles)fs.writeFileSync(path.join(stage,file),contents);
        for(const details of Object.values(layout))fs.writeFileSync(path.join(stage,details.plugin,'install-state.json'),pin,{flag:'wx'});
        requireValue(sameInventory(stage),'Runtime staging differed; files were preserved.');
        replaceSource({...runtimeCopy,pluginRoot:stage});
        requireValue(path.dirname(stagingRoot)===installationRoot && path.basename(stagingRoot).startsWith('.runtime-build-') && sameInventory(stage),'Unexpected runtime stage was preserved.');noLinks(stagingRoot);fs.rmSync(stagingRoot,{recursive:true});
        progress.runtime.recovery.status='pending';
      }
      requireValue(sameInventory(path.join(installationRoot, 'hosts')), `Installed version ${pkg.version} differs from this package; files were preserved. Use a new release version.`);
    } else {
      fs.mkdirSync(versions, { recursive: true });
      const stage = path.join(versions, `.staging-${randomUUID()}`);
      fs.cpSync(source, path.join(stage, 'hosts'), { recursive: true, force: false, errorOnExist: true });
      for(const [file,contents] of runtimeFiles)fs.writeFileSync(path.join(stage,'hosts',file),contents);
      for (const details of Object.values(layout)) fs.writeFileSync(path.join(stage, 'hosts', details.plugin, 'install-state.json'), pin, { flag: 'wx' });
      requireValue(sameInventory(path.join(stage, 'hosts')), `Copied files differ; staging files were preserved at ${stage}`);
      fs.renameSync(stage, installationRoot);
    }
    for(const entry of progress.hosts)entry.status='placed';
    progress.core={ready:true,status:'ready',verified:'validated-payload'};
    progress.phase='registration';
    for (const target of hosts) {
      const entry=progress.hosts.find(item=>item.host===target.host);
      entry.status='registering';saveProgress();
      if(target.register) {
        Object.assign(target,target.register());
        console.log(target.registered?`BontaFlowStack ${pkg.version}: ${target.host}, 34 skills and MCP registered. Start a new session.`:`BontaFlowStack ${pkg.version}: Cursor files placed. Reload the IDE window, then verify bontaflowstack-cursor and its bfs-cursor tools in Customize and a new chat. Active loading is not yet confirmed. If missing, check Allow Local Plugin Imports with your admin and whether an installed marketplace plugin of the same name takes precedence. Native hooks must remain enabled; setup does not change host policy.`);
      } else {
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
        Object.assign(target,{registered:true,reloadRequired:true,verified:'plugin-registration'});
        console.log(`BontaFlowStack ${pkg.version}: ${target.host} registered.`);
      }
      Object.assign(entry,{status:target.registered?'registered':'reload-required',registered:target.registered,reloadRequired:target.reloadRequired,verified:target.verified});
      saveProgress();
    }
    writeRuntimeRecord(process.execPath);
    if(progress.runtime)progress.runtime.recovery.status=progress.runtime.recovery.status==='pending' || hosts.some(target=>target.runtimeRefreshed)?'repaired':'unchanged';
    progress.phase='engines';saveProgress();
    const core = path.join(installationRoot, 'hosts', layout.codex.plugin);
    progress.engines={status:'running',issues:[]};
    const nextAction=`npx bontaflowstack@${pkg.version} setup${host==='auto'?'':` --host ${host}`}`;
    const recordIssue=(phase,error)=>{progress.engines.issues.push({phase,reason:error.message,nextAction});saveProgress();};
    try {
      // Keep the official platform binary and its license outside the disposable npm cache.
      const require = createRequire(path.join(packageRoot, 'package.json'));
      const impeccableManifest = require.resolve('impeccable/package.json');
      const impeccable = read(impeccableManifest);
      requireValue(impeccable.version === pkg.dependencies.impeccable, 'Unexpected Impeccable npm version; rerun setup with a clean npm cache.');
      const platformPackage=`@impeccable/cli-${platform==='win32'?'windows':platform}-${arch}`;
      const platformManifest = createRequire(impeccableManifest).resolve(`${platformPackage}/package.json`);
      requireValue(read(platformManifest).version === impeccable.optionalDependencies[platformPackage], 'Unexpected Impeccable platform package.');
      const toolSource = path.dirname(platformManifest);
      const toolRoot = path.join(stateHome, 'tools', 'impeccable', impeccable.version,...(platform==='win32'?[]:[`${platform}-${arch}`]));
      noLinks(toolRoot);
      const toolFiles = inventory(toolSource);
      const sameTool = directory => JSON.stringify(inventory(directory)) === JSON.stringify(toolFiles);
      if (fs.existsSync(toolRoot)) {
        requireValue(sameTool(toolRoot), `Impeccable installation differs; files were preserved at ${toolRoot}`);
      } else {
        fs.mkdirSync(path.dirname(toolRoot), { recursive:true });
        const stagingRoot = fs.mkdtempSync(path.join(path.dirname(toolRoot), '.staging-'));
        const stage = path.join(stagingRoot,'tool');
        fs.cpSync(toolSource, stage, { recursive:true, force:false, errorOnExist:true });
        requireValue(sameTool(stage), `Impeccable copy differs; files were preserved at ${stage}`);
        fs.renameSync(stage, toolRoot);
        fs.rmdirSync(stagingRoot);
      }
      const executable = path.join(toolRoot, platform==='win32'?'bin/impeccable.exe':'bin/impeccable');
      if(platform!=='win32')fs.accessSync(executable,fs.constants.X_OK);
      const engineVersion = invoke(executable, ['--version']);
      requireValue(/^\d+\.\d+\.\d+$/.test(engineVersion), 'Impeccable did not confirm a working executable.');
      const configFile = path.join(stateHome, 'impeccable.json');
      const configuration = { schema:1, version:impeccable.version, engineVersion, command:[executable], sha256:digest(fs.readFileSync(executable)) };
      const priorTool = readJson(configFile);
      const { externalCommand } = await import(pathToFileURL(path.join(core, 'core/engines.mjs')));
      if (priorTool) externalCommand({home:stateHome}, 'BFS_IMPECCABLE_COMMAND', {});
      atomicWrite(configFile, configuration);
      externalCommand({home:stateHome}, 'BFS_IMPECCABLE_COMMAND', commandEnv);
    } catch(error) { recordIssue('impeccable',error); }
    try {
      const output=invoke(process.execPath, [path.join(core, 'scripts/install-engines.mjs')]);
      if(output)console.log(output);
    }
    catch(error) { recordIssue('install',error); }
    const required=['browser','browser-host','render','design','design-detect','pretext'];
    progress.capabilities=Object.fromEntries(required.map(name=>[name,{ready:false,status:'unverified',reason:'Engine verification has not completed.',nextAction}]));
    try {
      const health=JSON.parse(invoke(process.execPath,[path.join(core,'core/cli.mjs'),'doctor']));
      requireValue(health.core?.ready===true && typeof health.engines?.installed==='boolean' && health.engines.capabilities && typeof health.engines.capabilities==='object','Unexpected engine doctor result');
      progress.core=health.core;progress.engines.health=health.engines;
      for(const name of required) {
        const capability=health.engines.capabilities[name];
        if(!capability?.ready)recordIssue(name,new Error(capability?.reason || health.engines.reason || `Engine capability is not provided: ${name}`));
      }
      progress.capabilities={...health.engines.capabilities};
      for(const name of required) if(!progress.capabilities[name]?.ready)progress.capabilities[name]={ready:false,status:'unavailable',reason:health.engines.capabilities[name]?.reason || health.engines.reason || `Engine capability is not provided: ${name}`,nextAction};
    } catch(error) {
      recordIssue('verification',error);
      for(const capability of Object.values(progress.capabilities))if(capability.status==='unverified')capability.reason=error.message;
    }
    progress.engines.status=progress.engines.issues.length?'incomplete':'ready';
    progress.nextAction=progress.engines.issues.length?nextAction:null;
    saveProgress();

    if (ownership && ownership.stateHome !== stateHome) atomicWrite(marker, { schema: 1, package: pkg.name, stateHome });
    progress.status=progress.engines.status==='incomplete'?'incomplete':hosts.some(target=>target.registered===false)?'reload-required':'completed';progress.phase='complete';saveProgress();
    return { name: pkg.name, version: pkg.version, installationRoot, stateHome, status:progress.status, exitCode:progress.status==='incomplete'?1:0, ...targetInfo(platform,arch), ...(progress.runtime?{runtime:progress.runtime}:{}), core:progress.core, capabilities:progress.capabilities || {}, engines:progress.engines, nextAction:progress.nextAction, hosts: hosts.map(({ host, pluginRoot, marketplaceRoot, sourceRoot, registered, reloadRequired, verified }) => ({ host, pluginRoot, marketplaceRoot, ...(sourceRoot?{sourceRoot}:{}),registered,reloadRequired,verified })) };
  } catch(error) {
    progress.status='failed';
    for(const entry of progress.hosts)if(entry.status==='registering')entry.status='failed';
    saveProgress();
    throw new Error(`${error.message}\nSetup incomplete (${progress.phase}): ${progress.hosts.map(entry=>`${entry.host}=${entry.status}`).join(', ')}. Rerun the same setup command.`,{cause:error});
  }
}

if (process.argv[1] && fs.existsSync(process.argv[1]) && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length === 1 && ['--help', '-h'].includes(args[0])) {
      console.log('Usage: npx bontaflowstack@<version> [setup] [--host codex|claude|gemini|copilot|cursor|opencode|all]\nAutomatically installs and configures every detected host and the shared engines.\nRequires Windows x64 or Linux/macOS x64/ARM64, Node.js 24+, npm, Git, and Codex 0.162.0+, Claude Code 2.1.296+, Gemini CLI 0.63.0+, GitHub Copilot CLI 1.0.96+, Cursor IDE 3.24.12+ or OpenCode CLI 1.19.0+. Cursor requires an IDE window reload and host verification.');
    } else if (args.length === 1 && args[0] === '--version') {
      console.log(read(path.join(defaultPackageRoot, 'package.json')).version);
    } else {
      if (args[0] === 'setup') args.shift();
      if (args.length !== 0 && !(args.length === 2 && args[0] === '--host' && [...Object.keys(layout), 'all'].includes(args[1]))) throw new Error('Unknown arguments. Use: npx bontaflowstack@<version> setup');
      const result = await setup({ host: args[1] || 'auto' });
      process.exitCode=result.exitCode;
      if(result.status==='incomplete')console.error(`Setup incomplete: core registered; engine prerequisites unresolved. ${result.engines.issues.map(item=>`${item.phase}: ${item.reason}`).join('\n')}\nNext action: ${result.nextAction}`);
      console.log(`BontaFlowStack ${result.version} ${result.status} at ${result.installationRoot}\nShared data: ${result.stateHome}\nStart a new host session and use bfs-router.`);
      if (result.hosts.some(item => item.host === 'codex')) console.log('Codex: review and trust the plugin hooks in /hooks when prompted. Setup does not bypass host trust.');
    }
  } catch (error) {
    console.error(`BontaFlowStack setup: ${error.message}`);
    process.exitCode = 1;
  }
}
