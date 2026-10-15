import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {context} from '../plugins/bontaflowstack/core/state.mjs';

if(process.env.BFS_RUN_NATIVE_FILESYSTEM==='1') {
  const root=fs.mkdtempSync(path.join(fs.realpathSync.native(process.argv[2]),'bfs-case-'));
  const upper=path.join(root,'Case project á'),lower=path.join(root,'case project á');
  fs.mkdirSync(upper);
  const sensitive=!fs.existsSync(lower);
  assert.equal(sensitive,process.argv[3]==='sensitive');
  if(sensitive)fs.mkdirSync(lower);
  const env={...process.env,BFS_STATE_HOME:path.join(root,'state'),CODEX_THREAD_ID:'native-filesystem-fixture'};
  const first=context(upper,env),second=context(lower,env);
  assert.equal(first.workspaceId===second.workspaceId,!sensitive);
  const alias=path.join(root,'alias');fs.symlinkSync(upper,alias);
  assert.equal(context(alias,env).workspaceId,first.workspaceId);
  console.log(JSON.stringify({status:'passed',platform:process.platform,arch:process.arch,caseSensitive:sensitive,aliasIdentity:true,unicodeAndSpaces:true}));
} else console.log('SKIP: set BFS_RUN_NATIVE_FILESYSTEM=1 and provide a private volume directory and expected case mode.');
