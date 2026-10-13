import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';import {LCB_MAPPED_CONTEXTS} from '../app/lcb-mapped-contexts.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=t=>jointStylisticIssues(makeDocument([t],'Current'),refs);
test('final contextual entries preserve genuine alternatives and unresolved referents',()=>{
 for(const t of ['The assignor shall act.','The revivor of the judgment is permitted.','The controller shall act.','The treasurer shall act.','The county controller Jane Doe shall act.','Each member of the county board shall act.','Each member elected to the California Legislature Advisory Board shall act.','The General Fund shall apply.','The county general fund shall retain reserves.','A budget bill shall apply.','The budget bill for additional funding shall apply.','The East Los Angeles community is described.','The Constitutional Clause Advisory Board shall meet.','The Commerce Clause applies.','The State welfare policies shall apply.','The State shall act.'])assert.equal(check(t).length,0,t);
});
test('listed spellings use finite nonword witnesses and protect valid legal alternatives',()=>{
 for(const [bad,good] of [['assignner','assigner'],['revivver','reviver']]){const t='The '+bad+' shall act.';assert.deepEqual(check(t).map(i=>i.suggestion),[good]);assert.equal(check(t.replace(bad,good)).length,0);assert.equal(check('The term “'+bad+'” is literal.').length,0);}
});
test('the last contextual mappings preserve quotes, strikeouts and exact offsets',()=>{
 for(const r of LCB_MAPPED_CONTEXTS.slice(0,11)){
  const d=makeDocument([r.bad],'Current'),found=jointStylisticIssues(d,refs).find(i=>i.suggestion===r.suggestion);assert.ok(found,r.bad);assert.equal(d.text.slice(found.start,found.end),found.text);
  d.struck=[{start:found.start,end:found.end}];assert.equal(jointStylisticIssues(d,refs).filter(i=>i.suggestion===r.suggestion).length,0,r.bad);
  // Quote just the offending phrase, retaining its external context.
  const quoted=r.bad.replace(found.text,'“'+found.text+'”');assert.equal(check(quoted).filter(i=>i.suggestion===r.suggestion).length,0,quoted);
 }
});
test('supported printed LCB choices take priority without hiding independent errors or inventing full coverage',()=>{
 for(const [t,preferred]of [['The Central Valley of California is described.','central valley'],['California’s Central Valley is described.','central valley'],['See subchapter 2 of the Code of Federal Regulations.','Subchapter'],['During the 2025-26 regular session of the Legislature.','Regular Session'],['The quarter horserace is held.','horse race']])assert.deepEqual(check(t).map(i=>i.suggestion),[preferred],t);for(const t of ['The central valley of California is described.','See Subchapter 2 of the California Code of Regulations.','During the 2025-26 Regular Session of the Legislature.','The quarter horse race is held.'])assert.equal(check(t).length,0,t);
 const found=check('The Central Valley of California has 3 public members.');assert.deepEqual(found.map(i=>i.suggestion),['central valley','three']);
 const rows=styleRuleInventory(refs);for(const text of ['horse race (all forms)','quarter horse race','central valley','Subchapter (with number, Cal. Code Regs. and federal usages)','Regular Session of the Legislature (with year)'])assert.equal(rows.find(r=>r.text===text).status,'Partially automated',text);
 // Canonical entries expose manual prefix gaps alongside selected checks/conflicts;
 // The supplied entity snapshot is available; the distinct opinions and
 // cover-letter workflow remains explicitly unsupported by bill checks.
 assert.equal(rows.filter(r=>r.id.startsWith('lcb-entry-')&&r.status==='Manual review required').length,4);
 assert.deepEqual(rows.filter(r=>r.guide==='lcb'&&r.status==='Manual review required').map(r=>r.id),['lcb-21-opinions-and-cover-letters-source','lcb-entry-9-bi-all-one-word','lcb-entry-11-in-as-a-prefix-generally-one-word','lcb-entry-12-multi-all-uses-one-word','lcb-entry-12-non-as-a-prefix-generally-one-word']);
 assert.ok(!rows.some(r=>r.guide==='lcb'&&r.status==='Fully automated'));
});
