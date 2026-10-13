import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {writeNativeEvidence,writeAcceptanceEvidence} from './fixtures/native-evidence.mjs';

test('npm-installed Copilot closes only its own browser while another live session retains its page and session cookie',{skip:process.env.BFS_RUN_COPILOT_BROWSER_ISOLATION!=='1'},async t=>{
  const root=path.resolve(process.env.BFS_COPILOT_SETUP_EVIDENCE || '');assert.equal(path.dirname(root),fs.realpathSync.native(os.tmpdir()));assert.match(path.basename(root),/^bfs-copilot-setup-/);
  const setup=JSON.parse(fs.readFileSync(path.join(root,'result.json'),'utf8'));assert.equal(setup.status,'passed');
  const project=fs.mkdtempSync(path.join(root,'browser-isolation-'));
  fs.writeFileSync(path.join(project,'hold.mjs'),"import fs from 'node:fs';\nconst label=process.argv[2];if(!['alpha','beta'].includes(label))throw new Error('Unknown fixture hold');\nfs.writeFileSync(label+'.ready',String(process.pid));\nconst deadline=Date.now()+600000;while(!fs.existsSync(label+'.release')){if(Date.now()>deadline)throw new Error('Fixture hold expired');await new Promise(resolve=>setTimeout(resolve,100));}\nconsole.log('BFS_FIXTURE_RELEASED');\n");
  fs.writeFileSync(path.join(project,'keep.txt'),'unrelated work');
  const originalFiles=['hold.mjs','keep.txt'].map(name=>[name,fs.readFileSync(path.join(project,name))]);
  let alphaClosed=false;
  const requests=[],server=http.createServer((request,response)=>{
    const url=new URL(request.url,'http://localhost'),label=url.searchParams.get('owner'),cookie=request.headers.cookie?.match(/(?:^|;\s*)bfs_session=(alpha|beta)(?:;|$)/)?.[1] || 'missing';
    requests.push({path:url.pathname,label,cookie,alphaClosed});
    if(!['alpha','beta'].includes(label) || !['/start','/check'].includes(url.pathname)){response.writeHead(404);response.end();return;}
    response.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store',...(url.pathname==='/start'?{'set-cookie':`bfs_session=${label}; Path=/; HttpOnly; SameSite=Lax`}:{})});
    response.end(url.pathname==='/start'?`<!doctype html><html lang="en"><title>${label} browser fixture</title><h1>${label} browser fixture</h1><button onclick="document.querySelector('#result').textContent='BFS_DOM_${label}'">Mark page</button><p id="result">Ready</p></html>`:`<!doctype html><html lang="en"><title>Cookie check</title><p>BFS_COOKIE_${cookie}</p></html>`);
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const url=`http://127.0.0.1:${server.address().port}`;
  const env={...process.env,LOCALAPPDATA:path.join(root,'LocalAppData'),USERPROFILE:path.join(root,'UserProfile'),COPILOT_HOME:path.join(root,"Copilot's $profile"),COPILOT_CACHE_HOME:path.join(root,'copilot-cache')};
  for(const key of ['BFS_STATE_HOME','BFS_IMPECCABLE_COMMAND','NODE_TEST_CONTEXT'])delete env[key];
  const configFile=path.join(env.COPILOT_HOME,'config.json'),config=fs.readFileSync(configFile),contract=fs.readFileSync(path.join(setup.source,'HOST.md'),'utf8'),version=JSON.parse(fs.readFileSync(path.join(setup.source,'catalog.json'),'utf8')).version;
  const cli=process.env.BFS_COPILOT_CLI || path.join(process.env.APPDATA,'npm/node_modules/@github/copilot/npm-loader.js');
  const base=[cli,'--no-custom-instructions','--disable-builtin-mcps','--no-auto-update','--no-remote','--no-remote-export','--output-format','json','--add-dir',setup.source,...['core','status','browser'].flatMap(tool=>['--allow-tool',`bfs(${tool})`]),'--allow-tool','shell(node)','--deny-tool','write','--excluded-tools','task','write_agent'];
  const events=run=>run.stdout.split(/\r?\n/).filter(Boolean).flatMap(line=>{try{return [JSON.parse(line)];}catch{return [];}});
  const calls=run=>events(run).filter(event=>event.type==='tool.execution_start');
  const done=(run,call)=>events(run).find(event=>event.type==='tool.execution_complete' && event.data?.toolCallId===call?.data.toolCallId);
  const find=(run,tool,...args)=>calls(run).find(call=>call.data.toolName===tool && (!args.length || call.data.arguments?.args?.join(' ')===args.join(' ')));
  const content=(run,call)=>{const result=done(run,call);assert.equal(result?.data.success,true,'Native browser fixture operation failed');return result.data.result.contents.find(item=>item.type==='text').text;};
  const value=(run,call)=>JSON.parse(content(run,call));
  const runs=[];
  const kill=run=>{if(run.child.exitCode===null && run.child.signalCode===null){const result=spawnSync('taskkill.exe',['/pid',String(run.child.pid),'/t','/f'],{windowsHide:true,encoding:'utf8'});assert.equal(result.status,0,'Could not stop owned fixture process');}};
  t.after(async()=>{try{for(const run of runs)kill(run);await Promise.allSettled(runs.map(run=>run.finished));}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}});
  const launch=label=>{
    const prompt=`Activate the installed bfs-browse skill in browse mode and follow its HOST/read and effective-preferences protocol. Use only native BFS MCP for browser work. This is an isolated acceptance fixture; do not edit files, install, delegate, change configuration, open a visible browser or use another browser tool. Do not invent _bfsCall; stop on binding or permission errors. Open ${url}/start?owner=${label} once. Take a fresh snapshot, click Mark page and read back the resulting text. Call BFS status while your browser is running. Run exactly "node hold.mjs ${label}" using the native shell tool; wait for its actual completion, which the test controller will trigger. Do not stop your browser or finish early while it waits. After the hold completes, first call BFS status and read the current page text again WITHOUT navigating, reloading or clicking. Then visit ${url}/check?owner=${label} once, read its actual text and report the cookie marker. Do not return to /start or create another browser. Finally stop only your own BFS browser, call BFS status again to verify it is stopped, and finish.`;
    const child=spawn(process.execPath,[...base,'-p',prompt],{cwd:project,env,windowsHide:true,stdio:['ignore','pipe','pipe']}),run={label,child,stdout:'',stderr:''};runs.push(run);
    run.finished=new Promise((resolve,reject)=>{
      let timedOut=false;const timer=setTimeout(()=>{timedOut=true;kill(run);},660000);
      child.stdout.on('data',data=>run.stdout+=String(data));child.stderr.on('data',data=>run.stderr+=String(data));child.on('error',error=>{clearTimeout(timer);reject(error);});child.on('close',code=>{clearTimeout(timer);run.code=timedOut?'timeout':code;run.diagnostic=writeNativeEvidence(path.join(project,label+'.native-evidence.json'),run);resolve(run);});
    });run.finished.catch(()=>{});return run;
  };
  const ready=async run=>{
    const deadline=Date.now()+240000;
    while(!fs.existsSync(path.join(project,run.label+'.ready'))){assert(Date.now()<deadline,'Native browser hold did not start');assert.equal(run.child.exitCode,null,'Native session exited before hold');await new Promise(resolve=>setTimeout(resolve,100));}
    const status=value(run,calls(run).findLast(call=>call.data.toolName==='bfs-status' && done(run,call)?.data.success));assert.equal(status.browser,'running');assert.equal(status.chromiumSandbox,true);assert.equal(status.hostWorkspace,project);
    assert.equal(value(run,find(run,'bfs-core','read','bfs-browse')).host,contract);assert(find(run,'bfs-core','preferences','effective'));
    assert(calls(run).some(call=>call.data.toolName==='skill' && call.data.arguments?.skill==='bfs-browse' && done(run,call)?.data.success));
    assert(calls(run).some(call=>call.data.toolName==='bfs-browser' && call.data.arguments?.args?.[0]==='text' && content(run,call).includes('BFS_DOM_'+run.label)));
    return status;
  };
  console.log('Native Copilot browser isolation evidence: '+project);
  const alpha=launch('alpha'),beta=launch('beta'),[alphaStatus,betaStatus]=await Promise.all([ready(alpha),ready(beta)]);
  assert.notEqual(alphaStatus.sessionId,betaStatus.sessionId);assert.notEqual(alphaStatus.taskId,betaStatus.taskId);
  fs.writeFileSync(path.join(project,'alpha.release'),'release');await alpha.finished;assert.equal(alpha.code,0,'First native session failed');
  assert.equal(value(alpha,find(alpha,'bfs-browser','stop')).status,'stopped');assert.equal(value(alpha,calls(alpha).findLast(call=>call.data.toolName==='bfs-status')).browser,'stopped');
  alphaClosed=true;process.kill(beta.child.pid,0);assert.equal(beta.child.exitCode,null);assert.equal(calls(beta).some(call=>call.data.toolName==='bfs-browser' && call.data.arguments?.args?.[0]==='stop'),false);
  fs.writeFileSync(path.join(project,'beta.release'),'release');await beta.finished;assert.equal(beta.code,0,'Second native session failed');
  for(const run of runs){
    const all=calls(run),shell=all.filter(call=>['powershell','bash'].includes(call.data.toolName));assert.equal(shell.length,1);assert.equal(shell[0].data.arguments.command.trim(),'node hold.mjs '+run.label);assert(done(run,shell[0])?.data.success);
    const heldIndex=all.indexOf(shell[0]),afterHold=all.slice(heldIndex+1),statuses=afterHold.filter(call=>call.data.toolName==='bfs-status');assert(statuses.length>=2);assert.equal(value(run,statuses[0]).browser,'running');assert.equal(value(run,statuses.at(-1)).browser,'stopped');
    const check=afterHold.find(call=>call.data.toolName==='bfs-browser' && call.data.arguments?.args?.[0]==='goto');assert.equal(check?.data.arguments.args[1],`${url}/check?owner=${run.label}`);
    assert(afterHold.slice(0,afterHold.indexOf(check)).some(call=>call.data.toolName==='bfs-browser' && call.data.arguments?.args?.[0]==='text' && content(run,call).includes('BFS_DOM_'+run.label)));
    assert(afterHold.slice(afterHold.indexOf(check)+1).some(call=>call.data.toolName==='bfs-browser' && call.data.arguments?.args?.[0]==='text' && content(run,call).includes('BFS_COOKIE_'+run.label)));
    const browserCalls=all.filter(call=>call.data.toolName==='bfs-browser');assert.equal(browserCalls.filter(call=>call.data.arguments.args[0]==='goto').length,2);assert.equal(browserCalls.filter(call=>call.data.arguments.args[0]==='stop').length,1);assert(browserCalls.every(call=>['--help','help','goto','snapshot','click','text','status','tabs','stop'].includes(call.data.arguments.args[0])));
    assert.equal(all.some(call=>['create','edit','apply_patch','task','write_agent'].includes(call.data.toolName)),false);
    const status=value(run,find(run,'bfs-status'));assert.equal(status.sessionId,events(run).find(event=>event.type==='result')?.sessionId);
    assert(requests.some(request=>request.path==='/check' && request.label===run.label && request.cookie===run.label && request.alphaClosed===(run.label==='beta')));
  }
  for(const [name,bytes] of originalFiles)assert.deepEqual(fs.readFileSync(path.join(project,name)),bytes);assert.deepEqual(fs.readFileSync(configFile),config);
  fs.writeFileSync(path.join(project,'result.json'),JSON.stringify({status:'passed',host:'copilot-cli',version,hostSha256:createHash('sha256').update(contract).digest('hex'),sessionIds:[alphaStatus.sessionId,betaStatus.sessionId],taskIds:[alphaStatus.taskId,betaStatus.taskId],simultaneousBrowsers:true,firstClosedBeforeSecondContinued:true,otherPageMemoryPreserved:true,separateSessionCookies:true,bothOwnBrowsersStopped:true,sandbox:true,configPreserved:true,failedTools:Object.fromEntries(runs.map(run=>[run.label,run.diagnostic.tools.filter(tool=>tool.status==='failed').map(tool=>tool.tool)]))},null,2)+'\n');
  writeAcceptanceEvidence(path.join(project,'result.json'));
});
