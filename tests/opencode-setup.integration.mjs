import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {writeCommandEvidence,writeAcceptanceEvidence} from './fixtures/native-evidence.mjs';
import {dataPaths} from '../plugins/bontaflowstack/core/state.mjs';

test('real npm setup registers and upgrades OpenCode while preserving JSONC, state and conflicts',{skip:process.env.BFS_RUN_OPENCODE_SETUP!=='1'},async()=>{
  const repo=fileURLToPath(new URL('../',import.meta.url)),root=fs.mkdtempSync(path.join(os.tmpdir(),'bfs-opencode-setup-')),project=path.join(root,'project with spaces'),built=path.join(root,'package'),packed=path.join(root,'packed');
  const cli=process.env.BFS_OPENCODE_CLI || path.join(process.env.APPDATA,'npm/node_modules/opencode-ai/bin/opencode.exe');assert.ok(fs.existsSync(cli));
  const env={...process.env,LOCALAPPDATA:path.join(root,'LocalAppData'),USERPROFILE:path.join(root,"User's $profile"),XDG_CONFIG_HOME:path.join(root,"User's $config"),BFS_STATE_HOME:path.join(root,'state'),npm_config_cache:path.join(root,'npm-cache'),npm_config_yes:'true'};
  env.CODEX_THREAD_ID ||= 'opencode-setup-validation';
  if(process.platform!=='win32')Object.assign(env,{HOME:path.join(root,'Home'),XDG_DATA_HOME:path.join(root,'xdg-data'),XDG_STATE_HOME:path.join(root,'xdg-state')});
  const {installRoot}=dataPaths(env);
  const versionRoot=path.join(installRoot,'versions',...(process.platform==='win32'?[]:[`${process.platform}-${process.arch}`]));
  for(const name of ['BFS_IMPECCABLE_COMMAND','OPENCODE_CONFIG_DIR','OPENCODE_CONFIG','OPENCODE_CONFIG_CONTENT','NODE_TEST_CONTEXT'])delete env[name];
  const configRoot=path.join(env.XDG_CONFIG_HOME,'opencode'),loader=path.join(configRoot,'plugins/bontaflowstack.js'),configFile=path.join(configRoot,'opencode.jsonc');
  for(const dir of [project,packed,env.LOCALAPPDATA,env.USERPROFILE,path.join(configRoot,'plugins')])fs.mkdirSync(dir,{recursive:true});
  const original='// Preserve comments, trailing commas and user permission.\n{"share":"disabled","permission":{"bash":"deny"},}\n';fs.writeFileSync(configFile,original);
  const otherPlugin=path.join(configRoot,'plugins/keep.js'),otherSource='export const Keep=async()=>({});\n';fs.writeFileSync(otherPlugin,otherSource);
  const npmBase=[process.env.npm_execpath && path.dirname(process.env.npm_execpath),process.env.APPDATA && path.join(process.env.APPDATA,'npm/node_modules/npm/bin'),path.join(path.dirname(process.execPath),'node_modules/npm/bin'),path.resolve(path.dirname(process.execPath),'../lib/node_modules/npm/bin')].filter(Boolean).find(base=>fs.existsSync(path.join(base,'npm-cli.js')));assert.ok(npmBase);
  const records=[];
  async function run(label,command,args,{cwd=project,allowFailure=false}={}) {
    console.log(`Running ${label}; evidence: ${root}`);
    const result=await new Promise((resolve,reject)=>{
      const child=spawn(command,args,{cwd,env,windowsHide:true,detached:process.platform!=='win32',stdio:['ignore','pipe','pipe']});let stdout='',stderr='';
      const timer=setTimeout(()=>{if(child.pid){if(process.platform==='win32')spawn('taskkill.exe',['/pid',String(child.pid),'/t','/f'],{windowsHide:true,stdio:'ignore'});else try{process.kill(-child.pid,'SIGTERM');}catch(error){if(error.code!=='ESRCH')throw error;}}reject(new Error(`${label} timed out`));},15*60*1000);
      child.stdout.on('data',data=>stdout+=String(data));child.stderr.on('data',data=>stderr+=String(data));child.on('error',error=>{clearTimeout(timer);reject(error);});child.on('close',code=>{clearTimeout(timer);resolve({code,stdout,stderr});});
    });
    writeCommandEvidence(path.join(root,label+'.command-evidence.json'),result);records.push({label,code:result.code});
    if(!allowFailure)assert.equal(result.code,0,`${label} failed; retained command evidence contains the exit code and output sizes`);return result;
  }
  await run('build',process.execPath,[path.join(repo,'scripts/build-npm-package.mjs'),'--output',built]);
  const pack=async(label,directory)=>{const result=await run(label,process.execPath,[path.join(npmBase,'npm-cli.js'),'pack','--json','--pack-destination',packed],{cwd:directory}),data=JSON.parse(result.stdout),entry=Array.isArray(data)?data[0]:data.bontaflowstack,file=path.join(packed,entry.filename);return {file,sha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex')};};
  const npx=(label,archive,options)=>run(label,process.execPath,[path.join(npmBase,'npx-cli.js'),'--yes','--package',archive.file,'--','bontaflowstack','setup','--host','opencode'],options);
  const first=await pack('pack',built);await npx('install',first);await npx('repeat',first);
  const initial=JSON.parse(fs.readFileSync(path.join(built,'package.json'),'utf8')).version,memory=path.join(env.BFS_STATE_HOME,'keep.txt');fs.writeFileSync(memory,'preserved user state');
  const upgrade=path.join(root,'upgrade'),next='9.9.9-opencode-test.1';fs.cpSync(built,upgrade,{recursive:true});
  for(const file of ['package.json','hosts/codex/plugins/bontaflowstack/catalog.json','hosts/codex/plugins/bontaflowstack/.codex-plugin/plugin.json','hosts/claude/catalog.json','hosts/claude/.claude-plugin/plugin.json','hosts/claude/.claude-plugin/marketplace.json','hosts/gemini/catalog.json','hosts/gemini/gemini-extension.json','hosts/copilot/catalog.json','hosts/copilot/plugin.json','hosts/copilot/marketplace.json','hosts/cursor/catalog.json','hosts/cursor/.cursor-plugin/plugin.json','hosts/opencode/catalog.json','hosts/opencode/package.json']){const target=path.join(upgrade,file),value=JSON.parse(fs.readFileSync(target,'utf8'));if(value.version)value.version=next;for(const entry of value.plugins || [])if(entry.version)entry.version=next;fs.writeFileSync(target,JSON.stringify(value,null,2)+'\n');}
  const second=await pack('pack-upgrade',upgrade);await npx('upgrade',second);
  const plugin=path.join(versionRoot,next,'hosts/opencode');assert.match(fs.readFileSync(loader,'utf8'),/9\.9\.9-opencode-test\.1/);
  fs.renameSync(env.npm_config_cache,env.npm_config_cache+'-removed');fs.renameSync(built,built+'-removed');fs.renameSync(upgrade,upgrade+'-removed');
  const skills=JSON.parse((await run('skills',cli,['debug','skill'])).stdout).filter(skill=>skill.name.startsWith('bfs-'));assert.equal(skills.length,34);for(const skill of skills)assert.equal(path.resolve(skill.location),path.join(plugin,'skills',skill.name,'SKILL.md'));
  const mcp=await run('mcp',cli,['mcp','list']);assert.match(mcp.stdout.replace(/\u001b\[[0-9;]*m/g,''),/bfs connected/);
  const doctor=JSON.parse((await run('pinned-doctor',process.execPath,[path.join(plugin,'core/cli.mjs'),'doctor','bfs-browse'])).stdout);assert.equal(doctor.engines.installed,true);assert.equal(doctor.engines.capabilities['design-detect'].ready,true);
  const css=path.join(project,'finding.css');fs.writeFileSync(css,'body { font-family: Inter, sans-serif; }');const design=await run('impeccable',process.execPath,[path.join(plugin,'core/cli.mjs'),'engine','design-detect','--','detect','--json','--no-config',css],{allowFailure:true});assert.equal(design.code,2);assert.match(JSON.parse(design.stdout).stdout,/overused-font/);
  const expectedLoader=fs.readFileSync(loader,'utf8');fs.writeFileSync(configFile,'// Explicit native disable\n{"mcp":{"bfs":{"enabled":false}}}\n');
  const disabled=await npx('disabled',second,{allowFailure:true});assert.notEqual(disabled.code,0);assert.match(disabled.stderr,/conflicting or disabled bfs MCP/);assert.equal(fs.readFileSync(loader,'utf8'),expectedLoader);assert.match(fs.readFileSync(configFile,'utf8'),/"enabled":false/);fs.writeFileSync(configFile,original);
  const skillFile=path.join(project,'.opencode/skills/bfs-health/SKILL.md'),foreign='---\nname: bfs-health\ndescription: Preserve this project skill.\n---\nNo operations.\n';fs.mkdirSync(path.dirname(skillFile),{recursive:true});fs.writeFileSync(skillFile,foreign);
  const conflict=await npx('skill-conflict',second,{allowFailure:true});assert.notEqual(conflict.code,0);assert.match(conflict.stderr,/conflicting BFS skill/);assert.equal(fs.readFileSync(skillFile,'utf8'),foreign);fs.unlinkSync(skillFile);
  assert.equal(fs.readFileSync(configFile,'utf8'),original);assert.equal(fs.readFileSync(otherPlugin,'utf8'),otherSource);assert.equal(fs.readFileSync(memory,'utf8'),'preserved user state');
  fs.writeFileSync(path.join(root,'result.json'),JSON.stringify({status:'passed',nativeVersion:(await run('host-version',cli,['--version'])).stdout.trim(),initialVersion:initial,upgradedVersion:next,skillCount:34,plugin,project,tarballs:[first,second],cacheRemoved:true,statePreserved:true,jsoncPreserved:true,foreignPluginPreserved:true,disabledPreserved:true,skillConflictPreserved:true,impeccable:true,records},null,2)+'\n');
  writeAcceptanceEvidence(path.join(root,'result.json'));
  console.log(`OpenCode npm setup evidence: ${path.join(root,'result.json')}`);
});
