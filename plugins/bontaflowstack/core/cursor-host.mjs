import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createNativeHost,serveNativeHost} from './mcp-host.mjs';
import {consumeCall} from './cursor-context.mjs';

const binding={hostId:'cursor-ide',consumeCall,toolPrefix:'bfs_'};
export const createCursorHost=(options={})=>createNativeHost({...options,...binding});
export const serveCursorHost=(...args)=>serveNativeHost(binding,...args);
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url))serveCursorHost().catch(error=>{process.stderr.write(error.message+'\n');process.exitCode=1;});
