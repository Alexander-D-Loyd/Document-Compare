import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument}from '../app/core.mjs';import {workerWords}from './helpers/spelling-worker.mjs';import {contextualPunctuationIssues}from '../app/style-punctuation.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),words=await workerWords(),make=t=>makeDocument([t],'Current',[],[],words),check=d=>contextualPunctuationIssues(d,refs).filter(i=>i.rule==='Punctuation: Time possessives');
test('complete qualified notice periods receive the source unit possessive without altering the count',()=>{
 for(const q of ['business','calendar','court','school','academic','consecutive','working']){
  const d=make('The office requires 30 '+q+' days notice.'),saved=JSON.stringify(d),[i]=check(d);assert.ok(i,q);assert.equal(i.text,'30 '+q+' days notice');assert.equal(i.suggestion,'30 '+q+' days’ notice');assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(JSON.stringify(d),saved);
 }
 const d=make('The office requires one calendar week notice.'),[i]=check(d);assert.equal(i.suggestion,'one calendar week’s notice');
 for(const [count,unit,expected]of [['30','schooldays','schooldays’'],['one','schoolday','schoolday’s']]){const [i]=check(make('The office requires '+count+' '+unit+' notice.'));assert.equal(i.suggestion,count+' '+expected+' notice');}
});
test('independent larger numeral corrections and punctuation remain separate source findings',()=>{
 const d=make('The office requires thirty calendar days notice.'),[i]=check(d);assert.ok(i);assert.equal(i.text,'calendar days notice');assert.equal(i.suggestion,'calendar days’ notice');const all=jointStylisticIssues(d,refs,{includeReviewSuggestions:true});assert.ok(all.some(x=>x.rule==='Punctuation: Time possessives'));assert.ok(all.some(x=>x.text==='thirty'&&x.suggestion==='30'));
 const small=check(make('The office requires 3 calendar days notice.'))[0];assert.equal(small.text,'calendar days notice');assert.equal(small.suggestion,'calendar days’ notice','Punctuation cannot decide or change a separately governed number form');
});
test('complete count evidence rejects fragments, identifiers, currency and unsupported fractions',()=>{
 for(const text of ['Section 30 calendar days notice.','$30 calendar days notice.','1/2 calendar days notice.','1 1/2 calendar days notice.','-30 calendar days notice.','+30 calendar days notice.','30 calendar-day notice.','thirty thirty calendar days notice.','one hundred and and three calendar days notice.','3calendar days notice.'])assert.equal(check(make(text)).length,0,text);
 const [decimal]=check(make('The office requires 0.5 calendar days notice.'));assert.equal(decimal.suggestion,'0.5 calendar days’ notice');
});
test('already possessive wording and unsupported nominal/verb roles retain their source',()=>{
 for(const text of ['30 calendar days’ notice.','one calendar week’s notice.',"30 calendar days' notice.",'30 schooldays’ notice.','one schoolday’s notice.','30 schooldays work for this schedule.','30 calendar days work for this schedule.','30 business days pay employees.','30 calendar days written notice.','30 business days elapsed.'])assert.equal(check(make(text)).length,0,text);
});
test('quotes, table layout and every damaged component retain the complete notice safeguard',()=>{
 for(const text of ['“30 calendar days notice.”',"'30 calendar days notice.'",'‘30 calendar days notice.’'])assert.equal(check(make(text)).length,0,text);
 const text='The office requires 30 calendar days notice.';
 for(const kind of ['struck','excluded'])for(const word of ['30','calendar','days','notice'])for(let n=0;n<word.length;n++){const d=make(text),at=d.text.indexOf(word)+n;d[kind]=[{start:at,end:at+1}];assert.equal(check(d).length,0,kind+' '+word+' '+n);}
 const d=make(text);d.blocks[0].formatting={headerGaps:[{start:3,end:4},{start:10,end:11}]};assert.equal(check(d).length,0);
});
test('a divided qualifier restores full physical highlighting and preserves source formatting',()=>{
 const d=makeDocument(['line 1 The office requires 30 calen-','line 1 dar days notice.'],'Current',[],[],words),saved=JSON.stringify(d),[i]=jointStylisticIssues(d,refs,{includeReviewSuggestions:true}).filter(i=>i.rule==='Punctuation: Time possessives');assert.ok(i);assert.ok(i.text.includes('calen-\nline 1 dar'));assert.equal(i.suggestion,'30 calendar days’ notice');assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(JSON.stringify(d),saved);
});
