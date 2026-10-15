import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {context} from '../plugins/bontaflowstack/core/state.mjs';
import {run} from '../plugins/bontaflowstack/core/cli.mjs';

test('host core dispatch preserves supplied project, owner and JSON input', t => {
  const root=fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()),'bfs-host-context-'));
  t.after(()=>{assert.equal(path.dirname(root),fs.realpathSync(os.tmpdir()));assert.match(path.basename(root),/^bfs-host-context-/);fs.rmSync(root,{recursive:true,force:true});});
  const ctx={...context(root,{BFS_STATE_HOME:path.join(root,'state')}),taskId:'claude-native-session'};
  const result=run(['workflow','start'],{context:ctx,input:{goal:'Host dispatch fixture',skills:['bfs-health']}});
  assert.equal(result.workspace,ctx.workspace);
  assert.equal(result.taskId,ctx.taskId);
  assert.equal(result.goal,'Host dispatch fixture');
  assert.equal(run(['workflow','list'],{context:ctx})[0].id,result.id);
  assert.equal(run(['read','bfs-health'],{context:ctx}).context.workspaceId,ctx.workspaceId);
});
