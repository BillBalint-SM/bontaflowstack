#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.join(repo,'plugins/bontaflowstack');
const usage='Usage: node scripts/build-host-package.mjs --host gemini-cli|copilot-cli|cursor-ide|opencode-cli --output <new-directory>';
const within=(root,target)=>{const relative=path.relative(root,target);return relative==='' || !path.isAbsolute(relative) && relative!=='..' && !relative.startsWith(`..${path.sep}`);};

function build(host,outputValue) {
  if(!['gemini-cli','copilot-cli','cursor-ide','opencode-cli'].includes(host) || !outputValue)throw new Error(usage);
  const gemini=host==='gemini-cli',cursor=host==='cursor-ide',opencode=host==='opencode-cli',title=gemini?'Gemini CLI':cursor?'Cursor IDE':opencode?'OpenCode CLI':'GitHub Copilot CLI';
  const preTool=gemini?'BeforeTool':opencode?'tool.execute.before':'preToolUse',stop=gemini?'AfterAgent and SessionEnd':cursor?'stop, sessionEnd and postToolUseFailure':opencode?'session.idle, session.error and session.deleted':'agentStop, sessionEnd and postToolUseFailure';
  const instructionFile=gemini?'GEMINI.md':cursor?'.cursor/rules':'.github/copilot-instructions.md';
  const tool=name=>gemini?`\`mcp_bfs_${name}\``:opencode?`\`bfs_${name}\``:`the installed plugin's \`${cursor?'bfs-cursor':'bfs'}\` MCP \`${cursor?'bfs_':''}${name}\` tool`;
  const output=path.resolve(outputValue),template=path.join(repo,'adapters',host);
  if(fs.existsSync(output))throw new Error(`Output already exists; choose a new directory: ${output}`);
  let ancestor=path.dirname(output);const missing=[];
  while(!fs.existsSync(ancestor)){missing.unshift(path.basename(ancestor));ancestor=path.dirname(ancestor);}
  const projected=path.join(fs.realpathSync(ancestor),...missing,path.basename(output));
  if(within(fs.realpathSync(source),projected))throw new Error('Output must be outside the canonical plugin tree');
  const catalog=JSON.parse(fs.readFileSync(path.join(source,'catalog.json'),'utf8'));
  fs.mkdirSync(path.dirname(output),{recursive:true});
  const stage=fs.mkdtempSync(path.join(path.dirname(output),'.bfs-host-'));
  try {
    fs.cpSync(source,stage,{recursive:true,errorOnExist:true,force:false,filter:file=>{
      const relative=path.relative(source,file).replaceAll(path.sep,'/');
      return relative!=='.codex-plugin' && relative!=='.mcp.json' && relative!=='hooks' && !relative.endsWith('/agents/openai.yaml');
    }});
    const replace=(relative,pattern,replacement)=>{
      const file=path.join(stage,relative),text=fs.readFileSync(file,'utf8');
      const matches=typeof pattern==='string'?text.split(pattern).length-1:[...text.matchAll(new RegExp(pattern.source,pattern.flags.replace('g','')+'g'))].length;
      if(matches!==1)throw new Error(`Expected one host instruction in ${relative}, found ${matches}`);
      fs.writeFileSync(file,text.replace(pattern,()=>replacement));
    };
    const manifestFile=gemini?'gemini-extension.json':opencode?'package.json':'plugin.json';
    const manifest=fs.readFileSync(path.join(template,manifestFile),'utf8').replaceAll('{{VERSION}}',catalog.version);
    if(manifest.includes('{{'))throw new Error('Unresolved extension template marker');
    const manifestTarget=path.join(stage,cursor?'.cursor-plugin/plugin.json':manifestFile);
    fs.mkdirSync(path.dirname(manifestTarget),{recursive:true});fs.writeFileSync(manifestTarget,manifest,{flag:'wx'});
    if(gemini) {
      fs.copyFileSync(path.join(template,'GEMINI.md'),path.join(stage,'GEMINI.md'));
      const hooks=Object.fromEntries(['SessionStart','BeforeAgent','BeforeTool','AfterTool','AfterAgent','SessionEnd'].map(event=>[event,[{hooks:[{
        name:`bfs-${event}`,type:'command',
        // A literal here-string keeps Windows paths with quotes or dollar signs out of shell syntax.
        command:`$bfsExtension = @'\n\${extensionPath}\n'@\n& node (Join-Path $bfsExtension 'core/gemini-hook.mjs') ${event}`,timeout:10000
      }]}]]));
      fs.mkdirSync(path.join(stage,'hooks'));
      fs.writeFileSync(path.join(stage,'hooks/hooks.json'),JSON.stringify({hooks},null,2)+'\n');
    }else if(cursor) {
      fs.copyFileSync(path.join(template,'mcp.json'),path.join(stage,'mcp.json'));
      const hooks=Object.fromEntries(['sessionStart','sessionEnd','beforeSubmitPrompt','preToolUse','postToolUse','postToolUseFailure','stop'].map(event=>[event,[{
        // EncodedCommand prevents the host's Windows shell from expanding the inner PowerShell variables.
        command:`powershell.exe -NoProfile -NonInteractive -EncodedCommand ${Buffer.from(`$ErrorActionPreference='Stop'; & node (Join-Path $env:CURSOR_PLUGIN_ROOT 'core/cursor-hook.mjs') ${event}; exit $LASTEXITCODE`,'utf16le').toString('base64')}`,timeout:10,...(event==='preToolUse'?{failClosed:true}:{})
      }]]));
      fs.mkdirSync(path.join(stage,'hooks'));fs.writeFileSync(path.join(stage,'hooks/hooks.json'),JSON.stringify({version:1,hooks},null,2)+'\n');
    }else if(opencode) {
      fs.copyFileSync(path.join(template,'plugin.mjs'),path.join(stage,'plugin.mjs'));
    }else {
      fs.copyFileSync(path.join(template,'mcp.json'),path.join(stage,'mcp.json'));
      fs.writeFileSync(path.join(stage,'marketplace.json'),fs.readFileSync(path.join(template,'marketplace.json'),'utf8').replaceAll('{{VERSION}}',catalog.version));
      const hooks=Object.fromEntries(['sessionStart','userPromptSubmitted','preToolUse','postToolUse','postToolUseFailure','agentStop','sessionEnd'].map(event=>[event,[{type:'command',exec:'node',args:['${PLUGIN_ROOT}/core/copilot-hook.mjs',event],timeoutSec:10}]]));
      fs.mkdirSync(path.join(stage,'com.github.copilot/hooks'),{recursive:true});
      fs.writeFileSync(path.join(stage,'com.github.copilot/hooks/hooks.json'),JSON.stringify({version:1,hooks},null,2)+'\n');
    }
    for(const skill of catalog.skills)replace(`skills/${skill.id}/SKILL.md`,
      `Load [HOST.md](../../HOST.md) via \`read ${skill.id}\`; follow its hash-based read protocol.`,
      `First call ${tool('core')} with \`{"args":["read","${skill.id}"]}\`. Its result supplies [HOST.md](../../HOST.md) and this skill; follow the returned hash-based read protocol. Use this MCP entry point for BFS commands. The native hook supplies \`_bfsCall\`; omit that field.`);
    replace('HOST.md',/^# BontaFlowStack execution contract[\s\S]*?(?=^## Task scope and results\n)/m,fs.readFileSync(path.join(template,'HOST.md'),'utf8').trim()+'\n\n');
    replace('HOST.md','## Core and session identity\n',
      '## Core and session identity\n\nThe core `read` command accepts a catalog skill name, never a `references/...` file path. Read linked Markdown files with the host\'s native file-reading tool, resolving links from the installed skill location. For effective preferences use `args:["preferences","effective"]`, without `read`.\n');
    replace('HOST.md','The Stop hook marks an unfinished active step interrupted and never invents a',
      `The ${stop} hooks mark an unfinished active step interrupted and never invent a`);
    replace('HOST.md',/^## Optional capabilities\n[\s\S]*?(?=^## Guard\n)/m,
      '## Optional capabilities\n\nRead [capabilities](references/capabilities.md) before optional engine or image work, and [browser](references/browser.md) before browser/render work. Missing capability blocks only the affected operation.\n\n');
    replace('HOST.md','Codex `/hooks` review grants trust for new or changed hooks; never edit trust\nrecords or bypass review.',
      `${title} loads packaged hooks under its native policy; never edit trust records or bypass review.`);
    replace('references/commands.md','Run from the selected project. JSON requests use `--input <file>` or `--input -`\non `node <plugin>/core/cli.mjs`. The PowerShell launcher takes `-Command`,\n`-Action`, `-Skill` and `-InputFile`. `help` lists available actions.',
      `Use ${tool('core')} in the current ${title} session. Pass command/action operands in \`args\`, for example \`["workflow","list"]\`, and the JSON request object in \`input\`. Do not invoke the core CLI directly: the native hook binds MCP calls to this session and workspace. \`args:["help"]\` lists actions.`);
    replace('references/commands.md',"Image generation/editing uses the host's Codex image tool. `engine design` is local:",
      'This adapter configures no raster image generation or editing. Use supplied assets or authored HTML/SVG. `engine design` is local:');
    replace('references/guard.md','New or changed hooks require Codex `/hooks` review; preserve host trust records.',
      `${title} loads packaged hooks under its native policy; preserve host trust records and verify native ${preTool} observation before relying on guard enforcement.`);
    replace('references/browser.md',/^# Shared browser usage\n[\s\S]*?(?=^Useful operations:)/m,
      `# Shared browser usage\n\nUse ${tool('core')} with \`args:["doctor","bfs-browse"]\` to inspect engine file readiness. Use ${tool('browser')} with \`{"args":["goto","https://example.com"]}\` for browser work and \`{"args":["--help"]}\` before unfamiliar commands. Inspect actual content and \`isError\`.\n\nThe status tool reports the native session, workspace and engine readiness; it does not prove browser launch. The ${preTool} hook supplies identity. A missing or denied connection blocks its work; do not launch a shell replacement or disable Chromium sandboxing.\n\n`);
    replace('references/browser.md',/^Call `select_project`[\s\S]*?(?=^Use this connection's `render` tool)/m,
      `Use ${tool('select_project')} with the actual absolute \`path\` for a project subdirectory. Ordinary calls use the native hook workspace. Outside-directory selection requires human MCP elicitation; decline, timeout or unsupported elicitation leaves the selection unbound. Never fabricate confirmation or change host policy to obtain it. Reconnect after switching workspace. Setup pins the shared BFS state root in the installed package; it does not depend on unfiltered environment inheritance.\n\n`);
    replace('references/capabilities.md',/^# Optional capabilities\n[\s\S]*?(?=^The npm setup installs)/m,
      `# Optional capabilities\n\nUse ${tool('core')} for doctor or engine status requests to inspect file readiness. Setup installs the engines; missing browser capability blocks browser work, not text planning, memory or source review. An actual operation establishes launch behavior.\n\nThe native ${preTool} hook supplies session/workspace identity. Browser/render require the enabled \`${cursor?'bfs-cursor':'bfs'}\` MCP connection. Read [browser](browser.md) before use, preserve host permissions and stop only owned resources. Parallel BFS child-agent execution is not enabled; use serial workflows in this session.\n\nThis adapter configures no raster image generator/editor. Use supplied assets or authored HTML/SVG and report unavailable raster operations. A separately supplied host image tool needs its own availability check and verification. The local design engine compares images and records only the actual user selection.\n\n`);
    if(!opencode)replace('skills/bfs-router/SKILL.md','read existing `AGENTS.md`, `docs/agents/issue-tracker.md`',`read existing \`AGENTS.md\`, \`${instructionFile}\`, \`docs/agents/issue-tracker.md\``);
    if(!cursor && !opencode)replace('skills/bfs-router/SKILL.md','Add only missing AGENTS links;',`Add only missing AGENTS.md/${instructionFile} links;`);
    replace('skills/bfs-design-consultation/SKILL.md','Check render capability for HTML and Codex image-tool availability for images.',
      'Check render capability for HTML. This adapter configures no raster image generator/editor; use supplied assets or authored HTML/SVG and report unavailable raster operations.');
    replace('skills/bfs-design-consultation/SKILL.md',"4. For images, use Codex's current image tool and its reference/output rules; inspect local originals before editing. If unavailable, report it and offer HTML variants without claiming generated images. Use engine design compare for a comparison board and design select for the actual user choice.",
      '4. For images, inspect supplied references using available host image understanding. Report unavailable raster generation/editing and offer authored HTML/SVG variants without claiming generated images. A separately supplied host image tool needs its own availability and output checks. Use engine design compare for a comparison board and design select for the actual user choice.');
    replace('skills/bfs-design-html/SKILL.md',"Requested image generation or editing uses Codex's image tool through bfs-design-consultation, without separate API credentials.",
      'For requested raster generation/editing, read bfs-design-consultation and report the capability available in this host; this adapter configures no raster tool. Use supplied assets or authored HTML/SVG when appropriate.');
    replace('core/cli.mjs','Review and trust the plugin hooks with /hooks, then use a new Codex chat.',`Start a new ${title} session and verify a native ${preTool} event.`);
    replace('scripts/setup.ps1',/^Write-Host 'Setup complete\.[\s\S]*$/m,
      `Write-Host 'Setup complete. Start a new ${title} session and activate bfs-router.'\nWrite-Host 'Verify native ${preTool} observation and an actual BFS MCP operation. File readiness does not prove browser launch.'\n`);
    if(fs.existsSync(output))throw new Error(`Output already exists; choose a new directory: ${output}`);
    fs.renameSync(stage,output);
    return {output,host,version:catalog.version,skillCount:catalog.skills.length};
  }catch(error){fs.rmSync(stage,{recursive:true,force:true});throw error;}
}

try {
  const args=process.argv.slice(2);
  if(args.length!==4 || args[0]!=='--host' || args[2]!=='--output')throw new Error(usage);
  process.stdout.write(JSON.stringify(build(args[1],args[3]))+'\n');
}catch(error){process.stderr.write(error.message+'\n');process.exitCode=1;}
