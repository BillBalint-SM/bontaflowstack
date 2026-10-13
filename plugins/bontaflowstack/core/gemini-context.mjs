import path from 'node:path';
import {context,identifier,object,requireValue,digest,readJson,changeJson} from './state.mjs';
import {consumeNativeCall} from './call-binding.mjs';
export {nativeTools as geminiTools,callArguments,issueCall} from './call-binding.mjs';
export const geminiToolName=name=>`mcp_bfs_${name}`;

export function nativeContext(event,env=process.env) {
  object(event);const sessionId=identifier(event.session_id);
  requireValue(!env.GEMINI_SESSION_ID || env.GEMINI_SESSION_ID===sessionId,'Gemini hook session identity mismatch');
  requireValue(typeof event.cwd==='string' && path.isAbsolute(event.cwd),'Gemini hook requires an absolute working directory');
  const current=context(event.cwd,env),file=path.join(current.home,'gemini-cli','sessions',`${digest(sessionId)}.json`);
  // Gemini exports its current cwd to both variables; the first native event pins the project.
  const initial={schema:1,sessionId,workspace:current.workspace,workspaces:[current.workspace]};
  let session=readJson(file);
  if(!session)session=changeJson(file,initial,value=>value);
  requireValue(session.schema===1 && session.sessionId===sessionId && path.isAbsolute(session.workspace),'Invalid Gemini session state');
  const project=context(session.workspace,env);
  const selected=current.git && project.git && current.projectId===project.projectId ? current : {...project,cwd:current.cwd};
  if(!(session.workspaces || [session.workspace]).includes(selected.workspace))changeJson(file,initial,value=>{
    requireValue(value.schema===1 && value.sessionId===sessionId,'Invalid Gemini session state');
    value.workspaces ??= [value.workspace];
    if(!value.workspaces.includes(selected.workspace))value.workspaces.push(selected.workspace);
    return value;
  });
  return {...selected,taskId:`gemini-${digest(JSON.stringify([sessionId,null]))}`,host:'gemini-cli',sessionId,agentId:null};
}
export function sessionContexts(ctx,env=process.env) {
  const session=readJson(path.join(ctx.home,'gemini-cli','sessions',`${digest(ctx.sessionId)}.json`));
  requireValue(session?.schema===1 && session.sessionId===ctx.sessionId,'Invalid Gemini session state');
  const workspaces=session.workspaces || [session.workspace];
  requireValue(Array.isArray(workspaces),'Invalid Gemini workspace list');
  return workspaces.map(cwd=>{
    const selected=nativeContext({session_id:ctx.sessionId,cwd},{...env,GEMINI_SESSION_ID:ctx.sessionId});
    requireValue(selected.workspace===cwd && selected.taskId===ctx.taskId,'Gemini workspace ownership changed');return selected;
  });
}
export function consumeCall(name,input,env=process.env) {
  return consumeNativeCall(name,input,env,'gemini-cli',record=>nativeContext({session_id:record.sessionId,cwd:record.cwd},{...env,GEMINI_SESSION_ID:record.sessionId}));
}
