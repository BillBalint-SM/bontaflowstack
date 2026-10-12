import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), `bfs-install-state-${randomUUID()}-`));
const evidenceDir = path.join(repo, '.tmp', `install-state-${randomUUID()}`);
const plugin = path.join(fixture, 'host-plugin');
const core = path.join(plugin, 'core');
const project = path.join(fixture, 'project');

try {
  fs.mkdirSync(core, { recursive: true });
  fs.mkdirSync(project, { recursive: true });
  fs.copyFileSync(path.join(repo, 'plugins', 'bontaflowstack', 'core', 'state.mjs'), path.join(core, 'state.mjs'));
  const { context } = await import(`${pathToFileURL(path.join(core, 'state.mjs')).href}?fixture=${randomUUID()}`);
  const localA = path.join(fixture, 'codex-localappdata');
  const localB = path.join(fixture, 'claude-localappdata');
  const pinned = path.join(fixture, 'shared-bfs-state');

  assert.equal(context(project, { LOCALAPPDATA: localA }).home, path.join(localA, 'BontaFlowStack', 'state', 'v2'), 'without a host config, legacy LOCALAPPDATA fallback is retained');

  fs.writeFileSync(path.join(plugin, 'install-state.json'), JSON.stringify({ schema: 1, stateHome: pinned }));
  assert.equal(context(project, { LOCALAPPDATA: localA }).home, pinned, 'installed host config pins shared state');
  assert.equal(context(project, { LOCALAPPDATA: localB }).home, pinned, 'the pin is stable across host-specific LOCALAPPDATA values');

  const explicit = path.join(fixture, 'explicit-state');
  assert.equal(context(project, { BFS_STATE_HOME: explicit, LOCALAPPDATA: localB }).home, explicit, 'explicit env override has highest priority');

  for (const [name, contents, message] of [
    ['malformed', '{not json', /Cannot read state/],
    ['relative', JSON.stringify({ schema: 1, stateHome: 'relative/state' }), /absolute/],
    ['wrong-schema', JSON.stringify({ schema: 2, stateHome: pinned }), /schema/],
  ]) {
    fs.writeFileSync(path.join(plugin, 'install-state.json'), contents);
    assert.throws(() => context(project, { LOCALAPPDATA: localA }), message, `${name} install config must fail closed`);
  }

  fs.mkdirSync(evidenceDir, { recursive: true });
  const evidence = path.join(evidenceDir, 'result.json');
  fs.writeFileSync(evidence, JSON.stringify({ status: 'passed', fallback: path.join(localA, 'BontaFlowStack', 'state', 'v2'), pinned, explicit, cases: ['legacy-fallback', 'pinned-across-hosts', 'environment-override', 'malformed-config-rejected', 'relative-config-rejected', 'wrong-schema-rejected'] }, null, 2) + '\n');
  console.log(JSON.stringify({ status: 'passed', evidence }));
} finally {
  // The fixture is a unique mkdtemp child created by this test.
  fs.rmSync(fixture, { recursive: true, force: true });
}
