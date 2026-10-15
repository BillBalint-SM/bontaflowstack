import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {restoreSource,replaceSource} from './source-copy.mjs';

export function findCursor(env,platform=process.platform) {
  const pathDirectories=(env.PATH || env.Path || '').split(path.delimiter).filter(Boolean).map(directory=>directory.replace(/^"|"$/g,''));
  const locations=platform==='win32' ? [path.join(env.LOCALAPPDATA,'Programs/cursor'),...[env.ProgramFiles,env['ProgramFiles(x86)']].filter(Boolean).map(root=>path.join(root,'cursor')),
    ...pathDirectories.map(directory=>path.resolve(directory,'../../..'))]
    : [...(platform==='darwin' ? ['/Applications/Cursor.app/Contents',path.join(env.HOME || os.homedir(),'Applications/Cursor.app/Contents')] : ['/usr/share/cursor','/opt/cursor']),
      ...pathDirectories.flatMap(directory=>{
        try {
          const executable=fs.realpathSync(path.join(directory,'cursor'));
          fs.accessSync(executable,fs.constants.X_OK);
          const parent=path.dirname(executable);
          return [parent,path.resolve(parent,'..'),path.resolve(parent,'../../..')];
        } catch { return []; }
      })];
  for(const root of new Set(locations)) {
    if(platform==='win32' && !fs.statSync(path.join(root,'Cursor.exe'),{throwIfNoEntry:false})?.isFile())continue;
    const file=path.join(root,platform==='darwin'?'Resources':'resources','app/product.json');
    try {const product=JSON.parse(fs.readFileSync(file,'utf8'));if(product.nameShort==='Cursor' && typeof product.version==='string')return {root,version:product.version};}catch { /* Try the next native IDE installation. */ }
  }
  return null;
}

export function prepareCursor({root,versions,pluginRoot,version,skillNames,inventory,readJson,noLinks,requireValue,owned,env,platform=process.platform,knownInventories=()=>[]}) {
  // Keep managed paths stable while separating the native identity from imported plugins.
  const name='bontaflowstack-cursor',profile=(platform==='win32'?env.USERPROFILE:null) || env.HOME || os.homedir(),cursor=path.join(profile,'.cursor'),local=path.join(cursor,'plugins/local'),source=path.join(local,'bontaflowstack');
  const same=(left,right)=>JSON.stringify([...left].sort())===JSON.stringify([...right].sort());
  noLinks(source);
  const validate=directory=>{
    noLinks(directory);
    const manifest=readJson(path.join(directory,'.cursor-plugin/plugin.json'));
    requireValue(owned && [name,'bontaflowstack'].includes(manifest?.name) && /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9]+(?:[.-][a-zA-Z0-9]+)*)?$/.test(manifest.version),'Unrecognized Cursor plugin; existing files were preserved.');
    const canonical=path.join(versions,manifest.version,'hosts/cursor');
    requireValue(fs.existsSync(canonical) && (same(inventory(directory),inventory(canonical)) || knownInventories('cursor',manifest.version).some(known=>same(inventory(directory),known))),'Cursor payload differs from its managed version; existing files were preserved.');
  };
  // Stage outside local discovery so an IDE reload cannot load two BFS copies.
  const copy={source,parent:path.dirname(local),prefix:'.bfs-cursor-',validate,noLinks,requireValue,inventory,pluginRoot};
  restoreSource(copy);
  if(fs.existsSync(source))validate(source);
  if(fs.existsSync(local))for(const entry of fs.readdirSync(local,{withFileTypes:true})) {
    if(entry.name===path.basename(source) || !entry.isDirectory())continue;
    for(const manifest of ['.cursor-plugin/plugin.json','plugin.json'])requireValue(readJson(path.join(local,entry.name,manifest))?.name!==name,'Another local Cursor plugin has the BontaFlowStack name; it was preserved.');
  }
  for(const file of [path.join(cursor,'mcp.json'),path.join(process.cwd(),'.cursor/mcp.json')]) {
    let config;try {config=readJson(file);}catch {throw new Error(`Cannot read Cursor MCP configuration; file was preserved: ${file}`);}
    requireValue(!config?.mcpServers || !Object.hasOwn(config.mcpServers,'bfs-cursor'),'A conflicting bfs-cursor MCP configuration exists in Cursor; it was preserved.');
  }
  for(const base of [path.join(cursor,'skills'),path.join(process.cwd(),'.cursor/skills'),path.join(profile,'.agents/skills'),path.join(process.cwd(),'.agents/skills')]) {
    noLinks(base);
    requireValue(!skillNames.some(skill=>fs.existsSync(path.join(base,skill,'SKILL.md'))),'A conflicting BFS skill exists outside the Cursor plugin; it was preserved.');
  }
  return {
    host:'cursor',pluginRoot,sourceRoot:source,
    register() {
      const expected=inventory(pluginRoot);
      const runtimeRefreshed=fs.existsSync(source) && !same(inventory(source),expected);
      replaceSource(copy);
      requireValue(readJson(path.join(source,'.cursor-plugin/plugin.json'))?.version===version && same(inventory(source),expected),'Cursor plugin placement did not match the selected release. Durable versions were preserved.');
      return {registered:false,reloadRequired:true,verified:'files-placed-awaiting-host-readback',runtimeRefreshed};
    }
  };
}
