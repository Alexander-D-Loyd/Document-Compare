import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {calendarIssues} from '../app/style-calendar.mjs';
const refs={gpo:JSON.parse(fs.readFileSync(new URL('../app/data/gpo-reference.json',import.meta.url)))};
const check=text=>calendarIssues(makeDocument([text],'Current'),refs);

test('finite complete calendar cues retain weekday plurals ordinal days and year roles',()=>{
 for(const [text,expected]of [['Meet every mondays.','Monday'],['Meet on tuesday.','Tuesday'],['File by january 1st.','January'],['The report is effective october 1993.','October'],['The report is effective october.','October'],['Meet on independence day.','Independence Day']]){
  const found=check(text);assert.deepEqual(found.map(i=>i.suggestion),[expected],text);assert.equal(text.slice(found[0].start,found[0].end),found[0].text);assert.equal(found[0].guidePage,48);assert.ok(['3.24','3.25'].includes(found[0].rule));
 }
});

test('Unicode calendar-name day and cue fragments cannot establish a calendar correction',()=>{
 for(const text of ['Meet on mondayé.','Meet on monday\u0301.','Meet éon monday.','File by january 1é.','File by january 1\u0301.','File by january 2026é.','File by january 1sté.','Meet on independence dayé.','Meet on éindependence day.'])assert.equal(check(text).length,0,text);
});

test('struck or excluded cue words and whitespace cannot manufacture full calendar evidence',()=>{
 for(const [text,needle]of [['Meet on x monday.','x'],['File by x january 1.','x'],['Meet on x independence day.','independence'],['File by january 1x.','x'],['Meet éon monday.','é'],['Meet on monday.','on'],['File by january 1.','1']]){
  for(const property of ['struck','excluded']){
   const doc=makeDocument([text],'Current'),start=doc.text.indexOf(needle);doc[property]=[{start,end:start+needle.length}];assert.equal(calendarIssues(doc,refs).length,0,text+' '+property);
  }
 }
 const doc=makeDocument(['Meet on monday.'],'Current'),space=doc.text.indexOf(' monday');doc.struck=[{start:space,end:space+1}];assert.equal(calendarIssues(doc,refs).length,0,'A struck cue separator is incomplete evidence');
});

test('long layout whitespace and recognized interior page headers retain exact name selections',()=>{
 assert.deepEqual(check('File by'+ ' '.repeat(700)+'january 1.').map(i=>i.suggestion),['January']);
 const doc=makeDocument(['ASSEMBLY BILL No. 1\nThe people do enact as follows:\nline 1 Meet on\n97','AB 1 — 2 —\nline 1 monday.'],'Current'),head=doc.blocks.find(b=>b.ignored&&b.text.includes('AB 1'));head.formatting={headerParts:[{text:head.text}]};
 const original=doc.text,found=calendarIssues(doc,refs);assert.deepEqual(found.map(i=>i.suggestion),['Monday']);assert.equal(found[0].start,doc.text.indexOf('monday'));assert.equal(found[0].end,doc.text.indexOf('monday')+6);assert.equal(doc.text,original);
 head.formatting={};head.runningHead=false;head.layoutLabel=false;assert.equal(calendarIssues(doc,refs).length,0);
});

test('wrapped literals tables and uncertain heading context preserve calendar text',()=>{
 assert.equal(check('The words "Meet on\nmonday" are literal.').length,0);
 const doc=makeDocument(['Meet on monday.\nFile by january 1.'],'Current');doc.blocks[0].formatting={headerGaps:[1,2]};assert.deepEqual(calendarIssues(doc,refs).map(i=>i.suggestion),['January']);
 assert.equal(check('Meet on monday.\nThe people do enact as follows:').length,0);
});
