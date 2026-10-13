import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkLocalLinks } from '../scripts/check.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(repo, 'plugins', 'bontaflowstack');
const catalog = JSON.parse(fs.readFileSync(path.join(source, 'catalog.json'), 'utf8'));
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'bfs-claude-package-'));
const output = path.join(temp, 'package');

try {
  const built = spawnSync(process.execPath, [path.join(repo, 'scripts', 'build-claude-package.mjs'), '--output', output], { encoding: 'utf8' });
  assert.equal(built.status, 0, built.stderr);
  const manifest = JSON.parse(fs.readFileSync(path.join(output, '.claude-plugin', 'plugin.json'), 'utf8'));
  const marketplace = JSON.parse(fs.readFileSync(path.join(output, '.claude-plugin', 'marketplace.json'), 'utf8'));
  const mcp = JSON.parse(fs.readFileSync(path.join(output, '.mcp.json'), 'utf8'));
  const hooks = JSON.parse(fs.readFileSync(path.join(output, 'hooks', 'hooks.json'), 'utf8'));
  assert.equal(manifest.version, catalog.version);
  for (const field of ['skills', 'hooks', 'mcpServers']) assert.equal(manifest[field], undefined, `${field} uses Claude default discovery`);
  assert.equal(marketplace.name, 'bontaflowstack-local');
  assert.equal(marketplace.plugins[0].source, '.');
  assert.equal(marketplace.plugins[0].version, manifest.version);
  assert.equal(catalog.skills.length, 34);
  for (const skill of catalog.skills) {
    const file = path.join(output, 'skills', skill.id, 'SKILL.md');
    assert.ok(fs.statSync(file).isFile(), `missing ${skill.id}/SKILL.md`);
    const generated = fs.readFileSync(file, 'utf8');
    const canonical = fs.readFileSync(path.join(source, 'skills', skill.id, 'SKILL.md'), 'utf8');
    if (skill.id === 'bfs-guard') {
      assert.equal(generated, canonical.replace(/^---\n(name: bfs-guard\ndescription: .+\n)---\n/, '---\n$1disable-model-invocation: true\n---\n'));
    } else if (skill.id === 'bfs-router') {
      assert.equal(generated, canonical
        .replace('read existing `AGENTS.md`, `docs/agents/issue-tracker.md`', 'read existing `AGENTS.md`, `CLAUDE.md`, `docs/agents/issue-tracker.md`')
        .replace('Add only missing AGENTS links;', 'Add only missing AGENTS.md/CLAUDE.md links;'));
    } else if (skill.id === 'bfs-design-consultation') {
      assert.match(generated, /Claude image understanding/);
      assert.match(generated, /Raster generation\/editing is outside this package's accepted scope/);
      assert.doesNotMatch(generated, /Codex|raster generation tools/);
    } else if (skill.id === 'bfs-design-html') {
      assert.match(generated, /Claude image understanding/);
      assert.match(generated, /Raster image generation and editing are outside this package's accepted scope/);
      assert.doesNotMatch(generated, /Codex image tool/);
    } else assert.equal(generated, canonical);
  }
  for (const directory of ['references', 'skills']) {
    const list = root => fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
      ? list(path.join(root, entry.name)).map(file => path.join(entry.name, file)) : [entry.name])
      .filter(file => !file.replaceAll(path.sep, '/').endsWith('agents/openai.yaml')).sort();
    assert.deepEqual(list(path.join(output, directory)), list(path.join(source, directory)));
  }
  for (const alias of Object.values(catalog.aliases)) assert.ok(catalog.skills.some(skill => skill.id === alias.skill));
  assert.ok(fs.existsSync(path.join(output, '.claude-plugin', 'plugin.json')));
  assert.ok(!fs.existsSync(path.join(output, '.codex-plugin')));
  assert.ok(!fs.existsSync(path.join(output, 'skills', 'bfs-router', 'agents', 'openai.yaml')));
  assert.equal(mcp.mcpServers.bfs.command, 'node');
  assert.deepEqual(mcp.mcpServers.bfs.args, ['${CLAUDE_PLUGIN_ROOT}/core/claude-host.mjs']);
  assert.ok(fs.statSync(path.join(output, 'core', 'claude-host.mjs')).isFile());
  assert.ok(fs.statSync(path.join(output, 'core', 'claude-hook.mjs')).isFile());
  const doctor = spawnSync(process.execPath, [path.join(output, 'core/cli.mjs'), 'doctor'], { encoding: 'utf8' });
  assert.equal(doctor.status, 0, doctor.stderr);
  assert.match(JSON.parse(doctor.stdout).hooks.reason, /Claude Code/);
  assert.deepEqual(Object.keys(hooks.hooks).sort(), ['PostToolUseFailure', 'PreToolUse', 'SessionEnd', 'SessionStart', 'Stop', 'StopFailure', 'SubagentStop', 'UserPromptSubmit'].sort());
  for (const [event, entries] of Object.entries(hooks.hooks)) for (const entry of entries) for (const hook of entry.hooks) {
    assert.equal(hook.type, 'command');
    assert.equal(hook.command, 'node');
    assert.deepEqual(hook.args, ['${CLAUDE_PLUGIN_ROOT}/core/claude-hook.mjs', event]);
  }
  assert.equal(hooks.hooks.PreToolUse[0].hooks[0].onFailure, 'block', 'guard failure must block native tool execution');
  const markdown = root => fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? markdown(path.join(root, entry.name)) : entry.name.endsWith('.md') ? [path.join(root, entry.name)] : []);
  for (const file of markdown(output)) checkLocalLinks(file);
  const browserSource = fs.readFileSync(path.join(source, 'references', 'browser.md'), 'utf8');
  assert.ok(fs.readFileSync(path.join(output, 'references', 'browser.md'), 'utf8').includes(browserSource.match(/^## Removed browser scripts\n[\s\S]*?(?=^## )/m)[0]));
  for (const file of [...markdown(output), path.join(output, 'scripts', 'setup.ps1')]) {
    const content = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(content, /Codex|CODEX_THREAD_ID|(?:^|[\s`])\/hooks\b|bfs-browser/, `Codex-specific runtime instruction remains in ${path.relative(output, file)}`);
  }
  assert.match(fs.readFileSync(path.join(output, 'references', 'commands.md'), 'utf8'), /Call the `bfs` MCP `core` tool/);
  assert.doesNotMatch(fs.readFileSync(path.join(output, 'references', 'commands.md'), 'utf8'), /node <plugin>\/core\/cli\.mjs/);
  assert.match(fs.readFileSync(path.join(output, 'references', 'capabilities.md'), 'utf8'), /Raster image generation and editing are outside this package's accepted scope/);

  const occupied = spawnSync(process.execPath, [path.join(repo, 'scripts', 'build-claude-package.mjs'), '--output', output], { encoding: 'utf8' });
  assert.notEqual(occupied.status, 0);
  assert.match(occupied.stderr, /Output already exists/);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
