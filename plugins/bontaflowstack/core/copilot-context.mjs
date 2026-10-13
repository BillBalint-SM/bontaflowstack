import path from 'node:path';
import {context,identifier,object,requireValue,digest,readJson,changeJson} from './state.mjs';
import {consumeNativeCall} from './call-binding.mjs';
export {nativeTools as copilotTools,callArguments,issueCall} from './call-binding.mjs';
export const copilotToolName=name=>`bfs-${name}`;

export function nativeContext(event,env=process.env) {
  object(event);const sessionId=identifier(event.sessionId);
  requireValue(typeof event.cwd==='string' && path.isAbsolute(event.cwd),'Copilot hook requires an absolute working directory');
  const current=context(event.cwd,env),file=path.join(current.home,'copilot-cli','sessions',`${digest(sessionId)}.json`);
  const initial={schema:1,sessionId,workspace:current.workspace,workspaces:[current.workspace]};
  const session=readJson(file) || changeJson(file,initial,value=>value);
  requireValue(session.schema===1 && session.sessionId===sessionId && path.isAbsolute(session.workspace),'Invalid Copilot session state');
  const project=context(session.workspace,env);
  const selected=current.git && project.git && current.projectId===project.projectId?current:{...project,cwd:current.cwd};
  if(!(session.workspaces || [session.workspace]).includes(selected.workspace))changeJson(file,initial,value=>{
    requireValue(value.schema===1 && value.sessionId===sessionId,'Invalid Copilot session state');
    value.workspaces ??= [value.workspace];
    if(!value.workspaces.includes(selected.workspace))value.workspaces.push(selected.workspace);
    return value;
  });
  return {...selected,taskId:`copilot-${digest(JSON.stringify([sessionId,null]))}`,host:'copilot-cli',sessionId,agentId:null};
}
export function sessionContexts(ctx,env=process.env) {
  const session=readJson(path.join(ctx.home,'copilot-cli','sessions',`${digest(ctx.sessionId)}.json`));
  requireValue(session?.schema===1 && session.sessionId===ctx.sessionId,'Invalid Copilot session state');
  const workspaces=session.workspaces || [session.workspace];
  requireValue(Array.isArray(workspaces),'Invalid Copilot workspace list');
  return workspaces.map(cwd=>{
    const selected=nativeContext({sessionId:ctx.sessionId,cwd},env);
    requireValue(selected.workspace===cwd && selected.taskId===ctx.taskId,'Copilot workspace ownership changed');return selected;
  });
}
export function consumeCall(name,input,env=process.env) {
  return consumeNativeCall(name,input,env,'copilot-cli',record=>nativeContext({sessionId:record.sessionId,cwd:record.cwd},env));
}
