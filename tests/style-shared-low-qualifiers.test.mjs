import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {sharedModifierIssues} from '../app/style-shared-modifiers.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=doc=>sharedModifierIssues(doc,refs),find=t=>check(makeDocument([t],'Current'));
test('LCB listed very low and extremely low adjective phrases keep their open shared ending',()=>{
 for(const text of ['Support very low and moderate-income households.','Support extremely low and moderate-income households.','Support extremely low, very low, low-, and moderate-income households.','Support very low, low- and moderate-income households.']){
  assert.equal(find(text).length,0,text);assert.equal(jointStylisticIssues(makeDocument([text],'Current'),refs).some(i=>i.checkId==='shared-modifiers'),false,text);
 }
});
test('a later bare low retains the required hyphen without selecting the earlier qualified adjective',()=>{
 const text='Support extremely low, very low, low, and moderate-income households.',issues=find(text);assert.equal(issues.length,1);const i=issues[0];assert.equal(i.text,'low, and moderate-income');assert.equal(i.suggestion,'low-, and moderate-income');assert.equal(i.start,text.lastIndexOf('low,'));assert.equal(text.slice(i.start,i.end),i.text);assert.equal(find(text.slice(0,i.start)+i.suggestion+text.slice(i.end)).length,0);
});
test('every later bare low is retained in a mixed qualified and suspended series',()=>{
 const text='Support very low, low, low and moderate-income families.',issues=find(text);assert.equal(issues.length,1);assert.equal(issues[0].text,'low, low and moderate-income');assert.equal(issues[0].suggestion,'low-, low- and moderate-income');
});
test('ordinary low and moderate-income still requires its hyphen and agreeing citations',()=>{
 const text='Support low and moderate-income households.',issues=find(text);assert.equal(issues.length,1);assert.equal(issues[0].text,'low and moderate-income');assert.equal(issues[0].suggestion,'low- and moderate-income');assert.deepEqual(issues[0].references.map(r=>[r.guideId,r.guidePage,r.rule]),[['lcb',11,'Hyphenation examples'],['gpo',117,'6.23']]);
});
test('recognized page heads retain both the open qualifier and precise bare-low source selection',()=>{
 const doc=makeDocument(['Support extremely low, very','AB 1 — 2 —\nlow, low and moderate-income households.'],'Current'),head=doc.blocks.find(b=>b.ignored);assert.ok(head);head.formatting={headerParts:[{text:head.text}]};const issues=check(doc);assert.equal(issues.length,1);assert.equal(issues[0].text,'low and moderate-income');assert.equal(issues[0].start,doc.text.lastIndexOf('low and'));
});
test('removed or unclassified ignored shared context cannot establish a suggestion',()=>{
 const doc=makeDocument(['Support low','AB 1 — 2 —\nand moderate-income households.'],'Current'),head=doc.blocks.find(b=>b.ignored);assert.equal(check(doc).length,0);head.formatting={headerParts:[{text:head.text}]};assert.equal(check(doc).length,1);const start=doc.text.indexOf('low');doc.struck=[{start,end:start+3}];assert.equal(check(doc).length,0);
});
test('complete open income qualifiers do not receive a suffix-only low-income suggestion',()=>{
 for(const text of ['Support very low income households.','Support extremely low income households.','Support very low income housing.','Support extremely low income residents.'])assert.equal(jointStylisticIssues(makeDocument([text],'Current'),refs).some(i=>i.rule==='Hyphenation examples: low-income'),false,text);
 const text='Support low income households.',issues=jointStylisticIssues(makeDocument([text],'Current'),refs);assert.ok(issues.some(i=>i.text==='low income'&&i.suggestion==='low-income'));
});
test('the open qualifier remains protected through source line and recognized page boundaries',()=>{
 for(const pages of [['Support very\nline 2 low income households.'],['Support extremely','AB 1 — 2 —\nlow income households.']]){const doc=makeDocument(pages,'Current'),head=doc.blocks.find(b=>b.ignored);if(head)head.formatting={headerParts:[{text:head.text}]};assert.equal(jointStylisticIssues(doc,refs).some(i=>i.rule==='Hyphenation examples: low-income'),false);}
});
