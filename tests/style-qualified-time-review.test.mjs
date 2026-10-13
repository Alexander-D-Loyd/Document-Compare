import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument}from '../app/core.mjs';import {timePossessiveReviewIssues}from '../app/style-time-possessive-review.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),make=s=>makeDocument([s],'Current'),check=d=>timePossessiveReviewIssues(typeof d==='string'?make(d):d,refs);
test('qualified periods preserve complete source counts and modifiers without selecting punctuation',()=>{
 for(const q of ['business','calendar','court','school','academic','consecutive','working']){const d=make('The office requires 30 '+q+' days written notice.'),saved=JSON.stringify(d),[i]=check(d);assert.ok(i,q);assert.equal(i.text,q+' days written notice');assert.equal(i.suggestion,null);assert.equal(i.reviewSuggested,true);assert.equal(i.timePossessiveEvidence.qualifier.text,q+' ');assert.equal(i.timePossessiveEvidence.count.text,'30 ');assert.equal(i.timePossessiveEvidence.unit.text,'days');assert.equal(JSON.stringify(d),saved);}
 assert.equal(check('The office requires several schooldays advance notice.')[0].text,'schooldays advance notice');
});
test('a precise notice correction retains ownership and ordinary temporal continuations are protected',()=>{
 const all=jointStylisticIssues(make('The office requires 30 calendar days notice.'),refs,{includeReviewSuggestions:true});assert.equal(all.filter(i=>i.checkId==='lcb-time-possessive-review').length,0);assert.ok(all.some(i=>i.suggestion==='30 calendar days’ notice'));
 for(const s of ['The office acts after 30 business days elapsed.','The facility’s 2023 calendar year rate applies.','Rates for 2024 and 2025 calendar years based on reports apply.','The office requires 30 business days based on the schedule.','The 30 calendar days begin today.','The office requires 30 business days’ written notice.','The office requires 30 business-days written notice.','The office requires $30 business days written notice.','The office requires 1/2 business days written notice.'])assert.equal(check(s).length,0,s);
});
test('every count qualifier unit modifier and head needs original intact evidence',()=>{
 const s='The office requires 30 business days written notice.';
 for(const kind of ['struck','excluded'])for(const word of ['30','business','days','written','notice'])for(let n=0;n<word.length;n++){const d=make(s),start=s.indexOf(word)+n;d[kind]=[{start,end:start+1}];assert.equal(check(d).length,0,kind+' '+word+' '+n);}
 for(const s of ['“30 business days written notice.”',"'30 business days written notice.'",'The office requires thirty thirty business days written notice.'])assert.equal(check(s).length,0,s);
});
test('margin and page divisions keep count and qualifier evidence in physical offsets',()=>{
 const d=makeDocument(['line 1 The office requires 30 calendar\nline 2 days written','line 1 notice.'],'Current'),[i]=check(d);assert.ok(i);assert.equal(d.text.slice(i.start,i.end),'calendar\nline 2 days written\nline 1 notice');for(const r of [i.timePossessiveEvidence.count,i.timePossessiveEvidence.qualifier,i.timePossessiveEvidence.unit,i.timePossessiveEvidence.head])assert.equal(d.text.slice(r.start,r.end),r.text);
});
