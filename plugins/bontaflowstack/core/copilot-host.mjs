import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createNativeHost,serveNativeHost} from './mcp-host.mjs';
import {consumeCall} from './copilot-context.mjs';

const binding={hostId:'copilot-cli',consumeCall};
export const createCopilotHost=(options={})=>createNativeHost({...options,...binding});
export const serveCopilotHost=(...args)=>serveNativeHost(binding,...args);
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url))serveCopilotHost().catch(error=>{process.stderr.write(error.message+'\n');process.exitCode=1;});
