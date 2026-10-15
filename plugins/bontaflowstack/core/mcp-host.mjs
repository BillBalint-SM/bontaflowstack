import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import {pathToFileURL} from 'node:url';
import {context,canonical,noLinks,within,requireValue,object} from './state.mjs';
import {run} from './cli.mjs';
import {engines} from './engines.mjs';
import {validateBrowserRequest,validateRenderRequest} from './browser-host.mjs';
import {nativeTools} from './call-binding.mjs';

const binding={type:'string',description:'Reserved for the native BFS tool hook. Never invent or copy this value.'};
const commandArgs={type:'array',items:{type:'string'},minItems:1,maxItems:100};
const schema=(properties,required=[])=>({type:'object',properties:{...properties,_bfsCall:binding},required,additionalProperties:false});
export const tools=[
  {name:'core',description:'Run the BFS core in this native session, agent and workspace. args are the CLI command/action operands; input is the JSON request. Start with args:["help"] or ["read","bfs-router"].',inputSchema:schema({args:commandArgs,input:{type:'object'}},['args'])},
  {name:'status',description:'Inspect this native task browser and engine readiness without launching a browser.',inputSchema:schema({}),annotations:{readOnlyHint:true}},
  {name:'select_project',description:'Select this task browser project before its first operation. Directories outside the native workspace require a human confirmation form.',inputSchema:schema({path:{type:'string'}},['path'])},
  ...['browser','render'].map(name=>({name,description:`Use the sandboxed BFS ${name} engine in this native task. Read args:["--help"] first. Project-scoped input/output files; stop only owned resources.`,inputSchema:schema({args:commandArgs,stdin:{type:'string'}},['args'])}))
];

export function createNativeHost({env=process.env,confirmProject,consumeCall,hostId,toolPrefix=''}) {
  const owners=new Map();
  const owner=ctx=>{
    const key=`${ctx.workspaceId}:${ctx.taskId}`;
    if(!owners.has(key))owners.set(key,{ctx,project:null,browser:null,loaded:null});
    return owners.get(key);
  };
  async function call(name,input) {
    requireValue(nativeTools.includes(name),'Unknown BFS tool');
    const {ctx,args}=consumeCall(name,input,env);
    if(name==='core') {
      requireValue(Object.keys(args).every(key=>['args','input'].includes(key)),'Unknown core argument');
      requireValue(Array.isArray(args.args) && args.args.length>0 && args.args.length<=100 && args.args.every(value=>typeof value==='string' && !value.includes('\0')),'Provide 1..100 core arguments');
      requireValue(args.args[0]!=='hook' && !args.args.includes('--input'),'Native hooks and input files are not exposed through core; use the input object');
      requireValue(!(args.args[0]==='engine' && ['browser','browser-host','render'].includes(args.args[1])),'Use the native browser/render tools for browser operations');
      const result=run(args.args,{context:ctx,input:args.input===undefined?{}:object(args.input)});
      if(['help','--help'].includes(args.args[0])) {
        result.usage=`Call MCP ${toolPrefix}core with args:["command","action"] and input:{...}; use the ${toolPrefix}browser/${toolPrefix}render tools for browser operations.`;
        delete result.commands.hook;
        result.commands.engine=result.commands.engine.split('|').filter(action=>!['browser','browser-host','render'].includes(action)).join('|');
      }
      return result;
    }
    const current=owner(ctx);
    if(name==='select_project') {
      requireValue(Object.keys(args).length===1 && typeof args.path==='string' && path.isAbsolute(args.path),'Provide one absolute project path');
      requireValue(!current.project,'Project is already bound; use a new native task to select another project');
      noLinks(args.path);const selected=canonical(args.path);
      requireValue(fs.statSync(selected).isDirectory(),'Project must be a directory');
      if(!within(ctx.workspace,selected))requireValue(confirmProject && await confirmProject(selected),'Project was not approved; project remains unbound');
      current.project=selected;
      return {project:selected,taskId:ctx.taskId,hostWorkspace:ctx.workspace};
    }
    if(name==='status') {
      requireValue(Object.keys(args).length===0,'status takes no arguments');
      return {host:hostId,project:current.project ?? ctx.workspace,taskId:ctx.taskId,sessionId:ctx.sessionId,agentId:ctx.agentId,hostWorkspace:ctx.workspace,chromiumSandbox:true,browser:current.browser?.context?'running':'stopped',engine:engines(ctx,'status')};
    }
    current.project ??= ctx.workspace;
    const selected={...context(current.project,env),taskId:ctx.taskId};
    (name==='browser'?validateBrowserRequest:validateRenderRequest)(selected.cwd,args);
    if(name==='browser' && args.args[0]==='stop') {await current.browser?.close();current.browser=null;return {status:'stopped'};}
    if(name==='browser' && args.args[0]==='status')return {status:current.browser?.context?'running':'stopped',visible:current.browser?.visible || false,tabs:current.browser?.pages().length || 0};
    const resolved=engines(selected,'browser-host');
    requireValue(!current.loaded || current.loaded.resource===resolved.resource,'Engine changed; reconnect the BFS MCP server');
    current.loaded ??= {resource:resolved.resource,module:await import(pathToFileURL(resolved.resource).href)};
    const api=current.loaded.module;
    if(name==='render')return api.render(args.args,selected.cwd);
    if(['--help','help'].includes(args.args[0]))return api.help;
    if(!current.browser) {
      const folder=path.join(selected.workspaceDir,'engine-sessions',ctx.taskId,`${hostId.split('-')[0]}-browser`);
      noLinks(folder);fs.mkdirSync(folder,{recursive:true,mode:0o700});current.browser=api.createBrowser(folder);
    }
    const result=await current.browser.run(args.args,selected.cwd,args.stdin);
    await current.browser.save();return result;
  }
  return {call,async close(){const results=await Promise.allSettled([...owners.values()].map(owner=>owner.browser?.close()));owners.clear();const failed=results.find(result=>result.status==='rejected');if(failed)throw failed.reason;}};
}

export async function serveNativeHost({hostId,consumeCall,toolPrefix=''},input=process.stdin,output=process.stdout,env=process.env) {
  let queue=Promise.resolve(),elicitation=false,approval=null,closed=false;
  const send=value=>output.write(JSON.stringify(value)+'\n');
  const host=createNativeHost({env,hostId,consumeCall,toolPrefix,confirmProject:async selected=>{
    requireValue(elicitation,'The host must support MCP elicitation to confirm a directory outside the workspace');
    const answer=await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{approval=null;reject(new Error('Project confirmation timed out'));},75000);
      approval={resolve:value=>{clearTimeout(timer);approval=null;resolve(value);},reject:error=>{clearTimeout(timer);approval=null;reject(error);}};
      send({jsonrpc:'2.0',id:'bfs-project-confirm',method:'elicitation/create',params:{mode:'form',message:`Allow this BFS browser to read and write files inside ${selected}?`,requestedSchema:{type:'object',properties:{allow:{type:'boolean',title:'Allow this project directory'}},required:['allow']}}});
    });return answer.action==='accept' && answer.content?.allow===true;
  }});
  async function dispatch(request) {
    if(request.id===undefined)return;
    try {
      let result;
      if(request.method==='initialize') {
        elicitation=Boolean(request.params?.capabilities?.elicitation);
        const catalog=run(['catalog','list']);
        result={protocolVersion:['2024-11-05','2025-03-26','2025-06-18','2025-11-25'].includes(request.params?.protocolVersion)?request.params.protocolVersion:'2024-11-05',capabilities:{tools:{}},serverInfo:{name:`bontaflowstack-${hostId.split('-')[0]}`,version:catalog.version},instructions:`Use ${toolPrefix}core for BFS commands. Native hooks bind every call to the actual session and workspace. Missing bindings are errors; never invent them. Browser file paths stay in the selected project; outside directories need the human form. Chromium sandbox remains enabled.`};
      }else if(request.method==='ping')result={};
      else if(request.method==='tools/list')result={tools:tools.map(tool=>({...tool,name:toolPrefix+tool.name}))};
      else if(request.method==='resources/list')result={resources:[]};
      else if(request.method==='resources/templates/list')result={resourceTemplates:[]};
      else if(request.method==='tools/call') {
        try {
          requireValue(typeof request.params?.name==='string' && request.params.name.startsWith(toolPrefix),'Unknown BFS tool');
          const value=await host.call(request.params.name.slice(toolPrefix.length),request.params?.arguments ?? {}),text=typeof value==='string'?value:JSON.stringify(value ?? null);
          requireValue(Buffer.byteLength(text)<=16*1024*1024,'BFS result exceeds 16 MiB; narrow the request');
          result={content:[{type:'text',text}],...(value?.ready===false || value?.valid===false || value?.status==='failed' || value?.exitCode && value?.status!=='completed'?{isError:true}:{})};
        }catch(error){result={isError:true,content:[{type:'text',text:error.message}]};}
      }else {send({jsonrpc:'2.0',id:request.id,error:{code:-32601,message:'Method not found'}});return;}
      send({jsonrpc:'2.0',id:request.id,result});
    }catch(error){send({jsonrpc:'2.0',id:request.id,error:{code:-32603,message:error.message}});}
  }
  const lines=readline.createInterface({input,crlfDelay:Infinity});
  const close=async()=>{if(closed)return;closed=true;approval?.reject(new Error('Host disconnected before project confirmation'));await queue;await host.close();};
  const onSignal=()=>{lines.close();input.destroy();close().catch(error=>process.stderr.write(error.message+'\n'));};
  process.once('SIGINT',onSignal);process.once('SIGTERM',onSignal);
  try {
    for await(const line of lines) {
      if(Buffer.byteLength(line)>1024*1024){send({jsonrpc:'2.0',id:null,error:{code:-32600,message:'Request exceeds 1 MiB'}});continue;}
      let request;
      try {
        request=JSON.parse(line);
        if(request?.jsonrpc==='2.0' && request.id==='bfs-project-confirm' && approval){request.error?approval.reject(new Error(request.error.message)):approval.resolve(request.result);continue;}
        requireValue(request?.jsonrpc==='2.0' && typeof request.method==='string','Invalid JSON-RPC request');
      }catch{send({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Invalid JSON-RPC request'}});continue;}
      queue=queue.then(()=>dispatch(request));
    }
  }finally{await close();process.off('SIGINT',onSignal);process.off('SIGTERM',onSignal);}
}
