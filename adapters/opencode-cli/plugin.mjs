import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {BontaFlowStack as core} from './core/opencode-plugin.mjs';
import {requireValue} from './core/state.mjs';

export const BontaFlowStack=async context=>{
  const root=path.dirname(fileURLToPath(import.meta.url)),hooks=await core(context);
  const mcp={type:'local',command:['node',path.join(root,'core/opencode-host.mjs')],enabled:true};
  let configured=false;
  return {...hooks,
    config:async config=>{
      configured=false;
      requireValue(!config.mcp?.bfs || JSON.stringify(config.mcp.bfs)===JSON.stringify(mcp),'BFS OpenCode MCP configuration conflicts with an existing or disabled bfs server; it was preserved.');
      await hooks.config(config);
      config.mcp={...config.mcp,bfs:mcp};
      config.skills={...config.skills,paths:[...new Set([...(config.skills?.paths || []),path.join(root,'skills')])]};
      configured=true;
    },
    'tool.execute.before':async(input,output)=>{
      // OpenCode logs config-hook errors and continues, so failed registration must not bind another server's tools.
      if(input.tool.startsWith('bfs_'))requireValue(configured,'BFS OpenCode configuration did not complete; resolve the MCP conflict before retrying.');
      return hooks['tool.execute.before'](input,output);
    }
  };
};
