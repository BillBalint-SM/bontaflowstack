import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { atomicWrite, readJson, digest, requireValue, canonical, within, noLinks } from './state.mjs';

function manifest(root) {
  noLinks(root);
  const file = path.join(root, 'engine.json');
  const value = readJson(file);
  requireValue(value?.schema === 1 && value.name === 'bontaflowstack-engines' && /^\d+\.\d+\.\d+$/.test(value.version) && value.commands && value.files, 'Invalid engine manifest');
  requireValue(value.platform === `${process.platform}-${process.arch}`, 'Engine platform does not match this machine');
  return { value, hash: digest(fs.readFileSync(file)) };
}
function engineFile(root, relative) {
  requireValue(typeof relative === 'string' && !path.isAbsolute(relative), 'Engine paths must be relative');
  const file = canonical(path.resolve(root, relative));
  requireValue(within(root, file), 'Engine path escapes the installation');
  noLinks(file);
  return file;
}
function registered(ctx) {
  const registration = readJson(path.join(ctx.home, 'engines.json'));
  requireValue(registration?.root && /^[a-f0-9]{64}$/.test(registration.manifestSha256), 'Optional engines are not installed; run scripts/install-engines.ps1 explicitly');
  const root = canonical(registration.root);
  const result = manifest(root);
  requireValue(result.hash === registration.manifestSha256 && result.value.version === registration.version, 'Engine installation changed; rebuild and register the verified package');
  return { root, ...result.value };
}
export function externalCommand(ctx, name, env = process.env) {
  requireValue(/^BFS_[A-Z_]+_COMMAND$/.test(name), 'Invalid external tool setting');
  let configured = env[name], managed;
  if (!configured && name === 'BFS_IMPECCABLE_COMMAND') {
    managed = readJson(path.join(ctx.home, 'impeccable.json'));
    if (managed) {
      requireValue(managed.schema === 1 && /^[a-f0-9]{64}$/.test(managed.sha256), 'Invalid managed Impeccable configuration; rerun npm setup');
      configured = JSON.stringify(managed.command);
    }
  }
  requireValue(configured, name === 'BFS_IMPECCABLE_COMMAND' ? 'Impeccable is not installed; rerun npm setup' : `Install the external tool and set ${name}; see the engine prerequisites`);
  const args = JSON.parse(configured);
  requireValue(Array.isArray(args) && args.length && args.every(a => typeof a === 'string' && !a.includes('\0')) && path.isAbsolute(args[0]) && fs.statSync(args[0], {throwIfNoEntry:false})?.isFile() && !/\.(cmd|bat|ps1)$/i.test(args[0]), 'External tool command must start with an existing absolute executable');
  if (managed) {
    noLinks(args[0]);
    requireValue(digest(fs.readFileSync(args[0])) === managed.sha256, 'Managed Impeccable binary changed; files were preserved. Rerun npm setup');
  }
  return configured;
}
function availability(ctx, root, command, files) {
  const required = [...command.requires || []];
  if (command.resource) required.push(command.resource);
  requireValue(command.resource || command.program === 'node', 'Use the current BontaFlowStack Node engine release');
  required.push(...(command.args || []).filter(a => a.startsWith('src/')));
  for (const relative of required) {
    const file = engineFile(root, relative);
    requireValue(fs.statSync(file, { throwIfNoEntry: false })?.isFile(), `Engine component missing: ${relative}`);
    if (files[relative]) requireValue(digest(fs.readFileSync(file)) === files[relative], `Engine component changed: ${relative}`);
  }
  if (command.environment) {
    return externalCommand(ctx, command.environment);
  }
}
export function engines(ctx, action, input = {}) {
  if (action === 'register') {
    const root = canonical(input.root);
    const { value, hash } = manifest(root);
    requireValue(input.sha256 === hash, 'Supply the exact engine manifest SHA-256 printed by the build');
    for (const [relative, expected] of Object.entries(value.files)) {
      requireValue(/^[a-f0-9]{64}$/.test(expected), 'Malformed engine file hash');
      requireValue(digest(fs.readFileSync(engineFile(root, relative))) === expected, `Engine integrity check failed: ${relative}`);
    }
    for (const command of Object.values(value.commands)) if (!command.environment) availability(ctx, root, command, value.files);
    return atomicWrite(path.join(ctx.home, 'engines.json'), { schema: 1, root, version: value.version, manifestSha256: hash });
  }
  if (action === 'status') {
    try {
      const engine = registered(ctx);
      const capabilities = Object.fromEntries(Object.entries(engine.commands).map(([name, command]) => {
        try { availability(ctx, engine.root, command, engine.files); return [name, { ready: true }]; }
        catch (error) { return [name, { ready: false, reason: error.message }]; }
      }));
      return { installed: true, version: engine.version, capabilities };
    } catch (error) { return { installed: false, reason: error.message, capabilities: {} }; }
  }
  const engine = registered(ctx), command = engine.commands[action];
  requireValue(command, `Unknown engine capability: ${action}`);
  const configured = availability(ctx, engine.root, command, engine.files);
  if (command.resource) return { resource: engineFile(engine.root, command.resource), license: engineFile(engine.root, command.requires[0]) };
  requireValue(ctx.taskId, 'Engine operations require the current CODEX_THREAD_ID');
  requireValue(Array.isArray(input.args || []) && (input.args || []).every(a => typeof a === 'string' && !a.includes('\0')), 'Engine arguments must be strings');
  requireValue(action !== 'browser' || input.args?.[0] !== 'skill', 'Reusable browser scripts are no longer supported');
  const taskRoot = path.join(ctx.workspaceDir, 'engine-sessions', ctx.taskId);
  noLinks(taskRoot); fs.mkdirSync(taskRoot, { recursive: true });
  const args = (command.args || []).map(a => a.startsWith('src/') ? engineFile(engine.root, a) : a).concat(input.args || []);
  const program = process.execPath;
  const env = { ...process.env, BFS_ENGINE_SESSION:path.join(taskRoot,'own-engine'),
    PLAYWRIGHT_BROWSERS_PATH: engineFile(engine.root, engine.browserDirectory) };
  if (configured) env[command.environment] = configured;
  const timeout = input.timeoutMs ?? 120000;
  requireValue(Number.isInteger(timeout) && timeout >= 100 && timeout <= 600000, 'Engine timeout must be 100..600000 ms');
  requireValue(input.stdin === undefined || typeof input.stdin === 'string', 'Engine stdin must be text');
  const result = spawnSync(program, args, { cwd: ctx.cwd, env, input:input.stdin, encoding: 'utf8', windowsHide: true, timeout, maxBuffer: 16 * 1024 * 1024, shell: false });
  // Impeccable detect returns 2 for findings, 1 for a scan failure.
  const completed = result.status === 0 || action === 'design-detect' && input.args?.[0] === 'detect' && result.status === 2;
  return { status: completed && !result.error ? 'completed' : 'failed', exitCode: result.status ?? 1, stdout: result.stdout || '', stderr: result.stderr || '', error: result.error?.message ?? null };
}
