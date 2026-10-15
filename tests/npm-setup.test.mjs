import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { setup,captureCommand } from '../installers/npm/bin/setup.mjs';
import { findCursor } from '../installers/npm/bin/cursor.mjs';
import { dataPaths } from '../plugins/bontaflowstack/core/state.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
test('native command capture retains exit and separate output streams',()=>{
  const result=captureCommand(process.execPath,['-e','process.stdout.write("out");process.stderr.write("err");process.exitCode=7']);
  assert.equal(result.status,7);assert.equal(result.stdout,'out');assert.equal(result.stderr,'err');
});
test('Darwin captures complete large CLI JSON even when the CLI exits immediately',{skip:process.platform!=='darwin'},()=>{
  const result=captureCommand(process.execPath,['-e','process.stdout.write(JSON.stringify({text:"x".repeat(256000)}));process.exit(0)']);
  assert.equal(result.status,0);assert.equal(JSON.parse(result.stdout).text.length,256000);
});
const scratch = fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()), `bfs-universal-setup-${randomUUID()}-`));
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
for(const platform of ['linux','darwin']) {
  const name=`@impeccable/cli-${platform}-x64`,folder=path.join(packageRoot,'node_modules',name);
  fs.mkdirSync(path.join(folder,'bin'),{recursive:true});
  fs.writeFileSync(path.join(folder,'package.json'),JSON.stringify({name,version:'0.1.14'}));
  fs.writeFileSync(path.join(folder,'bin/impeccable'),'fixture POSIX binary',{mode:0o755});
  const manifest=path.join(packageRoot,'node_modules/impeccable/package.json'),value=JSON.parse(fs.readFileSync(manifest));
  value.optionalDependencies[name]='0.1.14';fs.writeFileSync(manifest,JSON.stringify(value));
}
after(() => fs.rmSync(scratch, { recursive:true, force:true }));

test('POSIX npm bin symlink runs setup CLI instead of silently succeeding',{skip:process.platform==='win32'},()=>{
  const bin=path.join(scratch,'bontaflowstack');fs.symlinkSync(path.join(packageRoot,'bin/setup.mjs'),bin);
  const version=spawnSync(process.execPath,[bin,'--version'],{encoding:'utf8'});
  assert.equal(version.status,0,version.stderr);assert.equal(version.stdout.trim(),'1.2.0');
  const invalid=spawnSync(process.execPath,[bin,'--invalid'],{encoding:'utf8'});
  assert.equal(invalid.status,1);assert.match(invalid.stderr,/Unknown arguments/);
});

test('Cursor discovery reads native POSIX product layouts without LOCALAPPDATA',()=>{
  for(const platform of ['linux','darwin']) {
    const root=path.join(scratch,`cursor-${platform}`),bin=path.join(root,'resources','app','bin');
    fs.mkdirSync(bin,{recursive:true});
    fs.writeFileSync(path.join(bin,'cursor'),'fixture CLI',{mode:0o755});
    const resources=platform==='darwin'?'Resources':'resources';
    fs.mkdirSync(path.join(root,resources,'app'),{recursive:true});
    fs.writeFileSync(path.join(root,resources,'app/product.json'),JSON.stringify({nameShort:'Cursor',version:'3.24.12'}));
    const found=findCursor({PATH:bin},platform);
    assert.equal(found?.root,root);
    assert.equal(found.version,'3.24.12');
  }
  const root=path.join(scratch,'cursor-linux-appimage'),bin=path.join(root,'bin');
  fs.mkdirSync(bin,{recursive:true});fs.writeFileSync(path.join(bin,'cursor'),'fixture CLI',{mode:0o755});
  fs.mkdirSync(path.join(root,'resources/app'),{recursive:true});fs.writeFileSync(path.join(root,'resources/app/product.json'),JSON.stringify({nameShort:'Cursor',version:'3.24.18'}));
  assert.equal(findCursor({PATH:bin},'linux')?.root,root);
});

test('POSIX Cursor placement uses HOME even when a Windows USERPROFILE is inherited',async()=>{
  const env=makeEnv('cursor-posix-profile'),mock=runner(env,undefined,{available:[]});
  env.HOME=path.join(scratch,'cursor-posix-home');env.XDG_DATA_HOME=path.join(env.HOME,'data');
  const app=path.join(env.HOME,'app'),bin=path.join(app,'resources/app/bin');
  fs.mkdirSync(bin,{recursive:true});fs.writeFileSync(path.join(bin,'cursor'),'fixture CLI',{mode:0o755});env.PATH=bin;
  fs.writeFileSync(path.join(app,'resources/app/product.json'),JSON.stringify({nameShort:'Cursor',version:'3.24.18'}));
  const result=await setup(options(env,mock.run,{platform:'linux',host:'cursor'}));
  assert.equal(result.hosts[0].sourceRoot,path.join(env.HOME,'.cursor/plugins/local/bontaflowstack'));
  assert.equal(fs.existsSync(path.join(env.USERPROFILE,'.cursor')),false);
});

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
    if(args.includes('doctor')) return JSON.stringify({core:{ready:true,status:'ready'},engines:{installed:true,capabilities:Object.fromEntries(['browser','browser-host','render','design','design-detect','pretext'].map(name=>[name,{ready:true,status:'ready'}]))}});
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

test('POSIX setup discovers both CLI hosts without Windows environment variables',async()=>{
  for(const platform of ['linux','darwin']) {
    const env=makeEnv(`posix-${platform}`),mock=runner(env,undefined,{native:false});
    env.HOME=env.USERPROFILE;env.XDG_DATA_HOME=path.join(env.HOME,'data');env.XDG_STATE_HOME=path.join(env.HOME,'state');
    delete env.LOCALAPPDATA;delete env.APPDATA;delete env.USERPROFILE;
    const run=(command,args,options)=>{
      assert.ok(command===process.execPath || !command.endsWith('.exe') && command!=='powershell.exe','POSIX must not probe a Windows host executable');
      if(path.basename(command)==='impeccable')return '4.0.0';
      return mock.run(command,args,options);
    };
    const result=await setup(options(env,run,{platform,host:'auto'}));
    assert.deepEqual(result.hosts.map(item=>item.host),['codex','claude']);
    assert.match(result.installationRoot,new RegExp(`${platform}-x64`));
    assert.equal(result.stateHome,env.BFS_STATE_HOME);
    const repeated=await setup(options(env,run,{platform,host:'auto'}));assert.equal(repeated.installationRoot,result.installationRoot);
  }
});

test('every POSIX CLI host reaches its own native registration protocol',async()=>{
  const versions={codex:'codex-cli 0.162.0',claude:'2.1.296',gemini:'0.63.0',copilot:'1.0.96',opencode:'1.19.0'};
  for(const platform of ['linux','darwin'])for(const [host,version] of Object.entries(versions)) {
    const env=makeEnv(`discovery-${platform}-${host}`);env.HOME=env.USERPROFILE;env.XDG_DATA_HOME=path.join(env.HOME,'data');
    delete env.LOCALAPPDATA;delete env.APPDATA;delete env.USERPROFILE;
    const calls=[];
    const run=(command,args)=>{
      calls.push({command,args});
      assert.equal(command,host,'discovery uses the POSIX host executable');
      if(args.length===1 && args[0]==='--version')return version;
      throw new Error(`Discovered native ${host} protocol`);
    };
    await assert.rejects(setup(options(env,run,{platform,host})),new RegExp(`Discovered native ${host} protocol`));
    assert.ok(calls.some(call=>call.args.length>1),'native host-specific protocol was reached');
  }
});

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

function probePosixRuntime(host,plugin,env) {
  if(process.platform==='win32')return;
  const project=path.join(plugin,'fixture-project');fs.mkdirSync(project,{recursive:true});
  const event=host==='gemini'?{hook_event_name:'BeforeTool',session_id:`${host}-posix`,cwd:project,tool_name:'mcp_bfs_status',tool_input:{}}
    :{hook_event_name:'preToolUse',conversation_id:`${host}-posix`,workspace_roots:[project],cwd:project,tool_name:'MCP:bfs_status',tool_input:{}};
  const settings={cwd:project,env:{...env,PATH:'',GEMINI_PROJECT_DIR:project,CURSOR_PLUGIN_ROOT:plugin},encoding:'utf8',timeout:15000};
  const hooks=JSON.parse(fs.readFileSync(path.join(plugin,'hooks/hooks.json'),'utf8')).hooks;
  const command=host==='gemini'?hooks.BeforeTool[0].hooks[0].command:hooks.preToolUse[0].command;
  const hook=spawnSync('/bin/sh',['-c',command],{...settings,input:JSON.stringify(event)});
  assert.equal(hook.status,0,hook.stderr);const output=JSON.parse(hook.stdout);
  const bound=host==='gemini'?output.hookSpecificOutput.tool_input:output.updated_input;
  assert.equal(typeof bound._bfsCall,'string');
  const config=JSON.parse(fs.readFileSync(path.join(plugin,host==='gemini'?'gemini-extension.json':'mcp.json'),'utf8'));
  const server=Object.values(config.mcpServers)[0];
  const args=server.args.map(arg=>arg.replace(host==='gemini'?'${extensionPath}':'${CURSOR_PLUGIN_ROOT}',plugin));
  const request={jsonrpc:'2.0',id:1,method:'tools/call',params:{name:host==='gemini'?'status':'bfs_status',arguments:bound}};
  const rpc=spawnSync(server.command,args,{...settings,input:JSON.stringify(request)+'\n'});
  assert.equal(rpc.status,0,rpc.stderr);const result=JSON.parse(rpc.stdout).result;
  assert.equal(result.isError,undefined,result.content[0].text);assert.equal(JSON.parse(result.content[0].text).hostWorkspace,project);
  fs.rmdirSync(project);
}

test('POSIX Gemini hooks are materialized safely and repeated registration keeps identical files',async()=>{
  for(const platform of ['linux','darwin']) {
    const env=makeEnv(`gemini-posix-${platform}`),mock=geminiRunner(env),profile=env.USERPROFILE;
    env.HOME=profile;env.XDG_DATA_HOME=path.join(profile,"data's $literal");
    const run=(command,args,settings)=>command==='gemini'?mock.run(path.join(profile,'.local/bin/gemini.exe'),args,settings):path.basename(command)==='impeccable'?'4.0.0':mock.run(command,args,settings);
    const result=await setup(options(env,run,{platform,host:'gemini'}));
    const plugin=result.hosts[0].pluginRoot,read=file=>JSON.parse(fs.readFileSync(path.join(plugin,file),'utf8'));
    for(const [event,entries] of Object.entries(read('hooks/hooks.json').hooks)) {
      const command=entries[0].hooks[0].command;
      assert.doesNotMatch(command,/Join-Path|powershell|\$bfsExtension/);
      assert.ok(command.endsWith(` ${event}`));assert.match(command,/gemini-hook\.mjs/);
    }
    if(platform==='darwin')assert.equal(read('gemini-extension.json').mcpServers.bfs.command,process.execPath);
    probePosixRuntime('gemini',plugin,env);
    const repeated=await setup(options(env,run,{platform,host:'gemini'}));assert.equal(repeated.hosts[0].pluginRoot,plugin);
  }
});

test('removed Node path is repaired on the same release without losing state or accepting user edits',()=>{
  const home=path.join(scratch,'runtime-relocation'),env=makeEnv('runtime-relocation');env.HOME=home;env.USERPROFILE=home;
  const input=path.join(home,'input.json'),oldNode=path.join(home,'old-node',path.basename(process.execPath));
  fs.mkdirSync(path.dirname(oldNode),{recursive:true});fs.copyFileSync(process.execPath,oldNode);
  const platform=process.platform==='win32'?'darwin':'linux';
  const app=path.join(home,'cursor'),bin=path.join(app,'resources/app/bin');
  fs.mkdirSync(bin,{recursive:true});fs.writeFileSync(path.join(bin,'cursor'),'fixture CLI',{mode:0o755});env.PATH=bin;
  const resources=platform==='darwin'?'Resources':'resources';
  fs.mkdirSync(path.join(app,resources,'app'),{recursive:true});fs.writeFileSync(path.join(app,resources,'app/product.json'),JSON.stringify({nameShort:'Cursor',version:'3.24.12'}));
  fs.writeFileSync(input,JSON.stringify({env,platform,arch:'x64'}));
  const invoke=node=>spawnSync(node,[path.join(repo,'tests/fixtures/runtime-setup.mjs'),packageRoot,input],{encoding:'utf8',windowsHide:true,timeout:120000});
  const first=invoke(oldNode);assert.equal(first.status,0,first.stderr);
  const initial=JSON.parse(first.stdout.trim().split('\n').at(-1)),plugin=initial.hosts.find(item=>item.host==='gemini').pluginRoot;
  fs.mkdirSync(env.BFS_STATE_HOME,{recursive:true});const memory=path.join(env.BFS_STATE_HOME,'keep.txt');fs.writeFileSync(memory,'existing memory');
  const metadata=path.join(home,'.gemini/extensions/bontaflowstack/.gemini-extension-install.json'),metadataBefore=fs.readFileSync(metadata,'utf8');
  fs.unlinkSync(path.join(initial.installationRoot,'runtime.json')); // Previous installers only recorded the pin in setup-status.
  const interrupted=path.join(initial.installationRoot,'.runtime-swap-fixture');fs.mkdirSync(interrupted);
  fs.renameSync(path.join(initial.installationRoot,'hosts'),path.join(interrupted,'previous'));
  fs.unlinkSync(oldNode);
  fs.writeFileSync(input,JSON.stringify({env,platform,arch:'x64',failRuntimeSwap:true}));
  const failed=invoke(process.execPath);assert.notEqual(failed.status,0);assert.match(failed.stderr,/fixture runtime swap failure/);
  assert.equal(fs.readFileSync(metadata,'utf8'),metadataBefore);
  assert.equal(JSON.parse(fs.readFileSync(path.join(home,'.gemini/extensions/bontaflowstack/gemini-extension.json'),'utf8')).mcpServers.bfs.command,oldNode,'failed active swap restores the old payload');
  const activeRoot=path.dirname(metadata),activeInterrupted=path.join(path.dirname(activeRoot),'.bfs-runtime-fixture');fs.mkdirSync(activeInterrupted);
  fs.renameSync(activeRoot,path.join(activeInterrupted,'previous'));
  fs.writeFileSync(input,JSON.stringify({env,platform,arch:'x64'}));
  const repaired=invoke(process.execPath);assert.equal(repaired.status,0,repaired.stderr);
  const result=JSON.parse(repaired.stdout.trim().split('\n').at(-1));
  assert.equal(result.installationRoot,initial.installationRoot);assert.equal(result.runtime.recovery.status,'repaired');
  assert.equal(fs.readFileSync(memory,'utf8'),'existing memory');
  const state=JSON.parse(fs.readFileSync(path.join(home,'host-fixture.json'),'utf8'));
  assert.equal(state.extensions.length,1);assert.equal(state.installs,1,'same-version repair never reinstalls the extension');
  assert.equal(JSON.parse(fs.readFileSync(path.join(home,'.gemini/extensions/bontaflowstack/gemini-extension.json'),'utf8')).mcpServers.bfs.command,process.execPath);
  assert.equal(fs.readFileSync(metadata,'utf8'),metadataBefore);
  assert.ok(!fs.existsSync(interrupted),'interrupted canonical swap was recovered');
  assert.ok(!fs.existsSync(activeInterrupted),'missing active extension was restored before native discovery');
  probePosixRuntime('gemini',plugin,env);
  const cursor=result.hosts.find(item=>item.host==='cursor');assert.equal(cursor.reloadRequired,true);assert.equal(cursor.registered,false);
  const cursorSource=path.join(home,'.cursor/plugins/local/bontaflowstack');
  assert.ok(Object.values(JSON.parse(fs.readFileSync(path.join(cursorSource,'mcp.json'),'utf8')).mcpServers).every(server=>server.command===process.execPath));
  probePosixRuntime('cursor',cursorSource,env);
  if(platform==='darwin')assert.ok(Object.values(JSON.parse(fs.readFileSync(path.join(result.installationRoot,'hosts/codex/plugins/bontaflowstack/.mcp.json'),'utf8')).mcpServers).every(server=>server.command===process.execPath));
  const repeated=invoke(process.execPath);assert.equal(repeated.status,0,repeated.stderr);
  assert.equal(JSON.parse(fs.readFileSync(path.join(home,'host-fixture.json'),'utf8')).installs,1);
  const activeManifest=path.join(home,'.gemini/extensions/bontaflowstack/gemini-extension.json'),activeBefore=fs.readFileSync(activeManifest,'utf8');
  const edited=JSON.parse(activeBefore);edited.mcpServers.bfs.env={KEEP:'host edit'};fs.writeFileSync(activeManifest,JSON.stringify(edited));
  const refused=invoke(process.execPath);assert.notEqual(refused.status,0);
  assert.equal(JSON.parse(fs.readFileSync(activeManifest,'utf8')).mcpServers.bfs.env.KEEP,'host edit');
  fs.writeFileSync(activeManifest,activeBefore);
  const manifest=path.join(plugin,'gemini-extension.json'),data=JSON.parse(fs.readFileSync(manifest,'utf8'));
  data.mcpServers.bfs.env={KEEP:'user edit'};fs.writeFileSync(manifest,JSON.stringify(data));
  const rejected=invoke(process.execPath);assert.notEqual(rejected.status,0);
  assert.equal(JSON.parse(fs.readFileSync(manifest,'utf8')).mcpServers.bfs.env.KEEP,'user edit');
});

test('Mac GUI Cursor and Codex pin the verified setup Node instead of requiring GUI PATH',async()=>{
  const env=makeEnv('mac-gui'),mock=runner(env,undefined,{native:false}),app=path.join(scratch,'mac-cursor');
  env.HOME=env.USERPROFILE;env.PATH=path.join(app,'resources/app/bin');
  fs.mkdirSync(env.PATH,{recursive:true});fs.writeFileSync(path.join(env.PATH,'cursor'),'fixture',{mode:0o755});
  fs.mkdirSync(path.join(app,'Resources/app'),{recursive:true});fs.writeFileSync(path.join(app,'Resources/app/product.json'),JSON.stringify({nameShort:'Cursor',version:'3.24.12'}));
  const run=(command,args,settings)=>path.basename(command)==='impeccable'?'4.0.0':mock.run(command,args,settings);
  const result=await setup(options(env,run,{platform:'darwin'}));
  for(const host of ['codex','cursor']) {
    const plugin=result.hosts.find(item=>item.host===host).pluginRoot;
    const mcp=JSON.parse(fs.readFileSync(path.join(plugin,host==='cursor'?'mcp.json':'.mcp.json'),'utf8'));
    assert.ok(Object.values(mcp.mcpServers).every(server=>server.command===process.execPath));
    const hooks=fs.readFileSync(path.join(plugin,'hooks/hooks.json'),'utf8');assert.doesNotMatch(hooks,/"command": "node /);
    if(host==='cursor')probePosixRuntime('cursor',plugin,env);
  }
  const repeat=await setup(options(env,run,{platform:'darwin'}));assert.equal(repeat.installationRoot,result.installationRoot);
});

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

test('setup registers core before installing Impeccable outside npm cache and persisting its command', async () => {
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
  assert.ok(register >= 0 && probe > register);
  const before = fs.statSync(config.command[0]).mtimeMs;
  await setup(options(env, mock.run));
  assert.equal(fs.statSync(config.command[0]).mtimeMs, before, 'repeat setup reuses the verified binary');
});

test('Impeccable failures leave registered core, allow retry and preserve modified installed files', async () => {
  const env = makeEnv('impeccable-failure'), mock = runner(env);
  const run = (command, args, options) => {
    if (path.basename(command) === 'impeccable.exe') throw new Error('Impeccable probe failed');
    return mock.run(command,args,options);
  };
  const incomplete=await setup(options(env,run));
  assert.equal(incomplete.status,'incomplete');assert.match(incomplete.engines.issues[0].reason,/Impeccable probe failed/);
  assert.equal(mock.state.codexPlugins.length + mock.state.claudePlugins.length,2);
  assert.equal(fs.existsSync(path.join(env.BFS_STATE_HOME,'impeccable.json')),false);
  await setup(options(env,mock.run));
  const config = JSON.parse(fs.readFileSync(path.join(env.BFS_STATE_HOME,'impeccable.json'),'utf8'));
  fs.writeFileSync(config.command[0],'user modification');
  const changed=await setup(options(env,mock.run));
  assert.equal(changed.status,'incomplete');assert.match(changed.engines.issues[0].reason,/Impeccable installation differs/);
  assert.equal(fs.readFileSync(config.command[0],'utf8'),'user modification');
});

test('explicit Impeccable environment override survives setup; invalid overrides leave core registered', async () => {
  const env = makeEnv('impeccable-override'), mock = runner(env);
  env.BFS_IMPECCABLE_COMMAND = JSON.stringify([process.execPath,'custom-tool.mjs']);
  const original=env.BFS_IMPECCABLE_COMMAND;
  await setup(options(env,mock.run));
  assert.equal(env.BFS_IMPECCABLE_COMMAND,original);
  assert.ok(mock.calls.every(call=>call.options.env.BFS_IMPECCABLE_COMMAND===original));
  const invalid = makeEnv('impeccable-invalid'), failed=runner(invalid);
  invalid.BFS_IMPECCABLE_COMMAND = '["missing.exe"]';
  const incomplete=await setup(options(invalid,failed.run));
  assert.equal(incomplete.status,'incomplete');assert.match(incomplete.engines.issues[0].reason,/absolute executable/);
  assert.equal(failed.state.codexPlugins.length+failed.state.claudePlugins.length,2);
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

test('engine preparation failure keeps core registered, reports incomplete and same command can retry', async () => {
  const env = makeEnv('retry'), mock = runner(env);
  let fail = true;
  const run = (...args) => {
    const [command, argv] = args;
    if (fail && argv?.some(value => /install-engines\.mjs$/i.test(value))) throw new Error('engine preparation failed');
    return mock.run(...args);
  };
  const partial = await setup(options(env, run));
  assert.equal(partial.status,'incomplete');assert.equal(partial.exitCode,1);
  assert.equal(partial.core.ready,true);
  assert.match(partial.engines.issues[0].reason,/engine preparation failed/);
  assert.match(partial.nextAction,/npx bontaflowstack@.* setup/);
  const progress=JSON.parse(fs.readFileSync(path.join(env.LOCALAPPDATA,'BontaFlowStack/npm/setup-status.json'),'utf8'));
  assert.equal(progress.status,'incomplete');assert.equal(progress.phase,'complete');
  assert.ok(progress.hosts.every(item=>item.status==='registered' && item.verified==='plugin-registration'));
  assert.equal(mock.state.codexPlugins.length + mock.state.claudePlugins.length, 2);
  const plugins=structuredClone(mock.state.codexPlugins);
  const memory=path.join(env.BFS_STATE_HOME,'keep.txt');fs.writeFileSync(memory,'preserved memory');
  fail = false;
  const retried = await setup(options(env, run));
  assert.deepEqual(retried.hosts.map(item => item.host).sort(), ['claude','codex']);
  assert.equal(retried.status,'completed');assert.equal(retried.exitCode,0);
  assert.deepEqual(mock.state.codexPlugins,plugins);
  assert.equal(fs.readFileSync(memory,'utf8'),'preserved memory');
});

test('missing Impeccable does not prevent the bundled engines or POSIX core registration',async()=>{
  const env=makeEnv('partial-posix'),mock=runner(env,undefined,{native:false});
  env.HOME=env.USERPROFILE;env.XDG_DATA_HOME=path.join(env.HOME,'data');delete env.LOCALAPPDATA;delete env.USERPROFILE;
  const run=(command,args,settings)=>{
    if(path.basename(command)==='impeccable')throw new Error('fixture missing Impeccable runtime');
    if(args.includes('doctor'))return JSON.stringify({core:{ready:true,status:'ready'},engines:{installed:true,capabilities:{browser:{ready:true,status:'ready'},'design-detect':{ready:false,status:'unavailable',reason:'Impeccable is not installed'}}}});
    return mock.run(command,args,settings);
  };
  const result=await setup(options(env,run,{platform:'linux'}));
  assert.equal(result.status,'incomplete');assert.equal(result.exitCode,1);assert.equal(result.core.ready,true);
  assert.ok(result.hosts.every(item=>item.registered));
  assert.ok(mock.calls.some(call=>call.args.some(arg=>arg.endsWith('install-engines.mjs'))),'the bundled engine install still runs');
  assert.equal(result.capabilities.browser.status,'ready');
  assert.equal(result.capabilities['design-detect'].status,'unavailable');
  assert.match(result.capabilities['design-detect'].reason,/Impeccable/);
  assert.match(result.capabilities['design-detect'].nextAction,/npx bontaflowstack@.* setup/);
  assert.equal(result.platform,'linux');assert.equal(result.arch,'x64');
  assert.ok(['glibc','unknown'].includes(result.libc));
});

test('invalid doctor output is unverified and cannot report a completed setup',async()=>{
  const env=makeEnv('invalid-doctor'),mock=runner(env);
  const result=await setup(options(env,(command,args,settings)=>args.includes('doctor')?'{}':mock.run(command,args,settings)));
  assert.equal(result.status,'incomplete');assert.equal(result.exitCode,1);
  assert.ok(result.hosts.every(item=>item.registered));
  assert.equal(result.capabilities.browser.status,'unverified');
  assert.match(result.capabilities.browser.reason,/Unexpected engine doctor/);
});

test('setup CLI exits nonzero after core registration when the source checksum is wrong',()=>{
  const env=makeEnv('actual-cli-incomplete'),isolated=path.join(scratch,'cli-package');
  fs.cpSync(packageRoot,isolated,{recursive:true});
  env.HOME=env.USERPROFILE;env.APPDATA=path.join(env.HOME,'AppData');env.PATH=process.env.PATH || process.env.Path;
  env.XDG_DATA_HOME=path.join(env.HOME,'data');env.XDG_STATE_HOME=path.join(env.HOME,'state');
  const hostScript=`import fs from 'node:fs';import path from 'node:path';
const file=path.join(process.env.CODEX_HOME,'fixture-host.json');fs.mkdirSync(path.dirname(file),{recursive:true});
const value=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)): {marketplaces:[],installed:[]};
const args=process.argv.slice(2).filter(arg=>arg!=='--no-daemon');
if(args.includes('--version'))console.log('codex-cli 0.162.0');
else if(args.includes('marketplace') && args.includes('list'))console.log(JSON.stringify({marketplaces:value.marketplaces}));
else if(args.includes('list'))console.log(JSON.stringify({installed:value.installed}));
else {if(args.includes('marketplace') && args.includes('add'))value.marketplaces=[{name:'bontaflowstack',root:args[3]}];
else if(args.includes('add'))value.installed=[{pluginId:'bontaflowstack@bontaflowstack',version:${JSON.stringify(JSON.parse(fs.readFileSync(path.join(isolated,'package.json'),'utf8')).version)},enabled:true,installed:true}];
fs.writeFileSync(file,JSON.stringify(value));console.log('{}');}`;
  if(process.platform==='win32') {
    const wrapper=path.join(env.APPDATA,'npm/node_modules/@openai/codex/bin/codex.js');
    fs.mkdirSync(path.dirname(wrapper),{recursive:true});fs.writeFileSync(wrapper,hostScript);
    fs.writeFileSync(path.join(env.APPDATA,'npm/node_modules/@openai/codex/package.json'),'{"type":"module"}');
  } else {
    const executable=path.join(env.HOME,'.local/bin/codex');fs.mkdirSync(path.dirname(executable),{recursive:true});
    fs.writeFileSync(executable,'#!/usr/bin/env node\n'+hostScript,{mode:0o755});
    fs.writeFileSync(path.join(env.HOME,'.local/bin/package.json'),'{"type":"module"}');
  }
  const lockFile=path.join(isolated,'hosts/codex/plugins/bontaflowstack/engines.lock.json');
  const lock=JSON.parse(fs.readFileSync(lockFile,'utf8'));lock.sha256='0'.repeat(64);fs.writeFileSync(lockFile,JSON.stringify(lock));
  fs.mkdirSync(env.HOME,{recursive:true});
  const result=spawnSync(process.execPath,[path.join(isolated,'bin/setup.mjs'),'setup','--host','codex'],{cwd:env.HOME,env,encoding:'utf8',windowsHide:true,timeout:30000});
  assert.equal(result.status,1,result.stderr || result.stdout);assert.match(result.stderr,/Setup incomplete: core registered/);
  assert.match(result.stderr,/checksum does not match.*No source was executed/);
  const state=JSON.parse(fs.readFileSync(path.join(env.CODEX_HOME,'fixture-host.json'),'utf8'));assert.equal(state.installed.length,1);
  const plugin=path.join(state.marketplaces[0].root,'plugins/bontaflowstack');
  const installRoot=dataPaths(env).installRoot;
  const progress=JSON.parse(fs.readFileSync(path.join(installRoot,'setup-status.json'),'utf8'));
  assert.match(progress.engines.issues.find(item=>item.phase==='install').reason,/checksum does not match/);
  const doctor=skill=>spawnSync(process.execPath,[path.join(plugin,'core/cli.mjs'),'doctor',...skill],{cwd:env.HOME,env,encoding:'utf8',windowsHide:true});
  const core=doctor([]),browser=doctor(['bfs-browse']);assert.equal(core.status,0,core.stderr);assert.equal(browser.status,1);
  assert.equal(JSON.parse(core.stdout).core.ready,true);assert.equal(JSON.parse(browser.stdout).capabilities.browser.status,'unavailable');
  const memory=spawnSync(process.execPath,[path.join(plugin,'core/cli.mjs'),'memory','list'],{cwd:env.HOME,env,encoding:'utf8',windowsHide:true});
  assert.equal(memory.status,0,memory.stderr);assert.ok(JSON.parse(memory.stdout));
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
