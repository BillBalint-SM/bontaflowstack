import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadCatalog, pluginRoot, selection } from '../plugins/bontaflowstack/core/catalog.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
export function checkLocalLinks(file) {
  const source=fs.readFileSync(file,'utf8').replace(/^```[^\n]*\n[\s\S]*?^```[^\n]*$/gm,'');
  for(const match of source.matchAll(/\]\(([^)]+)\)/g)) {
    const link=match[1];
    if(/^(?:[a-z][\w+.-]*:|\/\/)/i.test(link))continue;
    const [relative,fragment]=link.split('#');
    const target=relative ? path.resolve(path.dirname(file),decodeURIComponent(relative)) : file;
    assert.ok(fs.existsSync(target),`${file}: broken link ${link}`);
    if(fragment) {
      const headings=fs.readFileSync(target,'utf8').replace(/^```[^\n]*\n[\s\S]*?^```[^\n]*$/gm,'');
      const seen=new Map(),anchors=new Set();
      for(const heading of headings.matchAll(/^#{1,6}\s+(.+?)\s*#*\s*$/gm)) {
        const slug=heading[1].toLowerCase().replace(/[^\p{L}\p{N}_ -]/gu,'').replace(/ /g,'-');
        const count=seen.get(slug)||0;seen.set(slug,count+1);
        anchors.add(count ? `${slug}-${count}` : slug);
      }
      assert.ok(anchors.has(decodeURIComponent(fragment)),`${file}: broken anchor ${link}`);
    }
  }
}

export function skillPolicy(id, yaml) {
  for(const field of ['interface:','  display_name:','  short_description:','  default_prompt:','policy:'])
    assert.ok(yaml.split(/\r?\n/).some(line=>line.startsWith(field)),`${id}: missing ${field}`);
  assert.ok(yaml.includes(`$${id}`),`${id}: missing default prompt`);
  const policy=[...yaml.matchAll(/^  allow_implicit_invocation: (true|false)\s*$/gm)];
  assert.equal(policy.length,1,`${id}: expected one explicit invocation policy`);
  return policy[0][1]==='true';
}

export function checkPublicSkills(catalog, readme, policies) {
  const names=catalog.skills.map(skill=>skill.id);
  const section=readme.replace(/\r\n/g,'\n').split('## Skills\n')[1]?.split(/\n#{2,3} /)[0];
  assert.ok(section,'README: missing Skills section');
  const table=section.split('\n').filter(line=>line.startsWith('|'));
  const listed=table.slice(2).flatMap(line=>[...line.matchAll(/`([a-z][a-z0-9-]*)`/g)].map(match=>match[1]));
  assert.deepEqual(listed.sort(),[...names].sort(),'README skill table differs from catalog');
  for(const skill of catalog.skills) {
    assert.equal(policies[skill.id],skill.id!=='bfs-guard',`${skill.id}: wrong invocation policy`);
    for(const next of skill.handoffs) assert.equal(policies[next],true,`${skill.id}: handoff to non-implicit ${next}`);
  }
  for(const route of Object.values(catalog.workflows))for(const name of route)
    assert.equal(policies[name],true,`route to non-implicit ${name}`);
}

export function checkCatalog(catalog) {
  const names=catalog.skills.map(s=>s.id);
  assert.ok(names.length>0,'Catalog is empty');
  assert.equal(new Set(names).size,names.length,'Duplicate skill ID');
  for(const skill of catalog.skills) {
    assert.ok(typeof skill.description==='string'&&skill.description.trim(),`${skill.id}: missing description`);
    selection(skill);
    for(const capabilities of Object.values(skill.modes)) assert.ok(Array.isArray(capabilities)&&capabilities.every(name=>typeof name==='string'&&name),`${skill.id}: invalid capabilities`);
    for(const next of skill.handoffs) assert.ok(names.includes(next),`${skill.id}: unknown handoff ${next}`);
    if(skill.id==='bfs-qa') {
      assert.deepEqual(Object.keys(skill.modes).sort(),['fix','inspect']);
      assert.deepEqual(skill.coverages,['quick','full','regression','diff']);
      assert.ok(skill.coverages.includes(skill.defaultCoverage),'Invalid default QA coverage');
    } else assert.equal(skill.coverages,undefined,`${skill.id}: QA coverage on another skill`);
  }
  for(const alias of Object.values(catalog.aliases)) {
    const skill=catalog.skills.find(s=>s.id===alias.skill);assert.ok(skill,'Unknown alias target');selection(skill,alias);
  }
  for(const route of Object.values(catalog.workflows)) for(const name of route) assert.ok(names.includes(name),`Unknown route skill ${name}`);
}

function checkPackage() {
  const catalog=loadCatalog();
  const manifest=JSON.parse(fs.readFileSync(path.join(pluginRoot,'.codex-plugin/plugin.json'),'utf8'));
  assert.equal(manifest.version,catalog.version);
  assert.equal(manifest.interface.displayName,'BontaFlowStack');
  const marketplace=JSON.parse(fs.readFileSync(path.join(root,'.agents/plugins/marketplace.json'),'utf8'));
  assert.equal(marketplace.interface.displayName,'BontaFlowStack');
  checkCatalog(catalog);
  const names=catalog.skills.map(s=>s.id);
  assert.deepEqual(fs.readdirSync(path.join(pluginRoot,'skills')).sort(),[...names].sort());
  const policies={};
  for(const skill of catalog.skills) {
    assert.ok(skill.id.startsWith('bfs-'),`${skill.id}: skill ID needs bfs- prefix`);
    const acronyms={qa:'QA',ceo:'CEO',cso:'CSO',html:'HTML',devex:'DevEx',bontaflow:'BontaFlow'};
    const displayName='BFS '+skill.id.slice(4).split('-').map(word=>acronyms[word] || word[0].toUpperCase()+word.slice(1)).join(' ');
    assert.equal(skill.title,displayName,`${skill.id}: picker title differs from skill name`);
    assert.ok(Object.hasOwn(skill.modes,skill.defaultMode));
    for(const next of skill.handoffs)assert.ok(names.includes(next),`${skill.id}: unknown ${next}`);
    const folder=path.join(pluginRoot,'skills',skill.id);
    const source=fs.readFileSync(path.join(folder,'SKILL.md'),'utf8');
    assert.ok(source.startsWith(`---\nname: ${skill.id}\n`));
    assert.equal(JSON.parse(source.match(/^description: (.+)$/m)?.[1]||'null'),skill.description,`${skill.id}: description differs from catalog`);
    assert.ok(source.includes(`\n# ${skill.title}\n`),`${skill.id}: skill heading differs from picker title`);
    checkLocalLinks(path.join(folder,'SKILL.md'));
    const yaml=fs.readFileSync(path.join(folder,'agents/openai.yaml'),'utf8');
    assert.ok(yaml.includes(`  display_name: "${skill.title}"`),`${skill.id}: picker title differs from catalog`);
    assert.ok(skill.title.startsWith('BFS '),`${skill.id}: picker title needs BFS prefix`);
    policies[skill.id]=skillPolicy(skill.id,yaml);
  }
  checkPublicSkills(catalog,fs.readFileSync(path.join(root,'README.md'),'utf8'),policies);
  checkLocalLinks(path.join(pluginRoot,'HOST.md'));
  for(const file of fs.readdirSync(path.join(pluginRoot,'references')).filter(file=>file.endsWith('.md')))
    checkLocalLinks(path.join(pluginRoot,'references',file));
  for(const alias of Object.values(catalog.aliases))assert.ok(names.includes(alias.skill));
  for(const route of Object.values(catalog.workflows))for(const name of route)assert.ok(names.includes(name));
  const hooks=JSON.parse(fs.readFileSync(path.join(pluginRoot,'hooks/hooks.json'),'utf8'));
  assert.deepEqual(Object.keys(hooks.hooks).sort(),['PreToolUse','Stop']);
  assert.equal(fs.readFileSync(path.join(root,'LICENSE'),'utf8'),fs.readFileSync(path.join(pluginRoot,'LICENSE'),'utf8'));
  const result=spawnSync(process.execPath,['--test',...['core','package','reliability','context-closure','task-graph','browser-host','browser-host-package','host-context','claude-host','claude-guard','claude-package','install-state','npm-setup','npm-package','npm-release',...(process.platform==='win32'?['engine-install']:[])].map(name=>path.join(root,`tests/${name}.test.mjs`)),path.join(root,'tests/parallel.integration.test.mjs')],{stdio:'inherit',windowsHide:true});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status||1);
  console.log(`Checked BontaFlowStack ${manifest.version}: ${names.length} skills, README, policies, handoffs, hooks, license and core tests.`);
}

if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url))checkPackage();
