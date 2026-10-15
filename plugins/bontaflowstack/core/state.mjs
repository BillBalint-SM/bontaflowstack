import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const installStateFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'install-state.json');

export const digest = value => createHash('sha256').update(value).digest('hex');
export const now = () => new Date().toISOString();
export function requireValue(condition, message) { if (!condition) throw new Error(message); }
export function object(value) {
  requireValue(value && typeof value === 'object' && !Array.isArray(value), 'Expected a JSON object');
  return value;
}
export function text(value, label, max = 16000) {
  requireValue(typeof value === 'string' && value.trim() && value.length <= max, `Invalid ${label}`);
  return value;
}
export function identifier(value) {
  requireValue(typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(value), 'Invalid identifier');
  return value;
}
export function canonical(target) {
  const absolute = path.resolve(target);
  const entry = fs.lstatSync(absolute, { throwIfNoEntry: false });
  if (entry) return fs.realpathSync.native(absolute);
  const parent = path.dirname(absolute);
  requireValue(parent !== absolute, 'Path cannot be resolved');
  return path.join(canonical(parent), path.basename(absolute));
}
export function within(root, target) {
  const relative = path.relative(root, target);
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`));
}
export function noLinks(target) {
  let part = path.resolve(target);
  while (true) {
    const stat = fs.lstatSync(part, { throwIfNoEntry: false });
    requireValue(!stat?.isSymbolicLink(), `State path contains a link: ${part}`);
    const parent = path.dirname(part);
    if (parent === part) break;
    part = parent;
  }
}
export function git(cwd, args) {
  return spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8', windowsHide: true, timeout: 10000, maxBuffer: 4 * 1024 * 1024 });
}
export function dataPaths(env = process.env, platform = process.platform) {
  const home=platform!=='win32' && env.HOME && path.isAbsolute(env.HOME) ? env.HOME : os.homedir();
  if(platform==='win32') {
    const base=path.join(env.LOCALAPPDATA || path.join(home,'AppData','Local'),'BontaFlowStack');
    return {installRoot:path.join(base,'npm'),stateHome:path.join(base,'state','v2')};
  }
  if(platform==='darwin') {
    const base=path.join(home,'Library','Application Support','BontaFlowStack');
    return {installRoot:path.join(base,'npm'),stateHome:path.join(base,'state','v2')};
  }
  requireValue(platform==='linux',`Unsupported platform: ${platform}`);
  const xdg=(value,fallback)=>value && path.isAbsolute(value) ? value : path.join(home,fallback);
  return {installRoot:path.join(xdg(env.XDG_DATA_HOME,'.local/share'),'bontaflowstack','npm'),
    stateHome:path.join(xdg(env.XDG_STATE_HOME,'.local/state'),'bontaflowstack','state','v2')};
}
export function context(cwd = process.cwd(), env = process.env) {
  const location = canonical(cwd);
  requireValue(fs.statSync(location).isDirectory(), 'Project must be a directory');
  const top = git(location, ['rev-parse', '--show-toplevel']);
  const workspace = top.status === 0 ? canonical(top.stdout.trim()) : location;
  const common = top.status === 0 ? git(workspace, ['rev-parse', '--path-format=absolute', '--git-common-dir']) : null;
  const anchor = common?.status === 0 ? canonical(common.stdout.trim()) : workspace;
  const key = value => digest(process.platform === 'win32' ? value.toLowerCase() : value);
  let pinnedHome = null;
  if (!env.BFS_STATE_HOME) {
    const installed = readJson(installStateFile);
    if (installed !== null) {
      object(installed);
      requireValue(installed.schema === 1, 'Unsupported install-state schema');
      pinnedHome = text(installed.stateHome, 'installed stateHome', 4096);
      requireValue(path.isAbsolute(pinnedHome), 'Installed stateHome must be an absolute path');
    }
  }
  if(env.BFS_STATE_HOME) requireValue(typeof env.BFS_STATE_HOME==='string' && path.isAbsolute(env.BFS_STATE_HOME),'BFS_STATE_HOME must be an absolute directory');
  const home = path.resolve(env.BFS_STATE_HOME || pinnedHome || dataPaths(env).stateHome);
  const projectId = key(anchor), workspaceId = key(workspace);
  const projectDir = path.join(home, 'projects', projectId);
  const workspaceDir = path.join(projectDir, 'workspaces', workspaceId);
  const taskId = env.CODEX_THREAD_ID ? identifier(env.CODEX_THREAD_ID) : null;
  return { home, cwd: location, workspace, anchor, projectId, workspaceId, projectDir, workspaceDir, taskId, git: top.status === 0 };
}
export function readJson(file, fallback = null) {
  noLinks(file);
  if (!fs.existsSync(file)) return fallback;
  requireValue(fs.statSync(file).size <= 16 * 1024 * 1024, `State file is too large: ${file}`);
  try { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); }
  catch (error) { throw new Error(`Cannot read state ${file}: ${error.message}`); }
}
export function safeData(value) {
  const encoded = JSON.stringify(value);
  requireValue(encoded !== undefined && encoded.length <= 8 * 1024 * 1024, 'State payload is too large');
  requireValue(!/(?:-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,})|Bearer\s+[A-Za-z0-9._~+\/-]{12,}|https?:\/\/[^\s"/]+:[^\s"/]+@)/i.test(encoded), 'Remove credentials before saving');
  const visit = entry => {
    if (!entry || typeof entry !== 'object') return;
    for (const [key, child] of Object.entries(entry)) {
      requireValue(!/^(password|secret|access_token|refresh_token|api_key|authorization|cookie)$/i.test(key), 'Credential fields cannot be saved');
      visit(child);
    }
  };
  visit(value);
  return value;
}
function replaceFile(source,target) {
  const deadline = performance.now()+2000, sleeper = new Int32Array(new SharedArrayBuffer(4));
  while (true) {
    try { fs.renameSync(source,target); return; }
    catch (error) {
      const remaining = deadline-performance.now();
      if (!['EPERM','EACCES','EBUSY'].includes(error.code) || remaining <= 0) throw error;
      Atomics.wait(sleeper,0,0,Math.min(25,remaining));
    }
  }
}
export function atomicWrite(file, value) {
  safeData(value);
  writeSerialized(file,JSON.stringify(value,null,2)+'\n');
  return value;
}
export function atomicWriteText(file, value, {overwrite=false} = {}) {
  safeData({text:value});
  requireValue(typeof value === 'string', 'Expected UTF-8 text');
  writeSerialized(file,value,!overwrite);
  return value;
}
function writeSerialized(file, serialized, createOnly=false) {
  noLinks(file);
  fs.mkdirSync(path.dirname(file), { recursive: true, mode:0o700 });
  noLinks(file);
  const previous = fs.existsSync(file) ? fs.readFileSync(file) : null;
  if (previous?.equals(Buffer.from(serialized))) return;
  requireValue(!createOnly || !previous, 'Output already exists; select a new file or explicit overwrite');
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    const fd = fs.openSync(temporary, 'wx', 0o600);
    try { fs.writeFileSync(fd, serialized); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    requireValue(fs.readFileSync(temporary, 'utf8') === serialized, 'Temporary write verification failed');
    // Create-only publication must reject a destination created by another writer.
    // Same-directory hardlink publication is atomic; unsupported filesystems fail visibly.
    if(createOnly)fs.linkSync(temporary,file);else replaceFile(temporary, file);
    try { requireValue(fs.readFileSync(file, 'utf8') === serialized, 'Saved data verification failed'); }
    catch (error) {
      if (previous) {
        fs.writeFileSync(temporary, previous, { flag: 'wx', mode: 0o600 });
        replaceFile(temporary, file);
      } else fs.unlinkSync(file);
      throw error;
    }
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}
export function changeJson(file, fallback, update) {
  noLinks(file);
  fs.mkdirSync(path.dirname(file), { recursive: true, mode:0o700 });
  const lock = `${file}.lock`;
  const deadline = performance.now() + 2000;
  const sleeper = new Int32Array(new SharedArrayBuffer(4));
  while (true) {
    try { fs.mkdirSync(lock,{mode:0o700}); break; }
    catch (error) {
      if (error.code !== 'EEXIST' && error.code !== 'EPERM') throw error;
      const remaining = deadline - performance.now();
      if (remaining <= 0) {
        if (error.code === 'EPERM') throw error;
        throw new Error(`State is being changed by another process; retry: ${file}`, { cause: error });
      }
      Atomics.wait(sleeper, 0, 0, Math.min(25, remaining));
    }
  }
  try { return atomicWrite(file, update(readJson(file, fallback))); }
  finally { fs.rmdirSync(lock); }
}
export function fingerprints(ctx, files = []) {
  requireValue(Array.isArray(files) && files.length <= 500, 'Expected at most 500 file paths');
  return files.map(item => {
    const given = typeof item === 'string' ? item : item.path;
    const file = canonical(path.resolve(ctx.workspace, text(given, 'file path', 4096)));
    requireValue(within(ctx.workspace, file), 'Evidence file is outside the workspace');
    const stat = fs.statSync(file, { throwIfNoEntry: false });
    requireValue(!stat || stat.isFile(), 'Evidence inputs must be files');
    return { path: path.relative(ctx.workspace, file).replaceAll('\\', '/'), sha256: stat ? digest(fs.readFileSync(file)) : null };
  });
}
export function drift(ctx, entries = []) {
  return entries.flatMap(entry => {
    try { const current = fingerprints(ctx, [entry.path])[0]; return current.sha256 === entry.sha256 ? [] : [{ ...entry, current: current.sha256 }]; }
    catch (error) { return [{ ...entry, error: error.message }]; }
  });
}
export function filesIn(directory) {
  noLinks(directory);
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).filter(x => x.isFile() && x.name.endsWith('.json')).map(x => path.join(directory, x.name));
}
