import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {writeNativeEvidence,writeAcceptanceEvidence} from './fixtures/native-evidence.mjs';

test('npm-installed Copilot runs BFS browser interaction, HTML rendering and Impeccable through native MCP',{skip:process.env.BFS_RUN_COPILOT_ENGINES!=='1'},async()=>{
  const root=path.resolve(process.env.BFS_COPILOT_SETUP_EVIDENCE || '');assert.equal(path.dirname(root),fs.realpathSync.native(os.tmpdir()));assert.match(path.basename(root),/^bfs-copilot-setup-/);
  const setup=JSON.parse(fs.readFileSync(path.join(root,'result.json'),'utf8'));assert.equal(setup.status,'passed');
  const project=fs.mkdtempSync(path.join(root,'engines-project-')),page=path.join(project,'page.html');
  const css='body { font-family: Inter, sans-serif; font-size:18px; margin:24px; background:#fafafa; color:#17243c } main{max-width:800px;margin:auto}button{padding:12px;background:#173fa5;color:white;border:0;border-radius:6px}button:focus-visible{outline:3px solid #c04f00;outline-offset:3px}';
  const html='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>BFS engine fixture</title><link rel="stylesheet" href="style.css"><main><h1>BFS engine fixture</h1><button id="action" onclick="document.querySelector(\'#result\').textContent=\'BFS_BROWSER_CLICK_OK\'">Choose offer</button><p id="result" aria-live="polite">Ready</p></main></html>';
  fs.writeFileSync(page,html);fs.writeFileSync(path.join(project,'style.css'),css);
  const stateHome=JSON.parse(fs.readFileSync(path.join(setup.source,'install-state.json'),'utf8')).stateHome,command=JSON.parse(fs.readFileSync(path.join(stateHome,'impeccable.json'),'utf8')).command;
  const preflight=spawnSync(command[0],[...command.slice(1),'detect','--json','--no-config','style.css'],{cwd:project,encoding:'utf8',windowsHide:true,timeout:15000});
  fs.writeFileSync(path.join(project,'impeccable-preflight.json'),JSON.stringify({code:preflight.status,stdout:preflight.stdout,stderr:preflight.stderr},null,2));
  assert.equal(preflight.status,2,preflight.stderr);assert.match(preflight.stdout,/overused-font/);
  const requests=[],server=http.createServer((request,response)=>{requests.push(request.url);const stylesheet=request.url==='/style.css';response.writeHead(200,{'content-type':stylesheet?'text/css':'text/html; charset=utf-8'});response.end(stylesheet?css:html);});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  try {
    const url=`http://127.0.0.1:${server.address().port}`;
    const env={...process.env,LOCALAPPDATA:path.join(root,'LocalAppData'),USERPROFILE:path.join(root,'UserProfile'),COPILOT_HOME:path.join(root,"Copilot's $profile"),COPILOT_CACHE_HOME:path.join(root,'copilot-cache')};
    for(const key of ['BFS_STATE_HOME','BFS_IMPECCABLE_COMMAND','NODE_TEST_CONTEXT'])delete env[key];
    const configFile=path.join(env.COPILOT_HOME,'config.json'),config=fs.readFileSync(configFile),hostContract=fs.readFileSync(path.join(setup.source,'HOST.md'),'utf8');
    const version=JSON.parse(fs.readFileSync(path.join(setup.source,'catalog.json'),'utf8')).version;
    const cli=process.env.BFS_COPILOT_CLI || path.join(process.env.APPDATA,'npm/node_modules/@github/copilot/npm-loader.js');
    const prompt=`Use the installed bfs-browse skill in browse mode; activate it with the native skill tool and follow its HOST/read and preferences protocol. Open ${url} through the BFS browser MCP, inspect a fresh snapshot, click Choose offer, and read back the resulting page text. Save browser.png. Also render the supplied page.html through BFS render at 1280x800 to desktop.png and 375x800 to narrow.png, and view both rendered images using the native image/file tool. Run the installed Impeccable detect operation on the page's style.css with JSON output and no config through BFS core, following the shipped command reference, and report its actual findings. Call BFS status and stop only your own BFS browser at the end. Do not modify page.html, style.css or configuration, run shell commands, install anything, use another browser, or start a visible handoff. Report any failed or unavailable operation honestly.`;
    const args=[cli,'--no-custom-instructions','--disable-builtin-mcps','--no-auto-update','--no-remote','--no-remote-export','--output-format','json','--add-dir',setup.source,
      ...['core','status','browser','render'].flatMap(tool=>['--allow-tool',`bfs(${tool})`]),'--deny-tool','shell','--deny-tool','write','-p',prompt];
    console.log(`Native Copilot engine evidence: ${project}`);
    const result=await new Promise((resolve,reject)=>{
      const child=spawn(process.execPath,args,{cwd:project,env,windowsHide:true,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';
      const timer=setTimeout(()=>{writeNativeEvidence(path.join(project,'native-evidence.json'),{stdout,stderr,code:'timeout'});if(child.pid)spawn('taskkill.exe',['/pid',String(child.pid),'/t','/f'],{windowsHide:true,stdio:'ignore'});reject(new Error('Native engine journey timed out'));},300000);
      child.stdout.on('data',data=>stdout+=String(data));child.stderr.on('data',data=>stderr+=String(data));child.on('error',error=>{clearTimeout(timer);reject(error);});child.on('close',code=>{clearTimeout(timer);resolve({code,stdout,stderr});});
    });
    const diagnostic=writeNativeEvidence(path.join(project,'native-evidence.json'),result);assert.equal(result.code,0,JSON.stringify(diagnostic));
    const events=result.stdout.trim().split('\n').map(JSON.parse),calls=events.filter(event=>event.type==='tool.execution_start');
    const completed=call=>events.find(event=>event.type==='tool.execution_complete' && event.data?.toolCallId===call?.data.toolCallId);
    const find=(tool,action)=>calls.find(event=>event.data.toolName===tool && (!action || event.data.arguments?.args?.[0]===action));
    const value=call=>{const done=completed(call);assert.equal(done?.data.success,true,JSON.stringify(diagnostic));return JSON.parse(done.data.result.contents.find(item=>item.type==='text').text);};
    assert(calls.some(event=>event.data.toolName==='skill' && event.data.arguments?.skill==='bfs-browse'));
    const read=value(find('bfs-core','read'));assert.equal(read.host,hostContract);
    const status=value(find('bfs-status'));assert.equal(status.host,'copilot-cli');assert.equal(status.hostWorkspace,project);assert.equal(status.chromiumSandbox,true);assert.equal(status.sessionId,events.find(event=>event.type==='result')?.sessionId);
    assert.equal(find('bfs-browser','goto')?.data.arguments?.args?.[1],url);assert(requests.length>0);
    assert(completed(find('bfs-browser','snapshot'))?.data.success);assert(completed(find('bfs-browser','click'))?.data.success);
    const observed=calls.filter(event=>event.data.toolName==='bfs-browser' && ['text','snapshot'].includes(event.data.arguments?.args?.[0])).map(completed);assert(observed.some(event=>event?.data.success && JSON.stringify(event.data.result).includes('BFS_BROWSER_CLICK_OK')));
    for(const [file,width,height] of [['desktop.png',1280,800],['narrow.png',375,800]]) {
      const png=fs.readFileSync(path.join(project,file));assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(png.readUInt32BE(16),width);assert.equal(png.readUInt32BE(20),height);
      assert(calls.some(event=>event.data.toolName==='bfs-render' && event.data.arguments.args.some(arg=>String(arg).endsWith(file)) && completed(event)?.data.success));
      assert(calls.some(event=>event.data.toolName==='view' && String(event.data.arguments?.path).endsWith(file) && completed(event)?.data.success && completed(event).data.result?.binaryResultsForLlm?.some(item=>item.type==='image' && item.mimeType==='image/png')),'Rendered image was not delivered to the model');
    }
    assert.equal(fs.readFileSync(path.join(project,'browser.png')).subarray(0,8).toString('hex'),'89504e470d0a1a0a');
    const design=calls.find(event=>event.data.toolName==='bfs-core' && event.data.arguments?.args?.slice(0,2).join(' ')==='engine design-detect');
    const detection=value(design);assert.equal(detection.status,'completed');assert.equal(detection.exitCode,2);assert.match(detection.stdout,/overused-font/);
    assert.equal(value(find('bfs-browser','stop')).status,'stopped');
    assert.equal(calls.some(event=>['powershell','bash','create','edit'].includes(event.data.toolName)),false);
    assert.equal(fs.readFileSync(page,'utf8'),html);assert.equal(fs.readFileSync(path.join(project,'style.css'),'utf8'),css);assert.deepEqual(fs.readFileSync(configFile),config);
    const failedTools=events.filter(event=>event.type==='tool.execution_complete' && !event.data.success).map(event=>({tool:calls.find(call=>call.data.toolCallId===event.data.toolCallId)?.data.toolName,code:event.data.error?.code}));
    fs.writeFileSync(path.join(project,'result.json'),JSON.stringify({status:'passed',host:'copilot-cli',version,installedSource:setup.source,hostSha256:createHash('sha256').update(hostContract).digest('hex'),sessionId:status.sessionId,project,browserInteraction:true,sandbox:true,renderedSizes:[[1280,800],[375,800]],imagesViewed:true,impeccable:true,ownBrowserStopped:true,configPreserved:true,failedTools},null,2)+'\n');
    writeAcceptanceEvidence(path.join(project,'result.json'));
  }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
