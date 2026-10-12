import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=t=>jointStylisticIssues(makeDocument([t],'Current'),refs);
test('listed modifiers check English capitalization independently of existing hyphens',()=>{
 for(const wanted of ['limited-English-proficient','limited-English-speaking','non-English-speaking'])for(const variant of [wanted.replace('English','english'),wanted.replaceAll('-',' ').replace('English','english')]){
  const t='The '+variant+' households are eligible.',i=check(t).find(x=>x.suggestion===wanted);assert.ok(i,t);assert.equal(t.slice(i.start,i.end),variant);assert.equal(check(t.replace(variant,wanted)).length,0);
 }
 assert.equal(check('The Non-english-speaking households are eligible.')[0].suggestion,'Non-English-speaking');
});
test('source quotations, headings, extended names and uppercase typography remain protected',()=>{
 for(const t of ['The Non-English-Speaking Households Program is named.','The term “non-english-speaking households” is literal.','NON-ENGLISH-SPEAKING HOUSEHOLDS','The non-ENGLISH-speaking households are eligible.'])assert.equal(check(t).length,0,t);
 const doc=makeDocument(['The non-english-speaking households are eligible.'],'Current');doc.struck=[{start:4,end:24}];assert.equal(jointStylisticIssues(doc,refs).length,0);
});
test('proper-language corrections preserve precise wrapped modifier offsets',()=>{
 const doc=makeDocument(['line 1 The non-english-\nline 2 speaking households are eligible.'],'Current'),i=jointStylisticIssues(doc,refs)[0];assert.equal(i.suggestion,'non-English-speaking');assert.equal(doc.text.slice(i.start,i.end),i.text);assert.ok(i.text.includes('line 2'));
});
