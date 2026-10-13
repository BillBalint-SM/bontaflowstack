import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createNativeHost,serveNativeHost} from './mcp-host.mjs';
import {consumeCall} from './opencode-context.mjs';

const binding={hostId:'opencode-cli',consumeCall};
export const createOpenCodeHost=(options={})=>createNativeHost({...options,...binding});
export const serveOpenCodeHost=(...args)=>serveNativeHost(binding,...args);
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url))serveOpenCodeHost().catch(error=>{process.stderr.write(error.message+'\n');process.exitCode=1;});
