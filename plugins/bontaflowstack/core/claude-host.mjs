import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createNativeHost,serveNativeHost} from './mcp-host.mjs';
import {consumeCall} from './claude-context.mjs';
export {tools} from './mcp-host.mjs';

const binding={hostId:'claude-code',consumeCall};
export const createClaudeHost=(options={})=>createNativeHost({...options,...binding});
export const serveClaudeHost=(...args)=>serveNativeHost(binding,...args);
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url))serveClaudeHost().catch(error=>{process.stderr.write(error.message+'\n');process.exitCode=1;});
