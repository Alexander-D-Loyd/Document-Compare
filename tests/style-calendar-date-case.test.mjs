import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';import {contextualPunctuationIssues}from '../app/style-punctuation.mjs';import {calendarIssues}from '../app/style-calendar.mjs';import {CALENDAR_MONTHS,validCompleteCalendarDate}from '../app/style-calendar-dates.mjs';
import {jointStylisticIssues}from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const dates=d=>contextualPunctuationIssues(typeof d==='string'?makeDocument([d],'Current'):d,refs).filter(i=>['Punctuation: Full dates','Punctuation: Month and year'].includes(i.rule));

test('LCB full-date commas are independent of a month capitalization finding',()=>{
 for(const month of CALENDAR_MONTHS){const lower=month.toLowerCase(),text='On '+lower+' 12, 2027 the rule applies.',doc=makeDocument([text],'Current'),before=JSON.stringify(doc),found=dates(doc);assert.equal(found.length,1,text);assert.equal(found[0].suggestion,lower+' 12, 2027,');assert.equal(found[0].guidePage,7);assert.equal(found[0].references[0].guideId,'lcb');assert.equal(calendarIssues(doc,refs).find(i=>i.suggestion===month)?.text,lower);assert.equal(JSON.stringify(doc),before);assert.equal(dates(text.replace(found[0].text,found[0].suggestion)).length,0);}
});

test('divided-day and month-year punctuation retain source case while proposing only punctuation',()=>{
 for(const [text,suggestion]of [['On june 3 0, 2019 the board acted.','june 30, 2019,'],['Until jUnE 3 0, 2019.','jUnE 30, 2019'],['During april, 2027 it changed.','april 2027'],['As of aPrIl, 2027 it changed.','aPrIl 2027']]){const found=dates(text);assert.equal(found.length,1,text);assert.equal(found[0].suggestion,suggestion);assert.equal(dates(text.replace(found[0].text,suggestion)).length,0);}
 assert.equal(validCompleteCalendarDate('fEbRuArY',29,2000),true);assert.equal(validCompleteCalendarDate('fEbRuArY',29,2100),false);assert.equal(validCompleteCalendarDate('unknown',1,2027),false);
});

test('lowercase calendar punctuation still requires valid dates, intact words and supported month-year roles',()=>{
 for(const text of ['On february 31, 2027 the rule applies.','On february 29, 2100 the rule applies.','On april 31, 2027 the rule applies.','On april 0, 2027 the rule applies.','On april 1, 0000 the rule applies.','On june 3 2, 2019 the board acted.','The defendant may, 2027, was identified.','The code name april, 2027, is listed.','On éapril 1, 2027 the rule applies.','On april 1, 2027é the rule applies.','On april 1, 2027 theé rule applies.','During april, 2027é it changed.'])assert.equal(dates(text).length,0,text);
 for(const text of ['On april x 1, 2027 the rule applies.','On june 3 0, 2019 x the rule applies.','In x april, 2027 it changed.'])for(const kind of ['struck','excluded']){const doc=makeDocument([text],'Current'),start=text.indexOf(' x ')+1;doc[kind]=[...(doc[kind]||[]),{start,end:start+1}];assert.equal(dates(doc).length,0,text+' '+kind);}
});

test('lowercase dates inside literals or tables do not become punctuation corrections',()=>{
 for(const text of ['The label “april, 2027” is literal.','The text reads "june 3 0,\n2019 the clause applies" as a literal.'])assert.equal(dates(text).length,0,text);
 const doc=makeDocument(['On april 1, 2027 the rule applies.'],'Current');doc.blocks[0].formatting={headerGaps:[12,24]};assert.equal(dates(doc).length,0);
});

test('lowercase complete dates preserve cross-page selections across known heads',()=>{
 const doc=makeDocument(['ASSEMBLY BILL No. 121\nThe people do enact as follows:\nline 1 On april 1,\n97','AB 121 — 2 —\nline 1 2027 the rule applies.'],'Current'),before=JSON.stringify(doc),found=dates(doc);assert.equal(found.length,1);assert.equal(found[0].suggestion,'april 1, 2027,');assert.equal(doc.text.slice(found[0].start,found[0].end),found[0].text);assert.equal(JSON.stringify(doc),before);
});

test('joint review keeps a lowercase divided date whole instead of changing individual day digits',()=>{
 const text='On june 3 0, 2019 the board acted. Appoint 3 workers.',doc=makeDocument([text],'Current'),before=JSON.stringify(doc),found=jointStylisticIssues(doc,refs);assert.deepEqual(found.filter(i=>i.rule==='Punctuation: Full dates').map(i=>[i.text,i.suggestion]),[['june 3 0, 2019','june 30, 2019,']]);assert.deepEqual(found.filter(i=>i.checkId==='numerals').map(i=>[i.text,i.suggestion]),[['3','three']]);assert.equal(JSON.stringify(doc),before);
 // The combined review shows one finding per overlapping source span.
 // Applying the punctuation suggestion leaves capitalization independently
 // checkable, instead of silently changing the source month spelling.
 const corrected=makeDocument([text.replace(found[0].text,found[0].suggestion)],'Current');assert.ok(jointStylisticIssues(corrected,refs).some(i=>i.checkId==='calendar'&&i.text==='june'&&i.suggestion==='June'));
});
