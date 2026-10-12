import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=t=>jointStylisticIssues(makeDocument([t],'Current'),refs).filter(i=>i.rule.startsWith('Hyphenation')&&i.suggestion.includes(' '));

test('selected predicate families reject comma-separated adjectives before a noun',()=>{
 for(const text of ['The standard is cost-effective, flexible software.','The plan is age-appropriate, flexible software.','The material is fire-tested, durable material.','The water is crystal-clear, clean water.','The program is science-based, flexible software.','The standard is cost-effective, for purposes of this section, software.','The program is science-based, when used, software.','The system is cost-effective, subject to this section, software.'])assert.equal(check(text).length,0,text);
});

test('explicit clauses and terminal reduced complements establish predicate boundaries',()=>{
 for(const form of ['cost-effective','age-appropriate','science-based'])for(const ending of [', and the agency shall review it.',', because the standard applies.',', the report is required.',', when used.',', subject to this section.',' and the agency shall review it.']){
  const text='The program is '+form+ending,found=check(text);assert.equal(found.length,1,text);assert.equal(found[0].suggestion,form.replaceAll('-',' '));assert.equal(text.slice(found[0].start,found[0].end),form);
 }
});

test('mixed listed and productive predicate compounds share one explicit copula',()=>{
 for(const [phrase,forms] of [['cost-effective and science-based',['cost-effective','science-based']],['science-based and cost-effective',['science-based','cost-effective']],['cost-effective, age-appropriate, and science-based',['cost-effective','age-appropriate','science-based']],['cost-effective but not science-based',['cost-effective','science-based']],['science-based and fully cost-effective',['science-based','cost-effective']],['mental-health-related and cost-effective',['mental-health-related','cost-effective']]]){
  const text='The program shall be '+phrase+'.',found=check(text);assert.deepEqual(found.map(i=>i.text),forms,text);for(const i of found)assert.equal(text.slice(i.start,i.end),i.text);
  assert.equal(check(text.replaceAll('-',' ')).length,0,text+' compliant');
 }
 for(const text of ['The program is cost-effective and science-based software.','The program is science-based and cost-effective software.','The plan is cost-effective, age-appropriate, flexible software.','The program is cost-effective and unknownword-based.','The program is unknownword-based and cost-effective.'])assert.equal(check(text).length,0,text);
});

test('GPO source examples retain their explicit noun restriction in mixed predicates',()=>{
 for(const [noun,phrase,forms] of [['material','cost-effective and fire-tested',['cost-effective','fire-tested']],['material','fire-tested and science-based',['fire-tested','science-based']],['water','science-based and crystal-clear',['science-based','crystal-clear']]]){
  const text='The '+noun+' is '+phrase+'.',found=check(text);assert.deepEqual(found.map(i=>i.text),forms,text);assert.ok(found.find(i=>/crystal|fire/.test(i.text)).references.some(r=>r.guideId==='gpo'&&r.rule==='7.7'));
 }
 assert.ok(!check('The program is science-based and fire-tested.').some(i=>i.text==='fire-tested'),'Unencoded source nouns remain manual');
});

test('complete wrapped compounds preserve exact offsets and ignore intervening page labels',()=>{
 const doc=makeDocument(['ASSEMBLY BILL No. 577\nThe people of the State of California do enact as follows:\nline 1 The program is cost-\n94','AB 577 — 2 —\nline 1 effective and science-based.'],'Current'),found=jointStylisticIssues(doc,refs).filter(i=>['cost effective','science based'].includes(i.suggestion));
 assert.equal(found.length,2);assert.equal(found[0].start,doc.text.indexOf('cost-'));assert.equal(found[0].end,doc.text.indexOf('effective')+9);assert.equal(found[1].text,'science-based');for(const i of found)assert.equal(doc.text.slice(i.start,i.end),i.text);
});

test('extended compounds, body dashes, names, quotations and source strikeouts remain protected',()=>{
 for(const text of ['The program is cost-effective-extra.','The program is COST-EFFECTIVE.','The program is Cost-Effective.','The program is cost—effective.','The material is fire–tested.','The term “the program is cost-effective and science-based.” is literal.'])assert.equal(check(text).length,0,text);
 const whole=check('The program is cost-effective-based.');assert.equal(whole.length,1);assert.equal(whole[0].text,'cost-effective-based');assert.equal(whole[0].suggestion,'cost-effective based','The unencoded base retains its internal spelling for manual review');
 const doc=makeDocument(['The program is cost-effective and science-based.'],'Current');doc.struck=[{start:15,end:29}];assert.ok(!jointStylisticIssues(doc,refs).some(i=>i.text==='cost-effective'));
});
