import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Real Linux x64 setup: builds the npm package, installs its dependencies, runs the shipped
// `setup` command against the real Claude Code CLI and downloads the real engines (network needed).
// Runs in the `linux-setup` CI job; skipped off Linux or without the CLI on PATH.
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hasClaude = process.platform === 'linux' && spawnSync('claude', ['--version'], { encoding: 'utf8' }).status === 0;
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), `bfs-linux-real-${randomUUID()}-`));
const home = path.join(scratch, 'home');
const env = { ...process.env, HOME: home, CLAUDE_CONFIG_DIR: path.join(home, 'claude'), XDG_DATA_HOME: '', BFS_STATE_HOME: '' };
const sh = (command, args, options = {}) => {
  const result = spawnSync(command, args, { encoding: 'utf8', env, maxBuffer: 64 * 1024 * 1024, ...options });
  assert.equal(result.status, 0, `${command} ${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
};

test('real Linux x64 setup installs and registers Claude Code, then repeats safely', { skip: !hasClaude && 'needs Linux and the claude CLI on PATH', timeout: 900000 }, async t => {
  t.after(() => fs.rmSync(scratch, { recursive: true, force: true }));
  fs.mkdirSync(home, { recursive: true });
  const output = path.join(scratch, 'package');
  sh(process.execPath, [path.join(repo, 'scripts/build-npm-package.mjs'), '--output', output]);
  const manifest = JSON.parse(fs.readFileSync(path.join(output, 'package.json'), 'utf8'));
  // While package.json still restricts `os`, npm refuses the install; --force lifts only that check.
  sh('npm', ['install', '--omit=dev', '--no-audit', '--no-fund', ...manifest.os.includes('linux') ? [] : ['--force']], { cwd: output });
  const run = () => sh(process.execPath, [path.join(output, 'bin/setup.mjs'), 'setup'], { cwd: output });
  const first = run();
  assert.match(first, /claude registered/);
  const data = path.join(home, '.local/share/BontaFlowStack');
  const plugins = JSON.parse(sh('claude', ['plugin', 'list', '--json']));
  const installed = plugins.find(item => item.id === 'bontaflowstack@bontaflowstack-npx');
  assert.equal(installed?.scope, 'user');
  assert.equal(installed.enabled, true);
  assert.equal(installed.version, manifest.version);
  assert.equal(path.resolve(installed.readFromFolder), path.join(data, 'npm/versions', manifest.version, 'hosts/claude'));
  const cli = path.join(installed.readFromFolder, 'core/cli.mjs');
  const doctor = JSON.parse(sh(process.execPath, [cli, 'doctor', 'bfs-browse']));
  assert.equal(doctor.ready, true);
  assert.equal(doctor.engines.installed, true);
  for (const name of ['browser', 'render', 'design', 'design-detect']) assert.equal(doctor.engines.capabilities[name].ready, true, name);
  assert.equal(JSON.parse(fs.readFileSync(path.join(data, 'npm/setup-status.json'), 'utf8')).status, 'completed');
  const hook = spawnSync(process.execPath, [path.join(installed.readFromFolder, 'core/claude-hook.mjs'), 'SessionStart'], { input: '{}', encoding: 'utf8', env });
  assert.equal(hook.error, undefined);
  const second = run();
  assert.match(second, /claude registered/);
  assert.equal(JSON.parse(sh('claude', ['plugin', 'list', '--json'])).filter(item => item.id === 'bontaflowstack@bontaflowstack-npx').length, 1);
});
