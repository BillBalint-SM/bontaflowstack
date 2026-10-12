#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { context, readJson, object, requireValue, digest } from './state.mjs';
import { workflow, stopWorkflows } from './workflow.mjs';
import { memory, preferences } from './memory.mjs';
import { guard, preTool } from './guard.mjs';
import { engines } from './engines.mjs';
import { delivery } from './delivery.mjs';
import { pluginRoot, loadCatalog, resolveSkill, selection } from './catalog.mjs';
import { essentialContext, contextForRead } from './context.mjs';
import { handoff } from './handoff.mjs';
import { tasks } from './tasks.mjs';

export { pluginRoot, loadCatalog, resolveSkill } from './catalog.mjs';
function inputArgs(argv) {
  const args = [...argv];
  let input = {};
  const index = args.indexOf('--input');
  if (index >= 0) {
    const file = args[index + 1]; requireValue(file, '--input requires a JSON file or - for stdin');
    input = object(JSON.parse((file === '-' ? fs.readFileSync(0,'utf8') : fs.readFileSync(file,'utf8')).replace(/^\uFEFF/,'')));
    args.splice(index,2);
  }
  return { args, input };
}
export function run(argv, {context: hostContext, input: hostInput} = {}) {
  requireValue(hostInput === undefined || !argv.includes('--input'), 'Supply JSON input once');
  const parsed = inputArgs(argv), args = parsed.args, input = hostInput === undefined ? parsed.input : object(hostInput);
  const [command = 'doctor', action, ...extra] = args;
  if (command === 'hook') {
    const event = Object.keys(input).length ? input : object(JSON.parse(fs.readFileSync(0,'utf8').replace(/^\uFEFF/,'')));
    requireValue(path.isAbsolute(event.cwd || ''), 'Native hook requires an absolute working directory');
    const ctx = context(event.cwd, { ...process.env, CODEX_THREAD_ID:event.session_id });
    if (process.env.CODEX_THREAD_ID) requireValue(process.env.CODEX_THREAD_ID === event.session_id, 'Native hook task ID mismatch');
    if (action === 'pretool') return preTool(ctx,event);
    requireValue(action === 'stop' && event.hook_event_name === 'Stop', 'Unsupported hook event');
    stopWorkflows(ctx);
    return {};
  }
  if (command === 'help' || command === '--help') return {
    usage:'node core/cli.mjs <command> <action> [--input file.json|-]',
    commands:{ catalog:'list|resolve <skill>', read:'<skill>', context:'show', doctor:'[skill]', workflow:'start|begin|step|list|resume|adopt|save|pause|discard|checkpoints|import-legacy|export|import-handoff',
      memory:'list|search|put|status|history|prune|stats|export|import-legacy', tasks:'list|validate|create|status|bind|record|integrate|adopt', preferences:'inspect|effective|set|reset|profile|enable|question|stats|propose|apply',
      guard:'status|set|release|off|approve', engine:'status|register|browser|render|design|design-md|design-detect|pretext', delivery:'status|queue|version|config|evidence|verify|report', hook:'pretool|stop' }
  };
  const catalog = loadCatalog();
  if (command === 'catalog') return action === 'resolve' ? resolveSkill(extra[0] || input.skill,catalog) : catalog;
  const ctx = hostContext ?? context();
  if (command === 'read') {
    const skill = resolveSkill(action || input.skill,catalog);
    const source = fs.readFileSync(path.join(pluginRoot,'skills',skill.id,'SKILL.md'),'utf8');
    const host = fs.readFileSync(path.join(pluginRoot,'HOST.md'),'utf8'), hostSha256 = digest(host);
    requireValue(input.knownHostSha256 === undefined || /^[a-f0-9]{64}$/.test(input.knownHostSha256), 'Invalid known HOST SHA-256');
    return { skill:skill.id, ...selection(skill,{mode:skill.mode,coverage:input.mode === undefined ? skill.coverage : undefined,...input}), hostSha256,
      ...(input.knownHostSha256 === hostSha256 ? {} : {host}), instructions:source, contentSha256:digest(source), context:contextForRead(ctx,catalog) };
  }
  if (command === 'context') { requireValue(action === 'show', 'Unknown context action'); return essentialContext(ctx,catalog); }
  if (command === 'doctor' || command === 'check') {
    const engine = engines(ctx,'status');
    const skill = action ? resolveSkill(action,catalog) : null;
    if (skill) Object.assign(skill,selection(skill,{mode:skill.mode,coverage:input.mode === undefined ? skill.coverage : undefined,...input}));
    else requireValue(input.coverage === undefined && input.mode === undefined, 'Select a skill for mode or coverage');
    const requirements = skill?.modes[skill.mode] || [];
    const missing = requirements.filter(name => !engine.capabilities[name]?.ready);
    let hooks = { observed: false, reason: ctx.host === 'claude-code' ? 'Enable the Claude plugin hooks and verify a native PreToolUse event in this session.' : 'Review and trust the plugin hooks with /hooks, then use a new Codex chat.' };
    if (ctx.taskId) {
      try { hooks.observed = guard(ctx,'status').hookObservedRecently; } catch (error) { hooks.reason = error.message; }
    }
    if (skill?.id === 'bfs-guard' && !hooks.observed) missing.push('native-guard-hook');
    const version = Number(process.versions.node.split('.')[0]);
    return { core:{ ready:version >= 24, node:process.version }, skill:skill?.id || null, mode:skill?.mode || null,
      ...(skill?.coverage ? {coverage:skill.coverage, ...(skill.baseline ? {baseline:skill.baseline} : {}), ...(skill.diffBase ? {diffBase:skill.diffBase} : {})} : {}),
      ready:version >= 24 && !missing.length, missing, hooks, engines:engine, projectId:ctx.projectId, workspaceId:ctx.workspaceId, git:ctx.git, skillCount:catalog.skills.length };
  }
  if (command === 'workflow') return ['export','import-handoff'].includes(action) ? handoff(ctx,action,input,catalog) : workflow(ctx,action,input,catalog);
  if (command === 'memory') return memory(ctx,action,input);
  if (command === 'tasks') return tasks(ctx,action,input,catalog);
  if (command === 'preferences') return preferences(ctx,action,input);
  if (command === 'guard') return guard(ctx,action,input);
  if (command === 'engine') return engines(ctx,action,{ ...input, args:input.args || extra.filter((v,i) => !(i === 0 && v === '--')) });
  if (command === 'delivery') return delivery(ctx,action,input);
  throw new Error(`Unknown command: ${command}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = run(process.argv.slice(2));
    process.stdout.write(JSON.stringify(result) + '\n');
    if (result?.exitCode) process.exitCode = result.exitCode;
    else if (result?.ready === false || result?.valid === false || result?.status === 'failed') process.exitCode = 1;
  } catch (error) {
    if (process.argv[2] === 'hook') {
      if (process.argv[3] === 'stop') { process.stderr.write(`BFS stop state could not be saved: ${error.message}\n`); process.stdout.write('{}\n'); }
      else {
        process.stdout.write(JSON.stringify({ hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:'deny',permissionDecisionReason:`BFS guard could not inspect this event: ${error.message}`} })+'\n');
        process.exitCode = 2;
      }
    } else {
      process.stderr.write(JSON.stringify({ status:'failed',error:error.message })+'\n');
      process.exitCode = error.exitCode || 1;
    }
  }
}
