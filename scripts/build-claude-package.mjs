#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(repo, 'plugins', 'bontaflowstack');
const template = path.join(repo, 'adapters', 'claude-code');
const within = (root, target) => {
  const relative = path.relative(root, target);
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`));
};

function usage() {
  return 'Usage: node scripts/build-claude-package.mjs --output <new-directory>';
}

function build(outputValue) {
  if (!outputValue) throw new Error(usage());
  const output = path.resolve(outputValue);
  if (fs.existsSync(output)) throw new Error(`Output already exists; choose a new directory: ${output}`);
  const missing = [];
  let ancestor = path.dirname(output);
  while (!fs.existsSync(ancestor)) { missing.unshift(path.basename(ancestor)); ancestor = path.dirname(ancestor); }
  const projected = path.join(fs.realpathSync(ancestor), ...missing, path.basename(output));
  if (within(fs.realpathSync(source), projected)) throw new Error('Output must be outside the canonical Codex plugin tree');
  for (const entry of ['core/claude-host.mjs', 'core/claude-hook.mjs']) {
    if (!fs.statSync(path.join(source, entry), { throwIfNoEntry: false })?.isFile()) throw new Error(`Claude runtime entry is missing: ${entry}`);
  }

  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.cpSync(source, output, { recursive: true, errorOnExist: true, force: false });
  fs.rmSync(path.join(output, '.codex-plugin'), { recursive: true, force: true });
  fs.mkdirSync(path.join(output, '.claude-plugin'), { recursive: true });

  const catalog = JSON.parse(fs.readFileSync(path.join(source, 'catalog.json'), 'utf8'));
  const manifestTemplate = fs.readFileSync(path.join(template, 'plugin.json'), 'utf8');
  const manifest = manifestTemplate.replaceAll('{{VERSION}}', catalog.version);
  if (manifest.includes('{{')) throw new Error('Unresolved Claude manifest template marker');
  fs.writeFileSync(path.join(output, '.claude-plugin', 'plugin.json'), manifest, { flag: 'wx' });
  const marketplace = fs.readFileSync(path.join(template, 'marketplace.json'), 'utf8').replaceAll('{{VERSION}}', catalog.version);
  if (marketplace.includes('{{')) throw new Error('Unresolved Claude marketplace template marker');
  fs.writeFileSync(path.join(output, '.claude-plugin', 'marketplace.json'), marketplace, { flag: 'wx' });
  fs.writeFileSync(path.join(output, '.mcp.json'), fs.readFileSync(path.join(template, 'mcp.json')), { flag: 'w' });
  fs.writeFileSync(path.join(output, 'hooks', 'hooks.json'), fs.readFileSync(path.join(template, 'hooks.json')), { flag: 'w' });

  const replaceOnce = (file, before, after, label) => {
    const content = fs.readFileSync(file, 'utf8'), first = content.indexOf(before);
    if (first < 0 || content.indexOf(before, first + before.length) >= 0) throw new Error(`Expected one ${label} in ${path.relative(output, file)}`);
    fs.writeFileSync(file, content.slice(0, first) + after + content.slice(first + before.length));
  };
  const replaceSection = (file, pattern, after, label) => {
    const content = fs.readFileSync(file, 'utf8'), match = content.match(pattern);
    if (!match) throw new Error(`Could not locate ${label} in ${path.relative(output, file)}`);
    fs.writeFileSync(file, content.replace(pattern, after));
  };
  const removeMatching = (directory, predicate) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) removeMatching(file, predicate);
      else if (predicate(file)) fs.rmSync(file);
    }
  };

  const guardSkill = path.join(output, 'skills', 'bfs-guard', 'SKILL.md');
  const guardSource = fs.readFileSync(guardSkill, 'utf8');
  const guardFrontmatter = /^---\n(name: bfs-guard\ndescription: .+\n)---\n/;
  if (!guardFrontmatter.test(guardSource)) throw new Error('Unexpected bfs-guard frontmatter; refusing to drop its explicit invocation policy');
  fs.writeFileSync(guardSkill, guardSource.replace(guardFrontmatter, '---\n$1disable-model-invocation: true\n---\n'));

  const hostFile = path.join(output, 'HOST.md');
  const hostShared = fs.readFileSync(hostFile, 'utf8');
  const hostTemplate = fs.readFileSync(path.join(template, 'HOST.md'), 'utf8').trim();
  const hostSection = /^# BontaFlowStack execution contract[\s\S]*?(?=^## Task scope and results\n)/m;
  if (!hostSection.test(hostShared)) throw new Error('Could not locate the canonical HOST execution section');
  fs.writeFileSync(hostFile, hostShared.replace(hostSection, `${hostTemplate}\n\n`));
  replaceOnce(hostFile,
    'Browser and render use this plugin\'s separately enabled `bfs-browser` MCP tools;\nthe host supplies the thread identity and selected workspace. Use that workspace\nor select a directory inside it with `select_project`. A directory outside the\nhost workspace requires human confirmation. Keep Chromium\'s sandbox enabled.\nDo not replace a disabled connection with an MXC shell launch. Requested local\ninput/output files stay inside the host-selected project.',
    'Browser and render use this package\'s `bfs` MCP tools. The host supplies the session identity and selected workspace. Use that workspace or select a directory inside it with `select_project`. A directory outside the host workspace requires human confirmation through MCP elicitation. Keep Chromium\'s sandbox enabled. Requested local input/output files stay inside the host-selected project.', 'Codex browser host wording');
  replaceOnce(hostFile,
    'Codex `/hooks` review grants trust for new or changed hooks; never edit trust\nrecords or bypass review.',
    'Claude Code loads hooks from the installed plugin. Verify a real PreToolUse event before relying on native guard enforcement; never edit host trust records or bypass plugin review.', 'Codex hook trust wording');
  replaceSection(hostFile, /^## Optional capabilities\n[\s\S]*?(?=^## Guard\n)/m,
    '## Optional capabilities\n\nRead [capabilities](references/capabilities.md) before using an optional engine or external design tool. Missing capability blocks only the affected operation. The Claude adapter supplies the native task identity. For browser operations also read [browser](references/browser.md).\n\n', 'optional capability section');

  const commandsFile = path.join(output, 'references', 'commands.md');
  replaceOnce(commandsFile,
    'Run from the selected project. JSON requests use `--input <file>` or `--input -`\non `node <plugin>/core/cli.mjs`. The PowerShell launcher takes `-Command`,\n`-Action`, `-Skill` and `-InputFile`. `help` lists available actions.',
    'Call the `bfs` MCP `core` tool from the selected Claude task. Pass the CLI command and action as `args`, for example `args: ["workflow", "list"]`; pass the JSON request object separately in `input`. Do not invoke the core CLI directly because the native hook binds calls to the active Claude session and workspace. `args: ["help"]` lists available actions.', 'Codex core invocation');
  replaceOnce(commandsFile,
    'Image generation/editing uses the host\'s Codex image tool. `engine design` is local:',
    'Claude image understanding can inspect supplied assets; raster generation and editing are outside this package\'s accepted scope. Author HTML/SVG or use supplied assets. `engine design` is local:', 'Codex image capability wording');
  replaceOnce(path.join(output, 'references', 'guard.md'),
    'New or changed hooks require Codex `/hooks` review; preserve host trust records.',
    'Plugin hooks load from the Claude package. Verify a real native PreToolUse event before changing guard state; preserve host trust records.', 'Codex guard trust wording');
  fs.copyFileSync(path.join(template, 'browser.md'), path.join(output, 'references', 'browser.md'));
  fs.copyFileSync(path.join(template, 'capabilities.md'), path.join(output, 'references', 'capabilities.md'));
  replaceOnce(path.join(output, 'skills', 'bfs-router', 'SKILL.md'),
    'read existing `AGENTS.md`, `docs/agents/issue-tracker.md`, `docs/agents/domain.md` and glossary/context/ADR pointers.',
    'read existing `AGENTS.md`, `CLAUDE.md`, `docs/agents/issue-tracker.md`, `docs/agents/domain.md` and glossary/context/ADR pointers.', 'project instruction discovery');
  replaceOnce(path.join(output, 'skills', 'bfs-router', 'SKILL.md'),
    'Add only missing AGENTS links;', 'Add only missing AGENTS.md/CLAUDE.md links;', 'project instruction links');
  replaceOnce(path.join(output, 'skills', 'bfs-design-consultation', 'SKILL.md'),
    '1. Read brief, audience, content, existing UI and decisions; establish impression and constraints. Consultation needs no engine. Check render capability for HTML and Codex image-tool availability for images.',
    '1. Read brief, audience, content, existing UI and decisions; establish impression and constraints. Consultation needs no engine. Use Claude image understanding for supplied references when available; authored HTML/SVG and supplied assets are supported visual outputs. Raster generation/editing is outside this package\'s accepted scope. Check render readiness only when HTML output needs it.', 'Codex image availability instruction');
  replaceOnce(path.join(output, 'skills', 'bfs-design-consultation', 'SKILL.md'),
    '4. For images, use Codex\'s current image tool and its reference/output rules; inspect local originals before editing. If unavailable, report it and offer HTML variants without claiming generated images. Use engine design compare for a comparison board and design select for the actual user choice.',
    '4. For supplied image references, use Claude image understanding to inspect them. Create visual alternatives as authored HTML/SVG boards using supplied assets. Raster generation and editing are outside this package\'s accepted scope. Use engine design compare for a comparison board and design select for the actual user choice.', 'Codex image generation instruction');
  replaceOnce(path.join(output, 'skills', 'bfs-design-html', 'SKILL.md'),
    'For image-to-code work, inspect the supplied image with the host\'s image viewing capability and distinguish visible properties from inferred behavior. Requested image generation or editing uses Codex\'s image tool through bfs-design-consultation, without separate API credentials.',
    'For image-to-code work, use Claude image understanding to inspect supplied images and distinguish visible properties from inferred behavior. Use supplied assets or author HTML/SVG visuals. Raster image generation and editing are outside this package\'s accepted scope.', 'Codex image-to-code instruction');
  removeMatching(path.join(output, 'skills'), file => path.basename(file) === 'openai.yaml');
  replaceOnce(path.join(output, 'core', 'cli.mjs'),
    'Review and trust the plugin hooks with /hooks, then use a new Codex chat.',
    'Open a Claude Code session and verify a native PreToolUse event.', 'standalone setup doctor hint');
  const setup = path.join(output, 'scripts', 'setup.ps1');
  replaceOnce(setup,
    "Write-Host 'Setup complete. In Codex, use $bfs-router. Installed plugin changes are loaded in a new chat.'",
    "Write-Host 'Setup complete. In Claude Code, start with /bontaflowstack:bfs-router. Plugin changes load in a new session or after /reload-plugins.'", 'Codex setup completion message');
  replaceOnce(setup,
    "Write-Host 'Review and trust PreToolUse and Stop in Codex /hooks to enable protection and interruption tracking.'",
    "Write-Host 'Claude Code loads the plugin hooks. Start a new session and verify native PreToolUse observation before relying on guard enforcement.'", 'Codex setup hook message');
  replaceOnce(setup,
    "Write-Host 'Enable this plugin browser MCP connection in Codex. Engine file readiness does not verify browser launch.'",
    "Write-Host 'The Claude plugin provides the bfs browser MCP tools. Engine file readiness does not verify browser launch.'", 'Codex setup browser message');
  replaceOnce(setup,
    "Write-Host 'The browser uses the workspace selected in Codex. Selecting an outside directory requires host confirmation. Keep your chosen permission profile.'",
    "Write-Host 'The browser uses the Claude task workspace. Selecting an outside directory requires host confirmation. Keep your chosen permission profile.'", 'Codex setup workspace message');
  return { output, version: catalog.version, skillCount: catalog.skills.length };
}

try {
  const argv = process.argv.slice(2);
  const index = argv.indexOf('--output');
  if (index < 0 || !argv[index + 1] || argv.length !== 2) throw new Error(usage());
  const result = build(argv[index + 1]);
  process.stdout.write(`${JSON.stringify(result)}\n`);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
