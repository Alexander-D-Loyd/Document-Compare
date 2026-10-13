import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {lcbLexicalInventory} from '../app/lcb-lexical-inventory.mjs';import {styleRuleInventory,searchRuleInventory} from '../app/style-rule-inventory.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
test('LCB lexical tables keep entries, wrapped annotations and all source pages',()=>{
 const entries=lcbLexicalInventory(refs.lcb,[]);assert.ok(entries.length>450);assert.equal(new Set(entries.map(r=>r.id)).size,entries.length);
 assert.ok(entries.some(r=>r.text==='indorsement (used in Commercial Code)'));assert.ok(entries.some(r=>r.text==='limited- and non-English-speaking (u.m.)'));
 assert.ok(entries.some(r=>r.text.includes('anti (one word except with double vowels')));assert.ok(entries.every(r=>['Manual review required','Excluded guide conflict'].includes(r.status)));
 for(const page of [3,4,5,9,10,11,12,13,14,18,19,20])assert.ok(entries.some(r=>r.page===page));
});

test('source column and paragraph geometry keeps wrapped capitalization entries and exceptions intact',()=>{
 const entries=lcbLexicalInventory(refs.lcb,[]);assert.equal(entries.length,663);
 for(const text of ['acquired immunodeficiency syndrome (AIDS)','County Employees Retirement Law of 1937','California and United States Constitutions','Member (capitalize when standing alone as title, if Member of the Legislature)','Subchapter (with number, Cal. Code Regs. and federal usages)'])assert.ok(entries.some(r=>r.text===text),text);
 assert.ok(!entries.some(r=>r.text==='Constitutions'||r.text==='syndrome (AIDS)'));
 const capital=styleRuleInventory(refs).find(r=>r.id==='lcb-entry-18-county-employees-retirement-law-of-1937');assert.equal(capital.status,'Partially automated');assert.ok(capital.scope.includes('authentic referents'));
});

test('source inventory labels printed LCB priority as partial contextual coverage',()=>{
 const entries=styleRuleInventory(refs).filter(r=>r.id.startsWith('lcb-entry-'));
 for(const form of ['health care','federal government']){const item=entries.find(r=>r.text===form);assert.equal(item.status,'Partially automated');assert.ok(item.scope.includes('LCB takes priority'));assert.ok(item.scope.includes('unfamiliar roles'));}
 const collective=entries.find(r=>r.text==='collective bargaining (n., u.m.)');assert.match(collective.scope,/LCB priority/);assert.match(collective.scope,/noun and modifier contexts/);assert.match(collective.scope,/unfamiliar syntax and meaning remain manual/);assert.ok(!collective.scope.includes('excluded as known guide disagreements'));
 const african=entries.find(r=>r.text==='African American');assert.match(african.scope,/LCB priority/);assert.match(african.scope,/Unencoded contexts remain manual/);assert.ok(!african.scope.includes('excluded where the guides disagree'));
});
test('discrete entries distinguish selected checks from unimplemented contextual forms',()=>{
 const entries=styleRuleInventory(refs).filter(r=>r.id.startsWith('lcb-entry-'));assert.ok(entries.find(r=>r.text==='cost-effective (u.m.)').scope.includes('recognized noun head'));
 const once=entries.find(r=>r.text==='one-time (one action; u.m.)');assert.equal(once.status,'Partially automated');assert.match(once.scope,/only\/just once/);assert.match(once.scope,/Other variants, meanings and exceptions are not certified/);
 const former=entries.find(r=>r.text==='onetime (formerly; u.m.)');assert.equal(former.status,'Partially automated');assert.ok(former.scope.includes('formerly/previously'));
 assert.equal(entries.find(r=>r.text==='aural').status,'Partially automated');
 assert.equal(entries.find(r=>r.text==='assigner').status,'Partially automated');
 assert.equal(styleRuleInventory(refs).find(r=>r.id==='lcb-17-7').status,'Partially automated');
 assert.ok(searchRuleInventory(refs,'indorsement Commercial Code').some(r=>r.id.startsWith('lcb-entry-')));
});
