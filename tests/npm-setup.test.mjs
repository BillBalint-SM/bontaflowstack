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
const impeccablePackage = path.join(packageRoot, 'node_modules/@impeccable/cli-windows-x64');
fs.mkdirSync(path.join(impeccablePackage, 'bin'), { recursive:true });
fs.writeFileSync(path.join(impeccablePackage, 'package.json'), JSON.stringify({name:'@impeccable/cli-windows-x64',version:'0.1.14'}));
fs.writeFileSync(path.join(impeccablePackage, 'bin/impeccable.exe'), 'fixture Impeccable binary');
fs.writeFileSync(path.join(impeccablePackage, 'LICENSE'), 'fixture license');
fs.mkdirSync(path.join(packageRoot, 'node_modules/impeccable'), {recursive:true});
fs.writeFileSync(path.join(packageRoot, 'node_modules/impeccable/package.json'), JSON.stringify({name:'impeccable',version:'4.5.2',optionalDependencies:{'@impeccable/cli-windows-x64':'0.1.14'}}));
after(() => fs.rmSync(scratch, { recursive:true, force:true }));

function makeEnv(label = 'run') {
  const home = path.join(scratch, label);
  return {
    ...process.env,
    LOCALAPPDATA:path.join(home, 'LocalAppData'),
    USERPROFILE:path.join(home, 'UserProfile'),
    ProgramFiles:path.join(home, 'ProgramFiles'),
    'ProgramFiles(x86)':path.join(home, 'ProgramFilesX86'),
    PATH:path.join(home, 'bin'),
    Path:path.join(home, 'bin'),
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
    if (path.basename(command) === 'impeccable.exe' && args[0] === '--version') return '4.0.0';
    const raw = args.filter(arg => arg !== '--no-daemon');
    const lowerCommand = path.basename(command).toLowerCase();
    const commandLine = [command, ...raw].join('\0').toLowerCase();
    const host = lowerCommand.includes('codex') || commandLine.includes('codex.exe') || commandLine.includes('@openai\\codex') ? 'codex' : lowerCommand.includes('claude') || commandLine.includes('claude.exe') || commandLine.includes('@anthropic-ai\\claude-code') ? 'claude' : commandLine.includes('gemini.exe') || commandLine.includes('@google\\gemini-cli') ? 'gemini' : commandLine.includes('copilot.exe') || commandLine.includes('@github\\copilot') ? 'copilot' : commandLine.includes('opencode.exe') ? 'opencode' : null;
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

function upgradePackage(label,version) {
  const target=path.join(scratch,label);fs.cpSync(packageRoot,target,{recursive:true});
  const update=file=>{
    const value=JSON.parse(fs.readFileSync(file,'utf8'));
    if(value.version)value.version=version;
    for(const plugin of value.plugins || [])if(plugin.version)plugin.version=version;
    fs.writeFileSync(file,JSON.stringify(value,null,2));
  };
  update(path.join(target,'package.json'));
  for(const [host,manifest] of Object.entries({codex:'.codex-plugin/plugin.json',claude:'.claude-plugin/plugin.json',gemini:'gemini-extension.json',copilot:'plugin.json',cursor:'.cursor-plugin/plugin.json',opencode:'package.json'})) {
    const root=path.join(target,'hosts',host,host==='codex'?'plugins/bontaflowstack':'');
    update(path.join(root,manifest));update(path.join(root,'catalog.json'));
    if(host==='claude')update(path.join(root,'.claude-plugin/marketplace.json'));
    if(host==='copilot')update(path.join(root,'marketplace.json'));
  }
  return target;
}

test('OpenCode setup registers a durable loader, repeats safely and preserves JSONC and foreign skills',async()=>{
  const env=makeEnv('opencode'),mock=runner(env,undefined,{available:[]}),configRoot=path.join(env.USERPROFILE,'.config/opencode'),source=path.join(configRoot,'plugins/bontaflowstack.js');
  fs.mkdirSync(configRoot,{recursive:true});const configFile=path.join(configRoot,'opencode.jsonc'),original='// User settings\n{"permission":{"bash":"deny"},}\n';fs.writeFileSync(configFile,original);
  let foreignSkill=false;
  const current=()=>fs.existsSync(source)?path.dirname(fileURLToPath(JSON.parse(fs.readFileSync(source,'utf8').match(/from (".*");/)[1]))):null;
  const run=(command,args,options)=>{
    if(!command.endsWith('opencode.exe'))return mock.run(command,args,options);
    if(args[0]==='--version')return '1.19.0';
    if(args.join(' ')==='debug paths')return `config     ${configRoot}\n`;
    const plugin=current();
    if(args.join(' ')==='debug config')return JSON.stringify({permission:{bash:'deny'},...(plugin?{plugin:[source],mcp:{bfs:{type:'local',command:['node',path.join(plugin,'core/opencode-host.mjs')],enabled:true}}}:{})});
    if(args.join(' ')==='debug skill')return JSON.stringify(plugin?JSON.parse(fs.readFileSync(path.join(plugin,'catalog.json'),'utf8')).skills.map(skill=>({name:skill.id,location:path.join(plugin,'skills',skill.id,'SKILL.md')})):[]);
    if(args.join(' ')==='--pure debug skill')return JSON.stringify(foreignSkill?[{name:'bfs-health',location:path.join(configRoot,'skills/bfs-health/SKILL.md')}]:[]);
    if(args.join(' ')==='mcp list')return `✓ bfs connected\nnode ${path.join(plugin,'core/opencode-host.mjs')}\n`;
    throw new Error(`Unexpected OpenCode call: ${args.join(' ')}`);
  };
  const first=await setup(options(env,run,{host:'opencode'}));assert.deepEqual(first.hosts.map(item=>item.host),['opencode']);assert.equal(first.hosts[0].registered,true);assert.equal(current(),first.hosts[0].pluginRoot);assert.equal(fs.readFileSync(configFile,'utf8'),original);
  const loader=fs.readFileSync(source,'utf8');await setup(options(env,run,{host:'opencode'}));assert.equal(fs.readFileSync(source,'utf8'),loader);
  foreignSkill=true;await assert.rejects(setup(options(env,run,{host:'opencode'})),/conflicting BFS skill/);assert.equal(fs.readFileSync(source,'utf8'),loader);assert.equal(fs.readFileSync(configFile,'utf8'),original);
});

test('Cursor setup places its native plugin, preserves repeated installs and reports reload still required',async()=>{
  const env=makeEnv('cursor'),mock=runner(env,undefined,{available:[]});
  const app=path.join(env.LOCALAPPDATA,'Programs/cursor');fs.mkdirSync(path.join(app,'resources/app'),{recursive:true});
  fs.writeFileSync(path.join(app,'Cursor.exe'),'fixture executable');fs.writeFileSync(path.join(app,'resources/app/product.json'),JSON.stringify({nameShort:'Cursor',version:'3.24.12'}));
  const first=await setup(options(env,mock.run,{host:'cursor'}));
  assert.deepEqual(first.hosts.map(item=>item.host),['cursor']);
  const installed=first.hosts[0],target=path.join(env.USERPROFILE,'.cursor/plugins/local/bontaflowstack');
  assert.equal(installed.sourceRoot,target);assert.equal(installed.registered,false);assert.equal(installed.reloadRequired,true);assert.equal(installed.verified,'files-placed-awaiting-host-readback');
  assert.equal(JSON.parse(fs.readFileSync(path.join(target,'.cursor-plugin/plugin.json'),'utf8')).version,first.version);
  assert.equal(fs.readdirSync(path.join(target,'skills')).length,34);
  assert.equal(JSON.parse(fs.readFileSync(path.join(target,'install-state.json'),'utf8')).stateHome,env.BFS_STATE_HOME);
  const foreign=path.join(env.USERPROFILE,'.cursor/keep.txt');fs.writeFileSync(foreign,'unrelated settings');
  await setup(options(env,mock.run,{host:'cursor'}));assert.equal(fs.readFileSync(foreign,'utf8'),'unrelated settings');
  fs.appendFileSync(path.join(target,'HOST.md'),'\nLocal edit\n');
  await assert.rejects(setup(options(env,mock.run,{host:'cursor'})),/payload differs/);
  assert.match(fs.readFileSync(path.join(target,'HOST.md'),'utf8'),/Local edit/);
});

test('Cursor setup upgrades its owned legacy identity while preserving an existing bfs MCP and rejecting new identity conflicts',async()=>{
  const env=makeEnv('cursor-identity'),mock=runner(env,undefined,{available:[]});
  const app=path.join(env.LOCALAPPDATA,'Programs/cursor');fs.mkdirSync(path.join(app,'resources/app'),{recursive:true});
  fs.writeFileSync(path.join(app,'Cursor.exe'),'fixture executable');fs.writeFileSync(path.join(app,'resources/app/product.json'),JSON.stringify({nameShort:'Cursor',version:'3.24.12'}));
  const legacy=upgradePackage('cursor-legacy-identity','0.0.0-cursor-legacy.1'),legacyManifest=path.join(legacy,'hosts/cursor/.cursor-plugin/plugin.json');
  const manifest=JSON.parse(fs.readFileSync(legacyManifest,'utf8'));manifest.name='bontaflowstack';fs.writeFileSync(legacyManifest,JSON.stringify(manifest));
  const prior=await setup(options(env,mock.run,{host:'cursor',packageRoot:legacy})),source=prior.hosts[0].sourceRoot;
  const configFile=path.join(env.USERPROFILE,'.cursor/mcp.json'),config=JSON.stringify({mcpServers:{bfs:{command:'node',args:['existing.mjs']}}});fs.writeFileSync(configFile,config);
  const current=await setup(options(env,mock.run,{host:'cursor'}));assert.equal(current.hosts[0].sourceRoot,source);
  assert.equal(JSON.parse(fs.readFileSync(path.join(source,'.cursor-plugin/plugin.json'),'utf8')).name,'bontaflowstack-cursor');
  assert.deepEqual(Object.keys(JSON.parse(fs.readFileSync(path.join(source,'mcp.json'),'utf8')).mcpServers),['bfs-cursor']);assert.equal(fs.readFileSync(configFile,'utf8'),config);
  assert.equal(JSON.parse(fs.readFileSync(path.join(prior.hosts[0].pluginRoot,'.cursor-plugin/plugin.json'),'utf8')).name,'bontaflowstack');
  const before=fs.readFileSync(path.join(source,'HOST.md')),conflict=JSON.stringify({mcpServers:{'bfs-cursor':{command:'node',args:['foreign.mjs']}}});fs.writeFileSync(configFile,conflict);
  await assert.rejects(setup(options(env,mock.run,{host:'cursor'})),/conflicting bfs-cursor MCP/);assert.equal(fs.readFileSync(configFile,'utf8'),conflict);assert.deepEqual(fs.readFileSync(path.join(source,'HOST.md')),before);
  fs.writeFileSync(configFile,config);
  const foreign=path.join(env.USERPROFILE,'.cursor/plugins/local/foreign/.cursor-plugin/plugin.json');fs.mkdirSync(path.dirname(foreign),{recursive:true});const foreignText='{"name":"bontaflowstack-cursor","version":"1.0.0"}';fs.writeFileSync(foreign,foreignText);
  await assert.rejects(setup(options(env,mock.run,{host:'cursor'})),/Another local Cursor plugin/);assert.equal(fs.readFileSync(foreign,'utf8'),foreignText);assert.deepEqual(fs.readFileSync(path.join(source,'HOST.md')),before);
});

test('failed source publication and rollback preserve the prior Cursor plugin for retry',async t=>{
  const env=makeEnv('cursor-swap-failure'),mock=runner(env,undefined,{available:[]});
  const app=path.join(env.LOCALAPPDATA,'Programs/cursor');fs.mkdirSync(path.join(app,'resources/app'),{recursive:true});
  fs.writeFileSync(path.join(app,'Cursor.exe'),'fixture executable');fs.writeFileSync(path.join(app,'resources/app/product.json'),JSON.stringify({nameShort:'Cursor',version:'3.24.12'}));
  const first=await setup(options(env,mock.run,{host:'cursor'})),source=first.hosts[0].sourceRoot;
  const original=fs.readFileSync(path.join(source,'HOST.md'));
  const upgrade=upgradePackage('cursor-swap-upgrade','9.9.9-swap-test.1');
  const rename=fs.renameSync;let previous;
  t.mock.method(fs,'renameSync',(from,to)=>{
    if(from===source)previous=to;
    if(to===source)throw new Error('fixture Windows sharing violation');
    return rename(from,to);
  });
  try {await assert.rejects(setup(options(env,mock.run,{host:'cursor',packageRoot:upgrade})),/sharing violation/);}
  finally {t.mock.restoreAll();}
  assert.ok(previous,'the previous source must have been moved before the publication failure');
  assert.deepEqual(fs.readFileSync(path.join(previous,'HOST.md')),original,'a failed rollback must retain the old source');
  fs.appendFileSync(path.join(previous,'HOST.md'),'\nA user edit in the preserved copy.\n');
  await assert.rejects(setup(options(env,mock.run,{host:'cursor',packageRoot:upgrade})),/payload differs/);
  assert.equal(fs.existsSync(source),false,'an edited recovery copy must not be silently activated');
  assert.match(fs.readFileSync(path.join(previous,'HOST.md'),'utf8'),/A user edit in the preserved copy/);
  fs.writeFileSync(path.join(previous,'HOST.md'),original);
  const retried=await setup(options(env,mock.run,{host:'cursor',packageRoot:upgrade}));
  assert.equal(JSON.parse(fs.readFileSync(path.join(retried.hosts[0].sourceRoot,'.cursor-plugin/plugin.json'),'utf8')).version,'9.9.9-swap-test.1');
  assert.deepEqual(fs.readFileSync(path.join(first.hosts[0].pluginRoot,'HOST.md')),original);
  assert.equal(fs.existsSync(path.dirname(previous)),false,'verified recovery staging must not accumulate ambiguous older backups');
});

function geminiRunner(env) {
  const base=runner(env,undefined,{available:[]}),state={extensions:[]},calls=[];
  const executable=path.join(env.USERPROFILE,'.local/bin/gemini.exe');
  fs.mkdirSync(path.dirname(executable),{recursive:true});fs.writeFileSync(executable,'fixture');
  const run=(command,args,options)=>{
    if(command!==executable)return base.run(command,args,options);
    calls.push({args,options});
    if(args[0]==='--version')return '0.63.0';
    if(args[0]==='mcp')return state.extensions.map(item=>`✓ bfs (from bontaflowstack): node ${item.path}/core/gemini-host.mjs (stdio) - Connected`).join('\n');
    if(args[1]==='list')return JSON.stringify(state.extensions);
    if(['install','update'].includes(args[1])) {
      const source=args[1]==='install'?args[2]:state.extensions[0].installMetadata.source;
      const target=path.join(env.USERPROFILE,'.gemini/extensions/bontaflowstack');
      fs.cpSync(source,target,{recursive:true});
      const manifest=JSON.parse(fs.readFileSync(path.join(target,'gemini-extension.json'),'utf8'));
      state.extensions=[{...manifest,path:target,installMetadata:{type:'local',source},isActive:true,skills:fs.readdirSync(path.join(target,'skills')).map(name=>({name}))}];
      return 'installed';
    }
    throw new Error(`Unexpected Gemini fixture command: ${args.join(' ')}`);
  };
  return {run,state,calls};
}

test('Gemini setup uses native consent, a durable update source and host readback; repeated setup preserves user data',async()=>{
  const env=makeEnv('gemini'),mock=geminiRunner(env);
  const installed=await setup(options(env,mock.run,{host:'gemini'}));
  assert.deepEqual(installed.hosts.map(item=>item.host),['gemini']);
  const active=mock.state.extensions[0];
  assert.equal(active.version,installed.version);assert.equal(active.skills.length,34);
  assert.ok(active.installMetadata.source.startsWith(env.LOCALAPPDATA));
  assert.ok(!active.installMetadata.source.includes('node_modules'));
  assert.equal(JSON.parse(fs.readFileSync(path.join(active.path,'install-state.json'),'utf8')).stateHome,env.BFS_STATE_HOME);
  const install=mock.calls.find(call=>call.args[1]==='install');assert.equal(install.options.inherit,true);
  assert.ok(mock.calls.every(call=>!call.args.includes('--consent') && !call.args.includes('enable')));
  fs.mkdirSync(env.BFS_STATE_HOME,{recursive:true});const memory=path.join(env.BFS_STATE_HOME,'keep.txt');fs.writeFileSync(memory,'saved work');
  const before=mock.calls.filter(call=>['install','update'].includes(call.args[1])).length;
  await setup(options(env,mock.run,{host:'gemini'}));
  assert.equal(mock.calls.filter(call=>['install','update'].includes(call.args[1])).length,before);
  assert.equal(fs.readFileSync(memory,'utf8'),'saved work');
});

test('Gemini refuses conflicting MCP configuration, foreign extensions, disabled policy and changed installed files',async()=>{
  const conflictEnv=makeEnv('gemini-conflict'),conflict=geminiRunner(conflictEnv);
  const conflicting=(command,args,options)=>args[0]==='mcp'?'✓ bfs: node foreign.mjs (stdio) - Connected':conflict.run(command,args,options);
  await assert.rejects(setup(options(conflictEnv,conflicting,{host:'gemini'})),/conflicting bfs MCP/);
  assert.equal(fs.existsSync(path.join(conflictEnv.LOCALAPPDATA,'BontaFlowStack/npm')),false);
  const env=makeEnv('gemini-preserved'),mock=geminiRunner(env);
  await setup(options(env,mock.run,{host:'gemini'}));
  const active=mock.state.extensions[0],before=mock.calls.filter(call=>['install','update'].includes(call.args[1])).length;
  active.isActive=false;
  await assert.rejects(setup(options(env,mock.run,{host:'gemini'})),/disabled/);
  assert.equal(active.isActive,false);active.isActive=true;
  const source=active.installMetadata.source;active.installMetadata.source=path.join(env.USERPROFILE,'foreign');
  await assert.rejects(setup(options(env,mock.run,{host:'gemini'})),/Another BontaFlowStack/);
  active.installMetadata.source=source;
  const edited=path.join(active.path,'GEMINI.md');fs.appendFileSync(edited,'\nUser edit preserved.\n');
  await assert.rejects(setup(options(env,mock.run,{host:'gemini'})),/payload differs/);
  assert.match(fs.readFileSync(edited,'utf8'),/User edit preserved/);
  assert.equal(mock.calls.filter(call=>['install','update'].includes(call.args[1])).length,before);
});

test('setup installs Impeccable outside npm cache and persists a shared command before host registration', async () => {
  const env = makeEnv('impeccable'), mock = runner(env);
  delete env.BFS_IMPECCABLE_COMMAND;
  await setup(options(env, mock.run));
  const configFile = path.join(env.BFS_STATE_HOME, 'impeccable.json');
  assert.ok(fs.existsSync(configFile), 'automatic setup must persist the Impeccable command');
  const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  assert.equal(config.version, '4.5.2');
  assert.equal(fs.readFileSync(config.command[0], 'utf8'), 'fixture Impeccable binary');
  assert.ok(config.command[0].startsWith(env.BFS_STATE_HOME));
  assert.match(config.sha256, /^[a-f0-9]{64}$/);
  const probe = mock.calls.findIndex(call => path.basename(call.command) === 'impeccable.exe');
  const register = mock.calls.findIndex(call => call.args.includes('marketplace') && call.args.includes('add'));
  assert.ok(probe >= 0 && probe < register);
  const before = fs.statSync(config.command[0]).mtimeMs;
  await setup(options(env, mock.run));
  assert.equal(fs.statSync(config.command[0]).mtimeMs, before, 'repeat setup reuses the verified binary');
});

test('Impeccable failures stop registration, allow retry and preserve modified installed files', async () => {
  const env = makeEnv('impeccable-failure'), mock = runner(env);
  const run = (command, args, options) => {
    if (path.basename(command) === 'impeccable.exe') throw new Error('Impeccable probe failed');
    return mock.run(command,args,options);
  };
  await assert.rejects(setup(options(env,run)), /Impeccable probe failed/);
  assert.equal(mock.state.codexPlugins.length + mock.state.claudePlugins.length,0);
  assert.equal(fs.existsSync(path.join(env.BFS_STATE_HOME,'impeccable.json')),false);
  await setup(options(env,mock.run));
  const config = JSON.parse(fs.readFileSync(path.join(env.BFS_STATE_HOME,'impeccable.json'),'utf8'));
  fs.writeFileSync(config.command[0],'user modification');
  await assert.rejects(setup(options(env,mock.run)),/Impeccable installation differs/);
  assert.equal(fs.readFileSync(config.command[0],'utf8'),'user modification');
});

test('explicit Impeccable environment override survives setup; invalid overrides stop registration', async () => {
  const env = makeEnv('impeccable-override'), mock = runner(env);
  env.BFS_IMPECCABLE_COMMAND = JSON.stringify([process.execPath,'custom-tool.mjs']);
  const original=env.BFS_IMPECCABLE_COMMAND;
  await setup(options(env,mock.run));
  assert.equal(env.BFS_IMPECCABLE_COMMAND,original);
  assert.ok(mock.calls.every(call=>call.options.env.BFS_IMPECCABLE_COMMAND===original));
  const invalid = makeEnv('impeccable-invalid'), failed=runner(invalid);
  invalid.BFS_IMPECCABLE_COMMAND = '["missing.exe"]';
  await assert.rejects(setup(options(invalid,failed.run)),/absolute executable/);
  assert.equal(failed.state.codexPlugins.length+failed.state.claudePlugins.length,0);
});

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
  await assert.rejects(setup(options(noneEnv, none.run)), /No supported host found/);
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
  const nextVersion = '9.9.9-test.1';
  const upgradeRoot = upgradePackage('upgrade-package',nextVersion);
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
  const progress=JSON.parse(fs.readFileSync(path.join(env.LOCALAPPDATA,'BontaFlowStack/npm/setup-status.json'),'utf8'));
  assert.equal(progress.status,'failed');assert.equal(progress.phase,'engines');
  assert.ok(progress.hosts.every(item=>item.status==='placed' && !item.verified));
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

test('partial registration records each host state, preserves completed hosts and retries', async () => {
  const env=makeEnv('partial-registration'),mock=runner(env);
  const app=path.join(env.LOCALAPPDATA,'Programs/cursor');fs.mkdirSync(path.join(app,'resources/app'),{recursive:true});
  fs.writeFileSync(path.join(app,'Cursor.exe'),'fixture executable');fs.writeFileSync(path.join(app,'resources/app/product.json'),JSON.stringify({nameShort:'Cursor',version:'3.24.12'}));
  fs.mkdirSync(env.BFS_STATE_HOME,{recursive:true});const memory=path.join(env.BFS_STATE_HOME,'keep.txt');fs.writeFileSync(memory,'saved work');
  const failClaude=(command,args,options)=>{
    if(command.endsWith('claude.exe') && args[0]==='plugin' && args[1]==='install')throw new Error('fixture registration refused');
    return mock.run(command,args,options);
  };
  await assert.rejects(setup(options(env,failClaude)),error=>{
    assert.match(error.message,/fixture registration refused/);
    assert.match(error.message,/Setup incomplete \(registration\): codex=registered, claude=failed, cursor=placed/);
    return true;
  });
  const statusFile=path.join(env.LOCALAPPDATA,'BontaFlowStack/npm/setup-status.json');
  const failed=JSON.parse(fs.readFileSync(statusFile,'utf8'));
  assert.equal(failed.status,'failed');assert.equal(failed.phase,'registration');
  assert.deepEqual(failed.hosts.map(({host,status})=>[host,status]),[['codex','registered'],['claude','failed'],['cursor','placed']]);
  assert.equal(failed.hosts[0].verified,'plugin-registration');
  assert.equal(failed.hosts[1].verified,undefined,'a failed host must not claim readback');
  assert.equal(fs.existsSync(path.join(env.USERPROFILE,'.cursor/plugins/local/bontaflowstack')),false);
  const codex=structuredClone(mock.state.codexPlugins);
  const retry=await setup(options(env,mock.run));
  assert.deepEqual(mock.state.codexPlugins,codex);assert.equal(fs.readFileSync(memory,'utf8'),'saved work');
  assert.equal(retry.hosts.find(item=>item.host==='claude').registered,true);
  const completed=JSON.parse(fs.readFileSync(statusFile,'utf8'));
  assert.equal(completed.status,'reload-required');assert.equal(completed.phase,'complete');
  assert.deepEqual(completed.hosts.map(({host,status})=>[host,status]),[['codex','registered'],['claude','registered'],['cursor','reload-required']]);
  assert.equal(completed.hosts[2].verified,'files-placed-awaiting-host-readback');
});

test('installed host payloads remain available after the npm cache is removed', async () => {
  const env = makeEnv('cache-removal'), mock = runner(env);
  const installed = await setup(options(env, mock.run));
  const movedCache = `${packageRoot}-removed`;
  fs.renameSync(packageRoot, movedCache);
  assert.ok(installed.hosts.every(host => fs.existsSync(path.join(host.pluginRoot, 'catalog.json'))));
});
