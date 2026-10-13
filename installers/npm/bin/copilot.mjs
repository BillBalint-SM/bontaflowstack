import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {restoreSource,replaceSource} from './source-copy.mjs';

export function prepareCopilot({cli,root,versions,pluginRoot,version,skillNames,inventory,readJson,noLinks,requireValue,owned,env}) {
  const name='bontaflowstack',marketplace='bontaflowstack-npx',source=path.join(root,'sources','copilot',name);
  // Copilot's merged MCP list hides user/workspace entries overwritten by plugins.
  const configRoot=env.COPILOT_HOME || path.join(env.USERPROFILE || os.homedir(),'.copilot');
  const files=[path.join(configRoot,'mcp-config.json')],cwd=process.cwd();
  const git=spawnSync('git',['rev-parse','--show-toplevel'],{cwd,env,encoding:'utf8',windowsHide:true,timeout:10000});
  const top=git.status===0?path.resolve(git.stdout.trim()):cwd;
  for(let directory=cwd;;directory=path.dirname(directory)) {
    files.push(path.join(directory,'.mcp.json'),path.join(directory,'.github/mcp.json'));
    if(directory===top || directory===path.dirname(directory))break;
  }
  for(const file of files) {
    noLinks(file);
    let config;try {config=readJson(file);}catch {throw new Error(`Cannot read Copilot MCP configuration; file was preserved: ${file}`);}
    requireValue(!config || !Object.hasOwn(config.mcpServers || config,'bfs'),'A conflicting bfs MCP configuration exists in Copilot; it was preserved.');
  }
  const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
  const validate=directory=>{
    noLinks(directory);
    const manifest=readJson(path.join(directory,'plugin.json'));
    requireValue(owned && manifest?.name===name && /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9]+(?:[.-][a-zA-Z0-9]+)*)?$/.test(manifest.version),'Unrecognized Copilot source; existing files were preserved.');
    const canonical=path.join(versions,manifest.version,'hosts/copilot');
    requireValue(fs.existsSync(canonical) && same(inventory(directory),inventory(canonical)),'Copilot payload differs from its managed version; existing files were preserved.');
  };
  const copy={source,parent:path.dirname(source),prefix:'.bfs-source-',validate,noLinks,requireValue,inventory,pluginRoot};
  restoreSource(copy);
  const list=args=>{const value=JSON.parse(cli(args));requireValue(Array.isArray(value),'Unexpected Copilot CLI list format.');return value;};
  const markets=()=>list(['plugin','marketplace','list','--json']);
  const plugins=()=>list(['plugin','list','--json']).filter(item=>item.name===name);
  const skills=()=>list(['skill','list','--json']).filter(item=>skillNames.includes(item.name));
  const mcp=()=>JSON.parse(cli(['mcp','list','--json'])).mcpServers?.bfs;
  const ownMcp=value=>value?.source==='plugin' && value.sourcePlugin===name && value.env?.PLUGIN_ROOT===source && value.command==='node' && same(value.args,['${PLUGIN_ROOT}/core/copilot-host.mjs']);
  const ownSkill=item=>item.source==='plugin' && item.path===path.join(source,'skills',item.name);
  const configured=markets().find(item=>item.name===marketplace),installed=plugins(),prior=installed[0];
  requireValue(installed.length<=1 && (!prior || prior.marketplace===marketplace && prior.source==='live' && prior.installedFrom===source),'Another BontaFlowStack Copilot plugin is installed; it was preserved.');
  requireValue(!configured || configured.source===`Local: ${source}`,'The Copilot marketplace belongs to another installation; it was preserved.');
  if(configured || prior || fs.existsSync(source))validate(source);
  requireValue(!prior || prior.enabled===true,'BontaFlowStack remains disabled in Copilot. Its enablement policy was preserved.');
  const before=mcp();
  requireValue(!before || prior && ownMcp(before) && before.enabled===true,'A conflicting or disabled bfs MCP configuration exists in Copilot; it was preserved.');
  requireValue(skills().every(item=>prior && ownSkill(item) && item.enabled===true),'A conflicting or disabled BFS skill exists in Copilot; it was preserved.');
  return {
    host:'copilot',pluginRoot,sourceRoot:source,
    register() {
      replaceSource(copy);
      if(!configured)cli(['plugin','marketplace','add',source],true);
      if(!prior)cli(['plugin','install',`${name}@${marketplace}`],true);
      const active=plugins(),market=markets().find(item=>item.name===marketplace);
      requireValue(active.length===1 && active[0].version===version && active[0].source==='live' && active[0].installedFrom===source && active[0].marketplace===marketplace && market?.source===`Local: ${source}`,'Copilot did not confirm the selected plugin version and source. Rerun setup; durable versions were preserved.');
      requireValue(active[0].enabled===true,'The Copilot plugin remains disabled by host policy. Setup did not change that policy.');
      const discovered=skills();
      requireValue(same(discovered.map(item=>item.name).sort(),[...skillNames].sort()) && discovered.every(item=>ownSkill(item) && item.enabled===true),'Copilot did not discover all packaged BFS skills from this installation. Check conflicting skills or host policy.');
      const server=mcp();
      requireValue(ownMcp(server) && server.enabled===true && server.sourcePluginVersion===version,'Copilot did not confirm the BFS MCP registration from this plugin. Check host policy or conflicting configuration.');
      return {registered:true,reloadRequired:true,verified:'plugin-skills-mcp-registration'};
    }
  };
}
