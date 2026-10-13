import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import {randomUUID} from 'node:crypto';

const [mode,folder,eventName,behavior='pass']=process.argv.slice(2);
if(!path.isAbsolute(folder || '') || !fs.statSync(folder).isDirectory())throw new Error('Probe directory required');
const save=value=>fs.appendFileSync(path.join(folder,'events.jsonl'),JSON.stringify(value)+'\n');
if(['copilot-hook','gemini-hook','cursor-hook'].includes(mode)) {
  const event=JSON.parse(fs.readFileSync(0,'utf8').replace(/^\uFEFF/,''));
  const roots=event.workspace_roots?.map(root=>path.normalize(process.platform==='win32'?root.replace(/^\/(?=[A-Za-z]:\/)/,''):root));
  if(mode==='cursor-hook' && !roots?.some(root=>root.toLowerCase()===path.join(path.dirname(folder),'project with spaces').toLowerCase())) {
    process.stdout.write('{}\n');process.exit(0);
  }
  const cwd=mode==='cursor-hook'?roots[0]:event.cwd;
  const sessionId=mode==='copilot-hook'?event.sessionId:mode==='cursor-hook'?event.conversation_id:event.session_id,toolName=mode==='copilot-hook'?event.toolName:event.tool_name;
  let args=mode==='copilot-hook'?event.toolArgs:event.tool_input;
  if(typeof args==='string')args=JSON.parse(args);
  save({kind:eventName,sessionId,cwd,toolName,argumentKeys:Object.keys(args || {}),...(mode==='cursor-hook'?{version:event.cursor_version,workspaceRoots:roots,callId:event.tool_use_id}: {})});
  if(['preToolUse','BeforeTool'].includes(eventName) && toolName?.includes('ping')) {
    if(behavior==='deny') {
      process.stdout.write(JSON.stringify(mode==='copilot-hook'?{permissionDecision:'deny',permissionDecisionReason:'BFS_PROBE_DENIED'}:mode==='cursor-hook'?{permission:'deny',agent_message:'BFS_PROBE_DENIED'}:{decision:'deny',reason:'BFS_PROBE_DENIED'})+'\n');process.exit(0);
    }
    if(behavior==='crash') {process.stderr.write('BFS_PROBE_CRASH\n');process.exit(mode==='gemini-hook'?2:1);}
    if(behavior==='timeout')await new Promise(resolve=>setTimeout(resolve,15000));
    const id=randomUUID();
    fs.writeFileSync(path.join(folder,`${id}.json`),JSON.stringify({sessionId,cwd,value:args.value}),{flag:'wx'});
    const modified={...args,_bfsProbe:id};
    process.stdout.write(JSON.stringify(mode==='copilot-hook'?{modifiedArgs:modified}:mode==='cursor-hook'?{updated_input:modified}:{hookSpecificOutput:{tool_input:modified}})+'\n');
  }else process.stdout.write('{}\n');
}else if(mode==='server') {
  const send=(id,result)=>process.stdout.write(JSON.stringify({jsonrpc:'2.0',id,result})+'\n');
  for await(const line of readline.createInterface({input:process.stdin,crlfDelay:Infinity})) {
    const request=JSON.parse(line);if(request.id===undefined)continue;
    if(request.method==='initialize')send(request.id,{protocolVersion:'2025-06-18',capabilities:{tools:{}},serverInfo:{name:'bfs-probe',version:'0.0.1'}});
    else if(request.method==='tools/list')send(request.id,{tools:[{name:'ping',description:'Read-only BFS native hook contract probe. Call with value="probe". Reserved _bfsProbe is populated by the native hook; never invent it.',inputSchema:{type:'object',properties:{value:{type:'string'},_bfsProbe:{type:'string'}},required:['value'],additionalProperties:false},annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false}}]});
    else if(request.method==='tools/call') {
      const args=request.params.arguments,id=args._bfsProbe;
      const file=typeof id==='string' && /^[a-f0-9-]{36}$/.test(id)?path.join(folder,`${id}.json`):null;
      const record=file && fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null;
      const valid=record?.value===args.value && typeof record?.sessionId==='string' && path.isAbsolute(record?.cwd || '');
      if(valid)fs.unlinkSync(file);
      save({kind:'mcp-call',name:request.params.name,bound:Boolean(valid),sessionId:record?.sessionId,cwd:record?.cwd});
      send(request.id,{...(valid?{}:{isError:true}),content:[{type:'text',text:valid?'BFS_NATIVE_BINDING_OK':'Missing native hook argument binding'}]});
    }else send(request.id,{});
  }
}else throw new Error('Unknown probe mode');
