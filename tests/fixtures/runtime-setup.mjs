import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const [packageRoot,input]=process.argv.slice(2),settings=JSON.parse(fs.readFileSync(input,'utf8'));
const {setup}=await import(pathToFileURL(path.join(packageRoot,'bin/setup.mjs')));
const stateFile=path.join(settings.env.HOME,'host-fixture.json');
if(settings.failRuntimeSwap) {
  const rename=fs.renameSync;
  fs.renameSync=(from,to)=>{
    if(path.basename(from)==='next' && path.basename(path.dirname(from)).startsWith('.bfs-runtime-'))throw new Error('fixture runtime swap failure');
    return rename(from,to);
  };
}
let state=fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile,'utf8')):{extensions:[],installs:0};
const extensions=()=>state.extensions.map(item=>({...item,...JSON.parse(fs.readFileSync(path.join(item.path,'gemini-extension.json'),'utf8'))}));
const run=(command,args)=>{
  if(command==='gemini') {
    if(args[0]==='--version')return '0.63.0';
    if(args[0]==='mcp')return extensions().map(item=>`bfs (from bontaflowstack): ${item.path}/core/gemini-host.mjs - ${fs.existsSync(item.mcpServers.bfs.command)?'Connected':'Disconnected'}`).join('\n');
    if(args[1]==='list')return JSON.stringify(extensions());
    if(['install','update'].includes(args[1])) {
      if(args[1]==='install' && state.extensions.length)throw new Error('Extension is already installed');
      state.installs++;
      const source=args[1]==='install'?args[2]:state.extensions[0].installMetadata.source;
      const target=path.join(settings.env.HOME,'.gemini/extensions/bontaflowstack');
      fs.cpSync(source,target,{recursive:true});
      const manifest=JSON.parse(fs.readFileSync(path.join(target,'gemini-extension.json'),'utf8'));
      state.extensions=[{...manifest,path:target,installMetadata:{type:'local',source},isActive:true,skills:fs.readdirSync(path.join(target,'skills')).map(name=>({name}))}];
      fs.writeFileSync(path.join(target,'.gemini-extension-install.json'),JSON.stringify({type:'local',source,fixture:'preserve'}));
      fs.writeFileSync(stateFile,JSON.stringify(state));return 'installed';
    }
  }
  if(path.basename(command).startsWith('impeccable'))return '4.0.0';
  if(args.includes('doctor'))return JSON.stringify({core:{ready:true,status:'ready'},engines:{installed:true,capabilities:Object.fromEntries(['browser','browser-host','render','design','design-detect','pretext'].map(name=>[name,{ready:true,status:'ready'}]))}});
  if(command==='gemini.exe' || command.endsWith('gemini.exe'))throw new Error('No Windows Gemini fixture');
  return '';
};
try {console.log(JSON.stringify(await setup({packageRoot,...settings,run,host:'auto'})));}
catch(error){console.error(error.stack);process.exitCode=1;}
