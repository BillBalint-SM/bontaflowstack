import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {writeCommandEvidence,writeAcceptanceEvidence} from './fixtures/native-evidence.mjs';

test('real npm setup installs, repeats and upgrades Copilot with persistent engines and preserves disabled policy',{skip:process.env.BFS_RUN_COPILOT_SETUP!=='1'},async()=>{
  const repo=fileURLToPath(new URL('../',import.meta.url)),root=fs.mkdtempSync(path.join(os.tmpdir(),'bfs-copilot-setup-'));
  const project=path.join(root,'project with spaces'),built=path.join(root,'package'),packed=path.join(root,'packed');
  const env={...process.env,LOCALAPPDATA:path.join(root,'LocalAppData'),USERPROFILE:path.join(root,'UserProfile'),COPILOT_HOME:path.join(root,"Copilot's $profile"),COPILOT_CACHE_HOME:path.join(root,'copilot-cache'),BFS_STATE_HOME:path.join(root,'state'),npm_config_cache:path.join(root,'npm-cache'),npm_config_yes:'true'};
  delete env.BFS_IMPECCABLE_COMMAND;
  for(const directory of [project,packed,env.LOCALAPPDATA,env.USERPROFILE,env.COPILOT_HOME])fs.mkdirSync(directory,{recursive:true});
  const npmBase=[process.env.npm_execpath && path.dirname(process.env.npm_execpath),path.join(process.env.APPDATA,'npm/node_modules/npm/bin'),path.join(path.dirname(process.execPath),'node_modules/npm/bin')].filter(Boolean).find(base=>fs.existsSync(path.join(base,'npm-cli.js')));
  assert.ok(npmBase,'npm CLI must be installed');
  const copilot=process.env.BFS_COPILOT_CLI || path.join(process.env.APPDATA,'npm/node_modules/@github/copilot/npm-loader.js'),records=[];
  const progressFile=path.join(env.LOCALAPPDATA,'BontaFlowStack/npm/setup-status.json');
  async function run(label,args,{cwd=project,allowFailure=false,interruptPhase,interruptMarker,commandEnv=env}={}) {
    console.log(`Running ${label}; evidence: ${root}`);
    const result=await new Promise((resolve,reject)=>{
      const child=spawn(process.execPath,args,{cwd,env:commandEnv,windowsHide:true,stdio:['ignore','pipe','pipe']});
      let stdout='',stderr='';
      let interrupted=false;
      const monitor=interruptPhase || interruptMarker?setInterval(()=>{
        if(interrupted)return;
        const progress=fs.existsSync(progressFile)?JSON.parse(fs.readFileSync(progressFile,'utf8')):null;
        if(interruptMarker?fs.existsSync(interruptMarker):progress?.status==='running' && progress.phase===interruptPhase) {
          interrupted=true;
          spawn('taskkill.exe',['/pid',String(child.pid),'/t','/f'],{windowsHide:true,stdio:'ignore'});
        }
      },10):null;
      const timer=setTimeout(()=>{clearInterval(monitor);if(child.pid)spawn('taskkill.exe',['/pid',String(child.pid),'/t','/f'],{windowsHide:true,stdio:'ignore'});reject(new Error(`${label} timed out`));},15*60*1000);
      child.stdout.on('data',chunk=>stdout+=String(chunk));child.stderr.on('data',chunk=>stderr+=String(chunk));
      child.on('error',error=>{clearInterval(monitor);clearTimeout(timer);reject(error);});
      child.on('close',code=>{clearInterval(monitor);clearTimeout(timer);resolve({code,stdout,stderr,interrupted});});
    });
    writeCommandEvidence(path.join(root,`${label}.command-evidence.json`),result);
    records.push({label,code:result.code});
    if(!allowFailure)assert.equal(result.code,0,`${label} failed; retained command evidence contains the exit code and output sizes`);
    return result;
  }
  await run('build',[path.join(repo,'scripts/build-npm-package.mjs'),'--output',built]);
  const pack=async(label,directory)=>{
    const result=await run(label,[path.join(npmBase,'npm-cli.js'),'pack','--json','--pack-destination',packed],{cwd:directory});
    const data=JSON.parse(result.stdout),entry=Array.isArray(data)?data[0]:data.bontaflowstack;
    const file=path.join(packed,entry.filename);return {file,sha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex')};
  };
  const npx=(label,archive,options)=>run(label,[path.join(npmBase,'npx-cli.js'),'--yes','--package',archive.file,'--','bontaflowstack','setup','--host','copilot'],options);
  const plugins=async label=>JSON.parse((await run(label,[copilot,'plugin','list','--json'])).stdout);
  const first=await pack('pack',built);
  const interrupted=await npx('interrupted-install',first,{allowFailure:true,interruptPhase:'engines'});
  assert.equal(interrupted.interrupted,true);assert.notEqual(interrupted.code,0);
  const unfinished=JSON.parse(fs.readFileSync(progressFile,'utf8'));
  assert.equal(unfinished.status,'running');assert.equal(unfinished.phase,'engines');
  assert.deepEqual(unfinished.hosts,[{host:'copilot',status:'placed'}]);
  fs.writeFileSync(path.join(root,'interrupted-status.json'),JSON.stringify(unfinished,null,2)+'\n');
  assert.equal((await plugins('interrupted-registration')).some(item=>item.name==='bontaflowstack'),false);
  await npx('install',first);await npx('repeat',first);
  const initial=(await plugins('first-registration')).find(item=>item.name==='bontaflowstack');
  assert.equal(initial.enabled,true);assert.equal(initial.source,'live');assert.equal(initial.marketplace,'bontaflowstack-npx');
  const memory=path.join(env.BFS_STATE_HOME,'keep.txt');fs.writeFileSync(memory,'preserved user state');
  const upgrade=path.join(root,'upgrade');fs.cpSync(built,upgrade,{recursive:true});const next='9.9.9-copilot-test.1';
  for(const file of ['package.json','hosts/codex/plugins/bontaflowstack/catalog.json','hosts/codex/plugins/bontaflowstack/.codex-plugin/plugin.json','hosts/claude/catalog.json','hosts/claude/.claude-plugin/plugin.json','hosts/claude/.claude-plugin/marketplace.json','hosts/gemini/catalog.json','hosts/gemini/gemini-extension.json','hosts/copilot/catalog.json','hosts/copilot/plugin.json','hosts/copilot/marketplace.json','hosts/cursor/catalog.json','hosts/cursor/.cursor-plugin/plugin.json','hosts/opencode/catalog.json','hosts/opencode/package.json']) {
    const target=path.join(upgrade,file),data=JSON.parse(fs.readFileSync(target,'utf8'));
    if(data.version)data.version=next;for(const entry of data.plugins || [])if(entry.version)entry.version=next;
    fs.writeFileSync(target,JSON.stringify(data,null,2)+'\n');
  }
  const second=await pack('pack-upgrade',upgrade);
  const freeze=path.join(root,'freeze-source-swap.mjs'),swapMarker=path.join(root,'source-swap-interrupted.json'),beforeSwap=fs.readFileSync(path.join(initial.installedFrom,'HOST.md'));
  fs.writeFileSync(freeze,`import fs from 'node:fs';\nconst rename=fs.renameSync;\nfs.renameSync=(from,to)=>{const result=rename(from,to);if(from===${JSON.stringify(initial.installedFrom)} && String(to).endsWith('previous')){fs.writeFileSync(${JSON.stringify(swapMarker)},JSON.stringify({from,to}));Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0);}return result;};\n`);
  const interruptedSwap=await npx('interrupted-upgrade',second,{allowFailure:true,interruptMarker:swapMarker,commandEnv:{...env,NODE_OPTIONS:`${env.NODE_OPTIONS || ''} --import=${pathToFileURL(freeze).href}`.trim()}});
  assert.equal(interruptedSwap.interrupted,true);assert.notEqual(interruptedSwap.code,0);
  const saved=JSON.parse(fs.readFileSync(swapMarker,'utf8'));
  assert.equal(saved.from,initial.installedFrom);assert.ok(path.resolve(saved.to).startsWith(path.join(env.LOCALAPPDATA,'BontaFlowStack/npm/sources/copilot')+path.sep));
  assert.equal(fs.existsSync(initial.installedFrom),false);
  assert.deepEqual(fs.readFileSync(path.join(saved.to,'HOST.md')),beforeSwap);
  const pendingSwap=JSON.parse(fs.readFileSync(progressFile,'utf8'));assert.equal(pendingSwap.status,'running');assert.equal(pendingSwap.hosts[0].status,'registering');
  fs.writeFileSync(path.join(root,'interrupted-upgrade-status.json'),JSON.stringify(pendingSwap,null,2)+'\n');
  await npx('upgrade',second);
  assert.equal(fs.existsSync(path.dirname(saved.to)),false,'the recovered source staging must be removed only after verification');
  const active=(await plugins('upgraded-registration')).find(item=>item.name==='bontaflowstack');
  assert.equal(active.version,next);assert.equal(active.enabled,true);assert.equal(active.installedFrom,initial.installedFrom);
  assert.equal(fs.readFileSync(memory,'utf8'),'preserved user state');
  assert.ok(fs.existsSync(path.join(env.LOCALAPPDATA,'BontaFlowStack/npm/versions',initial.version,'hosts/copilot/plugin.json')));
  fs.renameSync(env.npm_config_cache,env.npm_config_cache+'-removed');fs.renameSync(built,built+'-removed');fs.renameSync(upgrade,upgrade+'-removed');
  const after=(await plugins('without-cache')).find(item=>item.name==='bontaflowstack');assert.equal(after.version,next);
  const skills=JSON.parse((await run('skills',[copilot,'skill','list','--json'])).stdout).filter(item=>item.name.startsWith('bfs-'));
  assert.equal(skills.length,34);assert.ok(skills.every(item=>item.enabled && item.source==='plugin' && path.dirname(path.dirname(item.path))===active.installedFrom));
  const mcp=JSON.parse((await run('mcp',[copilot,'mcp','list','--json'])).stdout).mcpServers.bfs;
  assert.equal(mcp.enabled,true);assert.equal(mcp.source,'plugin');assert.equal(mcp.env.PLUGIN_ROOT,active.installedFrom);
  assert.equal(JSON.parse(fs.readFileSync(path.join(active.installedFrom,'install-state.json'),'utf8')).stateHome,env.BFS_STATE_HOME);
  const health=JSON.parse((await run('pinned-doctor',[path.join(active.installedFrom,'core/cli.mjs'),'doctor','bfs-browse'])).stdout);
  assert.equal(health.engines.installed,true);assert.equal(health.engines.capabilities['design-detect'].ready,true);
  const file=path.join(project,'finding.css');fs.writeFileSync(file,'body { font-family: Inter, sans-serif; }');
  const design=await run('impeccable',[path.join(active.installedFrom,'core/cli.mjs'),'engine','design-detect','--','detect','--json','--no-config',file],{allowFailure:true});
  assert.equal(design.code,2);assert.match(JSON.parse(design.stdout).stdout,/overused-font/);
  await run('disable',[copilot,'plugin','disable','bontaflowstack@bontaflowstack-npx']);
  const disabled=await npx('disabled-setup',second,{allowFailure:true});assert.notEqual(disabled.code,0);assert.match(disabled.stderr,/disabled/);
  assert.equal((await plugins('disabled-preserved')).find(item=>item.name==='bontaflowstack').enabled,false);
  assert.equal(fs.readFileSync(memory,'utf8'),'preserved user state');
  // Restore only this isolated test-owned plugin before testing independent conflicts.
  await run('enable-test-plugin',[copilot,'plugin','enable','bontaflowstack@bontaflowstack-npx']);
  const mcpFile=path.join(env.COPILOT_HOME,'mcp-config.json'),foreignMcp=JSON.stringify({mcpServers:{bfs:{type:'local',command:'node',args:['foreign.mjs'],tools:['*']}}});
  fs.writeFileSync(mcpFile,foreignMcp,{flag:'wx'});
  const conflict=await npx('mcp-conflict',second,{allowFailure:true});assert.notEqual(conflict.code,0);assert.match(conflict.stderr,/conflicting.*bfs MCP/);
  assert.equal(fs.readFileSync(mcpFile,'utf8'),foreignMcp);fs.unlinkSync(mcpFile);
  const skillFile=path.join(project,'.github/skills/bfs-health/SKILL.md'),foreignSkill='---\nname: bfs-health\ndescription: Test-owned conflicting project skill.\n---\nDo not execute.\n';
  fs.mkdirSync(path.dirname(skillFile),{recursive:true});fs.writeFileSync(skillFile,foreignSkill,{flag:'wx'});
  const shadow=await npx('skill-conflict',second,{allowFailure:true});assert.notEqual(shadow.code,0);assert.match(shadow.stderr,/conflicting.*BFS skill/);
  assert.equal(fs.readFileSync(skillFile,'utf8'),foreignSkill);fs.unlinkSync(skillFile);
  assert.equal(fs.readFileSync(memory,'utf8'),'preserved user state');
  fs.writeFileSync(path.join(root,'result.json'),JSON.stringify({status:'passed',nativeVersion:(await run('host-version',[copilot,'--version'])).stdout.trim(),initialVersion:initial.version,upgradedVersion:next,skillCount:skills.length,source:active.installedFrom,tarballs:[first,second],interruptedInstallRecovered:true,interruptedSourceSwapRecovered:true,cacheRemoved:true,statePreserved:true,disabledPreserved:true,mcpConflictPreserved:true,skillConflictPreserved:true,impeccable:true,records},null,2)+'\n');
  writeAcceptanceEvidence(path.join(root,'result.json'));
  console.log(`Native npm setup evidence: ${path.join(root,'result.json')}`);
});
