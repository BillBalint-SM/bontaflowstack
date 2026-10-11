import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {context,canonical,within,noLinks,requireValue,identifier,digest} from './state.mjs';
import {engines} from './engines.mjs';

function scopedFile(cwd,value) {
  requireValue(typeof value==='string' && value.trim() && !value.includes('\0'),'A project file path is required');
  const file=path.resolve(cwd,value);noLinks(file);
  requireValue(within(canonical(cwd),canonical(file)),'Browser file must stay inside the host-selected project');
  return file;
}
function webTarget(value) {
  const url=new URL(value);
  requireValue(['http:','https:'].includes(url.protocol) || value==='about:blank','Host browser navigation accepts HTTP(S) or about:blank; use render for project HTML');
  requireValue(!url.username && !url.password,'Use visible browser login instead of URL credentials');
}
function argumentsOnly(input) {
  requireValue(input && typeof input==='object' && !Array.isArray(input),'Expected tool arguments');
  requireValue(Object.keys(input).every(k=>['args','stdin'].includes(k)),'Unknown tool argument');
  requireValue(Array.isArray(input.args) && input.args.length>0 && input.args.length<=100 && input.args.every(a=>typeof a==='string' && !a.includes('\0')),'Expected 1..100 command arguments');
  requireValue(input.stdin===undefined || typeof input.stdin==='string','stdin must be text');
}
export function validateBrowserRequest(cwd,input) {
  argumentsOnly(input);
  const [action,...rest]=input.args;
  if(['goto','newtab','connect'].includes(action) && rest[0])webTarget(rest[0]);
  if(action==='diff')rest.forEach(webTarget);
  if(action==='eval')scopedFile(cwd,rest[0]);
  if(action==='upload')rest.slice(1).forEach(file=>scopedFile(cwd,file));
  if(action==='pdf')scopedFile(cwd,rest[0] || 'page.pdf');
  if(action==='responsive')scopedFile(cwd,`${rest[0] || 'responsive'}-375.png`);
  if(action==='screenshot') {
    const selector=rest.indexOf('--selector');
    const file=rest.find((v,i)=>!v.startsWith('--') && (selector<0 || i!==selector+1)) || 'screenshot.png';
    scopedFile(cwd,file);
  }
  if(action==='chain') {
    const commands=JSON.parse(input.stdin);
    requireValue(Array.isArray(commands) && commands.length<=50,'Use at most 50 browser commands');
    for(const args of commands) {
      requireValue(Array.isArray(args) && !['chain','stop'].includes(args[0]),'Nested chains and stop are not supported in a batch');
      validateBrowserRequest(cwd,{args});
    }
  }
}
export function validateRenderRequest(cwd,input) {
  argumentsOnly(input);const {args}=input;
  if(args.includes('--help'))return;
  const values={},rest=[];
  for(let i=0;i<args.length;i++) {
    if(!args[i].startsWith('--')){rest.push(args[i]);continue;}
    const key=args[i].slice(2);
    requireValue(['screenshot','pdf','width','height'].includes(key),'Unknown render option');
    requireValue(args[i+1] && !args[i+1].startsWith('--'),'Render option requires a value');
    values[key]=args[++i];
  }
  requireValue(rest.length===1,'Provide one project HTML file or HTTP(S) URL');
  if(/^https?:/.test(rest[0]))webTarget(rest[0]);else scopedFile(cwd,rest[0]);
  scopedFile(cwd,values.screenshot || 'render.png');
  if(values.pdf)scopedFile(cwd,values.pdf);
}

const schema={type:'object',properties:{args:{type:'array',items:{type:'string'},minItems:1,maxItems:100},stdin:{type:'string'}},required:['args'],additionalProperties:false};
const hostStateKey='codex/sandbox-state-meta';
function hostProject(request) {
  const value=request.params?._meta?.[hostStateKey]?.sandboxCwd;
  if(value===undefined)return null;
  requireValue(typeof value==='string','Invalid host workspace');
  let directory=value;
  if(value.startsWith('file:')) {
    const url=new URL(value);requireValue(!url.hostname,'Host workspace must be a local directory');directory=fileURLToPath(url);
  }
  requireValue(path.isAbsolute(directory),'Host workspace must be absolute');noLinks(directory);
  const root=canonical(directory);requireValue(fs.statSync(root).isDirectory(),'Host workspace must be a directory');return root;
}
const tools=[
  {name:'select_project',description:'Bind this connection to the host-selected workspace or a directory inside it. Outside that workspace, require human confirmation through the host. Cannot change a bound project.',inputSchema:{type:'object',properties:{path:{type:'string'}},required:['path'],additionalProperties:false}},
  {name:'browser',description:'Use the task-owned BFS Chromium browser with its sandbox enabled. Call args:["--help"] for commands. The host supplies workspace and thread identity; outside directories require human confirmation. HTTP(S) navigation; project-only file inputs and outputs. Switching to visible mode reloads pages.',inputSchema:schema},
  {name:'render',description:'Render a host-selected project HTML file or HTTP(S) URL with sandboxed Chromium; save screenshot/PDF inside the project. Call args:["--help"] for syntax.',inputSchema:schema},
  {name:'status',description:'Inspect engine installation and this connection browser status. File readiness alone does not establish native browser launch.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true}}
];

export async function serveBrowserHost(input=process.stdin,output=process.stdout) {
  let owner=null,session=null,loaded=null,queue=Promise.resolve(),closing=false;
  const pluginRoot=fileURLToPath(new URL('..',import.meta.url));
  let project=canonical(process.cwd())===canonical(pluginRoot)?null:process.cwd(),approval=null,elicitation=false;
  const version=JSON.parse(fs.readFileSync(new URL('../.codex-plugin/plugin.json',import.meta.url),'utf8')).version;
  const runtimeSha256=digest(fs.readFileSync(fileURLToPath(import.meta.url)));
  let bindingSource=project?'process-cwd':null,workspace=null;
  const send=value=>output.write(JSON.stringify(value)+'\n');
  const bindOwner=request=>{
    const thread=identifier(request.params?._meta?.threadId);
    requireValue(!owner || owner===thread,'Browser connection belongs to another host thread');
    owner=thread;return thread;
  };
  const engine=async ctx=>{
    const resolved=engines(ctx,'browser-host');
    requireValue(!loaded || loaded.resource===resolved.resource,'Engine changed; reconnect the browser tool');
    if(!loaded)loaded={resource:resolved.resource,module:await import(pathToFileURL(resolved.resource).href)};
    return loaded.module;
  };
  const perform=async request=>{
    const thread=bindOwner(request),{name,arguments:args={}}=request.params;
    const hostState=request.params?._meta?.[hostStateKey];
    const hostPermissions={hostPermissionProfile:hostState?.permissionProfile ?? null,hostSandboxPolicy:hostState?.sandboxPolicy ?? null};
    const root=hostProject(request);
    requireValue(!workspace || !root || workspace===root,'Host workspace changed; reconnect the browser tool');
    if(root)workspace=root;
    if(name==='select_project') {
      requireValue(!project,'Project is already bound; reconnect to select another project');
      requireValue(args && Object.keys(args).length===1 && typeof args.path==='string' && path.isAbsolute(args.path),'Provide one absolute project path');
      noLinks(args.path);const selected=canonical(args.path);
      requireValue(fs.statSync(selected).isDirectory() && selected!==canonical(pluginRoot),'Select a project directory, not the plugin directory');
      if(root && within(root,selected)) {
        project=selected;bindingSource='host-workspace';return {project,taskId:thread,bindingSource,hostWorkspace:root};
      }
      requireValue(elicitation,'This host does not support project confirmation through MCP elicitation');
      const result=await new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>{approval=null;reject(new Error('Project confirmation timed out; project remains unbound'));},75000);
        approval={resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}};
        send({jsonrpc:'2.0',id:'bfs-project-confirm',method:'elicitation/create',params:{mode:'form',message:`Allow this BFS browser connection to read and write files inside ${selected}?`,requestedSchema:{type:'object',properties:{allow:{type:'boolean',title:'Allow this project directory'}},required:['allow']}}});
      });
      requireValue(result.action==='accept' && result.content?.allow===true,'Project was not approved; project remains unbound. If no form appeared, check the host MCP elicitation approval policy; do not bypass confirmation.');
      project=selected;bindingSource='human-form';return {project,taskId:thread,bindingSource};
    }
    if(!project && root && root!==canonical(pluginRoot)){project=root;bindingSource='host-workspace';}
    if(name==='status' && !project) {
      requireValue(Object.keys(args).length===0,'status takes no arguments');
      return {transport:'host-mcp',project:null,taskId:thread,browser:'stopped',version,runtimeSha256,hostWorkspace:workspace,elicitation,...hostPermissions};
    }
    requireValue(project,'Project is unbound; call select_project and confirm the directory in the host');
    const ctx=context(project,{...process.env,CODEX_THREAD_ID:thread});
    if(name==='status') {
      requireValue(Object.keys(args).length===0,'status takes no arguments');
      return {transport:'host-mcp',chromiumSandbox:true,project:ctx.cwd,taskId:ctx.taskId,engine:engines(ctx,'status'),browser:session?.context?'running':'stopped',version,runtimeSha256,bindingSource,hostWorkspace:workspace,...hostPermissions};
    }
    requireValue(['browser','render'].includes(name),'Unknown browser tool');
    (name==='browser'?validateBrowserRequest:validateRenderRequest)(ctx.cwd,args);
    const api=await engine(ctx);
    if(name==='render')return api.render(args.args,ctx.cwd);
    if(['--help','help'].includes(args.args[0]))return api.help;
    if(args.args[0]==='status')return {status:session?.context?'running':'stopped',visible:session?.visible || false,tabs:session?.pages().length || 0};
    if(args.args[0]==='stop') {
      await session?.close();session=null;return {status:'stopped'};
    }
    if(!session) {
      const folder=path.join(ctx.workspaceDir,'engine-sessions',ctx.taskId,'host-browser');
      noLinks(folder);fs.mkdirSync(folder,{recursive:true});session=api.createBrowser(folder);
    }
    const result=await session.run(args.args,ctx.cwd,args.stdin);
    await session.save();return result;
  };
  const dispatch=async request=>{
    if(request.id===undefined)return;
    try {
      let result;
      if(request.method==='initialize') {elicitation=Boolean(request.params?.capabilities?.elicitation);result={protocolVersion:['2024-11-05','2025-03-26','2025-06-18','2025-11-25'].includes(request.params?.protocolVersion)?request.params.protocolVersion:'2024-11-05',capabilities:{tools:{},experimental:{[hostStateKey]:{}}},serverInfo:{name:'bontaflowstack-browser',version:JSON.parse(fs.readFileSync(new URL('../.codex-plugin/plugin.json',import.meta.url),'utf8')).version},instructions:'Use the workspace supplied by host metadata. select_project may choose a directory inside it; an outside directory requires human confirmation. Host metadata supplies threadId; never invent one. Chromium sandbox stays on. File inputs and outputs stay inside the approved project. Read --help before unfamiliar commands. Stop only this task browser. Failed/timeout calls are not successful; inspect state before repeating writes.'};}
      else if(request.method==='ping')result={};
      else if(request.method==='tools/list')result={tools};
      else if(['resources/list','resources/templates/list'].includes(request.method))result=request.method==='resources/list'?{resources:[]}:{resourceTemplates:[]};
      else if(request.method==='tools/call') {
        try { const value=await perform(request),text=typeof value==='string'?value:JSON.stringify(value ?? null);requireValue(Buffer.byteLength(text)<=16*1024*1024,'Browser result exceeds 16 MiB; narrow the request');result={content:[{type:'text',text}]}; }
        catch(error){result={isError:true,content:[{type:'text',text:error.message}]};}
      } else {send({jsonrpc:'2.0',id:request.id,error:{code:-32601,message:'Method not found'}});return;}
      send({jsonrpc:'2.0',id:request.id,result});
    }catch(error){send({jsonrpc:'2.0',id:request.id,error:{code:-32603,message:error.message}});}
  };
  const lines=readline.createInterface({input,crlfDelay:Infinity});
  const close=async()=>{if(closing)return;closing=true;if(approval){approval.reject(new Error('Host disconnected before project confirmation'));approval=null;}await queue;await session?.close();session=null;};
  const onSignal=()=>{lines.close();input.destroy();close().catch(error=>process.stderr.write(error.message+'\n'));};
  process.once('SIGINT',onSignal);process.once('SIGTERM',onSignal);
  try {
    for await(const line of lines) {
      if(Buffer.byteLength(line)>1024*1024){send({jsonrpc:'2.0',id:null,error:{code:-32600,message:'Request exceeds 1 MiB'}});continue;}
      let request;try{request=JSON.parse(line);if(request?.jsonrpc==='2.0' && request.id==='bfs-project-confirm' && approval){const pending=approval;approval=null;request.error?pending.reject(new Error(request.error.message)):pending.resolve(request.result);continue;}requireValue(request?.jsonrpc==='2.0' && typeof request.method==='string','Invalid request');}
      catch{send({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Invalid JSON-RPC request'}});continue;}
      queue=queue.then(()=>dispatch(request));
    }
  } finally {await close();process.off('SIGINT',onSignal);process.off('SIGTERM',onSignal);}
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url))serveBrowserHost().catch(error=>{process.stderr.write(error.message+'\n');process.exitCode=1;});
