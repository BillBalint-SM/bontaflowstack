import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {writeNativeEvidence,writeCommandEvidence,writeAcceptanceEvidence} from './fixtures/native-evidence.mjs';

test('npm-installed OpenCode runs BFS browser interaction, renders images for the model and receives actual Impeccable findings',{skip:process.env.BFS_RUN_OPENCODE_ENGINES!=='1'},async()=>{
  const root=path.resolve(process.env.BFS_OPENCODE_SETUP_EVIDENCE || '');assert.equal(path.dirname(root),fs.realpathSync.native(os.tmpdir()));assert.match(path.basename(root),/^bfs-opencode-setup-/);
  const setup=JSON.parse(fs.readFileSync(path.join(root,'result.json'),'utf8'));assert.equal(setup.status,'passed');
  const project=fs.mkdtempSync(path.join(root,'engines-project-')),page=path.join(project,'page.html');
  const css='body { font-family: Inter, sans-serif; font-size:18px; margin:24px; background:#fafafa; color:#17243c } main{max-width:800px;margin:auto}button{padding:12px;background:#173fa5;color:white;border:0;border-radius:6px}button:focus-visible{outline:3px solid #c04f00;outline-offset:3px}';
  const html='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>BFS engine fixture</title><link rel="stylesheet" href="style.css"><main><h1>BFS engine fixture</h1><button id="action" onclick="document.querySelector(\'#result\').textContent=\'BFS_BROWSER_CLICK_OK\'">Choose offer</button><p id="result" aria-live="polite">Ready</p></main></html>';
  fs.writeFileSync(page,html);fs.writeFileSync(path.join(project,'style.css'),css);
  const env={...process.env,LOCALAPPDATA:path.join(root,'LocalAppData'),USERPROFILE:path.join(root,"User's $profile"),XDG_CONFIG_HOME:path.join(root,"User's $config")};
  if(process.platform!=='win32')Object.assign(env,{HOME:path.join(root,'Home'),XDG_DATA_HOME:path.join(root,'xdg-data'),XDG_STATE_HOME:path.join(root,'xdg-state')});
  for(const key of ['BFS_STATE_HOME','BFS_IMPECCABLE_COMMAND','NODE_TEST_CONTEXT','OPENCODE_CONFIG','OPENCODE_CONFIG_DIR'])delete env[key];
  // Approval remains required for shell; completely removing it triggers OpenCode's free-model issue #51241.
  env.OPENCODE_CONFIG_CONTENT=JSON.stringify({agent:{build:{permission:{'*':'ask',skill:{'*':'deny','bfs-browse':'allow'},bfs_core:'allow',bfs_status:'allow',bfs_browser:'allow',bfs_render:'allow',read:'allow',glob:'allow',grep:'allow',external_directory:{[root.replaceAll('\\','/')+'/*']:'allow'},bash:'ask',edit:'deny'}}}});
  const configFile=path.join(env.XDG_CONFIG_HOME,'opencode/opencode.jsonc'),config=fs.readFileSync(configFile);
  const installedSource=path.dirname(fileURLToPath(JSON.parse(fs.readFileSync(path.join(env.XDG_CONFIG_HOME,'opencode/plugins/bontaflowstack.js'),'utf8').match(/from (".*");/)[1])));
  const contract=fs.readFileSync(path.join(installedSource,'HOST.md'),'utf8'),version=JSON.parse(fs.readFileSync(path.join(installedSource,'catalog.json'),'utf8')).version;
  const stateHome=JSON.parse(fs.readFileSync(path.join(installedSource,'install-state.json'),'utf8')).stateHome,command=JSON.parse(fs.readFileSync(path.join(stateHome,'impeccable.json'),'utf8')).command;
  const preflight=spawnSync(command[0],[...command.slice(1),'detect','--json','--no-config','style.css'],{cwd:project,encoding:'utf8',windowsHide:true,timeout:15000});
  writeCommandEvidence(path.join(project,'impeccable-preflight.command-evidence.json'),preflight);assert.equal(preflight.status,2,'Fixture did not produce design findings');assert(/overused-font/.test(preflight.stdout));
  const requests=[],server=http.createServer((request,response)=>{requests.push(request.url);const stylesheet=request.url==='/style.css';response.writeHead(200,{'content-type':stylesheet?'text/css':'text/html; charset=utf-8'});response.end(stylesheet?css:html);});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  try {
    const url=`http://127.0.0.1:${server.address().port}`,model='opencode/longcat-2.5-preview-free';
    const cli=process.env.BFS_OPENCODE_CLI || path.join(process.env.APPDATA,'npm/node_modules/opencode-ai/bin/opencode.exe');
    const prompt=`Use the installed bfs-browse skill in browse mode; activate it with the native skill tool and follow its HOST/read and effective-preferences protocol. Open ${url} through BFS browser MCP, inspect a fresh snapshot, click Choose offer, and read back the resulting page text. Save browser.png. Render the supplied page.html through BFS render at 1280x800 to desktop.png and 375x800 to narrow.png. Read both rendered PNG files using the native read tool so their image attachments reach your model. Run the installed Impeccable through bfs_core with args ["engine","design-detect","--","detect","--json","--no-config","style.css"] and report its actual findings. Call BFS status and stop only your own BFS browser at the end. Do not modify page.html, style.css or configuration, run shell commands, delegate, install, use another browser, or start a visible handoff. Do not invent _bfsCall; stop on binding or permission errors. Report other failed operations honestly.`;
    console.log('Native OpenCode engine evidence: '+project);
    const result=await new Promise((resolve,reject)=>{
      const child=spawn(cli,['run','--dir',project,'--agent','build','--model',model,'--format','json',prompt],{cwd:project,env,windowsHide:true,detached:process.platform!=='win32',stdio:['ignore','pipe','pipe']});let stdout='',stderr='',timedOut=false;
      const timer=setTimeout(()=>{timedOut=true;if(child.pid){if(process.platform==='win32')spawn('taskkill.exe',['/pid',String(child.pid),'/t','/f'],{windowsHide:true,stdio:'ignore'});else try{process.kill(-child.pid,'SIGTERM');}catch(error){if(error.code!=='ESRCH')throw error;}}},300000);
      child.stdout.on('data',data=>stdout+=String(data));child.stderr.on('data',data=>stderr+=String(data));child.on('error',error=>{clearTimeout(timer);reject(error);});child.on('close',code=>{clearTimeout(timer);resolve({code:timedOut?'timeout':code,stdout,stderr});});
    });
    const diagnostic=writeNativeEvidence(path.join(project,'native-evidence.json'),result);assert.equal(result.code,0,JSON.stringify(diagnostic));
    const events=result.stdout.split(/\r?\n/).filter(Boolean).map(JSON.parse),calls=events.filter(event=>event.type==='tool_use');
    const find=(tool,...args)=>calls.find(call=>call.part.tool===tool && (!args.length || call.part.state.input?.args?.join(' ')===args.join(' ')));
    const output=call=>{assert.equal(call?.part.state.status,'completed','Native engine operation failed');return call.part.state.output.split('\nBFS_GUARD_OBSERVED')[0];};
    const value=call=>JSON.parse(output(call));
    assert(calls.some(call=>call.part.tool==='skill' && call.part.state.input?.name==='bfs-browse' && call.part.state.status==='completed'));
    assert.equal(value(find('bfs_core','read','bfs-browse')).host,contract);assert(find('bfs_core','preferences','effective')?.part.state.status==='completed');
    const status=value(find('bfs_status'));assert.equal(status.host,'opencode-cli');assert.equal(status.hostWorkspace,project);assert.equal(status.sessionId,find('bfs_status').sessionID);assert.equal(status.chromiumSandbox,true);
    assert.equal(find('bfs_browser','goto',url)?.part.state.status,'completed');assert(requests.length>0);
    assert(find('bfs_browser','snapshot')?.part.state.status==='completed');assert(calls.some(call=>call.part.tool==='bfs_browser' && call.part.state.input?.args?.[0]==='click' && call.part.state.status==='completed'));
    assert(calls.some(call=>call.part.tool==='bfs_browser' && ['text','snapshot'].includes(call.part.state.input?.args?.[0]) && call.part.state.status==='completed' && output(call).includes('BFS_BROWSER_CLICK_OK')));
    for(const [file,width,height] of [['desktop.png',1280,800],['narrow.png',375,800]]){
      const png=fs.readFileSync(path.join(project,file));assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(png.readUInt32BE(16),width);assert.equal(png.readUInt32BE(20),height);
      assert(calls.some(call=>call.part.tool==='bfs_render' && call.part.state.input.args.some(arg=>String(arg).endsWith(file)) && call.part.state.status==='completed'));
      const read=calls.find(call=>call.part.tool==='read' && path.resolve(call.part.state.input.filePath)===path.join(project,file) && call.part.state.status==='completed');
      assert(read?.part.state.attachments?.some(attachment=>attachment.type==='file' && attachment.mime==='image/png' && attachment.url==='data:image/png;base64,'+png.toString('base64')),'Actual rendered PNG was not attached to the native read result');
    }
    assert.equal(fs.readFileSync(path.join(project,'browser.png')).subarray(0,8).toString('hex'),'89504e470d0a1a0a');
    const detection=value(calls.find(call=>call.part.tool==='bfs_core' && call.part.state.input?.args?.slice(0,2).join(' ')==='engine design-detect'));assert.equal(detection.status,'completed');assert.equal(detection.exitCode,2);assert.match(detection.stdout,/overused-font/);
    assert.equal(value(find('bfs_browser','stop')).status,'stopped');assert.equal(calls.some(call=>['bash','edit','write','apply_patch','task','webfetch'].includes(call.part.tool)),false);
    assert.equal(fs.readFileSync(page,'utf8'),html);assert.equal(fs.readFileSync(path.join(project,'style.css'),'utf8'),css);assert.deepEqual(fs.readFileSync(configFile),config);
    const failedTools=calls.filter(call=>call.part.state.status==='error').map(call=>({tool:call.part.tool,args:call.part.state.input?.args}));
    fs.writeFileSync(path.join(project,'result.json'),JSON.stringify({status:'passed',host:'opencode-cli',model,version,hostSha256:createHash('sha256').update(contract).digest('hex'),sessionId:status.sessionId,browserInteraction:true,sandbox:true,renderedSizes:[[1280,800],[375,800]],imagesAttached:true,impeccable:true,ownBrowserStopped:true,configPreserved:true,failedTools},null,2)+'\n');
    writeAcceptanceEvidence(path.join(project,'result.json'));
  }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
