import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { context } from '../plugins/bontaflowstack/core/state.mjs';
import { guard, preTool, classify } from '../plugins/bontaflowstack/core/guard.mjs';

function fixture(t) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'bfs-claude-guard-'));
  const project = path.join(temp, 'project with space'); fs.mkdirSync(project);
  const ctx = context(project, { ...process.env, BFS_STATE_HOME:path.join(temp, 'state'), CODEX_THREAD_ID:'claude-guard-fixture' });
  t.after(() => fs.rmSync(temp, { recursive:true, force:true }));
  return { temp, project, ctx };
}

test('Bash guard classifies literal destructive commands and paths', t => {
  const { project } = fixture(t);
  const escaped = project.replaceAll('\\', '/').replaceAll(' ', '\\ ');
  assert.equal(classify(`git -c core.pager=cat -C . reset --hard`, project, project, 'bash').decision, 'ask');
  assert.equal(classify(`rm -rf '${project}'`, project, project, 'bash').decision, 'deny');
  assert.equal(classify(`rm -r ${escaped}`, project, project, 'bash').decision, 'deny');
  assert.equal(classify('rm -f src/file.txt', project, project, 'bash').decision, 'ask');
  assert.equal(classify('git status --short', project, project, 'bash'), null);
  assert.equal(classify('  \n', project, project, 'bash'), null);
});

test('Git Bash drive paths still identify project-root deletion on Windows', { skip:process.platform !== 'win32' }, t => {
  const { project } = fixture(t);
  const gitBashPath = project.replace(/^([a-z]):\\/i, (_, drive) => `/${drive.toLowerCase()}/`).replaceAll('\\', '/');
  assert.equal(classify(`rm -rf '${gitBashPath}'`, project, project, 'bash').decision, 'deny');
});

test('Bash guard asks on dynamic or compound syntax and ignores true comments', t => {
  const { project } = fixture(t);
  for (const command of [
    'echo $(rm -rf .)', 'rm -rf "$PROJECT"', 'X=1 rm -rf .', 'sudo rm -rf .', 'env X=1 rm -rf .',
    'xargs rm -rf .', 'bash cleanup.sh', 'git status; git reset --hard',
    'git status | cat', 'echo safe > output.txt', 'git status\ngit reset --hard', 'rm -rf "unterminated'
  ]) assert.equal(classify(command, project, project, 'bash')?.decision, 'ask', command);
  assert.equal(classify('echo safe # rm -rf .', project, project, 'bash'), null);
  assert.equal(classify('echo safe # rm -rf .\n', project, project, 'bash'), null);
});

test('native Bash and PowerShell tool events keep shell-specific guard coverage', t => {
  const { ctx, project } = fixture(t);
  fs.mkdirSync(path.join(project, 'src'));
  const base = { hook_event_name:'PreToolUse', session_id:ctx.taskId, cwd:project };
  const observation = preTool(ctx, { ...base, tool_name:'Bash', tool_input:{command:'git status', shell:'bash'} }).hookSpecificOutput.additionalContext;
  guard(ctx, 'set', { observation, warnings:true, boundary:'src' });
  for (const [tool_name, tool_input] of [
    ['Bash', {command:'rm -rf .', shell:'bash'}],
    ['PowerShell', {command:`Remove-Item -LiteralPath '${project}' -Recurse`}]
  ]) {
    const result = preTool(ctx, { ...base, tool_name, tool_input });
    assert.equal(result.hookSpecificOutput.permissionDecision, 'deny');
  }
  assert.equal(preTool(ctx, { ...base, tool_name:'Write', tool_input:{file_path:path.join(project,'outside.txt')} }).hookSpecificOutput.permissionDecision, 'deny');
  assert.equal(preTool(ctx, { ...base, tool_name:'Edit', tool_input:{file_path:path.join(project,'src','inside.txt')} }).hookSpecificOutput.permissionDecision, undefined);
});
