import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { changeJson, readJson, requireValue, canonical, within, digest, now, identifier } from './state.mjs';
import { contextHook } from './context.mjs';
import { parseBash } from './parse-bash.mjs';

const parser = fileURLToPath(new URL('./parse-command.ps1', import.meta.url));
const blank = () => ({ schema: 1, warnings: false, boundary: null });
function stateFile(ctx) {
  requireValue(ctx.taskId, 'Guard requires the real Codex task ID');
  return path.join(ctx.workspaceDir, 'tasks', `${ctx.taskId}.guard.json`);
}
function valid(state) {
  requireValue(state?.schema === 1 && typeof state.warnings === 'boolean' && (state.boundary === null || typeof state.boundary === 'string'), 'Invalid guard state');
  return state;
}
const marker = ctx => `BFS_GUARD_OBSERVED task=${ctx.taskId} workspace=${ctx.workspaceId}`;
export function guard(ctx, action, input = {}) {
  const file = stateFile(ctx);
  const current = valid(readJson(file, blank()));
  const observed = readJson(`${file}.observed.json`);
  const fresh = observed?.taskId === ctx.taskId && observed.workspaceId === ctx.workspaceId && Date.now() - Date.parse(observed.at) < 300000;
  if (action === 'status') return { ...current, taskId: ctx.taskId, workspaceId: ctx.workspaceId, hookObservedRecently: !!fresh,
    coverage: ['apply_patch paths', 'Edit/Write paths', 'recognized destructive shell commands'], limitation: 'Not an operating-system sandbox; arbitrary shell writes are outside edit-boundary coverage.' };
  requireValue(fresh && input.observation === marker(ctx), 'Use the matching marker from an actual native PreToolUse event before changing guard state');
  return changeJson(file, blank(), state => {
    valid(state);
    if (action === 'set') {
      if (input.warnings !== undefined) { requireValue(typeof input.warnings === 'boolean', 'warnings must be boolean'); state.warnings = input.warnings; delete state.pending; delete state.approved; }
      if (input.boundary !== undefined) {
        if (input.boundary === null) state.boundary = null;
        else {
          const boundary = canonical(path.resolve(ctx.workspace, input.boundary));
          requireValue(within(ctx.workspace, boundary) && fs.statSync(boundary).isDirectory(), 'Boundary must be an existing project directory');
          state.boundary = boundary;
        }
      }
    } else if (action === 'release') state.boundary = null;
    else if (action === 'off') { state.warnings = false; state.boundary = null; delete state.pending; delete state.approved; }
    else if (action === 'approve') {
      requireValue(state.pending?.id === input.id && Date.now() - Date.parse(state.pending.at) < 300000, 'Select a fresh pending command');
      requireValue(typeof input.confirmation === 'string' && input.confirmation.trim(), 'Record the actual user authorization for this exact operation');
      state.approved = state.pending.id;
    }
    else throw new Error(`Unknown guard action: ${action}`);
    state.updatedAt = now();
    return state;
  });
}
export function classify(command, cwd, root, shell = '') {
  cwd = canonical(cwd); root = canonical(root);
  // ponytail: only exact read-only status commands skip the measured parser startup;
  // keep all other syntax in the native parser, extend only for measured frequent reads.
  const bash = typeof shell === 'string' && /(?:^|[\\/])bash(?:\.exe)?$/i.test(shell.trim());
  const powershell = typeof shell === 'string' && /(?:^|[\\/])(?:powershell|pwsh)(?:\.exe)?$/i.test(shell.trim());
  if(!bash && !powershell && (shell || process.platform!=='win32')) return {decision:'ask',reason:'This shell is not supported by the command inspector; inspect the command before execution'};
  if (!bash && /^git status(?: --short| --porcelain)?\s*$/i.test(command)) return null;
  let parsed;
  if (bash) parsed = parseBash(command);
  else {
    const result = spawnSync(process.platform === 'win32' ? 'powershell.exe' : 'pwsh', ['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',parser],
      { input: command, encoding: 'utf8', windowsHide: true, timeout: 8000, maxBuffer: 1024 * 1024 });
    if (result.error || result.status !== 0) return { decision: 'ask', reason: 'Command could not be inspected while guard warnings are enabled' };
    parsed = JSON.parse(result.stdout);
  }
  if (!parsed.valid) return { decision: 'ask', reason: 'Command syntax is outside the supported parser; inspect it before execution' };
  for (const item of parsed.commands) {
    const name = path.basename(item.name || '').replace(/\.exe$/i, '').toLowerCase();
    const args = item.args.map(String), joined = args.join(' ');
    if (['remove-item','rm','ri','rmdir','rd','del','erase','clear-content','format-volume','format','remove-itemproperty'].includes(name)) {
      const recursive = args.some(a => /^(?:-r(?:ecurse)?|-[^-]*r[^-]*|\/s)$/i.test(a));
      const targets = args.filter(a => !a.startsWith('-') && !/^\/[sq]$/i.test(a));
      for (const target of targets) {
        if (/[$*?{}]/.test(target)) continue;
        try {
          const resolved = canonical(path.resolve(cwd, target.replace(/^\/([a-z])\//i, '$1:/')));
          if (recursive && within(resolved, root)) return { decision: 'deny', reason: 'Recursive deletion of the project or an ancestor is blocked by guard' };
        } catch { /* Unresolved targets still require a real decision below. */ }
      }
      return { decision: 'ask', reason: 'This command removes or clears data; confirm the exact command and target' };
    }
    if (name === 'git') {
      const rest = [...args];
      while (rest[0]?.startsWith('-')) {
        const option = rest.shift();
        if (['-C','-c','--git-dir','--work-tree','--namespace','--config-env'].includes(option)) rest.shift();
      }
      const verb = rest.shift();
      const separator = rest.indexOf('--'), flags = rest.slice(0,separator < 0 ? rest.length : separator);
      const has = (long,short) => flags.includes(long) || flags.some(a => /^-[^-]/.test(a) && a.slice(1).includes(short));
      if ((verb === 'reset' && flags.includes('--hard')) || (verb === 'clean' && has('--force','f')) ||
          (verb === 'push' && rest.some(a => /^--force(?:-with-lease|-if-includes)?(?:=|$)|^-f$|^\+/.test(a))) ||
          (verb === 'branch' && (flags.some(a => /^-[^-]*D/.test(a)) || (has('--delete','d') && has('--force','f')))) ||
          (verb === 'restore' && !has('--help','h') && (has('--worktree','W') || !has('--staged','S'))) ||
          (verb === 'checkout' && separator >= 0 && separator < rest.length - 1)) {
        return { decision: 'ask', reason: 'This Git command can discard work or rewrite remote history; confirm its exact scope' };
      }
    }
    if (!name || ['iex','invoke-expression'].includes(name) ||
        (bash && (['eval','source','.','sudo','doas','command','builtin','env','exec','nohup','xargs','time','nice','timeout','setsid','bash','sh'].includes(name) ||
          (name === 'find' && args.some(a => ['-exec','-execdir','-delete'].includes(a))))) ||
        /(?:encodedcommand|frombase64string)/i.test(joined)) return { decision: 'ask', reason: 'Dynamic command execution needs inspection while guard warnings are enabled' };
    if (['cmd','powershell','pwsh','bash','sh'].includes(name) && /(?:^|\s)(?:-c|-command|\/c)\s/i.test(joined)) return { decision: 'ask', reason: 'Inspect the nested shell command before execution' };
  }
  if (/\b(?:drop\s+(?:database|table)|truncate\s+table|kubectl\s+delete|terraform\s+destroy)\b/i.test(command)) return { decision: 'ask', reason: 'This operation may destroy service data or infrastructure' };
  return null;
}
export function preTool(ctx, event) {
  requireValue(event.hook_event_name === 'PreToolUse' && event.session_id === ctx.taskId && typeof event.tool_name === 'string', 'Invalid native hook identity');
  const file = stateFile(ctx), state = valid(readJson(file, blank()));
  const args = event.tool_input;
  requireValue(args && typeof args === 'object' && !Array.isArray(args), 'Malformed native tool input');
  const observed = readJson(`${file}.observed.json`);
  if (!observed || Date.now() - Date.parse(observed.at) > 30000) changeJson(`${file}.observed.json`, null, current =>
    current?.taskId === ctx.taskId && current.workspaceId === ctx.workspaceId && Date.now() - Date.parse(current.at) <= 30000
      ? current : { taskId: ctx.taskId, workspaceId: ctx.workspaceId, at: now(), package: '0.6.0' });
  const hook = { hookEventName: 'PreToolUse', additionalContext: marker(ctx)+contextHook(ctx) };
  const response = (decision, reason) => ({ hookSpecificOutput: { ...hook, permissionDecision: decision, permissionDecisionReason: reason } });
  const tool = event.tool_name;
  if (state.boundary) {
    const current = canonical(state.boundary);
    if (current !== state.boundary || !within(ctx.workspace, current) || !fs.statSync(current, { throwIfNoEntry: false })?.isDirectory()) return response('deny', 'The edit boundary changed; establish it again');
    let targets = [];
    if (/(?:^|[._])(?:apply_patch)$/.test(tool)) {
      const patch = args.command ?? args.input ?? args.patch;
      requireValue(typeof patch === 'string', 'Missing patch input');
      targets = [...patch.matchAll(/^\*\*\* (?:Add File|Update File|Delete File|Move to): (.+)$/gm)].map(m => m[1].trim());
      requireValue(targets.length, 'Patch target paths could not be inspected');
    } else if (['Edit','Write'].includes(tool) || /(?:^|[._])(?:write_file|edit_file)$/.test(tool)) targets = [args.file_path ?? args.path];
    for (const target of targets) {
      requireValue(typeof target === 'string', 'Missing edit target');
      if (!within(current, canonical(path.resolve(event.cwd, target)))) return response('deny', 'Edit target is outside the active boundary');
    }
  }
  if (state.warnings && (tool === 'Bash' || tool === 'PowerShell' || /(?:^|[._])exec_command$/.test(tool))) {
    const command = args.cmd ?? args.command;
    requireValue(typeof command === 'string', 'Missing shell command');
    const shell = tool === 'Bash' ? 'bash' : tool === 'PowerShell' ? 'powershell' : args.shell;
    const decision = classify(command, args.workdir || event.cwd, ctx.workspace, shell);
    if (decision?.decision === 'deny') return response('deny',decision.reason);
    if (decision) {
      const key = digest(JSON.stringify([ctx.taskId,ctx.workspaceId,event.cwd,tool,args]));
      let permitted = false, pending;
      changeJson(file,blank(),current => {
        valid(current);
        if (current.pending?.key === key && current.approved === current.pending.id && Date.now() - Date.parse(current.pending.at) < 300000) {
          delete current.pending; delete current.approved; permitted = true;
        } else {
          pending = {id:randomUUID(),key,at:now()}; current.pending = pending; delete current.approved;
        }
        return current;
      });
      if (!permitted) return response('deny',`${decision.reason}. This call has not run. After the user's authorization for this exact operation, use guard approve with pending ID ${pending.id}, then retry the unchanged call once.`);
    }
  }
  return { hookSpecificOutput: hook };
}
