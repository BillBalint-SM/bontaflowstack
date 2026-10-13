import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {writeCommandEvidence,writeAcceptanceEvidence} from './fixtures/native-evidence.mjs';

test('real npm setup places, repeats and upgrades Cursor files with durable engines and preserves conflicts',{skip:process.env.BFS_RUN_CURSOR_SETUP!=='1'},async()=>{
  const repo=fileURLToPath(new URL('../',import.meta.url)),root=fs.mkdtempSync(path.join(os.tmpdir(),'bfs-cursor-setup-'));
  const project=path.join(root,'project with spaces'),built=path.join(root,'package'),packed=path.join(root,'packed');
  const cursorBin=path.join(process.env.LOCALAPPDATA,'Programs/cursor/resources/app/bin');
  assert.ok(fs.existsSync(path.join(cursorBin,'cursor.cmd')),'The native Cursor IDE must be installed');
  const env={...process.env,LOCALAPPDATA:path.join(root,'LocalAppData'),USERPROFILE:path.join(root,"User's $profile"),BFS_STATE_HOME:path.join(root,'state'),npm_config_cache:path.join(root,'npm-cache'),npm_config_yes:'true',PATH:`${cursorBin}${path.delimiter}${process.env.PATH || process.env.Path}`};
  delete env.BFS_IMPECCABLE_COMMAND;
  for(const directory of [project,packed,env.LOCALAPPDATA,env.USERPROFILE])fs.mkdirSync(directory,{recursive:true});
  const mcpFile=path.join(env.USERPROFILE,'.cursor/mcp.json'),existingMcp=JSON.stringify({mcpServers:{bfs:{command:'node',args:['existing.mjs']}}});fs.mkdirSync(path.dirname(mcpFile),{recursive:true});fs.writeFileSync(mcpFile,existingMcp,{flag:'wx'});
  const npmBase=[process.env.npm_execpath && path.dirname(process.env.npm_execpath),path.join(process.env.APPDATA,'npm/node_modules/npm/bin'),path.join(path.dirname(process.execPath),'node_modules/npm/bin')].filter(Boolean).find(base=>fs.existsSync(path.join(base,'npm-cli.js')));
  assert.ok(npmBase,'npm CLI must be installed');
  const records=[];
  async function run(label,args,{cwd=project,allowFailure=false}={}) {
    console.log(`Running ${label}; evidence: ${root}`);
    const result=await new Promise((resolve,reject)=>{
      const child=spawn(process.execPath,args,{cwd,env,windowsHide:true,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';
      const timer=setTimeout(()=>{if(child.pid)spawn('taskkill.exe',['/pid',String(child.pid),'/t','/f'],{windowsHide:true,stdio:'ignore'});reject(new Error(`${label} timed out`));},15*60*1000);
      child.stdout.on('data',chunk=>stdout+=String(chunk));child.stderr.on('data',chunk=>stderr+=String(chunk));
      child.on('error',error=>{clearTimeout(timer);reject(error);});child.on('close',code=>{clearTimeout(timer);resolve({code,stdout,stderr});});
    });
    writeCommandEvidence(path.join(root,`${label}.command-evidence.json`),result);records.push({label,code:result.code});
    if(!allowFailure)assert.equal(result.code,0,`${label} failed; retained command evidence contains the exit code and output sizes`);
    return result;
  }
  await run('build',[path.join(repo,'scripts/build-npm-package.mjs'),'--output',built]);
  const pack=async(label,directory)=>{
    const result=await run(label,[path.join(npmBase,'npm-cli.js'),'pack','--json','--pack-destination',packed],{cwd:directory});
    const data=JSON.parse(result.stdout),entry=Array.isArray(data)?data[0]:data.bontaflowstack,file=path.join(packed,entry.filename);
    return {file,sha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex')};
  };
  const npx=(label,archive,options)=>run(label,[path.join(npmBase,'npx-cli.js'),'--yes','--package',archive.file,'--','bontaflowstack','setup','--host','cursor'],options);
  const plugin=path.join(env.USERPROFILE,'.cursor/plugins/local/bontaflowstack'),manifest=()=>JSON.parse(fs.readFileSync(path.join(plugin,'.cursor-plugin/plugin.json'),'utf8'));
  const first=await pack('pack',built),installed=await npx('install',first);assert.match(installed.stdout,/active loading is not yet confirmed/i);
  await npx('repeat',first);const initial=manifest().version;
  assert.equal(manifest().name,'bontaflowstack-cursor');assert.deepEqual(Object.keys(JSON.parse(fs.readFileSync(path.join(plugin,'mcp.json'),'utf8')).mcpServers),['bfs-cursor']);assert.equal(fs.readFileSync(mcpFile,'utf8'),existingMcp);
  const memory=path.join(env.BFS_STATE_HOME,'keep.txt');fs.writeFileSync(memory,'preserved user state');
  const upgrade=path.join(root,'upgrade');fs.cpSync(built,upgrade,{recursive:true});const next='9.9.9-cursor-test.1';
  for(const file of ['package.json','hosts/codex/plugins/bontaflowstack/catalog.json','hosts/codex/plugins/bontaflowstack/.codex-plugin/plugin.json','hosts/claude/catalog.json','hosts/claude/.claude-plugin/plugin.json','hosts/claude/.claude-plugin/marketplace.json','hosts/gemini/catalog.json','hosts/gemini/gemini-extension.json','hosts/copilot/catalog.json','hosts/copilot/plugin.json','hosts/copilot/marketplace.json','hosts/cursor/catalog.json','hosts/cursor/.cursor-plugin/plugin.json','hosts/opencode/catalog.json','hosts/opencode/package.json']) {
    const target=path.join(upgrade,file),data=JSON.parse(fs.readFileSync(target,'utf8'));if(data.version)data.version=next;for(const entry of data.plugins || [])if(entry.version)entry.version=next;fs.writeFileSync(target,JSON.stringify(data,null,2)+'\n');
  }
  const second=await pack('pack-upgrade',upgrade);await npx('upgrade',second);assert.equal(manifest().version,next);
  assert.equal(fs.readFileSync(memory,'utf8'),'preserved user state');assert.ok(fs.existsSync(path.join(env.LOCALAPPDATA,'BontaFlowStack/npm/versions',initial,'hosts/cursor/.cursor-plugin/plugin.json')));
  fs.renameSync(env.npm_config_cache,env.npm_config_cache+'-removed');fs.renameSync(built,built+'-removed');fs.renameSync(upgrade,upgrade+'-removed');
  assert.equal(manifest().version,next);assert.equal(fs.readdirSync(path.join(plugin,'skills')).length,34);
  assert.equal(JSON.parse(fs.readFileSync(path.join(plugin,'install-state.json'),'utf8')).stateHome,env.BFS_STATE_HOME);
  const health=JSON.parse((await run('pinned-doctor',[path.join(plugin,'core/cli.mjs'),'doctor','bfs-browse'])).stdout);assert.equal(health.engines.installed,true);assert.equal(health.engines.capabilities['design-detect'].ready,true);
  const file=path.join(project,'finding.css');fs.writeFileSync(file,'body { font-family: Inter, sans-serif; }');
  const design=await run('impeccable',[path.join(plugin,'core/cli.mjs'),'engine','design-detect','--','detect','--json','--no-config',file],{allowFailure:true});assert.equal(design.code,2);assert.match(JSON.parse(design.stdout).stdout,/overused-font/);
  const foreignMcp=JSON.stringify({mcpServers:{'bfs-cursor':{command:'node',args:['foreign.mjs']}}});fs.writeFileSync(mcpFile,foreignMcp);
  const conflict=await npx('mcp-conflict',second,{allowFailure:true});assert.notEqual(conflict.code,0);assert.match(conflict.stderr,/conflicting bfs-cursor MCP/);assert.equal(fs.readFileSync(mcpFile,'utf8'),foreignMcp);fs.writeFileSync(mcpFile,existingMcp);
  const skillFile=path.join(project,'.cursor/skills/bfs-health/SKILL.md'),foreignSkill='---\nname: bfs-health\ndescription: Test-owned conflicting project skill.\n---\nDo not execute.\n';fs.mkdirSync(path.dirname(skillFile),{recursive:true});fs.writeFileSync(skillFile,foreignSkill,{flag:'wx'});
  const shadow=await npx('skill-conflict',second,{allowFailure:true});assert.notEqual(shadow.code,0);assert.match(shadow.stderr,/conflicting BFS skill/);assert.equal(fs.readFileSync(skillFile,'utf8'),foreignSkill);fs.unlinkSync(skillFile);
  assert.equal(fs.readFileSync(memory,'utf8'),'preserved user state');assert.equal(fs.readFileSync(mcpFile,'utf8'),existingMcp);
  fs.writeFileSync(path.join(root,'result.json'),JSON.stringify({status:'passed',scope:'npm file placement and engines; native IDE loading requires a separate test',initialVersion:initial,upgradedVersion:next,pluginName:manifest().name,mcpName:'bfs-cursor',existingBfsMcpPreserved:true,skillCount:34,plugin,project,tarballs:[first,second],cacheRemoved:true,statePreserved:true,mcpConflictPreserved:true,skillConflictPreserved:true,impeccable:true,records},null,2)+'\n');
  writeAcceptanceEvidence(path.join(root,'result.json'));
  console.log(`Cursor npm setup evidence: ${path.join(root,'result.json')}`);
});
