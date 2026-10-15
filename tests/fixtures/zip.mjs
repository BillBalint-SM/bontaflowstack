import {crc32,deflateRawSync} from "node:zlib";
export function zip(entries) {
  const local=[],central=[];let offset=0;
  for(const {name,body='source',mode=0o100644} of entries) {
    const filename=Buffer.from(name),content=Buffer.from(body),compressed=deflateRawSync(content);
    const header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(8,8);
    header.writeUInt32LE(crc32(content),14);header.writeUInt32LE(compressed.length,18);header.writeUInt32LE(content.length,22);header.writeUInt16LE(filename.length,26);
    local.push(header,filename,compressed);
    const directory=Buffer.alloc(46);directory.writeUInt32LE(0x02014b50);directory.writeUInt16LE(20,6);directory.writeUInt16LE(8,10);
    directory.writeUInt32LE(crc32(content),16);directory.writeUInt32LE(compressed.length,20);directory.writeUInt32LE(content.length,24);directory.writeUInt16LE(filename.length,28);
    directory.writeUInt32LE((mode*65536)>>>0,38);directory.writeUInt32LE(offset,42);central.push(directory,filename);
    offset+=header.length+filename.length+compressed.length;
  }
  const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
  return Buffer.concat([...local,directory,end]);
}
