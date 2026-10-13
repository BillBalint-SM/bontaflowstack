import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';

const loader=plugin=>`export {BontaFlowStack} from ${JSON.stringify(pathToFileURL(path.join(plugin,'plugin.mjs')).href)};\n`;

export function prepareOpenCode({cli,versions,pluginRoot,skillNames,noLinks,readJson,requireValue,owned}) {
  const configRoot=cli(['debug','paths']).match(/^config\s+(.+)$/m)?.[1]?.trim();
  requireValue(configRoot && path.isAbsolute(configRoot),'OpenCode did not report an absolute native config directory.');
  const source=path.join(configRoot,'plugins/bontaflowstack.js');noLinks(source);
  const previous=fs.existsSync(source)?fs.readFileSync(source,'utf8'):null;
  let prior;
  if(previous!==null) {
    requireValue(owned && fs.existsSync(versions),'Unrecognized OpenCode plugin loader; existing files were preserved.');
    for(const version of fs.readdirSync(versions).filter(name=>/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9]+(?:[.-][a-zA-Z0-9]+)*)?$/.test(name))) {
      const candidate=path.join(versions,version,'hosts/opencode');
      if(previous!==loader(candidate))continue;
      noLinks(candidate);const manifest=readJson(path.join(candidate,'package.json'));
      requireValue(manifest?.name==='bontaflowstack' && manifest.version===version,'OpenCode loader points to an unrecognized release; files were preserved.');prior=candidate;
    }
    requireValue(prior,'OpenCode loader differs from the managed release; existing files were preserved.');
  }
  const config=JSON.parse(cli(['debug','config']));
  const matches=(value,plugin)=>plugin && value?.type==='local' && value.enabled===true && JSON.stringify(value.command)===JSON.stringify(['node',path.join(plugin,'core/opencode-host.mjs')]) && Object.keys(value).every(key=>['type','command','enabled'].includes(key));
  requireValue(!config.mcp?.bfs || matches(config.mcp.bfs,prior),'A conflicting or disabled bfs MCP configuration exists in OpenCode; it was preserved.');
  const list=(pure=false)=>{const skills=JSON.parse(cli([...(pure?['--pure']:[]),'debug','skill']));requireValue(Array.isArray(skills),'Unexpected OpenCode skill list.');return skills.filter(skill=>skillNames.includes(skill.name));};
  // Plugin-added skills can shadow project skills; inspect native files without plugins as well.
  for(const skill of [...list(true),...list()])requireValue(prior && typeof skill.location==='string' && path.resolve(skill.location)===path.join(prior,'skills',skill.name,'SKILL.md'),'A conflicting BFS skill exists outside the OpenCode plugin; it was preserved.');
  const write=contents=>{
    noLinks(source);fs.mkdirSync(path.dirname(source),{recursive:true});const temporary=`${source}.${randomUUID()}.tmp`;
    try {fs.writeFileSync(temporary,contents,{flag:'wx'});fs.renameSync(temporary,source);}finally {if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
  };
  return {host:'opencode',pluginRoot,sourceRoot:source,
    register() {
      const current=fs.existsSync(source)?fs.readFileSync(source,'utf8'):null,expected=loader(pluginRoot);
      requireValue(current===previous,'OpenCode loader changed during setup; it was preserved. Rerun setup.');
      if(current!==expected)write(expected);
      try {
        const active=JSON.parse(cli(['debug','config']));requireValue(matches(active.mcp?.bfs,pluginRoot),'OpenCode did not load the selected BFS MCP configuration. Inspect native plugin policy; durable files were preserved.');
        const skills=list();requireValue(skills.length===skillNames.length && new Set(skills.map(skill=>skill.name)).size===skillNames.length && skills.every(skill=>typeof skill.location==='string' && path.resolve(skill.location)===path.join(pluginRoot,'skills',skill.name,'SKILL.md')),'OpenCode did not discover all BFS skills from the selected release.');
        const status=cli(['mcp','list']).replace(/\u001b\[[0-9;]*m/g,'');requireValue(/\bbfs connected\b/.test(status) && status.includes(path.join(pluginRoot,'core/opencode-host.mjs')),'OpenCode did not confirm the connected BFS MCP from the selected release.');
      }catch(error) {
        if(current!==expected && fs.readFileSync(source,'utf8')===expected){if(previous===null)fs.unlinkSync(source);else write(previous);}
        throw error;
      }
      return {registered:true,reloadRequired:true,verified:'plugin-skills-mcp-registration'};
    }
  };
}
