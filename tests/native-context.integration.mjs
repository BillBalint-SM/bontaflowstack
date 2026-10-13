import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {writeNativeEvidence,writeAcceptanceEvidence} from './fixtures/native-evidence.mjs';

for(const host of ['opencode','copilot'])test(`npm-installed ${host} saves memory and a paused workflow, restores drift in a new session and isolates another project`,{skip:process.env[`BFS_RUN_${host.toUpperCase()}_CONTEXT`]!=='1'},async()=>{
  const root=path.resolve(process.env[`BFS_${host.toUpperCase()}_SETUP_EVIDENCE`] || '');
  assert.equal(path.dirname(root),fs.realpathSync.native(os.tmpdir()));assert(path.basename(root).startsWith(`bfs-${host}-setup-`));
  const setup=JSON.parse(fs.readFileSync(path.join(root,'result.json'),'utf8'));assert.equal(setup.status,'passed');
  const evidence=fs.mkdtempSync(path.join(root,'context-')),project=path.join(evidence,'project'),other=path.join(evidence,'other-project');
  for(const directory of [project,other])fs.mkdirSync(directory);
  fs.writeFileSync(path.join(project,'README.md'),'# Context fixture\n\nDecision: the report format is CSV.\nPending: inspect the report format.\n');
  fs.writeFileSync(path.join(other,'README.md'),'# A separate project\n');
  const env={...process.env,LOCALAPPDATA:path.join(root,'LocalAppData'),...(host==='opencode'?{USERPROFILE:path.join(root,"User's $profile"),XDG_CONFIG_HOME:path.join(root,"User's $config")}:{USERPROFILE:path.join(root,'UserProfile'),COPILOT_HOME:path.join(root,"Copilot's $profile"),COPILOT_CACHE_HOME:path.join(root,'copilot-cache')})};
  for(const name of ['BFS_STATE_HOME','BFS_IMPECCABLE_COMMAND','NODE_TEST_CONTEXT','OPENCODE_CONFIG','OPENCODE_CONFIG_DIR'])delete env[name];
  const configFile=host==='opencode'?path.join(env.XDG_CONFIG_HOME,'opencode/opencode.jsonc'):path.join(env.COPILOT_HOME,'config.json'),original=fs.readFileSync(configFile,'utf8');
  const installedSource=host==='opencode'?path.dirname(fileURLToPath(JSON.parse(fs.readFileSync(path.join(env.XDG_CONFIG_HOME,'opencode/plugins/bontaflowstack.js'),'utf8').match(/from (".*");/)[1]))):setup.source;
  const hostContract=fs.readFileSync(path.join(installedSource,'HOST.md'),'utf8'),hostSha256=createHash('sha256').update(hostContract).digest('hex');
  const installedVersion=JSON.parse(fs.readFileSync(path.join(installedSource,'catalog.json'),'utf8')).version;
  // OpenCode #51241: removing bash can reject free-model requests; ask retains approval, with no shell use permitted by this test.
  if(host==='opencode')env.OPENCODE_CONFIG_CONTENT=JSON.stringify({agent:{build:{permission:{'*':'ask',skill:{'*':'deny','bfs-bontaflow-memory':'allow','bfs-save-context':'allow','bfs-load-context':'allow'},bfs_core:'allow',bfs_status:'allow',read:'allow',glob:'allow',grep:'allow',external_directory:{[root.replaceAll('\\','/')+'/*']:'allow'},bash:'ask',edit:'deny'}}}});
  const cli=host==='opencode'?(process.env.BFS_OPENCODE_CLI || path.join(process.env.APPDATA,'npm/node_modules/opencode-ai/bin/opencode.exe')):process.execPath;
  const baseArgs=host==='opencode'?['run','--agent','build','--model','opencode/longcat-2.5-preview-free','--format','json']:[process.env.BFS_COPILOT_CLI || path.join(process.env.APPDATA,'npm/node_modules/@github/copilot/npm-loader.js'),'--no-custom-instructions','--disable-builtin-mcps','--no-auto-update','--no-remote','--no-remote-export','--output-format','json','--add-dir',installedSource,'--allow-tool','bfs(core)','--allow-tool','bfs(status)','--deny-tool','shell','--deny-tool','write','-p'];
  const run=async(label,cwd,prompt)=>{
    const result=await new Promise((resolve,reject)=>{
      const child=spawn(cli,[...baseArgs,prompt],{cwd,env,windowsHide:true,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';
      const timer=setTimeout(()=>{writeNativeEvidence(path.join(evidence,`${label}.native-evidence.json`),{stdout,stderr,code:'timeout'});if(child.pid)spawn('taskkill.exe',['/pid',String(child.pid),'/t','/f'],{windowsHide:true,stdio:'ignore'});reject(new Error(`Native context ${label} timed out`));},240000);
      child.stdout.on('data',data=>stdout+=String(data));child.stderr.on('data',data=>stderr+=String(data));child.on('error',error=>{clearTimeout(timer);reject(error);});child.on('close',code=>{clearTimeout(timer);resolve({code,stdout,stderr});});
    });
    const diagnostic=writeNativeEvidence(path.join(evidence,`${label}.native-evidence.json`),result);assert.equal(result.code,0,JSON.stringify(diagnostic));
    const events=result.stdout.trim().split('\n').map(JSON.parse);
    const calls=host==='opencode'?events.filter(event=>event.type==='tool_use').map(event=>({tool:event.part.tool,input:event.part.state.input,output:event.part.state.output,success:event.part.state.status==='completed'})):events.filter(event=>event.type==='tool.execution_start').map(event=>{
      const completed=events.find(item=>item.type==='tool.execution_complete' && item.data?.toolCallId===event.data.toolCallId);
      return {tool:event.data.toolName.replace(/^bfs-/,'bfs_'),input:event.data.toolName==='skill'?{name:event.data.arguments.skill}:event.data.arguments,output:completed?.data.result?.contents?.find(item=>item.type==='text')?.text,success:completed?.data.success===true};
    });
    const failedTools=calls.filter(call=>!call.success).map(call=>({tool:call.tool,args:call.input?.args}));
    const find=(tool,args)=>calls.find(call=>call.tool===tool && (!args || call.input?.args?.join(' ')===args));
    const value=call=>{assert.equal(call?.success,true);return JSON.parse(call.output.split('\nBFS_GUARD_OBSERVED')[0]);};
    const firstRead=value(calls.find(call=>call.tool==='bfs_core' && call.input?.args?.[0]==='read'));assert.equal(firstRead.hostSha256,hostSha256);assert.equal(firstRead.host,hostContract);
    const status=value(find('bfs_status'));assert.equal(status.host,`${host}-cli`);assert.equal(status.hostWorkspace,cwd);assert.equal(status.sessionId,host==='opencode'?events.find(event=>event.type==='tool_use')?.sessionID:events.find(event=>event.type==='result')?.sessionId);
    assert.equal(calls.some(call=>['bash','powershell','edit','write','apply_patch','create'].includes(call.tool)),false,'Unexpected file or shell operation');
    assert.equal(fs.readFileSync(configFile,'utf8'),original);
    console.log(`${host} ${label}: native tools and session verified`);
    return {calls,find,value,status,failedTools};
  };
  const protocol='Activate each requested skill using the native skill tool and follow its HOST/read and preferences protocol. Use native BFS MCP tools for memory/workflow operations. Do not edit project files, run commands, install anything or invent _bfsCall. If a command is unknown, consult the shipped help/reference before correcting it; report the error. Stop on permission or binding errors. Call the BFS status tool once. ';
  const checkpointFrom=(result,id)=>{
    for(const call of result.calls.filter(call=>call.tool==='bfs_core' && ['workflow resume','workflow checkpoints'].includes(call.input?.args?.join(' ')))) {
      const value=result.value(call),snapshot=Array.isArray(value)?value.find(row=>row.id===id):value;
      if(snapshot?.id===id)return snapshot;
    }
    assert.fail('Saved checkpoint was not read back');
  };
  console.log(`Native ${host} context evidence: ${evidence}`);
  const saved=await run('save',project,protocol+'Read README.md. Use bfs-bontaflow-memory in write mode to record the report format decision with key report-format and its actual README source, then verify it by reading it back. Start a workflow with goal "Inspect the report format" and one bfs-health step; begin step 1 with README.md as input, but do not perform or complete the health check. I am pausing this work now: use bfs-save-context in pause mode to save that workflow with the observed decision, README.md fingerprint and next action "Inspect the report format". Read back the saved checkpoint, report its ID and stop.');
  for(const skill of ['bfs-bontaflow-memory','bfs-save-context'])assert(saved.calls.some(call=>call.tool==='skill' && call.input?.name===skill));
  const memory=saved.value(saved.find('bfs_core','memory put'));assert.equal(memory.key,'report-format');assert.equal(memory.kind,'decision');assert.match(memory.text,/CSV/);assert.equal(memory.source,'observed');assert(memory.sourceRef);assert(memory.fileFingerprints.some(file=>file.path==='README.md'));
  const readBack=saved.calls.find(call=>call.tool==='bfs_core' && ['memory list','memory search','memory history'].includes(call.input?.args?.join(' ')));
  assert(saved.value(readBack).some(row=>row.id===memory.id));
  const paused=saved.value(saved.find('bfs_core','workflow pause'));assert.equal(paused.status,'paused');assert.equal(paused.taskId,saved.status.taskId);assert.equal(paused.steps[0].status,'interrupted');
  const checkpoint=checkpointFrom(saved,paused.checkpointId);assert.equal(checkpoint.id,paused.checkpointId);assert.equal(checkpoint.workflowId,paused.id);assert(checkpoint.files.some(file=>file.path==='README.md'));
  const checkpointBytes=fs.readFileSync(checkpoint.file),memoryBytes=fs.readFileSync(memory.file);
  fs.appendFileSync(path.join(project,'README.md'),'\nUpdated after pause: verify the delimiter as well.\n');
  const restored=await run('resume',project,protocol+`Use bfs-load-context in resume mode for workflow ${paused.id}. Inspect its saved checkpoint and the current README.md, report drift and the next action. I authorize adopting this paused workflow into this session, but stop immediately after adoption without beginning or completing a step. Use bfs-bontaflow-memory in read mode to retrieve the report-format decision. Do not change that memory record. Report actual results.`);
  assert.notEqual(restored.status.sessionId,saved.status.sessionId);assert.notEqual(restored.status.taskId,saved.status.taskId);
  for(const skill of ['bfs-load-context','bfs-bontaflow-memory'])assert(restored.calls.some(call=>call.tool==='skill' && call.input?.name===skill));
  const resume=restored.value(restored.calls.find(call=>call.tool==='bfs_core' && call.input?.args?.join(' ')==='workflow resume' && call.input?.input?.id===paused.id));assert.equal(resume.id,paused.id);assert.equal(resume.requiresAdoption,true);assert(resume.drift.some(file=>file.path==='README.md'));
  assert.equal(checkpointFrom(restored,paused.checkpointId).id,paused.checkpointId);
  const adopted=restored.value(restored.find('bfs_core','workflow adopt'));assert.equal(adopted.taskId,restored.status.taskId);assert.equal(adopted.id,paused.id);assert.equal(adopted.steps[0].status,'interrupted');assert.equal(adopted.status,'running');
  const recalled=restored.calls.find(call=>call.tool==='bfs_core' && ['memory list','memory search','memory history'].includes(call.input?.args?.join(' ')));assert(restored.value(recalled).some(row=>row.id===memory.id));
  assert.deepEqual(fs.readFileSync(checkpoint.file),checkpointBytes);assert.deepEqual(fs.readFileSync(memory.file),memoryBytes);
  const isolated=await run('isolation',other,protocol+'Use bfs-bontaflow-memory in read mode to list current project memory. Use bfs-save-context in list mode to list checkpoints, following its command reference, and list the current project workflows too. Report whether any exist. This is read-only; do not create records.');
  assert(isolated.calls.some(call=>call.tool==='skill' && call.input?.name==='bfs-save-context'));
  assert.notEqual(isolated.status.sessionId,restored.status.sessionId);
  assert.deepEqual(isolated.value(isolated.find('bfs_core','memory list')),[]);assert.deepEqual(isolated.value(isolated.find('bfs_core','workflow list')),[]);assert.deepEqual(isolated.value(isolated.find('bfs_core','workflow checkpoints')),[]);
  assert.deepEqual(fs.readFileSync(checkpoint.file),checkpointBytes);assert.deepEqual(fs.readFileSync(memory.file),memoryBytes);
  fs.writeFileSync(path.join(evidence,'result.json'),JSON.stringify({status:'passed',host:`${host}-cli`,installedSource,installedVersion,hostSha256,project,otherProject:other,sessionIds:[saved.status.sessionId,restored.status.sessionId,isolated.status.sessionId],memoryId:memory.id,workflowId:paused.id,checkpointId:paused.checkpointId,driftDetected:true,ownershipAdopted:true,checkpointPreserved:true,memoryPreserved:true,otherProjectIsolated:true,configPreserved:true,failedTools:{save:saved.failedTools,resume:restored.failedTools,isolation:isolated.failedTools}},null,2)+'\n');
  writeAcceptanceEvidence(path.join(evidence,'result.json'));
});
