import path from 'node:path';
import {context,identifier,requireValue,digest,readJson,changeJson} from './state.mjs';
import {consumeNativeCall} from './call-binding.mjs';
export {nativeTools as opencodeTools,callArguments,issueCall} from './call-binding.mjs';
export const opencodeToolName=name=>`bfs_${name}`;

export function nativeContext(directory,sessionID,env=process.env) {
  const sessionId=identifier(sessionID);
  requireValue(typeof directory==='string' && path.isAbsolute(directory),'OpenCode requires its native absolute directory');
  const ctx=context(directory,env),file=path.join(ctx.home,'opencode-cli','sessions',`${digest(sessionId)}.json`);
  const initial={schema:1,sessionId,workspaces:[ctx.workspace]},session=readJson(file) || changeJson(file,initial,value=>value);
  requireValue(session.schema===1 && session.sessionId===sessionId && Array.isArray(session.workspaces),'Invalid OpenCode session state');
  if(!session.workspaces.includes(ctx.workspace))changeJson(file,initial,value=>{
    requireValue(value.schema===1 && value.sessionId===sessionId && Array.isArray(value.workspaces),'Invalid OpenCode session state');
    if(!value.workspaces.includes(ctx.workspace))value.workspaces.push(ctx.workspace);return value;
  });
  return {...ctx,taskId:`opencode-${digest(JSON.stringify([sessionId,null]))}`,host:'opencode-cli',sessionId,agentId:null};
}
export function sessionContexts(ctx,env=process.env) {
  const session=readJson(path.join(ctx.home,'opencode-cli','sessions',`${digest(ctx.sessionId)}.json`));
  requireValue(session?.schema===1 && session.sessionId===ctx.sessionId && Array.isArray(session.workspaces),'Invalid OpenCode session state');
  return session.workspaces.map(directory=>{
    const selected=nativeContext(directory,ctx.sessionId,env);
    requireValue(selected.workspace===directory && selected.taskId===ctx.taskId,'OpenCode workspace ownership changed');return selected;
  });
}
export function consumeCall(name,input,env=process.env) {
  return consumeNativeCall(name,input,env,'opencode-cli',record=>nativeContext(record.cwd,record.sessionId,env));
}
