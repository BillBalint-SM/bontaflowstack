import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {PassThrough} from 'node:stream';
import {randomUUID} from 'node:crypto';
import {context,digest} from '../plugins/bontaflowstack/core/state.mjs';
import {engines} from '../plugins/bontaflowstack/core/engines.mjs';
import {validateBrowserRequest,validateRenderRequest,serveBrowserHost} from '../plugins/bontaflowstack/core/browser-host.mjs';
const cwd=process.cwd();
test('host browser rejects output escapes, including inside batches',()=>{
  for(const args of [['screenshot','../escape.png'],['pdf','../escape.pdf'],['responsive','../escape']])assert.throws(()=>validateBrowserRequest(cwd,{args}),/inside/);
  assert.throws(()=>validateBrowserRequest(cwd,{args:['chain'],stdin:JSON.stringify([['screenshot','../escape.png']])}),/inside/);
  assert.throws(()=>validateBrowserRequest(cwd,{args:['chain'],stdin:JSON.stringify([['chain']])}),/Nested/);
  assert.throws(()=>validateBrowserRequest(cwd,{args:['screenshot'],workspace:'C:/'}),/Unknown/);
});
test('host browser accepts project captures and rejects direct local-file navigation',()=>{
  validateBrowserRequest(cwd,{args:['screenshot','capture.png','--selector','#selected']});
  validateBrowserRequest(cwd,{args:['goto','https://example.test/']});
  assert.throws(()=>validateBrowserRequest(cwd,{args:['goto','file:///C:/Windows/win.ini']}),/HTTP/);
  assert.throws(()=>validateBrowserRequest(cwd,{args:['eval','../outside.js']}),/inside/);
  assert.throws(()=>validateBrowserRequest(cwd,{args:['upload','input','../outside.txt']}),/inside/);
});
test('renderer confines all requested file paths to the host project',()=>{
  validateRenderRequest(cwd,{args:['README.md','--screenshot','page.png','--width','375']});
  assert.throws(()=>validateRenderRequest(cwd,{args:['../outside.html','--screenshot','page.png']}),/inside/);
  assert.throws(()=>validateRenderRequest(cwd,{args:['README.md','--pdf','../page.pdf']}),/inside/);
  assert.throws(()=>validateRenderRequest(cwd,{args:['README.md','--unsupported','value']}),/Unknown/);
  assert.equal(fs.existsSync(path.resolve(cwd,'../escape.png')),false);
});

test('stdio connection requires host identity, binds its owner and reports missing engines',async()=>{
  const input=new PassThrough(),output=new PassThrough();let transcript='';
  output.on('data',chunk=>transcript+=chunk);
  const previous=process.env.BFS_STATE_HOME;
  const state=path.resolve('.tmp/browser-host-protocol-absent');
  assert.equal(fs.existsSync(state),false);process.env.BFS_STATE_HOME=state;
  try {
    const running=serveBrowserHost(input,output);
    const requests=[
      {id:1,method:'initialize',params:{protocolVersion:'2024-11-05'}},
      {id:2,method:'tools/list'},
      {id:3,method:'tools/call',params:{name:'status',arguments:{}}},
      {id:4,method:'tools/call',params:{name:'status',arguments:{},_meta:{threadId:'task-A'}}},
      {id:5,method:'tools/call',params:{name:'status',arguments:{},_meta:{threadId:'task-B'}}},
      {id:6,method:'tools/call',params:{name:'browser',arguments:{args:['--help']},_meta:{threadId:'task-A'}}}
    ];
    input.end(requests.map(request=>JSON.stringify({jsonrpc:'2.0',...request})).join('\n')+'\n');
    await running;
    const replies=transcript.trim().split('\n').map(line=>JSON.parse(line).result);
    assert.equal(replies[0].serverInfo.version,JSON.parse(fs.readFileSync('plugins/bontaflowstack/.codex-plugin/plugin.json','utf8')).version);
    assert.deepEqual(replies[1].tools.map(tool=>tool.name),['select_project','browser','render','status']);
    assert.equal(replies[2].isError,true);assert.match(replies[2].content[0].text,/identifier/);
    const status=JSON.parse(replies[3].content[0].text);assert.equal(status.taskId,'task-A');assert.equal(status.engine.installed,false);
    assert.equal(replies[4].isError,true);assert.match(replies[4].content[0].text,/another host thread/);
    assert.equal(replies[5].isError,true);assert.match(replies[5].content[0].text,/not installed/);
    assert.equal(fs.existsSync(state),false);
  } finally {if(previous===undefined)delete process.env.BFS_STATE_HOME;else process.env.BFS_STATE_HOME=previous;}
});

test('a successful browser command with undefined output remains successful on stdio',async()=>{
  const root=path.resolve('.tmp','browser-host-response-'+randomUUID()),state=path.join(root,'state');fs.mkdirSync(root,{recursive:true});
  const source="export const createBrowser=()=>({run:async()=>undefined,save:async()=>{},close:async()=>{}});";
  fs.writeFileSync(path.join(root,'host.mjs'),source);fs.writeFileSync(path.join(root,'LICENSE'),'test fixture');
  const manifest={schema:1,name:'bontaflowstack-engines',version:'0.0.1',platform:process.platform+'-'+process.arch,files:{'host.mjs':digest(source)},commands:{'browser-host':{resource:'host.mjs',requires:['LICENSE']}}};
  fs.writeFileSync(path.join(root,'engine.json'),JSON.stringify(manifest));
  engines(context(cwd,{...process.env,BFS_STATE_HOME:state}),'register',{root,sha256:digest(fs.readFileSync(path.join(root,'engine.json')))});
  const previous=process.env.BFS_STATE_HOME;process.env.BFS_STATE_HOME=state;
  const input=new PassThrough(),output=new PassThrough();let transcript='';output.on('data',chunk=>transcript+=chunk);
  try {
    const running=serveBrowserHost(input,output);
    input.end(JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'browser',arguments:{args:['js','void 0']},_meta:{threadId:'task-output'}}})+'\n');
    await running;const result=JSON.parse(transcript).result;
    assert.equal(result.isError,undefined);assert.equal(result.content[0].text,'null');
  } finally {if(previous===undefined)delete process.env.BFS_STATE_HOME;else process.env.BFS_STATE_HOME=previous;}
});

test('plugin cwd requires human project confirmation and preserves refusal and owner boundaries',async()=>{
  const project=path.resolve('.tmp','host-project-confirm-'+randomUUID());fs.mkdirSync(project,{recursive:true});
  const input=new PassThrough(),output=new PassThrough(),pending=new Map();let allow=false,confirmations=0;
  output.on('data',chunk=>{
    const message=JSON.parse(chunk);
    if(message.method==='elicitation/create') {
      confirmations++;assert.match(message.params.message,new RegExp(project.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
      input.write(JSON.stringify({jsonrpc:'2.0',id:message.id,result:{action:allow?'accept':'decline',content:{allow}}})+'\n');
    }else {pending.get(message.id)?.(message.result);pending.delete(message.id);}
  });
  const call=(id,name,args)=>new Promise(resolve=>{pending.set(id,resolve);input.write(JSON.stringify({jsonrpc:'2.0',id,method:'tools/call',params:{name,arguments:args,_meta:{threadId:'confirmed-owner'}}})+'\n');});
  const previous=process.cwd();process.chdir(path.resolve('plugins/bontaflowstack'));
  const running=serveBrowserHost(input,output);
  try {
    input.write(JSON.stringify({jsonrpc:'2.0',id:0,method:'initialize',params:{protocolVersion:'2025-06-18',capabilities:{elicitation:{form:{}}}}})+'\n');
    assert.equal(JSON.parse((await call(1,'status',{})).content[0].text).project,null);
    assert.equal((await call(2,'select_project',{path:project})).isError,true);
    assert.equal(JSON.parse((await call(3,'status',{})).content[0].text).project,null);
    allow=true;assert.equal(JSON.parse((await call(4,'select_project',{path:project})).content[0].text).project,project);
    assert.equal(JSON.parse((await call(5,'status',{})).content[0].text).project,project);
    assert.equal((await call(6,'select_project',{path:project})).isError,true);
    assert.equal(confirmations,2);
  }finally{input.end();await running;process.chdir(previous);}
});

test('host workspace binding works without forms and preserves project and owner boundaries',async()=>{
  const root=path.resolve('.tmp','host-workspace-'+randomUUID()),project=path.join(root,'project'),outside=path.resolve('.tmp','host-outside-'+randomUUID());
  fs.mkdirSync(project,{recursive:true});fs.mkdirSync(outside,{recursive:true});
  const input=new PassThrough(),output=new PassThrough(),pending=new Map();let forms=0;
  output.on('data',chunk=>{const reply=JSON.parse(chunk);if(reply.method){forms++;return;}pending.get(reply.id)?.(reply.result);pending.delete(reply.id);});
  const call=(id,name,args,hostRoot=root,thread='workspace-owner')=>new Promise(resolve=>{pending.set(id,resolve);input.write(JSON.stringify({jsonrpc:'2.0',id,method:'tools/call',params:{name,arguments:args,_meta:{threadId:thread,'codex/sandbox-state-meta':{sandboxCwd:hostRoot}}}})+'\n');});
  const previous=process.cwd();process.chdir(path.resolve('plugins/bontaflowstack'));
  const running=serveBrowserHost(input,output);
  try {
    const initialized=new Promise(resolve=>pending.set(0,resolve));
    input.write(JSON.stringify({jsonrpc:'2.0',id:0,method:'initialize',params:{protocolVersion:'2025-06-18',capabilities:{}}})+'\n');
    assert.deepEqual((await initialized).capabilities.experimental?.['codex/sandbox-state-meta'],{});
    assert.equal((await call(1,'select_project',{path:outside})).isError,true);
    assert.equal((await call(2,'select_project',{path:project,hostWorkspace:outside})).isError,true);
    const binding=JSON.parse((await call(3,'select_project',{path:project})).content[0].text);
    assert.equal(binding.project,project);assert.equal(binding.bindingSource,'host-workspace');
    const status=JSON.parse((await call(4,'status',{})).content[0].text);
    assert.equal(status.project,project);assert.equal(status.hostWorkspace,root);assert.match(status.runtimeSha256,/^[a-f0-9]{64}$/);
    assert.equal((await call(5,'status',{},outside)).isError,true);
    assert.equal((await call(6,'status',{},root,'other-owner')).isError,true);
    assert.equal((await call(7,'select_project',{path:root})).isError,true);
    assert.equal((await call(8,'browser',{args:['screenshot',path.join(outside,'escape.png')]})).isError,true);
    assert.equal(forms,0);assert.equal(fs.existsSync(path.join(outside,'escape.png')),false);
  }finally{input.end();await running;process.chdir(previous);}
});

test('host workspace auto binding accepts local file URI and rejects malformed host roots',async()=>{
  const root=path.resolve('.tmp','host-auto-'+randomUUID());fs.mkdirSync(root,{recursive:true});
  const previous=process.cwd();process.chdir(path.resolve('plugins/bontaflowstack'));
  try {
    for(const [value,expected] of [[new URL('file:///'+root.replaceAll('\\','/')).href,root],['relative',null],['file://remote/share',null]]) {
      const input=new PassThrough(),output=new PassThrough();let transcript='';output.on('data',chunk=>transcript+=chunk);
      const running=serveBrowserHost(input,output);
      input.end(JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'status',arguments:{},_meta:{threadId:'auto-owner','codex/sandbox-state-meta':{sandboxCwd:value}}}})+'\n');
      await running;const reply=JSON.parse(transcript).result;
      if(expected){assert.equal(reply.isError,undefined);const status=JSON.parse(reply.content[0].text);assert.equal(status.project,expected);assert.equal(status.bindingSource,'host-workspace');}
      else assert.equal(reply.isError,true);
    }
  }finally{process.chdir(previous);}
});
