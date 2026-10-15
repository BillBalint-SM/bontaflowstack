import fs from 'node:fs';
import path from 'node:path';
import {crc32,inflateRawSync} from 'node:zlib';
import {requireValue,noLinks,within} from './state.mjs';

// shortcut: engine source uses ordinary stored/deflated ZIP entries; reject ZIP64 and encryption rather than guessing.
export function extractZip(bytes,root) {
  requireValue(Buffer.isBuffer(bytes) && bytes.length>=22 && bytes.length<=536870912,'Invalid or oversized engine ZIP');
  noLinks(root);requireValue(fs.statSync(root).isDirectory() && fs.readdirSync(root).length===0,'ZIP staging must be an empty directory');
  let end=bytes.length-22;
  while(end>=Math.max(0,bytes.length-65557) && !(bytes.readUInt32LE(end)===0x06054b50 && end+22+bytes.readUInt16LE(end+20)===bytes.length))end--;
  requireValue(end>=Math.max(0,bytes.length-65557),'Missing ZIP directory');
  const count=bytes.readUInt16LE(end+10),start=bytes.readUInt32LE(end+16),length=bytes.readUInt32LE(end+12);
  requireValue(bytes.readUInt16LE(end+4)===0 && bytes.readUInt16LE(end+6)===0 && bytes.readUInt16LE(end+8)===count && count>0 && count<=10000 && start+length===end,'Unsupported ZIP directory');
  const entries=[],seen=new Set();let cursor=start,total=0;
  for(let index=0;index<count;index++) {
    requireValue(cursor+46<=end && bytes.readUInt32LE(cursor)===0x02014b50,'Invalid ZIP entry');
    const flags=bytes.readUInt16LE(cursor+8),method=bytes.readUInt16LE(cursor+10),checksum=bytes.readUInt32LE(cursor+16);
    const compressed=bytes.readUInt32LE(cursor+20),size=bytes.readUInt32LE(cursor+24),nameLength=bytes.readUInt16LE(cursor+28);
    const next=cursor+46+nameLength+bytes.readUInt16LE(cursor+30)+bytes.readUInt16LE(cursor+32);
    const attributes=bytes.readUInt32LE(cursor+38)>>>16,offset=bytes.readUInt32LE(cursor+42);
    requireValue(next<=end && !(flags & ~0x080e) && [0,8].includes(method) && bytes.readUInt16LE(cursor+34)===0,'Unsupported ZIP entry');
    const rawName=bytes.subarray(cursor+46,cursor+46+nameLength),name=rawName.toString('utf8').replaceAll('\\','/');
    requireValue(rawName.equals(Buffer.from(rawName.toString('utf8'))) && name && !name.startsWith('/') && !/[\x00-\x1f<>:"|?*]|(^|\/)\.\.?($|\/)|(^|\/)[^/]*[ .]($|\/)/.test(name) && !/(^|\/)(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|\/|$)/i.test(name),'Unsafe archive entry');
    requireValue([0,0o100000,0o040000].includes(attributes & 0o170000),'Unsupported archive link or special file');
    const target=path.resolve(root,name),key=process.platform==='win32'?target.toLowerCase():target;
    requireValue(target!==path.resolve(root) && within(root,target) && !seen.has(key),'Invalid or repeated archive entry');seen.add(key);
    total+=size;requireValue(total<=536870912,'Engine source archive exceeds the supported size');
    requireValue(offset+30<=start && bytes.readUInt32LE(offset)===0x04034b50 && bytes.readUInt16LE(offset+6)===flags && bytes.readUInt16LE(offset+8)===method,'Invalid ZIP local entry');
    const localNameLength=bytes.readUInt16LE(offset+26),dataStart=offset+30+localNameLength+bytes.readUInt16LE(offset+28);
    requireValue(dataStart+compressed<=start && bytes.subarray(offset+30,offset+30+localNameLength).equals(rawName),'ZIP local entry differs from its directory');
    const content=method===0?bytes.subarray(dataStart,dataStart+compressed):inflateRawSync(bytes.subarray(dataStart,dataStart+compressed),{maxOutputLength:Math.max(1,size)});
    requireValue(content.length===size && crc32(content)===checksum,'Engine ZIP content verification failed');
    const directory=name.endsWith('/');requireValue((!directory || size===0) && (!attributes || (attributes & 0o170000)===0 || (attributes & 0o170000)===(directory?0o040000:0o100000)),'Invalid ZIP directory type');
    entries.push({target,key,content,directory,executable:!!(attributes & 0o111)});cursor=next;
  }
  requireValue(cursor===end,'ZIP directory length differs');
  const files=new Set(entries.filter(entry=>!entry.directory).map(entry=>entry.key));
  for(const entry of entries) {
    let parent=path.dirname(entry.target);
    while(within(root,parent) && parent!==path.resolve(root)) {
      requireValue(!files.has(process.platform==='win32'?parent.toLowerCase():parent),'ZIP file conflicts with a directory');parent=path.dirname(parent);
    }
  }
  for(const {target,content,directory,executable} of entries) {
    noLinks(target);fs.mkdirSync(directory?target:path.dirname(target),{recursive:true,mode:0o700});noLinks(target);
    if(!directory)fs.writeFileSync(target,content,{flag:'wx',mode:executable?0o755:0o644});
  }
}
