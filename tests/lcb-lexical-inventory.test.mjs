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

test('excluded lexical guide disagreements are not represented as active spelling or case checks',()=>{
 const entries=styleRuleInventory(refs).filter(r=>r.id.startsWith('lcb-entry-'));
 for(const form of ['health care','federal government']){const item=entries.find(r=>r.text===form);assert.equal(item.status,'Excluded guide conflict');assert.ok(item.scope.includes('excluded'));}
 const collective=entries.find(r=>r.text==='collective bargaining (n., u.m.)');assert.ok(collective.scope.includes('known guide disagreements'));
});
test('discrete entries distinguish selected checks from unimplemented contextual forms',()=>{
 const entries=styleRuleInventory(refs).filter(r=>r.id.startsWith('lcb-entry-'));assert.ok(entries.find(r=>r.text==='cost-effective (u.m.)').scope.includes('recognized noun head'));
 assert.equal(entries.find(r=>r.text==='one-time (one action; u.m.)').status,'Manual review required');
 assert.ok(searchRuleInventory(refs,'indorsement Commercial Code').some(r=>r.id.startsWith('lcb-entry-')));
});
