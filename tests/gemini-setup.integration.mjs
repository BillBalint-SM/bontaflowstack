import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {writeCommandEvidence,writeAcceptanceEvidence} from './fixtures/native-evidence.mjs';

test('real npm setup installs, repeats and upgrades the Gemini extension with persistent engines',{skip:process.env.BFS_RUN_GEMINI_SETUP!=='1'},async()=>{
  const repo=fileURLToPath(new URL('../',import.meta.url)),root=fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()),'bfs-gemini-setup-'));
  const project=path.join(root,'project with spaces'),built=path.join(root,'package'),packed=path.join(root,'packed');
  const env={...process.env,LOCALAPPDATA:path.join(root,'LocalAppData'),USERPROFILE:path.join(root,'UserProfile'),GEMINI_CLI_HOME:path.join(root,'Gemini'),BFS_STATE_HOME:path.join(root,'state'),npm_config_cache:path.join(root,'npm-cache'),npm_config_yes:'true'};
  env.CODEX_THREAD_ID ||= 'gemini-setup-validation';
  if(process.platform!=='win32')Object.assign(env,{HOME:path.join(root,'Home'),XDG_DATA_HOME:path.join(root,'xdg-data'),XDG_CONFIG_HOME:path.join(root,'xdg-config'),XDG_STATE_HOME:path.join(root,'xdg-state')});
  delete env.BFS_IMPECCABLE_COMMAND;
  for(const directory of [project,packed,env.LOCALAPPDATA,env.USERPROFILE,env.GEMINI_CLI_HOME])fs.mkdirSync(directory,{recursive:true});
  const npmBase=[process.env.npm_execpath && path.dirname(process.env.npm_execpath),process.env.APPDATA && path.join(process.env.APPDATA,'npm/node_modules/npm/bin'),path.join(path.dirname(process.execPath),'node_modules/npm/bin'),path.resolve(path.dirname(process.execPath),'../lib/node_modules/npm/bin')].filter(Boolean).find(base=>fs.existsSync(path.join(base,'npm-cli.js')));
  assert.ok(npmBase,'npm CLI must be installed');
  const gemini=process.env.BFS_GEMINI_CLI || path.join(process.env.APPDATA,'npm/node_modules/@google/gemini-cli/bundle/gemini.js');
  const records=[];
  async function run(label,args,{cwd=project,consent=false,allowFailure=false,command=process.execPath,input}={}) {
    console.log(`Running ${label}; evidence: ${root}`);
    const result=await new Promise((resolve,reject)=>{
      const child=spawn(command,args,{cwd,env,windowsHide:true,stdio:['pipe','pipe','pipe']});
      let stdout='',stderr='',promptBuffer='',replies=0;
      const timer=setTimeout(()=>{if(child.pid){if(process.platform==='win32')spawn('taskkill.exe',['/pid',String(child.pid),'/t','/f'],{windowsHide:true,stdio:'ignore'});else child.kill('SIGTERM');}reject(new Error(`${label} timed out`));},15*60*1000);
      const collect=(chunk,stream)=>{
        const text=String(chunk);if(stream==='stdout')stdout+=text;else stderr+=text;
        promptBuffer=(promptBuffer+text).slice(-3000);
        // Answer only the native consent prompts for the isolated test-owned source/workspace.
        if(consent && /(?:Do you want to trust this folder and continue with the installation\?|Do you want to continue\?) \[[yYnN/]+\]:\s*$/.test(promptBuffer)) {
          if(++replies>4){child.stdin.end('n\n');return;}
          child.stdin.write('y\n');promptBuffer='';
        }
      };
      child.stdout.on('data',chunk=>collect(chunk,'stdout'));child.stderr.on('data',chunk=>collect(chunk,'stderr'));
      child.on('error',error=>{clearTimeout(timer);reject(error);});
      child.on('close',code=>{clearTimeout(timer);resolve({code,stdout,stderr,consentReplies:replies});});
      if(input!==undefined)child.stdin.end(input);else if(!consent)child.stdin.end();
    });
    writeCommandEvidence(path.join(root,`${label}.command-evidence.json`),result);
    records.push({label,code:result.code,consentReplies:result.consentReplies});
    if(!allowFailure)assert.equal(result.code,0,`${label} failed; retained command evidence contains the exit code and output sizes`);
    return result;
  }
  await run('build',[path.join(repo,'scripts/build-npm-package.mjs'),'--output',built]);
  const pack=async(label,directory)=>{
    const result=await run(label,[path.join(npmBase,'npm-cli.js'),'pack','--json','--pack-destination',packed],{cwd:directory});
    const data=JSON.parse(result.stdout),entry=Array.isArray(data)?data[0]:data.bontaflowstack;
    const file=path.join(packed,entry.filename);return {file,sha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex')};
  };
  const npx=(label,archive)=>run(label,[path.join(npmBase,'npx-cli.js'),'--yes','--package',archive.file,'--','bontaflowstack','setup','--host','gemini'],{consent:true});
  const first=await pack('pack',built);await npx('install',first);await npx('repeat',first);
  const extensions=async label=>{const result=await run(label,[gemini,'extensions','list','--output-format','json']);return JSON.parse(result.stdout.trim() || result.stderr).find(item=>item.name==='bontaflowstack');};
  const initial=await extensions('first-registration');assert.equal(initial.skills.length,34);assert.equal(initial.isActive,true);
  fs.mkdirSync(env.BFS_STATE_HOME,{recursive:true});const memory=path.join(env.BFS_STATE_HOME,'keep.txt');fs.writeFileSync(memory,'preserved user state');
  const upgrade=path.join(root,'upgrade');fs.cpSync(built,upgrade,{recursive:true});
  const next='9.9.9-gemini-test.1';
  for(const file of ['package.json','hosts/codex/plugins/bontaflowstack/catalog.json','hosts/codex/plugins/bontaflowstack/.codex-plugin/plugin.json','hosts/claude/catalog.json','hosts/claude/.claude-plugin/plugin.json','hosts/claude/.claude-plugin/marketplace.json','hosts/gemini/catalog.json','hosts/gemini/gemini-extension.json','hosts/copilot/catalog.json','hosts/copilot/plugin.json','hosts/copilot/marketplace.json','hosts/cursor/catalog.json','hosts/cursor/.cursor-plugin/plugin.json','hosts/opencode/catalog.json','hosts/opencode/package.json']) {
    const target=path.join(upgrade,file),data=JSON.parse(fs.readFileSync(target,'utf8'));
    if(data.version)data.version=next;for(const entry of data.plugins || [])if(entry.version)entry.version=next;
    fs.writeFileSync(target,JSON.stringify(data,null,2)+'\n');
  }
  const second=await pack('pack-upgrade',upgrade);await npx('upgrade',second);
  const active=await extensions('upgraded-registration');assert.equal(active.version,next);assert.equal(active.isActive,true);assert.equal(active.skills.length,34);
  assert.equal(active.installMetadata.source,initial.installMetadata.source);assert.equal(fs.readFileSync(memory,'utf8'),'preserved user state');
  const versionRoot=process.platform==='win32'?path.join(env.LOCALAPPDATA,'BontaFlowStack/npm/versions'):path.join(env.XDG_DATA_HOME,'bontaflowstack/npm/versions',`${process.platform}-${process.arch}`);
  assert.ok(fs.existsSync(path.join(versionRoot,initial.version,'hosts/gemini/catalog.json')));
  fs.renameSync(env.npm_config_cache,env.npm_config_cache+'-removed');fs.renameSync(built,built+'-removed');fs.renameSync(upgrade,upgrade+'-removed');
  const after=await extensions('without-cache');assert.equal(after.version,next);
  const pin=JSON.parse(fs.readFileSync(path.join(after.path,'install-state.json'),'utf8'));assert.equal(pin.stateHome,env.BFS_STATE_HOME);
  const doctor=await run('pinned-doctor',[path.join(after.path,'core/cli.mjs'),'doctor','bfs-browse']);
  const health=JSON.parse(doctor.stdout);assert.equal(health.engines.installed,true);assert.equal(health.engines.capabilities['design-detect'].ready,true);
  const file=path.join(project,'finding.css');fs.writeFileSync(file,'body { font-family: Inter, sans-serif; }');
  const design=await run('impeccable',[path.join(after.path,'core/cli.mjs'),'engine','design-detect','--','detect','--json','--no-config',file],{allowFailure:true});
  assert.equal(design.code,2);assert.match(JSON.parse(design.stdout).stdout,/overused-font/);
  fs.writeFileSync(path.join(root,'result.json'),JSON.stringify({status:'passed',nativeVersion:(await run('host-version',[gemini,'--version'])).stdout.trim(),initialVersion:initial.version,upgradedVersion:next,skillCount:active.skills.length,source:active.installMetadata.source,extensionRoot:active.path,tarballs:[first,second],cacheRemoved:true,statePreserved:true,impeccable:true,records},null,2)+'\n');
  writeAcceptanceEvidence(path.join(root,'result.json'));
  console.log(`Native npm setup evidence: ${path.join(root,'result.json')}`);
});
