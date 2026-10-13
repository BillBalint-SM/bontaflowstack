import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

export const BfsProbe=async ({directory})=>{
  const folder=process.env.BFS_PROBE_FOLDER;
  if(!path.isAbsolute(folder || '') || !fs.statSync(folder).isDirectory())throw new Error('Probe directory required');
  const save=value=>fs.appendFileSync(path.join(folder,'events.jsonl'),JSON.stringify(value)+'\n');
  save({kind:'plugin-loaded',cwd:directory});
  return {
    'tool.execute.before':async(input,output)=>{
      save({kind:'tool.execute.before',sessionId:input.sessionID,callId:input.callID,toolName:input.tool,cwd:directory,argumentKeys:Object.keys(output.args || {})});
      if(input.tool==='bfsprobe_ping') {
        if(process.env.BFS_PROBE_BEHAVIOR==='deny')throw new Error('BFS_PROBE_DENIED');
        const id=randomUUID();
        fs.writeFileSync(path.join(folder,`${id}.json`),JSON.stringify({sessionId:input.sessionID,cwd:directory,value:output.args.value}),{flag:'wx'});
        output.args._bfsProbe=id;
      }
    },
    'tool.execute.after':async input=>save({kind:'tool.execute.after',sessionId:input.sessionID,callId:input.callID,toolName:input.tool}),
    event:async({event})=>{if(['session.created','session.idle','session.error','session.deleted'].includes(event.type))save({kind:event.type,sessionId:event.properties?.sessionID || event.properties?.info?.id});}
  };
};
