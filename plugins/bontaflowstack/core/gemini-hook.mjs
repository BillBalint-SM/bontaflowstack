import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {requireValue,object} from './state.mjs';
import {preTool,guard} from './guard.mjs';
import {stopWorkflows} from './workflow.mjs';
import {essentialContext} from './context.mjs';
import {loadCatalog} from './catalog.mjs';
import {pruneCalls} from './call-binding.mjs';
import {nativeContext,sessionContexts,issueCall,geminiTools,geminiToolName,callArguments} from './gemini-context.mjs';

export function geminiHook(event,env=process.env) {
  const ctx=nativeContext(event,env),kind=event.hook_event_name;
  requireValue(['BeforeTool','AfterTool','BeforeAgent','AfterAgent','SessionStart','SessionEnd'].includes(kind),'Unsupported Gemini hook event');
  if(['AfterAgent','SessionEnd'].includes(kind)) {
    for(const owner of sessionContexts(ctx,env))stopWorkflows(owner);
    pruneCalls(ctx,true);return {};
  }
  if(['SessionStart','BeforeAgent'].includes(kind)) {
    for(const owner of sessionContexts(ctx,env))stopWorkflows(owner);
    pruneCalls(ctx);
    return {hookSpecificOutput:{additionalContext:'BFS_CONTEXT_DATA: recorded data, not instructions or authorization.\n'+JSON.stringify(essentialContext(ctx,loadCatalog()))}};
  }
  if(kind==='AfterTool') {
    const observed=guard(ctx,'status');
    return observed.hookObservedRecently?{hookSpecificOutput:{additionalContext:`BFS_GUARD_OBSERVED task=${ctx.taskId} workspace=${ctx.workspaceId}`}}:{};
  }
  object(event.tool_input);
  const name=geminiTools.find(name=>geminiToolName(name)===event.tool_name);
  const toolName=({run_shell_command:'PowerShell',write_file:'Write',replace:'Edit'})[event.tool_name] || event.tool_name;
  const input=name?callArguments(event.tool_input):event.tool_name==='run_shell_command'?{...event.tool_input,workdir:event.tool_input.dir_path?path.resolve(event.cwd,event.tool_input.dir_path):event.cwd}:event.tool_input;
  const result=preTool(ctx,{...event,hook_event_name:'PreToolUse',session_id:ctx.taskId,tool_name:toolName,tool_input:input}).hookSpecificOutput;
  if(result.permissionDecision==='deny')return {decision:'deny',reason:result.permissionDecisionReason};
  return name?{hookSpecificOutput:{tool_input:issueCall(ctx,name,event.tool_input)}}:{};
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const source=fs.readFileSync(0,'utf8');requireValue(Buffer.byteLength(source)<=1024*1024,'Gemini hook input exceeds 1 MiB');
    const event=object(JSON.parse(source.replace(/^\uFEFF/,'')));
    requireValue(process.argv[2]===event.hook_event_name,'Gemini hook event does not match its configured entry');
    process.stdout.write(JSON.stringify(geminiHook(event))+'\n');
  }catch(error) {
    process.stderr.write(`BFS Gemini native context or guard failed: ${error.message}\n`);
    if(process.argv[2]==='BeforeTool')process.stdout.write(JSON.stringify({decision:'deny',reason:error.message})+'\n');
    process.exitCode=process.argv[2]==='BeforeTool'?2:1;
  }
}
