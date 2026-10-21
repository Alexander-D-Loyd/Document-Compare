import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {calendarAbbreviationIssues} from '../app/style-calendar-abbreviations.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const doc=text=>makeDocument([text],'Current');
const check=text=>calendarAbbreviationIssues(doc(text),refs);
const weekdays=[['Sun','Sunday'],['Mon','Monday'],['Tues','Tuesday'],['Wed','Wednesday'],['Thurs','Thursday'],['Fri','Friday'],['Sat','Saturday']];
const months=[['Jan','January'],['Feb','February'],['Mar','March'],['Apr','April'],['Aug','August'],['Sept','September'],['Oct','October'],['Nov','November'],['Dec','December']];

test('every printed calendar abbreviation supports ordinary sentence-opening leads with exact source references',()=>{
 const page=refs.gpo.pages[246];assert.equal(page.printedPage,'233');
 for(const [forms,rule]of [[weekdays,'9.46'],[months,'9.44']])for(const [alias,full]of forms){
  assert.ok(page.text.includes(alias+'.'),alias);
  for(const lead of ['On','By','Before','After','Through','Until','Every','Each']){
   const text=lead+' '+alias+'.'+(forms===months?' 1.':' The agency shall act.'),d=doc(text),before=JSON.stringify(d),found=calendarAbbreviationIssues(d,refs);
   assert.equal(found.length,1,text);const [i]=found;assert.equal(i.suggestion,full);assert.equal(i.guidePage,247);assert.equal(i.guidePrintedPage,'233');assert.equal(i.rule,rule);assert.equal(text.slice(i.start,i.end),alias+'.');assert.equal(i.text,alias+'.');assert.equal(JSON.stringify(d),before);
  }
  assert.equal(check('Meet on '+full+(forms===months?' 1.':'.')).length,0);
 }
});

test('all original cue abbreviation separator and required date characters must survive strikeouts and exclusions',()=>{
 for(const text of ['Meet on Tues.','File by Jan. 12.']){
  const from=text.indexOf(text.startsWith('Meet')?'on':'by'),to=text.startsWith('Meet')?text.length:text.length-1;
  assert.equal(check(text).length,1);
  for(const property of ['struck','excluded'])for(let at=from;at<to;at++){
   const d=doc(text);d[property]=[{start:at,end:at+1}];assert.equal(calendarAbbreviationIssues(d,refs).length,0,property+' '+text+' '+at);
  }
 }
 for(const [text,needle]of [['Meet on unknown Tues.','unknown'],['File by Jan. unknown 12.','unknown'],['Meet αon Tues.','α'],['File by Jan. 1x.','x']])for(const property of ['struck','excluded']){
  const d=doc(text),start=text.indexOf(needle);d[property]=[{start,end:start+needle.length}];assert.equal(calendarAbbreviationIssues(d,refs).length,0,text+' '+property);
 }
});

test('Unicode cue and day boundaries and nondate numeric continuations cannot supply a calendar cue',()=>{
 for(const text of ['Meet éon Tues.','Meet \u0301on Tues.','File by Jan. 1é.','File by Jan. 1\u0301.','File by Jan. 1_0.','File by Jan. 123.','File by Jan. 1.5.','File by Jan. Act.'])assert.equal(check(text).length,0,text);
});

test('complete quotations reference contexts explicit lists and tables preserve the printed exceptions',()=>{
 for(const text of ['The words “Meet on Tues.” are quoted.','The words "Meet on\nTues." are quoted.','See (Pub. L. 1, by Jan. 1).','See [Pub. L. 1, on Jan. 1].','• On Tues.','- On Tues.','(a) On Tues.','1. File by Jan. 1.'])assert.equal(check(text).length,0,text);
 for(const lines of [['Meet on','Tues.'],['File by Jan.','12.']])for(let row=0;row<2;row++){
  const d=doc(lines.join('\n'));d.blocks[row].formatting={headerGaps:[{},{}]};assert.equal(calendarAbbreviationIssues(d,refs).length,0,lines.join(' ')+' table '+row);
 }
 assert.equal(check('Meet on Tues.\nThe people do enact as follows:').length,0);
});

test('long ordinary whitespace margins and identified running heads preserve precise alias offsets',()=>{
 assert.equal(check('By'+' '.repeat(700)+'Jan.'+' '.repeat(700)+'12.').length,1);
 const d=makeDocument(['ASSEMBLY BILL No. 1\nThe people do enact as follows:\nline 1 File by Jan.\n97','AB 1 — 2 —\nline 1 12.'],'Current'),head=d.blocks.find(b=>b.ignored&&b.text.includes('AB 1'));head.formatting={headerParts:[{text:head.text}]};
 const before=JSON.stringify(d),[i]=calendarAbbreviationIssues(d,refs);assert.ok(i);assert.equal(i.text,'Jan.');assert.equal(i.suggestion,'January');assert.equal(i.start,d.text.indexOf('Jan.'));assert.equal(i.end,i.start+4);assert.equal(JSON.stringify(d),before);
 head.formatting={};head.runningHead=false;head.layoutLabel=false;assert.equal(calendarAbbreviationIssues(d,refs).length,0);
});

test('the same document is rechecked against current strike and exclusion state',()=>{
 const d=doc('By Jan. 12.'),at=d.text.indexOf('12');assert.equal(calendarAbbreviationIssues(d,refs).length,1);
 d.struck=[{start:at,end:at+1}];assert.equal(calendarAbbreviationIssues(d,refs).length,0);d.struck=[];assert.equal(calendarAbbreviationIssues(d,refs).length,1);
 d.excluded=[{start:at,end:at+1}];assert.equal(calendarAbbreviationIssues(d,refs).length,0);d.excluded=[];assert.equal(calendarAbbreviationIssues(d,refs).length,1);
});

test('joint style review preserves independent LCB findings while adding the bounded GPO calendar selection',()=>{
 const d=doc('The people do enact as follows:\nline 1 On Tues. the healthcare program shall act.'),before=JSON.stringify(d),issues=jointStylisticIssues(d,refs);
 assert.ok(issues.some(i=>i.checkId==='calendar-abbreviations'&&i.suggestion==='Tuesday'&&i.guideId==='gpo'));
 assert.ok(issues.some(i=>i.suggestion==='health care'&&i.guideId==='lcb'));
 for(const i of issues){assert.equal(d.text.slice(i.start,i.end),i.text);assert.ok(i.references.every(r=>r.sourcePassage?.text));}assert.equal(JSON.stringify(d),before);
});

test('removed original quotation and reference boundaries never expose their calendar payload',()=>{
 const checks=[d=>calendarAbbreviationIssues(d,refs),d=>jointStylisticIssues(d,refs).filter(i=>i.checkId==='calendar-abbreviations')];
 for(const [open,close,payload]of [['“','”','On Tues.'],['"','"','On Tues.'],["'","'",'On Tues.'],['(',')','On Jan. 1'],['[',']','On Jan. 1']]){
  const text='The text includes '+open+payload+close+'.',d=doc(text),boundaries=[text.indexOf(open),text.lastIndexOf(close)];
  for(const check of checks)assert.equal(check(d).length,0,text);
  for(const property of ['struck','excluded'])for(const at of boundaries){const damaged=structuredClone(d);damaged[property].push({start:at,end:at+1});for(const check of checks)assert.equal(check(damaged).length,0,property+' '+text+' '+at);}
 }
 for(const text of ['See (the reference (citation) on Jan. 1).','See [the reference [citation] on Jan. 1].'])for(const check of checks)assert.equal(check(doc(text)).length,0,text);
});

test('original technical lead and day endpoints cannot be removed into an eligible calendar expression',()=>{
 const checks=[d=>calendarAbbreviationIssues(d,refs),d=>jointStylisticIssues(d,refs).filter(i=>i.checkId==='calendar-abbreviations')];
 for(const [text,needle]of [['path/On Tues.','/'],['pre-On Tues.','-'],['key:On Tues.',':'],['By Jan. 1/key','/'],['By Jan. 1-code','-'],['On Tues./key','/']]){
  const d=doc(text);for(const check of checks)assert.equal(check(d).length,0,text);
  for(const property of ['struck','excluded']){const damaged=structuredClone(d),at=text.indexOf(needle);damaged[property].push({start:at,end:at+1});for(const check of checks)assert.equal(check(damaged).length,0,property+' '+text);}
 }
 for(const text of ['Meet—On Tues.','By Jan. 1—approval follows.'])for(const check of checks)assert.equal(check(doc(text)).length,1,text);
});

test('removed original list markers remain negative context for the calendar-list exception',()=>{
 for(const marker of ['•','-','1.','(a)'])for(const property of ['struck','excluded']){
  const d=doc(marker+' On Tues.');d[property].push({start:0,end:marker.length});assert.equal(calendarAbbreviationIssues(d,refs).length,0,property+' '+marker);assert.equal(jointStylisticIssues(d,refs).filter(i=>i.checkId==='calendar-abbreviations').length,0,property+' joint '+marker);
 }
});
