import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {context,object,requireValue,digest,noLinks,atomicWrite,readJson,identifier} from './state.mjs';

export const nativeTools=['core','status','select_project','browser','render'];
export function callArguments(input) {
  object(input);const {_bfsCall,...args}=input;return args;
}
const ordered=value=>Array.isArray(value)?value.map(ordered):value && typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,ordered(value[key])])):value;
const fingerprint=(name,input)=>digest(JSON.stringify(ordered({name,input:callArguments(input)})));
export function issueCall(ctx,name,input) {
  requireValue(nativeTools.includes(name),'Unknown BFS tool');
  const id=randomUUID(),folder=path.join(ctx.home,identifier(ctx.host),'calls');
  noLinks(folder);fs.mkdirSync(folder,{recursive:true});
  const record={schema:1,id,name,inputSha256:fingerprint(name,input),taskId:ctx.taskId,sessionId:ctx.sessionId,agentId:ctx.agentId,cwd:ctx.cwd,workspace:ctx.workspace,workspaceId:ctx.workspaceId,createdAt:Date.now()};
  atomicWrite(path.join(folder,`${id}.json`),record);
  return {...callArguments(input),_bfsCall:id};
}
export function consumeNativeCall(name,input,env,host,restoreContext) {
  object(input);
  requireValue(typeof input._bfsCall==='string' && /^[0-9a-f-]{36}$/.test(input._bfsCall),'Native BFS call binding is missing; enable the plugin hooks and verify argument rewriting support. Do not invent a binding.');
  const file=path.join(context(process.cwd(),env).home,identifier(host),'calls',`${input._bfsCall}.json`),record=readJson(file);
  requireValue(record?.schema===1 && record.id===input._bfsCall,'BFS call binding is missing or already consumed');
  requireValue(record.name===name && record.inputSha256===fingerprint(name,input),'BFS call arguments changed after native inspection');
  requireValue(Number.isFinite(record.createdAt) && Date.now()>=record.createdAt && Date.now()-record.createdAt<=300000,'BFS call binding expired; retry through the native hook');
  requireValue(typeof record.workspace==='string' && path.isAbsolute(record.workspace),'BFS binding predates stable workspace ownership; retry through the native hook');
  const ctx=restoreContext(record);
  requireValue(ctx.host===host && ctx.taskId===record.taskId && ctx.workspaceId===record.workspaceId,'BFS call workspace or owner changed');
  const claimed=`${file}.${randomUUID()}.consumed`;
  fs.renameSync(file,claimed);fs.unlinkSync(claimed);
  return {ctx,args:callArguments(input)};
}
export function pruneCalls(ctx,ended=false) {
  const folder=path.join(ctx.home,identifier(ctx.host),'calls');noLinks(folder);
  if(!fs.existsSync(folder))return;
  for(const name of fs.readdirSync(folder).filter(name=>/^[0-9a-f-]{36}\.json$/.test(name))) {
    const file=path.join(folder,name),record=readJson(file);
    if(record?.schema===1 && `${record.id}.json`===name && Number.isFinite(record.createdAt) &&
      (Date.now()-record.createdAt>300000 || ended && record.sessionId===ctx.sessionId)) {
      try{fs.unlinkSync(file);}catch(error){if(error.code!=='ENOENT')throw error;}
    }
  }
}
