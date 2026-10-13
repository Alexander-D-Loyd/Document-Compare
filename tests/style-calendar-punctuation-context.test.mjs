import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';import {contextualPunctuationIssues}from '../app/style-punctuation.mjs';import {CALENDAR_MONTHS}from '../app/style-calendar-dates.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=d=>contextualPunctuationIssues(typeof d==='string'?makeDocument([d],'Current'):d,refs).filter(i=>['Punctuation: Full dates','Punctuation: Month and year'].includes(i.rule));
test('full date comma examples require a valid complete Gregorian date while preserving figures',()=>{
 for(const text of ['On February 31, 2027 the rule applies.','On April 31, 2027 the rule applies.','On January 0, 2027 the rule applies.','On February 29, 2027 the rule applies.','On February 29, 2100 the rule applies.','On January 1, 0000 the rule applies.'])assert.equal(check(text).length,0,text);
 for(const text of ['On February 29, 2028 the rule applies.','On February 29, 2000 the rule applies.','On January 31, 2027 the rule applies.']){const found=check(text);assert.equal(found.length,1,text);assert.equal(found[0].suggestion,found[0].text+',');}
});
test('month-year comma checks use a temporal cue or source entry and preserve person-name contexts',()=>{
 for(const month of CALENDAR_MONTHS)for(const lead of ['In ','During ','Before ','As of ','The month of ','']){
  const text=lead+month+', 2027 it changed.',found=check(text);assert.equal(found.length,1,text);assert.equal(found[0].suggestion,month+' 2027');
 }
 for(const text of ['The defendant May, 2027, was identified.','Mr. May, 2027, is listed.','The code name April, 2027, is listed.','The label\nMay, 2027, is listed.'])assert.equal(check(text).length,0,text);
});
test('date continuation and temporal cue must use intact original source evidence',()=>{
 for(const text of ['On January 1, 2027 x the rule applies.','In x April, 2027 it changed.'])for(const kind of ['struck','excluded']){
  const doc=makeDocument([text],'Current'),start=text.indexOf(' x ')+1;doc[kind]=[...(doc[kind]||[]),{start,end:start+1}];assert.equal(check(doc).length,0,text+' '+kind);
 }
 for(const text of ['On January 1, 2027 theé rule applies.','Iné April, 2027 it changed.'])assert.equal(check(text).length,0,text);
});
test('long actual layout whitespace does not truncate a month-year temporal cue',()=>{
 const text='During'+' '.repeat(1000)+'April, 2027 it changed.',doc=makeDocument([text],'Current'),before=JSON.stringify(doc),found=check(doc);assert.equal(found.length,1);assert.equal(found[0].text,'April, 2027');assert.equal(JSON.stringify(doc),before);
});
test('month-year temporal cues survive recognized page heads and reject unknown bridges',()=>{
 const doc=makeDocument(['ASSEMBLY BILL No. 121\nThe people do enact as follows:\nline 1 During\n97','AB 121 — 2 —\nline 1 April, 2027 it changed.'],'Current');assert.equal(check(doc).length,1);
 const text='During x April, 2027 it changed.',bad=makeDocument([text],'Current'),start=text.indexOf('x');bad.excluded=[...(bad.excluded||[]),{start,end:start+1}];assert.equal(check(bad).length,0);
});
test('quoted date examples remain source literals rather than active calendar corrections',()=>{
 for(const text of ['The label “April, 2027” is literal.','The text reads "January 1,\n2027 the clause applies" as a literal.'])assert.equal(check(text).length,0,text);
});
