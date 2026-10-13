import path from 'node:path';
import {context,canonical,identifier,object,requireValue,digest,readJson,changeJson} from './state.mjs';
import {consumeNativeCall} from './call-binding.mjs';
export {nativeTools as cursorTools,callArguments,issueCall} from './call-binding.mjs';
// Cursor's native MCP hook name omits the server name; prefix the exposed tools.
export const cursorToolName=name=>`MCP:bfs_${name}`;
function nativePath(value) {
  requireValue(typeof value==='string','Cursor workspace path is missing');
  const file=process.platform==='win32'?value.replace(/^\/(?=[A-Za-z]:\/)/,''):value;
  requireValue(path.isAbsolute(file),'Cursor workspace path must be absolute');return canonical(file);
}
export function nativeContext(event,env=process.env) {
  object(event);const sessionId=identifier(event.conversation_id);
  requireValue(!event.session_id || event.session_id===sessionId,'Cursor session identity mismatch');
  requireValue(Array.isArray(event.workspace_roots) && event.workspace_roots.length===1,'Cursor BFS requires one unambiguous workspace root');
  const project=context(nativePath(event.workspace_roots[0]),env);
  const file=path.join(project.home,'cursor-ide','sessions',`${digest(sessionId)}.json`);
  changeJson(file,{schema:1,sessionId,workspaces:[]},value=>{
    requireValue(value.schema===1 && value.sessionId===sessionId && Array.isArray(value.workspaces),'Invalid Cursor session state');
    if(!value.workspaces.includes(project.workspace))value.workspaces.push(project.workspace);return value;
  });
  return {...project,cwd:event.cwd?nativePath(event.cwd):project.cwd,taskId:`cursor-${digest(JSON.stringify([sessionId,null]))}`,host:'cursor-ide',sessionId,agentId:null};
}
export function sessionContexts(ctx,env=process.env) {
  const session=readJson(path.join(ctx.home,'cursor-ide','sessions',`${digest(ctx.sessionId)}.json`));
  requireValue(session?.schema===1 && session.sessionId===ctx.sessionId && Array.isArray(session.workspaces),'Invalid Cursor session state');
  return session.workspaces.map(workspace=>{
    const owner=nativeContext({conversation_id:ctx.sessionId,workspace_roots:[workspace]},env);
    requireValue(owner.workspace===workspace && owner.taskId===ctx.taskId,'Cursor workspace ownership changed');return owner;
  });
}
export function consumeCall(name,input,env=process.env) {
  return consumeNativeCall(name,input,env,'cursor-ide',record=>nativeContext({conversation_id:record.sessionId,workspace_roots:[record.workspace],cwd:record.cwd},env));
}
