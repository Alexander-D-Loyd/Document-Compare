import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {wordChoiceIssues} from '../app/style-word-choice.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=t=>wordChoiceIssues(makeDocument([t],'Current'),refs);
test('full-time equivalent checks the complete listed modifier before personnel or student heads',()=>{
 for(const head of ['student','students','employees','workers','positions','staff','veterinarians','technicians','personnel'])for(const bad of ['full time equivalent','full-time-equivalent','full time-equivalent']){
  const text='The '+bad+' '+head+' are counted.',i=check(text)[0];assert.equal(i.suggestion,'full-time equivalent');assert.equal(text.slice(i.start,i.end),bad);assert.equal(check(text.replace(bad,'full-time equivalent')).length,0);assert.ok(jointStylisticIssues(makeDocument([text],'Current'),refs).some(x=>x.suggestion==='full-time equivalent'));
 }
});
test('non-life-threatening distinguishes an injury modifier from a present-participle predicate',()=>{
 for(const bad of ['non life threatening','non-life-threatening','non life-threatening']){const text='The injuries are '+bad+'.',i=check(text)[0];assert.equal(i.suggestion,'non-life threatening');assert.equal(text.slice(i.start,i.end),bad);assert.equal(check(text.replace(bad,i.suggestion)).length,0);assert.ok(jointStylisticIssues(makeDocument([text],'Current'),refs).some(x=>x.suggestion===i.suggestion));}
 assert.ok(jointStylisticIssues(makeDocument(['The non life threatening injuries are documented.'],'Current'),refs).some(i=>i.suggestion==='non-life-threatening'));
 assert.equal(jointStylisticIssues(makeDocument(['The non-life-threatening injuries are documented.'],'Current'),refs).length,0);
});
test('non-civil service predicate preserves the prefix and differs from its unit modifier',()=>{
 for(const bad of ['non civil service','non-civil-service','non civil-service']){const text='The positions are '+bad+'.',i=check(text)[0];assert.equal(i.suggestion,'non-civil service');assert.equal(text.slice(i.start,i.end),bad);assert.equal(check(text.replace(bad,i.suggestion)).length,0);assert.ok(jointStylisticIssues(makeDocument([text],'Current'),refs).some(x=>x.suggestion===i.suggestion));}
 assert.equal(check('The non-civil-service positions are filled.').length,0);
});
test('role checks preserve names, quotations, unfamiliar grammar and source strikeouts',()=>{
 for(const text of ['The full time equivalent is counted.','The full-time equivalent veterinarians are counted.','The Full Time Equivalent Student Program is named.','The term “full time equivalent students” is literal.','The injuries are non-life threatening.','The non-life-threatening injuries are documented.','The label is non-life-threatening.','The term “injuries are non-life-threatening” is literal.','The positions are non-civil service.','The Non Civil Service Program is named.','The term “positions are non-civil-service” is literal.'])assert.equal(check(text).length,0,text);
 const text='The injuries are non-life-threatening.',doc=makeDocument([text],'Current'),i=check(text)[0];doc.struck=[{start:i.start,end:i.end}];assert.equal(wordChoiceIssues(doc,refs).length,0);
});
test('complete modifier spelling preserves offsets through margin wrapping',()=>{
 const doc=makeDocument(['line 1 The full time\nline 2 equivalent students are counted.'],'Current'),i=wordChoiceIssues(doc,refs)[0];assert.equal(i.suggestion,'full-time equivalent');assert.equal(doc.text.slice(i.start,i.end),i.text);assert.ok(i.text.includes('line 2'));
 for(const text of ['The full-\ntime equivalent students are counted.','The injuries are non-life-\nthreatening.','The positions are non-civil-\nservice.'])assert.equal(check(text).length,0,text);
});
