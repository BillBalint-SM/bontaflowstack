import fs from 'node:fs';
import path from 'node:path';

function clearStage(stage,{parent,prefix,validate,noLinks,requireValue}) {
  requireValue(path.dirname(path.resolve(stage))===path.resolve(parent) && path.basename(stage).startsWith(prefix),'Unexpected source staging path; files were preserved.');
  noLinks(stage);
  const entries=fs.readdirSync(stage);
  requireValue(entries.every(name=>['previous','next'].includes(name)),'Unexpected source staging files were preserved.');
  for(const name of entries)validate(path.join(stage,name));
  fs.rmSync(stage,{recursive:true,force:true});
}

export function restoreSource(options) {
  const {source,parent,prefix,validate,noLinks,requireValue}=options;
  noLinks(parent);noLinks(source);
  if(!fs.existsSync(parent))return;
  const backups=fs.readdirSync(parent,{withFileTypes:true}).filter(entry=>entry.isDirectory() && entry.name.startsWith(prefix))
    .map(entry=>path.join(parent,entry.name,'previous')).filter(file=>fs.existsSync(file));
  if(!backups.length)return;
  if(!fs.existsSync(source)) {
    requireValue(backups.length===1,'Multiple interrupted source copies were preserved; cannot choose a previous release.');
    const previous=backups[0];
    requireValue(path.resolve(previous).startsWith(path.resolve(parent)+path.sep) && path.resolve(source).startsWith(path.resolve(parent)+path.sep),'Source recovery paths are outside their installation directory.');
    validate(previous);
    fs.mkdirSync(path.dirname(source),{recursive:true});fs.renameSync(previous,source);
  }
  validate(source);
  for(const previous of backups)clearStage(path.dirname(previous),options);
}

export function replaceSource(options) {
  const {source,parent,prefix,pluginRoot,inventory,validate,noLinks,requireValue}=options;
  const expected=inventory(pluginRoot),same=directory=>JSON.stringify(inventory(directory))===JSON.stringify(expected);
  if(fs.existsSync(source) && same(source))return;
  noLinks(parent);noLinks(source);fs.mkdirSync(path.dirname(source),{recursive:true});
  const stage=fs.mkdtempSync(path.join(parent,prefix)),next=path.join(stage,'next'),previous=path.join(stage,'previous');
  requireValue(path.dirname(path.resolve(stage))===path.resolve(parent) && path.resolve(source).startsWith(path.resolve(parent)+path.sep),'Source copy paths are outside their installation directory.');
  fs.cpSync(pluginRoot,next,{recursive:true,errorOnExist:true,force:false});
  requireValue(same(next),'Source copy failed verification; staging files were preserved.');
  if(fs.existsSync(source)){validate(source);fs.renameSync(source,previous);}
  try {fs.renameSync(next,source);}catch(error) {
    try {if(fs.existsSync(previous) && !fs.existsSync(source))fs.renameSync(previous,source);}
    catch(restore){throw new Error(`${error.message}\nSource rollback failed: ${restore.message}. Previous files remain at ${previous}; rerun setup.`,{cause:error});}
    throw error;
  }
  requireValue(same(source),'Published source differs; previous files were preserved.');
  // A failed or interrupted swap keeps its staging files for the next setup.
  clearStage(stage,options);
}
