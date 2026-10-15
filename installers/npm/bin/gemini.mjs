import fs from 'node:fs';
import path from 'node:path';
import {restoreSource,replaceSource} from './source-copy.mjs';

export function prepareGemini({cli,root,versions,pluginRoot,version,inventory,readJson,atomicWrite,noLinks,requireValue,owned,knownInventories=()=>[]}) {
  const name='bontaflowstack',source=path.join(root,'sources','gemini',name);
  const list=()=>{const data=JSON.parse(cli(['extensions','list','--output-format','json']));requireValue(Array.isArray(data),'Unexpected Gemini extension list format.');return data;};
  const nativeInventory=directory=>inventory(directory).filter(([file])=>file!=='.gemini-extension-install.json');
  const same=(left,right)=>JSON.stringify([...left].sort())===JSON.stringify([...right].sort());
  const ownedPayload=directory=>{
    noLinks(directory);
    const manifest=readJson(path.join(directory,'gemini-extension.json'));
    requireValue(owned && manifest?.name===name && /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9]+(?:[.-][a-zA-Z0-9]+)*)?$/.test(manifest.version),'Unrecognized Gemini payload; existing files were preserved.');
    const canonical=path.join(versions,manifest.version,'hosts/gemini');
    requireValue(fs.existsSync(canonical) && (same(nativeInventory(directory),inventory(canonical)) || knownInventories('gemini',manifest.version).some(known=>same(nativeInventory(directory),known))),'Gemini payload differs from its managed version; existing files were preserved.');
  };
  const copy={source,parent:path.dirname(source),prefix:'.bfs-source-',validate:ownedPayload,noLinks,requireValue,inventory,pluginRoot};
  restoreSource(copy);
  const activeFile=path.join(path.dirname(source),'active.json'),record=readJson(activeFile);
  const activeCopy=directory=>({source:directory,parent:path.dirname(directory),prefix:'.bfs-runtime-',validate:ownedPayload,noLinks,requireValue,inventory});
  if(record) {
    requireValue(owned && record.schema===1 && record.source===source && typeof record.path==='string' && path.isAbsolute(record.path),'Invalid Gemini runtime recovery record; files were preserved.');
    restoreSource(activeCopy(record.path));
  }
  const extensions=list(),prior=extensions.find(item=>item.name===name);
  if(fs.existsSync(source))ownedPayload(source);
  if(prior) {
    requireValue(prior.installMetadata?.type==='local' && prior.installMetadata.source===source && typeof prior.path==='string' && path.isAbsolute(prior.path),'Another BontaFlowStack Gemini extension is installed; it was preserved.');
    restoreSource(activeCopy(prior.path));
    ownedPayload(prior.path);
    requireValue(prior.isActive===true,'BontaFlowStack remains disabled in Gemini. Its enablement policy was preserved.');
  }
  const mcpLine=()=>cli(['mcp','list']).split(/\r?\n/).find(line=>/\bbfs(?::| \()/.test(line));
  const before=mcpLine();
  requireValue(!before || prior && before.includes('bfs (from bontaflowstack):') && before.includes(prior.path),'A conflicting bfs MCP configuration exists in Gemini; it was preserved.');
  requireValue(!extensions.some(item=>item.name!==name && item.mcpServers?.bfs),'Another Gemini extension declares the bfs MCP name; it was preserved.');
  return {
    host:'gemini',pluginRoot,sourceRoot:source,
    register() {
      const expected=inventory(pluginRoot);
      const runtimeRefreshed=!!prior && prior.version===version && !same(nativeInventory(prior.path),expected);
      replaceSource(copy);
      if(runtimeRefreshed) {
        // Gemini rejects reinstall and local update compares versions; preserve its install metadata during the owned copy swap.
        atomicWrite(activeFile,{schema:1,source,path:prior.path});
        const parent=path.dirname(prior.path),stage=fs.mkdtempSync(path.join(parent,'.bfs-runtime-build-'));
        fs.cpSync(pluginRoot,stage,{recursive:true});
        const metadata=path.join(prior.path,'.gemini-extension-install.json');
        if(fs.existsSync(metadata))fs.copyFileSync(metadata,path.join(stage,path.basename(metadata)));
        replaceSource({...activeCopy(prior.path),pluginRoot:stage});
        requireValue(path.dirname(stage)===parent && path.basename(stage).startsWith('.bfs-runtime-build-') && same(inventory(stage),inventory(prior.path)),'Unexpected Gemini runtime staging files were preserved.');noLinks(stage);fs.rmSync(stage,{recursive:true});
      }
      if(!prior)cli(['extensions','install',source],true);
      else if(prior.version!==version)cli(['extensions','update',name],true);
      const active=list().find(item=>item.name===name);
      requireValue(active?.version===version && active.installMetadata?.source===source && active.installMetadata?.type==='local' && typeof active.path==='string' && path.isAbsolute(active.path),'Gemini did not confirm the selected extension version and source. Rerun setup; durable versions were preserved.');
      requireValue(active.isActive===true,'The Gemini extension remains disabled by host policy. Setup did not change that policy.');
      requireValue(same(nativeInventory(active.path),expected),'Gemini installed files differ from the selected release. Durable files were preserved; rerun setup.');
      const skills=readJson(path.join(pluginRoot,'catalog.json')).skills.map(item=>item.id).sort();
      requireValue(Array.isArray(active.skills) && same(active.skills.map(item=>item.name).sort(),skills),'Gemini did not discover all packaged BFS skills.');
      const line=mcpLine();
      requireValue(line?.includes('bfs (from bontaflowstack):') && line.includes(active.path) && line.endsWith(' - Connected'),'Gemini did not confirm the connected BFS MCP from this extension. Inspect host policy or conflicting configuration.');
      return {registered:true,reloadRequired:true,verified:'extension-skills-mcp-registration',runtimeRefreshed};
    }
  };
}
