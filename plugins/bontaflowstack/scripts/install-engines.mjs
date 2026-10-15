#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {context,digest,noLinks,readJson,requireValue} from '../core/state.mjs';
import {extractZip} from '../core/zip.mjs';
import {engines,verifyEngine} from '../core/engines.mjs';

const plugin=fileURLToPath(new URL('../',import.meta.url));
export async function installEngines({archive,sha256,env=process.env}={}) {
  const lock=readJson(path.join(plugin,'engines.lock.json'));
  requireValue(lock?.schema===1 && /^\d+\.\d+\.\d+$/.test(lock.version),'Invalid engine release record');
  let bytes;
  if(archive) {
    requireValue(/^[a-fA-F0-9]{64}$/.test(sha256 || ''),'A local archive requires its explicit SHA-256');
    archive=path.resolve(archive);noLinks(archive);
    requireValue(fs.statSync(archive).size<=536870912,'Engine source archive exceeds the supported size');
    bytes=fs.readFileSync(archive);
  } else {
    sha256=lock.sha256;
    requireValue(/^[a-f0-9]{64}$/.test(sha256 || ''),'Invalid engine archive checksum');
    if(lock.bundledArchive) {
      requireValue(/^engines\/[a-zA-Z0-9._-]+\.zip$/.test(lock.bundledArchive),'Invalid bundled engine archive record');
      archive=path.join(plugin,lock.bundledArchive);noLinks(archive);
      requireValue(fs.statSync(archive,{throwIfNoEntry:false})?.isFile(),'The package is missing its bundled engine source archive');
      requireValue(fs.statSync(archive).size<=536870912,'Engine source archive exceeds the supported size');
      bytes=fs.readFileSync(archive);
    } else {
      requireValue(/^https:\/\/github\.com\/BillBalint-SM\/bontaflowstack-engines\/releases\/download\//.test(lock.url || ''),'Invalid engine release URL');
      const response=await fetch(lock.url,{signal:AbortSignal.timeout(60000)});
      requireValue(response.ok,`Engine download failed: ${response.status}`);
      const chunks=[];let size=0;
      for await(const chunk of response.body) {size+=chunk.length;requireValue(size<=536870912,'Engine source archive exceeds the supported size');chunks.push(chunk);}
      bytes=Buffer.concat(chunks);
    }
  }
  requireValue(digest(bytes)===sha256.toLowerCase(),'Engine archive checksum does not match. No source was executed.');
  const ctx=context(process.cwd(),env),base=path.join(ctx.home,'engines');noLinks(base);
  const suffix=process.platform==='win32'?'':`-${process.platform}-${process.arch}`;
  const root=path.join(base,`${lock.version}-${sha256.slice(0,16).toLowerCase()}${suffix}`);noLinks(root);
  fs.mkdirSync(base,{recursive:true,mode:0o700});
  if(!fs.existsSync(path.join(root,'engine.json'))) {
    requireValue(!fs.existsSync(root),`An incomplete installation exists at ${root}; files were preserved`);
    const stage=path.join(base,`.staging-${randomUUID()}`);fs.mkdirSync(stage,{mode:0o700});
    try {
      extractZip(bytes,stage);
      const build=path.join(stage,'scripts/build.mjs'),legacy=path.join(stage,'scripts/build.ps1');
      let command=process.execPath,args=[build,'--install','--install-browser'];
      if(!fs.existsSync(build)) {
        requireValue(process.platform==='win32' && fs.existsSync(legacy),'The archive has no supported engine build entry point');
        command='powershell.exe';args=['-NoProfile','-ExecutionPolicy','Bypass','-File',legacy,'-Install','-InstallBrowser'];
      }
      const buildEnv={...env,PATH:`${path.dirname(process.execPath)}${path.delimiter}${env.PATH || ''}`};
      if(command==='powershell.exe')for(const key of Object.keys(buildEnv))if(key.toLowerCase()==='psmodulepath')delete buildEnv[key];
      const result=spawnSync(command,args,{env:buildEnv,cwd:stage,stdio:'inherit',windowsHide:true});
      if(result.error)throw result.error;
      requireValue(result.status===0,`Engine build failed (${result.status ?? result.signal})`);
      const manifestFile=path.join(stage,'engine.json'),sha=digest(fs.readFileSync(manifestFile));
      const checked=verifyEngine(ctx,stage,sha);requireValue(checked.value.version===lock.version,'Built engine version differs from the selected release');
      fs.renameSync(stage,root);
    } catch(error) {throw new Error(`${error.message}. Staging files were preserved at ${stage}`,{cause:error});}
  }
  const manifestFile=path.join(root,'engine.json'),sha=digest(fs.readFileSync(manifestFile));
  requireValue(readJson(manifestFile)?.version===lock.version,'Built engine version differs from the selected release');
  engines(ctx,'register',{root,sha256:sha});
  return {root,...engines(ctx,'status')};
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const args=process.argv.slice(2),input={};
    while(args.length) {
      const flag=args.shift(),value=args.shift();requireValue(['--archive','--sha256'].includes(flag) && value,'Use --archive <file> --sha256 <hash>');
      const key=flag.slice(2);requireValue(input[key]===undefined,'Duplicate installer argument');input[key]=value;
    }
    console.log(JSON.stringify(await installEngines(input)));
  } catch(error) {process.stderr.write(`${error.message}\n`);process.exitCode=1;}
}
