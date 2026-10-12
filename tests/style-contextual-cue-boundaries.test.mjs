import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument} from '../app/core.mjs';import {lcbContextualIssues} from '../app/lcb-contextual.mjs';
import {CHECK_COVERAGE} from '../app/style-coverage.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),make=t=>makeDocument([t],'Current'),issues=t=>lcbContextualIssues(make(t),refs).filter(i=>i.category==='Modifier hyphenation');
const educational='high quality academic and behavioral learning practices';
test('a clipped 300-character window must not manufacture an independent nominal cue',()=>{
 for(const [stem,lead]of [['supports','x'],['within','x'],['provides','𐐀']]){const before=lead+stem+' '.repeat(300-stem.length),t=before+educational+'.';assert.equal(issues(t).length,0,stem);assert.equal(issues(stem+' '+educational+'.').length,1,'Intact cue '+stem);}
});
test('extended Unicode predicate tokens cannot establish a listed descriptor noun role',()=>{
 for(const suffix of ['α','𐐀','2','_value'])assert.equal(issues('The '+educational+' applies'+suffix+'.').length,0,suffix);assert.equal(issues('The '+educational+' applies.').length,1);
});
test('original cue boundaries protect multiword and productive participles as well as descriptor contexts',()=>{
 for(const phrase of ['family planning related services','science based programs']){assert.equal(issues('xsupports'+' '.repeat(292)+phrase+'.').length,0,phrase);assert.equal(issues('The agency supports '+phrase+'.').length,1,phrase);}
});
test('an independent complete cue survives a clipped or extended alternative and keeps original selection',()=>{
 const t='xsupports'+' '.repeat(292)+educational+' applies.',r=issues(t);assert.equal(r.length,1);assert.equal(r[0].text,'high quality');assert.equal(issues('The agency supports '+educational+' appliesα.').length,1);
});
test('coverage exposes complete original cue boundaries, finite context and unknown grammar limits',()=>{
 const row=CHECK_COVERAGE.find(r=>r.title==='Complete contextual modifier cues');assert.match(row.text,/300 characters/);assert.match(row.text,/original Unicode word boundaries/);assert.match(row.text,/Unknown grammar and meaning/);const entries=styleRuleInventory(refs).filter(r=>r.guide==='lcb'&&/Independent nominal cues validate both original Unicode word boundaries/.test(r.scope||''));assert.ok(entries.length);assert.ok(entries.every(r=>r.status==='Partially automated'));
});
