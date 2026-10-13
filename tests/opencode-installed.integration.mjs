import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {writeNativeEvidence,writeAcceptanceEvidence} from './fixtures/native-evidence.mjs';

test('OpenCode activates an npm-installed BFS skill and runs the actual project health check',{skip:process.env.BFS_RUN_OPENCODE_INSTALLED!=='1'},async()=>{
  const root=path.resolve(process.env.BFS_OPENCODE_SETUP_EVIDENCE || '');assert.equal(path.dirname(root),fs.realpathSync.native(os.tmpdir()));assert.match(path.basename(root),/^bfs-opencode-setup-/);
  const setup=JSON.parse(fs.readFileSync(path.join(root,'result.json'),'utf8'));assert.equal(setup.status,'passed');
  const project=fs.mkdtempSync(path.join(root,'health-project-'));
  fs.writeFileSync(path.join(project,'README.md'),'# Fixture\n\nExisting health check: `node --test check.test.mjs`.\n');
  fs.writeFileSync(path.join(project,'check.test.mjs'),"import test from 'node:test';\nimport assert from 'node:assert/strict';\ntest('BFS_INSTALLED_HEALTH_OK',()=>assert.equal(2+3,5));\n");
  const env={...process.env,LOCALAPPDATA:path.join(root,'LocalAppData'),USERPROFILE:path.join(root,"User's $profile"),XDG_CONFIG_HOME:path.join(root,"User's $config")};
  for(const name of ['BFS_STATE_HOME','BFS_IMPECCABLE_COMMAND','NODE_TEST_CONTEXT','OPENCODE_CONFIG','OPENCODE_CONFIG_DIR'])delete env[name];
  // Agent rules retain their order after the fixture's global bash deny; these permissions exist only in this test process.
  env.OPENCODE_CONFIG_CONTENT=JSON.stringify({agent:{build:{permission:{'*':'ask',skill:{'*':'deny','bfs-health':'allow'},bfs_core:'allow',bfs_status:'allow',read:'allow',glob:'allow',grep:'allow',bash:{'*':'deny','node --test check.test.mjs':'allow'}}}}});
  const configFile=path.join(env.XDG_CONFIG_HOME,'opencode/opencode.jsonc'),original=fs.readFileSync(configFile,'utf8');
  const loader=fs.readFileSync(path.join(env.XDG_CONFIG_HOME,'opencode/plugins/bontaflowstack.js'),'utf8'),installedSource=path.dirname(fileURLToPath(JSON.parse(loader.match(/from (".*");/)[1])));
  const cli=process.env.BFS_OPENCODE_CLI || path.join(process.env.APPDATA,'npm/node_modules/opencode-ai/bin/opencode.exe');
  const prompt='Use the installed bfs-health skill in check mode for this fixture project. Activate it with the native skill tool, follow its HOST read protocol and read effective preferences. Run the existing README health command exactly as written. Also call bfs_status once and report its host/sessionId and engine readiness. Do not modify files, use other skills, install anything or run any other shell command. Report actual results; do not retry errors.';
  console.log(`Native installed OpenCode evidence: ${project}`);
  const result=await new Promise((resolve,reject)=>{
    const child=spawn(cli,['run','--agent','build','--model','opencode/longcat-2.5-preview-free','--format','json',prompt],{cwd:project,env,windowsHide:true,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';
    const timer=setTimeout(()=>{if(child.pid)spawn('taskkill.exe',['/pid',String(child.pid),'/t','/f'],{windowsHide:true,stdio:'ignore'});reject(new Error('Native installed skill probe timed out'));},180000);
    child.stdout.on('data',data=>stdout+=String(data));child.stderr.on('data',data=>stderr+=String(data));child.on('error',error=>{clearTimeout(timer);reject(error);});child.on('close',code=>{clearTimeout(timer);resolve({code,stdout,stderr});});
  });
  const diagnostic=writeNativeEvidence(path.join(project,'native-evidence.json'),result);assert.equal(result.code,0,JSON.stringify(diagnostic));
  const events=result.stdout.trim().split('\n').map(JSON.parse),calls=events.filter(event=>event.type==='tool_use'),find=(tool,args)=>calls.find(event=>event.part?.tool===tool && (!args || event.part.state.input?.args?.join(' ')===args));
  const activation=find('skill');assert.equal(activation?.part.state.input?.name,'bfs-health','Missing native skill activation');assert.equal(activation.part.state.status,'completed');
  const read=find('bfs_core','read bfs-health');assert.equal(read?.part.state.status,'completed','Missing installed skill read');const readResult=JSON.parse(read.part.state.output.split('\nBFS_GUARD_OBSERVED')[0]);assert.match(readResult.host,/OpenCode CLI/);
  assert.equal(find('bfs_core','preferences effective')?.part.state.status,'completed');
  const statusCall=find('bfs_status');assert.equal(statusCall?.part.state.status,'completed');const status=JSON.parse(statusCall.part.state.output.split('\nBFS_GUARD_OBSERVED')[0]);assert.equal(status.host,'opencode-cli');assert.equal(status.hostWorkspace,project);assert.equal(status.sessionId,statusCall.sessionID);assert.equal(status.engine.installed,true);assert.equal(status.engine.capabilities['design-detect'].ready,true);
  const check=find('bash');assert.equal(check?.part.state.input?.command,'node --test check.test.mjs');assert.equal(check.part.state.status,'completed');assert.match(check.part.state.output,/BFS_INSTALLED_HEALTH_OK/);assert.match(read.part.state.output,/BFS_GUARD_OBSERVED/);assert.equal(fs.readFileSync(configFile,'utf8'),original);
  fs.writeFileSync(path.join(project,'result.json'),JSON.stringify({status:'passed',host:status.host,sessionId:status.sessionId,workspace:project,installedSource,healthCheck:true,pinnedEngines:true,guardObserved:true,configPreserved:true},null,2)+'\n');
  writeAcceptanceEvidence(path.join(project,'result.json'));
});
