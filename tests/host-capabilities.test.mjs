import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {checkLocalLinks} from '../scripts/check.mjs';

test('host capability profile covers every catalog mode once with four explicit host assessments',()=>{
  const catalog=JSON.parse(fs.readFileSync(new URL('../plugins/bontaflowstack/catalog.json',import.meta.url),'utf8'));
  const file=fileURLToPath(new URL('../docs/bontaflowstack/HOST-CAPABILITIES.md',import.meta.url)),text=fs.readFileSync(file,'utf8');
  checkLocalLinks(file);
  const actual=[];
  for(const line of text.split('\n').filter(line=>line.startsWith('| `bfs-'))) {
    const cells=line.split('|').slice(1,-1).map(cell=>cell.trim());assert.equal(cells.length,9,line);
    const [skill,modes,classification,conditions,...hostsAndEvidence]=cells;
    assert.match(classification,/^(Alap|Extra|Alap \+ extra)$/);assert(conditions);assert(hostsAndEvidence[4]);
    for(const state of hostsAndEvidence.slice(0,4))assert.match(state,/^(U|B|N)(?: \+ X)?$/,line);
    for(const mode of modes.matchAll(/`([^`]+)`/g))actual.push(`${skill.slice(1,-1)}:${mode[1]}`);
  }
  const expected=catalog.skills.flatMap(skill=>Object.keys(skill.modes).map(mode=>`${skill.id}:${mode}`));
  assert.equal(new Set(actual).size,actual.length,'A mode occurs more than once');assert.deepEqual(actual.sort(),expected.sort());
  for(const coverage of catalog.skills.find(skill=>skill.id==='bfs-qa').coverages)assert(text.includes(`\`${coverage}\``),`Missing QA coverage ${coverage}`);
});
