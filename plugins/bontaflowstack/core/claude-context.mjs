import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {context,identifier,object,requireValue,digest,noLinks,atomicWrite,readJson,changeJson} from './state.mjs';

export const claudeTools=['core','status','select_project','browser','render'];
export const claudeToolName=name=>`mcp__plugin_bontaflowstack_bfs__${name}`;
export function nativeContext(event,env=process.env) {
  object(event);
  const sessionId=identifier(event.session_id),agentId=event.agent_id === undefined ? null : identifier(event.agent_id);
  requireValue(!env.CLAUDE_CODE_SESSION_ID || env.CLAUDE_CODE_SESSION_ID===sessionId,'Claude hook session identity mismatch');
  requireValue(typeof event.cwd==='string' && path.isAbsolute(event.cwd),'Claude hook requires an absolute working directory');
  const ctx=context(event.cwd,env);
  return {...ctx,taskId:`claude-${digest(JSON.stringify([sessionId,agentId]))}`,host:'claude-code',sessionId,agentId};
}
export function callArguments(input) {
  object(input);const {_bfsCall,...args}=input;return args;
}
const callFolder=env=>path.join(context(process.cwd(),env).home,'claude-code','calls');
const ordered=value=>Array.isArray(value)?value.map(ordered):value && typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,ordered(value[key])])):value;
const fingerprint=(name,input)=>digest(JSON.stringify(ordered({name,input:callArguments(input)})));
export function issueCall(ctx,name,input) {
  requireValue(claudeTools.includes(name),'Unknown Claude BFS tool');
  const id=randomUUID(),folder=path.join(ctx.home,'claude-code','calls');
  noLinks(folder);fs.mkdirSync(folder,{recursive:true});
  const record={schema:1,id,name,inputSha256:fingerprint(name,input),taskId:ctx.taskId,sessionId:ctx.sessionId,agentId:ctx.agentId,cwd:ctx.cwd,workspaceId:ctx.workspaceId,createdAt:Date.now()};
  atomicWrite(path.join(folder,`${id}.json`),record);
  return {...callArguments(input),_bfsCall:id};
}
export function consumeCall(name,input,env=process.env) {
  object(input);
  requireValue(typeof input._bfsCall==='string' && /^[0-9a-f-]{36}$/.test(input._bfsCall),'Native Claude PreToolUse binding is missing; enable the plugin hooks and verify updatedInput support. Do not invent a binding.');
  const file=path.join(callFolder(env),`${input._bfsCall}.json`),record=readJson(file);
  requireValue(record?.schema===1 && record.id===input._bfsCall,'Claude call binding is missing or already consumed');
  requireValue(record.name===name && record.inputSha256===fingerprint(name,input),'Claude call arguments changed after native inspection');
  requireValue(Number.isFinite(record.createdAt) && Date.now()>=record.createdAt && Date.now()-record.createdAt<=300000,'Claude call binding expired; retry through the native hook');
  // MCP startup env can survive /clear; the one-use native-hook record owns this call.
  const ctx=nativeContext({session_id:record.sessionId,agent_id:record.agentId ?? undefined,cwd:record.cwd},{...env,CLAUDE_CODE_SESSION_ID:record.sessionId});
  requireValue(ctx.taskId===record.taskId && ctx.workspaceId===record.workspaceId,'Claude call workspace or owner changed');
  const claimed=`${file}.${randomUUID()}.consumed`;
  fs.renameSync(file,claimed);fs.unlinkSync(claimed);
  return {ctx,args:callArguments(input)};
}
export function rememberOwner(ctx) {
  const file=path.join(ctx.home,'claude-code','sessions',`${digest(ctx.sessionId)}.json`);
  const initial={schema:1,sessionId:ctx.sessionId,owners:[]};
  const valid=state=>{requireValue(state?.schema===1 && state.sessionId===ctx.sessionId && Array.isArray(state.owners),'Invalid Claude session state');return state;};
  const existing=valid(readJson(file,initial));
  if(existing.owners.some(owner=>owner.taskId===ctx.taskId && owner.cwd===ctx.cwd))return;
  changeJson(file,initial,state=>{
    valid(state);
    if(!state.owners.some(owner=>owner.taskId===ctx.taskId && owner.cwd===ctx.cwd))state.owners.push({taskId:ctx.taskId,agentId:ctx.agentId,cwd:ctx.cwd});
    return state;
  });
}
export function sessionContexts(ctx,env=process.env) {
  const file=path.join(ctx.home,'claude-code','sessions',`${digest(ctx.sessionId)}.json`),state=readJson(file);
  if(!state)return [ctx];
  requireValue(state.schema===1 && state.sessionId===ctx.sessionId && Array.isArray(state.owners),'Invalid Claude session state');
  return state.owners.map(owner=>{
    const selected=nativeContext({session_id:ctx.sessionId,agent_id:owner.agentId ?? undefined,cwd:owner.cwd},env);
    requireValue(selected.taskId===owner.taskId,'Claude session owner changed');return selected;
  });
}
export function forgetSession(ctx) {
  const file=path.join(ctx.home,'claude-code','sessions',`${digest(ctx.sessionId)}.json`);
  noLinks(file);
  try{fs.unlinkSync(file);}catch(error){if(error.code!=='ENOENT')throw error;}
}
export function pruneCalls(ctx,ended=false) {
  const folder=path.join(ctx.home,'claude-code','calls');noLinks(folder);
  if(!fs.existsSync(folder))return;
  for(const name of fs.readdirSync(folder).filter(name=>/^[0-9a-f-]{36}\.json$/.test(name))) {
    const file=path.join(folder,name),record=readJson(file);
    if(record?.schema===1 && `${record.id}.json`===name && Number.isFinite(record.createdAt) &&
      (Date.now()-record.createdAt>300000 || ended && record.sessionId===ctx.sessionId)) {
      try{fs.unlinkSync(file);}catch(error){if(error.code!=='ENOENT')throw error;}
    }
  }
}
