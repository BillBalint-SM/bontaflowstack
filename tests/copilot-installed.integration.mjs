import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {writeNativeEvidence,writeAcceptanceEvidence} from './fixtures/native-evidence.mjs';

test('Copilot uses an npm-installed BFS skill and runs the existing project check',{skip:process.env.BFS_RUN_COPILOT_INSTALLED!=='1'},async()=>{
  const root=path.resolve(process.env.BFS_COPILOT_SETUP_EVIDENCE || '');
  assert.equal(path.dirname(root),fs.realpathSync.native(os.tmpdir()));assert.match(path.basename(root),/^bfs-copilot-setup-/);
  const setup=JSON.parse(fs.readFileSync(path.join(root,'result.json'),'utf8'));assert.equal(setup.status,'passed');
  const project=fs.mkdtempSync(path.join(root,'health-project-'));
  fs.writeFileSync(path.join(project,'README.md'),'# Fixture\n\nExisting health check: `node --test check.test.mjs`.\n');
  fs.writeFileSync(path.join(project,'check.test.mjs'),"import test from 'node:test';\nimport assert from 'node:assert/strict';\ntest('BFS_INSTALLED_HEALTH_OK',()=>assert.equal(2+3,5));\n");
  const env={...process.env,LOCALAPPDATA:path.join(root,'LocalAppData'),USERPROFILE:path.join(root,'UserProfile'),COPILOT_HOME:path.join(root,"Copilot's $profile"),COPILOT_CACHE_HOME:path.join(root,'copilot-cache')};
  delete env.BFS_STATE_HOME;delete env.BFS_IMPECCABLE_COMMAND;
  delete env.NODE_TEST_CONTEXT;
  const cli=process.env.BFS_COPILOT_CLI || path.join(process.env.APPDATA,'npm/node_modules/@github/copilot/npm-loader.js');
  async function run(args) {
    return new Promise((resolve,reject)=>{
      const child=spawn(process.execPath,[cli,...args],{cwd:project,env,windowsHide:true,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';
      const timer=setTimeout(()=>{if(child.pid)spawn('taskkill.exe',['/pid',String(child.pid),'/t','/f'],{windowsHide:true,stdio:'ignore'});reject(new Error('Native installed skill probe timed out'));},180000);
      child.stdout.on('data',chunk=>stdout+=String(chunk));child.stderr.on('data',chunk=>stderr+=String(chunk));
      child.on('error',error=>{clearTimeout(timer);reject(error);});child.on('close',code=>{clearTimeout(timer);resolve({code,stdout,stderr});});
    });
  }
  // The setup fixture deliberately leaves its own plugin disabled in its policy test.
  const enabled=await run(['plugin','enable','bontaflowstack@bontaflowstack-npx']);assert.equal(enabled.code,0,enabled.stderr);
  const result=await run(['--no-custom-instructions','--disable-builtin-mcps','--no-auto-update','--no-remote','--no-remote-export','--output-format','json',
    '--allow-tool','bfs(core)','--allow-tool','bfs(status)','--allow-tool','shell(node)',
    '-p','Use the installed /bfs-health skill in check mode for this fixture project. Follow its HOST read protocol and read effective preferences. Run the existing README health command exactly as written. Also call the BFS status tool once and report its host/sessionId and engine readiness. Do not modify files, use other skills, install anything or run any other shell command. Report actual results; do not retry errors.']);
  const diagnostic=writeNativeEvidence(path.join(project,'native-evidence.json'),result);
  console.log(`Native installed Copilot evidence: ${project}`);
  assert.equal(result.code,0,JSON.stringify(diagnostic));
  const events=result.stdout.trim().split('\n').map(JSON.parse),starts=events.filter(event=>event.type==='tool.execution_start');
  const completed=call=>events.find(event=>event.type==='tool.execution_complete' && event.data?.toolCallId===call?.data.toolCallId);
  const activation=starts.find(event=>event.data.toolName==='skill' && event.data.arguments?.skill==='bfs-health');assert.ok(activation,'Missing native skill activation');assert.equal(completed(activation)?.data.success,true);
  const read=starts.find(event=>event.data.toolName==='bfs-core' && event.data.arguments?.args?.join(' ')==='read bfs-health');
  assert.ok(read,'Missing actual installed BFS skill read');assert.equal(completed(read)?.data.success,true);
  const readResult=JSON.parse(completed(read).data.result.contents.find(item=>item.type==='text').text);
  assert.match(readResult.host,/GitHub Copilot CLI/);
  assert.ok(starts.some(event=>event.data.toolName==='bfs-core' && event.data.arguments?.args?.join(' ')==='preferences effective'));
  const statusCall=starts.find(event=>event.data.toolName==='bfs-status');assert.ok(statusCall);
  const status=JSON.parse(completed(statusCall).data.result.contents.find(item=>item.type==='text').text);
  assert.equal(status.host,'copilot-cli');assert.equal(status.hostWorkspace,project);assert.equal(status.sessionId,events.find(event=>event.type==='result')?.sessionId);
  assert.equal(status.engine.installed,true);assert.equal(status.engine.capabilities['design-detect'].ready,true);
  const check=starts.find(event=>event.data.toolName==='powershell' && /\bnode --test check\.test\.mjs$/.test(event.data.arguments?.command));assert.ok(check,'Missing actual project health command');
  assert.equal(completed(check)?.data.success,true);assert(/BFS_INSTALLED_HEALTH_OK/.test(JSON.stringify(completed(check))),'Missing health-check result marker');
  assert(/BFS_GUARD_OBSERVED/.test(JSON.stringify(completed(read))),'Missing guard observation');
  fs.writeFileSync(path.join(project,'result.json'),JSON.stringify({status:'passed',host:status.host,sessionId:status.sessionId,workspace:project,installedSource:setup.source,healthCheck:true,pinnedEngines:true,guardObserved:true},null,2)+'\n');
  writeAcceptanceEvidence(path.join(project,'result.json'));
});
