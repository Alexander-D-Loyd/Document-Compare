import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {contextualPunctuationIssues} from '../app/style-punctuation.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=doc=>contextualPunctuationIssues(doc,refs).filter(i=>i.rule==='Punctuation: Commas'),find=t=>check(makeDocument([t],'Current'));
test('qualified nouns, conditional pairs and preposition pairs are not three-member lists',()=>{
 for(const text of ['The law includes schools, public and private.','The provision includes plans, approved and adopted.','The statute includes benefits, if and when available.','The report includes records, to and from agencies.','The report includes records, before and after review.','The law includes patients, licensed and registered.','The law includes agencies, federal or local.']){
  assert.equal(find(text).length,0,text);assert.equal(jointStylisticIssues(makeDocument([text],'Current'),refs).some(i=>i.rule==='Punctuation: Commas'),false,text);
 }
});
test('independent homogeneous words keep exact final-conjunction marks and agreeing guide rules',()=>{
 for(const words of [['red','white','blue'],['horses','mules','cattle'],['reports','records','documents'],['federal','state','local'],['a','b','c'],['one','two','three']])for(const join of ['and','or','nor']){
  const text='The list includes '+words[0]+', '+words[1]+' '+join+' '+words[2]+'.',issues=find(text);assert.equal(issues.length,1,text);const i=issues[0];assert.equal(text.slice(i.start,i.end),join);assert.equal(i.suggestion,', '+join);assert.deepEqual(i.references.map(r=>[r.guideId,r.guidePage,r.rule]),[['lcb',6,'Punctuation: Commas'],['gpo',216,'8.46']]);assert.equal(find(text.slice(0,i.start)+i.suggestion+text.slice(i.end)).length,0,text);
 }
});
test('unfamiliar words and quoted lists remain manual rather than guessing their roles',()=>{
 for(const text of ['The list includes kappa, lambda and omega.','The list includes Alder, Birch and Cedar.','The list includes reports, white and blue.','The phrase “includes red, white and blue” is literal.','The office comprises books and papers.'])assert.equal(find(text).length,0,text);
});
test('a known running head can bridge a complete list but unknown ignored content cannot',()=>{
 const doc=makeDocument(['The flag includes red, white','AB 1 — 2 —\nand blue.'],'Current'),head=doc.blocks.find(b=>b.ignored);assert.ok(head);head.formatting={headerParts:[{text:head.text}]};const issues=check(doc);assert.equal(issues.length,1);assert.equal(doc.text.slice(issues[0].start,issues[0].end),'and');head.formatting={};assert.equal(check(doc).length,0);
});
test('removed context cannot supply evidence for a later final conjunction',()=>{
 const doc=makeDocument(['The list includes superseded\nreports, records and documents.'],'Current'),start=doc.text.indexOf('superseded');doc.struck=[{start,end:start+10}];assert.equal(check(doc).length,0);
});
test('table evidence anywhere in the inferred list blocks a prose punctuation recommendation',()=>{
 const doc=makeDocument(['The flag includes red,\nwhite\nand blue.'],'Current');doc.blocks[1].formatting={headerGaps:[{},{}]};assert.equal(check(doc).length,0);
});
