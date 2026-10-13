import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {writeNativeEvidence,writeAcceptanceEvidence} from './fixtures/native-evidence.mjs';

test('npm-installed Copilot shares Git project memory while preserving worktree ownership after shell cwd changes',{skip:process.env.BFS_RUN_COPILOT_WORKTREES!=='1'},async()=>{
  const root=path.resolve(process.env.BFS_COPILOT_SETUP_EVIDENCE || '');assert.equal(path.dirname(root),fs.realpathSync.native(os.tmpdir()));assert.match(path.basename(root),/^bfs-copilot-setup-/);
  const setup=JSON.parse(fs.readFileSync(path.join(root,'result.json'),'utf8'));assert.equal(setup.status,'passed');
  const evidence=fs.mkdtempSync(path.join(root,'worktrees-')),main=path.join(evidence,'main worktree'),linked=path.join(evidence,'linked worktree'),outside=path.join(evidence,'unrelated directory');
  fs.mkdirSync(main);fs.mkdirSync(outside);
  const readme='# Worktree fixture\n\nDecision: the export format is CSV.\nPending: inspect the export format.\n';
  fs.writeFileSync(path.join(main,'README.md'),readme);fs.writeFileSync(path.join(main,'keep.txt'),'unrelated work');
  const git=(cwd,args)=>{const result=spawnSync('git',['-C',cwd,...args],{encoding:'utf8',windowsHide:true,timeout:15000});assert.equal(result.status,0,'Fixture Git command failed: '+args[0]);return result.stdout.trim();};
  git(main,['init']);git(main,['add','README.md','keep.txt']);
  git(main,['-c','user.name=BFS Test','-c','user.email=bfs@example.invalid','-c','commit.gpgsign=false','commit','-m','fixture']);
  git(main,['worktree','add','--detach',linked,'HEAD']);
  assert.equal(git(main,['rev-parse','--path-format=absolute','--git-common-dir']),git(linked,['rev-parse','--path-format=absolute','--git-common-dir']));
  const originalFiles=[main,linked].flatMap(directory=>['README.md','keep.txt'].map(name=>{const file=path.join(directory,name);return [file,fs.readFileSync(file)];}));
  const env={...process.env,LOCALAPPDATA:path.join(root,'LocalAppData'),USERPROFILE:path.join(root,'UserProfile'),COPILOT_HOME:path.join(root,"Copilot's $profile"),COPILOT_CACHE_HOME:path.join(root,'copilot-cache')};
  for(const key of ['BFS_STATE_HOME','BFS_IMPECCABLE_COMMAND','NODE_TEST_CONTEXT'])delete env[key];
  const configFile=path.join(env.COPILOT_HOME,'config.json'),config=fs.readFileSync(configFile),contract=fs.readFileSync(path.join(setup.source,'HOST.md'),'utf8');
  const version=JSON.parse(fs.readFileSync(path.join(setup.source,'catalog.json'),'utf8')).version,stateHome=JSON.parse(fs.readFileSync(path.join(setup.source,'install-state.json'),'utf8')).stateHome;
  const cli=process.env.BFS_COPILOT_CLI || path.join(process.env.APPDATA,'npm/node_modules/@github/copilot/npm-loader.js');
  const cwdCommand="Set-Location -LiteralPath '"+outside.replaceAll("'","''")+"'; (Get-Location).Path";
  const run=async(label,cwd,prompt,{resume,shell=false}={})=>{
    const args=[cli,'--no-custom-instructions','--disable-builtin-mcps','--no-auto-update','--no-remote','--no-remote-export','--output-format','json',
      '--add-dir',setup.source,'--add-dir',evidence,'--allow-tool','bfs(core)','--allow-tool','bfs(status)',shell?'--allow-tool':'--deny-tool','shell','--deny-tool','write','--excluded-tools','task','write_agent',...(resume?['--resume='+resume]:[]),'-p',prompt];
    const result=await new Promise((resolve,reject)=>{
      const child=spawn(process.execPath,args,{cwd,env,windowsHide:true,stdio:['ignore','pipe','pipe']});let stdout='',stderr='',timedOut=false;
      const timer=setTimeout(()=>{timedOut=true;if(child.pid)spawn('taskkill.exe',['/pid',String(child.pid),'/t','/f'],{windowsHide:true,stdio:'ignore'});},240000);
      child.stdout.on('data',data=>stdout+=String(data));child.stderr.on('data',data=>stderr+=String(data));child.on('error',error=>{clearTimeout(timer);reject(error);});child.on('close',code=>{clearTimeout(timer);resolve({code:timedOut?'timeout':code,stdout,stderr});});
    });
    const diagnostic=writeNativeEvidence(path.join(evidence,label+'.native-evidence.json'),result);assert.equal(result.code,0,'Native worktree phase failed: '+label);
    const events=result.stdout.split(/\r?\n/).filter(Boolean).map(JSON.parse),calls=events.filter(event=>event.type==='tool.execution_start');
    const done=call=>events.find(event=>event.type==='tool.execution_complete' && event.data?.toolCallId===call?.data.toolCallId);
    const find=(...args)=>calls.find(call=>call.data.toolName==='bfs-core' && call.data.arguments?.args?.join(' ')===args.join(' '));
    const value=call=>{assert.equal(done(call)?.data.success,true,'Native BFS operation failed: '+label);return JSON.parse(done(call).data.result.contents.find(item=>item.type==='text').text);};
    const status=calls.filter(call=>call.data.toolName==='bfs-status').map(value);assert(status.length);for(const item of status){assert.equal(item.hostWorkspace,cwd);assert.equal(item.sessionId,events.find(event=>event.type==='result')?.sessionId);}
    const read=calls.find(call=>call.data.toolName==='bfs-core' && call.data.arguments?.args?.[0]==='read');assert.equal(value(read).host,contract);assert(find('preferences','effective'));
    const shellCalls=calls.filter(call=>['powershell','bash'].includes(call.data.toolName));assert.equal(shellCalls.length,shell?1:0);if(shell){assert.equal(shellCalls[0].data.arguments.command,cwdCommand);assert(done(shellCalls[0])?.data.success);assert(JSON.stringify(done(shellCalls[0]).data.result).includes(outside.replaceAll('\\','\\\\')));assert(status.length>=2);assert(calls.findIndex(call=>call.data.toolName==='bfs-status')<calls.indexOf(shellCalls[0]));assert(calls.findLastIndex(call=>call.data.toolName==='bfs-status')>calls.indexOf(shellCalls[0]));}
    assert.equal(calls.some(call=>['create','edit','apply_patch','task','write_agent'].includes(call.data.toolName)),false);assert.deepEqual(fs.readFileSync(configFile),config);
    console.log('Copilot worktree phase verified: '+label);return {calls,done,find,value,status:status[0],diagnostic};
  };
  const protocol='Use the installed native BFS skills and MCP tools, following HOST/read and effective-preferences instructions. Never invent _bfsCall. Do not edit files, install, delegate, change configuration, commit or publish. Do not run any shell command except one explicitly given below. Stop on binding or permission errors. ';
  const pause='Start exactly one new workflow with goal "Inspect the export format" and one bfs-health/check step. Begin step 1 with README.md as input but do not perform or complete the check. Activate bfs-save-context in pause mode and pause only this new workflow with README.md as a checkpoint file, an honest summary that the check has not run, and next action "Inspect the export format". Read back this workflow and its saved checkpoint through BFS MCP, then stop.';
  const checkpoint=(result,id)=>result.calls.filter(call=>call.data.toolName==='bfs-core' && ['workflow resume','workflow checkpoints'].includes(call.data.arguments?.args?.join(' '))).flatMap(call=>result.value(call)).find(record=>record.id===id);
  const workflowFile=record=>path.join(stateHome,'projects',record.projectId,'workspaces',record.workspaceId,'workflows',record.id+'.json');
  console.log('Native Copilot worktree evidence: '+evidence);
  const saved=await run('main',main,protocol+'Call BFS status first. Activate bfs-bontaflow-memory in write mode. Read README.md, record its export format decision under key export-format with an observed source and README.md fingerprint, and read the record back. '+pause.replace('then stop.','Then run exactly this native PowerShell command to change the shell directory and print its location: '+cwdCommand+'. Call BFS status again afterward; do not start new work in that directory. Stop.'),{shell:true});
  const memory=saved.value(saved.find('memory','put'));assert.equal(memory.key,'export-format');assert.match(memory.text,/CSV/);assert(memory.fileFingerprints.some(file=>file.path==='README.md'));
  const mainWorkflow=saved.value(saved.find('workflow','pause'));assert.equal(mainWorkflow.status,'paused');assert.equal(mainWorkflow.workspace,main);assert.equal(mainWorkflow.taskId,saved.status.taskId);
  const mainCheckpoint=checkpoint(saved,mainWorkflow.checkpointId);assert(mainCheckpoint);assert(mainCheckpoint.files.some(file=>file.path==='README.md'));
  const mainBytes=fs.readFileSync(workflowFile(mainWorkflow)),checkpointBytes=fs.readFileSync(mainCheckpoint.file),memoryBytes=fs.readFileSync(memory.file);
  const other=await run('linked',linked,protocol+`Call BFS status. Activate bfs-bontaflow-memory in read mode and retrieve the export-format decision. Use bfs-load-context/resume to read workflow ${mainWorkflow.id} and its checkpoint ${mainCheckpoint.id}. This controlled negative acceptance probe explicitly requests one workflow adopt call for that foreign-worktree workflow with confirm="resume"; it must be rejected. After that expected refusal, do not retry or bypass it. `+pause);
  const recalled=other.value(other.find('memory','list') || other.find('memory','search') || other.find('memory','history'));assert(recalled.some(record=>record.id===memory.id));
  const restored=other.value(other.calls.find(call=>call.data.arguments?.args?.join(' ')==='workflow resume' && call.data.arguments.input?.id===mainWorkflow.id));assert.equal(restored.requiresAdoption,true);assert.equal(restored.workspace,main);assert(restored.environmentChanges.some(change=>change.key==='workspace' && change.current===linked));
  const denied=other.done(other.find('workflow','adopt'));assert.equal(denied?.data.success,false);assert(/Start a new workflow in this worktree/.test(JSON.stringify(denied.data.result || denied.data.error)));
  const otherWorkflow=other.value(other.find('workflow','pause'));assert.equal(otherWorkflow.status,'paused');assert.equal(otherWorkflow.workspace,linked);assert.equal(otherWorkflow.projectId,mainWorkflow.projectId);assert.notEqual(otherWorkflow.workspaceId,mainWorkflow.workspaceId);assert.notEqual(otherWorkflow.taskId,mainWorkflow.taskId);assert.notEqual(other.status.sessionId,saved.status.sessionId);
  const otherCheckpoint=checkpoint(other,otherWorkflow.checkpointId);assert(otherCheckpoint);assert.equal(otherCheckpoint.workspaceId,otherWorkflow.workspaceId);assert.equal(checkpoint(other,mainCheckpoint.id)?.id,mainCheckpoint.id);
  assert.deepEqual(fs.readFileSync(workflowFile(mainWorkflow)),mainBytes);assert.deepEqual(fs.readFileSync(mainCheckpoint.file),checkpointBytes);assert.deepEqual(fs.readFileSync(memory.file),memoryBytes);
  const otherBytes=fs.readFileSync(workflowFile(otherWorkflow)),otherCheckpointBytes=fs.readFileSync(otherCheckpoint.file);
  const returned=await run('main-resume',main,protocol+`Read-only verification: activate bfs-load-context/resume and read workflow ${mainWorkflow.id} and checkpoint ${mainCheckpoint.id}. Do not adopt, begin, pause or complete anything. List workflows and project memory through BFS MCP. Call BFS status and stop.`,{resume:saved.status.sessionId});
  assert.equal(returned.status.sessionId,saved.status.sessionId);assert.equal(returned.status.taskId,saved.status.taskId);
  const own=returned.value(returned.calls.find(call=>call.data.arguments?.args?.join(' ')==='workflow resume' && call.data.arguments.input?.id===mainWorkflow.id));assert.equal(own.requiresAdoption,false);assert.equal(own.status,'paused');assert.deepEqual(own.drift,[]);assert.deepEqual(own.environmentChanges,[]);
  assert.equal(checkpoint(returned,mainCheckpoint.id)?.id,mainCheckpoint.id);const listed=returned.value(returned.find('workflow','list'));assert(listed.some(row=>row.id===mainWorkflow.id));assert(listed.some(row=>row.id===otherWorkflow.id));assert(returned.value(returned.find('memory','list')).some(row=>row.id===memory.id));
  assert.deepEqual(fs.readFileSync(workflowFile(mainWorkflow)),mainBytes);assert.deepEqual(fs.readFileSync(workflowFile(otherWorkflow)),otherBytes);assert.deepEqual(fs.readFileSync(mainCheckpoint.file),checkpointBytes);assert.deepEqual(fs.readFileSync(otherCheckpoint.file),otherCheckpointBytes);assert.deepEqual(fs.readFileSync(memory.file),memoryBytes);
  for(const directory of [main,linked])assert.equal(git(directory,['status','--porcelain']), '');for(const [file,bytes] of originalFiles)assert.deepEqual(fs.readFileSync(file),bytes);assert.deepEqual(fs.readdirSync(outside),[]);
  fs.writeFileSync(path.join(evidence,'result.json'),JSON.stringify({status:'passed',host:'copilot-cli',version,hostSha256:createHash('sha256').update(contract).digest('hex'),projectId:mainWorkflow.projectId,workspaceIds:[mainWorkflow.workspaceId,otherWorkflow.workspaceId],sessionIds:[saved.status.sessionId,other.status.sessionId],workflowIds:[mainWorkflow.id,otherWorkflow.id],checkpointIds:[mainCheckpoint.id,otherCheckpoint.id],sharedMemory:true,separateWorkspaces:true,foreignAdoptionRefused:true,shellCwdChanged:true,hostWorkspacePreserved:true,sameSessionReturned:true,recordsPreserved:true,gitWorktreesClean:true,configPreserved:true,failedTools:Object.fromEntries([['main',saved],['linked',other],['main-resume',returned]].map(([label,result])=>[label,result.diagnostic.tools.filter(tool=>tool.status==='failed').map(tool=>tool.tool)]))},null,2)+'\n');
  writeAcceptanceEvidence(path.join(evidence,'result.json'));
});
