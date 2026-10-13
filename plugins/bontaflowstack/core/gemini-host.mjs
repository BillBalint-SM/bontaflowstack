import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createNativeHost,serveNativeHost} from './mcp-host.mjs';
import {consumeCall} from './gemini-context.mjs';

const binding={hostId:'gemini-cli',consumeCall};
export const createGeminiHost=(options={})=>createNativeHost({...options,...binding});
export const serveGeminiHost=(...args)=>serveNativeHost(binding,...args);
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url))serveGeminiHost().catch(error=>{process.stderr.write(error.message+'\n');process.exitCode=1;});
