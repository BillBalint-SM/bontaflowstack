import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';

// Explicit opt-in: this test uses an existing isolated setup result, never a model.
if(process.env.BFS_RUN_NATIVE_ENGINES==='1') {
  const log=fs.readFileSync(process.argv[2],'utf8');
  const record=log.split(/\r?\n/).filter(line=>line.startsWith('{')).map(line=>JSON.parse(line)).findLast(value=>value.status==='passed' && value.evidence);
  assert.ok(record,'A successful native npm setup result is required');
  const setup=JSON.parse(fs.readFileSync(record.evidence,'utf8'));
  assert.equal(setup.status,'passed');
  const engine=JSON.parse(fs.readFileSync(path.join(setup.stateHome,'engines.json'),'utf8')).root;
  const manifest=JSON.parse(fs.readFileSync(path.join(engine,'engine.json'),'utf8'));
  assert.equal(manifest.platform,`${process.platform}-${process.arch}`);
  const project=path.join(path.dirname(record.evidence),'engine project á with spaces');fs.mkdirSync(project);
  const {createBrowser,render}=await import(pathToFileURL(path.join(engine,'src/host-browser.mjs')));
  const server=http.createServer((req,res)=>{res.setHeader('content-type','text/html');res.end('<!doctype html><html lang="en"><title>Native engine</title><button onclick="this.textContent=\'Clicked\'">Choose</button></html>');});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${server.address().port}/`,browser=createBrowser(path.join(project,'session'));
  try {
    await browser.run(['goto',url],project);
    await browser.run(['click','button'],project);
    assert.match(await browser.run(['text'],project),/Clicked/);
    const cdp=await browser.browser.newBrowserCDPSession();
    const processes=await cdp.send('SystemInfo.getProcessInfo');
    const pid=processes.processInfo.find(item=>item.type==='browser')?.id;assert.ok(pid);
    const command=spawnSync('ps',['-p',String(pid),'-o','args='],{encoding:'utf8'});
    assert.equal(command.status,0,command.stderr);assert.match(command.stdout,/chrom(?:e|ium)/i);
    assert.equal(command.stdout.includes('--no-sandbox'),false);
    await cdp.detach();
    await browser.current.screenshot({path:path.join(project,'browser.png')});
    const rendered=await render([url,'--width','640','--height','480','--screenshot','render.png'],project);
    assert.equal(rendered.status,'completed');
    const png=fs.readFileSync(path.join(project,'render.png'));
    assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
    assert.equal(png.readUInt32BE(16),640);assert.equal(png.readUInt32BE(20),480);
    const output={status:'passed',platform:process.platform,arch:process.arch,engine:manifest.version,clickReadback:true,renderSize:[640,480],noSandboxFlagAbsent:true,scope:'standalone native engine; no model/MCP or human handoff'};
    fs.writeFileSync(path.join(project,'result.json'),JSON.stringify(output,null,2)+'\n');
    console.log(JSON.stringify(output));
  } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
} else console.log('SKIP: set BFS_RUN_NATIVE_ENGINES=1 and supply the isolated native npm setup log.');
