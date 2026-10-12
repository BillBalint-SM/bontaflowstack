import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { claudeHook } from '../plugins/bontaflowstack/core/claude-hook.mjs';
import { createClaudeHost } from '../plugins/bontaflowstack/core/claude-host.mjs';
import { claudeToolName } from '../plugins/bontaflowstack/core/claude-context.mjs';
import { context, digest, noLinks, within } from '../plugins/bontaflowstack/core/state.mjs';
import { engines } from '../plugins/bontaflowstack/core/engines.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(repo, '.tmp', `claude-engine-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}`);
const project = path.join(output, 'project');
const stateHome = path.join(output, 'isolated-state');
const outside = path.join(output, 'outside.png');
const registry = path.join(process.env.BFS_STATE_HOME || path.join(process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE, 'AppData', 'Local'), 'BontaFlowStack', 'state', 'v2'), 'engines.json');
const registration = JSON.parse(fs.readFileSync(registry, 'utf8'));
const engineRoot = registration.root;
const manifestPath = path.join(engineRoot, 'engine.json');
const manifestHash = digest(fs.readFileSync(manifestPath));
const sessionId = `bfs-fixture-${randomUUID()}`;
const env = { ...process.env, BFS_STATE_HOME: stateHome, CLAUDE_CODE_SESSION_ID: sessionId };
const evidence = [];

assert.ok(within(repo, output), 'Evidence output must stay inside the worktree');
noLinks(path.dirname(output));
fs.mkdirSync(project, { recursive: true });
noLinks(output);
fs.writeFileSync(outside, 'outside-project-sentinel');

const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Claude engine fixture</title><main><h1>Local browser fixture</h1><p id="owner">unselected</p><button id="choose" onclick="document.querySelector('#owner').textContent='selected:'+new URLSearchParams(location.search).get('owner')">Choose</button><table><tr><th>Item</th><th>Count</th></tr><tr><td>Alpha</td><td>3</td></tr></table></main></html>`;
fs.writeFileSync(path.join(project, 'fixture.html'), html);

const server = http.createServer((request, response) => {
  assert.equal(request.socket.remoteAddress, '127.0.0.1');
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  response.end(html);
});
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const url = `http://127.0.0.1:${server.address().port}/?owner=`;

function call(host, agentId, name, args = {}) {
  const event = { session_id: sessionId, agent_id: agentId, cwd: project, hook_event_name: 'PreToolUse', tool_name: claudeToolName(name), tool_input: args };
  const response = claudeHook(event, env);
  const hook = response.hookSpecificOutput;
  assert.equal(hook.hookEventName, 'PreToolUse');
  assert.notEqual(hook.permissionDecision, 'deny', hook.permissionDecisionReason);
  assert.ok(hook.updatedInput?._bfsCall, 'Claude hook must bind the request before the adapter consumes it');
  return host.call(name, hook.updatedInput);
}

let host;
try {
  const ctx = context(project, env);
  engines(ctx, 'register', { root: engineRoot, sha256: manifestHash });
  const engineStatus = engines(ctx, 'status');
  assert.equal(engineStatus.installed, true, engineStatus.reason);
  assert.equal(engineStatus.version, registration.version);
  evidence.push({ check: 'isolated registry registered the installed engine', version: engineStatus.version, root: engineRoot });

  host = createClaudeHost({ env });
  const ready = await call(host, 'primary', 'status');
  assert.equal(ready.host, 'claude-code');
  assert.equal(ready.engine.version, registration.version);
  assert.equal(ready.engine.capabilities['browser-host'].ready, true);
  assert.equal(ready.chromiumSandbox, true);
  evidence.push({ check: 'Claude adapter reports installed sandboxed Chromium engine', version: ready.engine.version, chromiumSandbox: ready.chromiumSandbox });

  await call(host, 'primary', 'select_project', { path: project });
  await call(host, 'worker-a', 'select_project', { path: project });
  await call(host, 'primary', 'browser', { args: ['goto', `${url}primary`] });
  await call(host, 'worker-a', 'browser', { args: ['goto', `${url}worker-a`] });
  assert.match(await call(host, 'primary', 'browser', { args: ['text', '#owner'] }), /unselected/);
  assert.match(await call(host, 'worker-a', 'browser', { args: ['text', '#owner'] }), /unselected/);
  await call(host, 'primary', 'browser', { args: ['click', '#choose'] });
  assert.equal(await call(host, 'primary', 'browser', { args: ['text', '#owner'] }), 'selected:primary');
  assert.equal(await call(host, 'worker-a', 'browser', { args: ['text', '#owner'] }), 'unselected');
  evidence.push({ check: 'real Chromium browser contexts are isolated by Claude agent owner' });

  await call(host, 'primary', 'browser', { args: ['storage', 'set', 'bfs-local-fixture', 'persisted'] });
  const browserShot = await call(host, 'primary', 'browser', { args: ['screenshot', 'browser.png'] });
  const browserPdf = await call(host, 'primary', 'browser', { args: ['pdf', 'browser.pdf'] });
  assert.equal(browserShot.path, path.join(project, 'browser.png'));
  assert.equal(browserPdf.path, path.join(project, 'browser.pdf'));
  const render = await call(host, 'primary', 'render', { args: ['fixture.html', '--screenshot', 'render.png', '--pdf', 'render.pdf', '--width', '960', '--height', '720'] });
  assert.equal(render.status, 'completed');
  assert.equal(render.screenshot, path.join(project, 'render.png'));
  assert.equal(render.pdf, path.join(project, 'render.pdf'));
  for (const file of ['browser.png', 'render.png']) assert.deepEqual(fs.readFileSync(path.join(project, file)).subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  for (const file of ['browser.pdf', 'render.pdf']) assert.equal(fs.readFileSync(path.join(project, file), 'utf8').slice(0, 5), '%PDF-');
  evidence.push({ check: 'browser screenshot/PDF and standalone render screenshot/PDF created by real Chromium', render });

  const compared = await call(host, 'primary', 'core', { args: ['engine', 'design', 'compare', '--images', 'browser.png,render.png', '--output', 'design-board.html', '--title', 'Claude local design comparison'] });
  assert.equal(compared.status, 'completed', compared.stderr || compared.stdout);
  const board = JSON.parse(compared.stdout);
  assert.equal(board.images, 2);
  assert.equal(board.board, path.join(project, 'design-board.html'));
  const boardMetadata = JSON.parse(fs.readFileSync(path.join(project, 'design-board.html.json'), 'utf8'));
  assert.deepEqual(boardMetadata.images.map(image => image.path), [path.join(project, 'browser.png'), path.join(project, 'render.png')]);
  for (const image of boardMetadata.images) assert.equal(digest(fs.readFileSync(image.path)), image.sha256);
  const boardRender = await call(host, 'primary', 'render', { args: ['design-board.html', '--screenshot', 'design-board.png', '--width', '1280', '--height', '900'] });
  assert.ok(fs.statSync(path.join(project, 'design-board.png')).size > 1000);
  assert.equal(boardRender.horizontalOverflow, false);

  const selected = await call(host, 'primary', 'core', { args: ['engine', 'design', 'select', '--board', 'design-board.html', '--index', '2', '--reason', 'synthetic integration choice verifies selection persistence'] });
  assert.equal(selected.status, 'completed', selected.stderr || selected.stdout);
  const selectionResult = JSON.parse(selected.stdout);
  assert.equal(selectionResult.selected.path, path.join(project, 'render.png'));
  const selection = await call(host, 'primary', 'core', { args: ['engine', 'design', 'selection', '--board', 'design-board.html'] });
  assert.equal(selection.status, 'completed', selection.stderr || selection.stdout);
  assert.equal(JSON.parse(selection.stdout).selected.sha256, boardMetadata.images[1].sha256);
  evidence.push({ check: 'design engine compares real Chromium screenshots, renders its board, records and reloads a synthetic test selection', board: board.board, selected: selectionResult.selected.path, syntheticChoice: true });

  await assert.rejects(call(host, 'primary', 'browser', { args: ['screenshot', '../outside.png'] }), /inside the host-selected project/);
  assert.equal(fs.readFileSync(outside, 'utf8'), 'outside-project-sentinel');
  evidence.push({ check: 'browser output outside the selected project is rejected without changing sentinel' });

  await host.close();
  host = createClaudeHost({ env });
  assert.match(await call(host, 'primary', 'browser', { args: ['url'] }), /owner=primary/);
  assert.equal(await call(host, 'primary', 'browser', { args: ['text', '#owner'] }), 'unselected');
  assert.equal(await call(host, 'primary', 'browser', { args: ['storage'] }).then(value => value['bfs-local-fixture']), 'persisted');
  assert.equal(await call(host, 'worker-a', 'browser', { args: ['text', '#owner'] }), 'unselected');
  evidence.push({ check: 'saved browser tabs and storage reopen under the same synthetic Claude owner; worker remains separate' });

  const report = {
    status: 'completed',
    scope: 'Synthetic Claude hook transport through claudeHook/createClaudeHost; actual installed sandboxed Chromium and local design engine against a localhost-only fixture. The design choice is synthetic test input, not a human selection. No image generation or external provider/network was used. This is not a native Claude Code run and does not verify Claude hook delivery or updatedInput behavior in the Claude CLI.',
    engine: { version: registration.version, root: engineRoot, manifestSha256: manifestHash },
    fixture: { url, project, externalNetworkUsed: false },
    checks: evidence,
    artifacts: ['fixture.html', 'browser.png', 'browser.pdf', 'render.png', 'render.pdf', 'design-board.html', 'design-board.html.json', 'design-board.html.selection.json', 'design-board.png'].map(file => path.join(project, file)),
  };
  fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ status: report.status, checks: evidence.length, engineVersion: registration.version, evidence: output }));
} finally {
  await host?.close();
  await new Promise(resolve => server.close(resolve));
}
