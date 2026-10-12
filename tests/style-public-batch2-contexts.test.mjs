import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {numeralIssues} from '../app/style-numerals.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const changes=text=>jointStylisticIssues(makeDocument([text],'Current'),refs);

test('AB 747 court reporter series and page identifiers are kept numeric without exempting nearby prose',()=>{
 for(const citation of ['17 Cal.5th 207','17 Cal. 5th 207','17 Cal.App.4th 207','17 Cal.Rptr.3d 207','290 U.S. 325']){
  const text=`The decision (${citation}) applies. The office accepts the 5th applicant and 3 reports.`;
  const issues=numeralIssues(makeDocument([text],'Current'),refs).filter(i=>!i.matchesPrimary&&!i.conflict);
  assert.deepEqual(issues.map(i=>[i.text,i.suggestion]),[['5th','fifth'],['3','three']],citation);
  assert.ok(!issues.some(i=>i.start<text.indexOf('The office')));
 }
 assert.ok(changes('The label is 17 XYZ.5th 207.').some(i=>i.text==='5th'),'Unknown reporter forms remain reviewable');
});

test('inservice applies to selected training modifiers while ordinary service phrases are retained',()=>{
 assert.ok(refs.lcb.pages[10].text.split('\n').some(s=>s.trim()==='inservice'));
 for(const text of ['The agency shall provide in service training.','The in-service courses are required.','The in service education program applies.'])assert.ok(changes(text).some(i=>i.suggestion==='inservice'),text);
 for(const text of ['The Legislature shall advance accountability and transparency in service of process.','The vehicle remains in service.','The officer has completed 3 years in service.','The In Service Training Institute is named.','The term “in service training” is literal.','The term "in-service courses" is literal.','The agency shall provide inservice training.'])assert.ok(!changes(text).some(i=>i.suggestion==='inservice'),text);
 const doc=makeDocument(['line 1 The agency shall provide in\nline 2 service training.'],'Current'),i=jointStylisticIssues(doc,refs).find(i=>i.suggestion==='inservice');
 assert.ok(i);assert.equal(doc.text.slice(i.start,i.end),'in\nline 2 service');
});

test('AB 495 typographic point sizes follow the explicit LCB figure example while ordinary point counts remain checked',()=>{
 assert.ok(refs.lcb.pages[22].text.split('\n').some(s=>s.trim()==='6-point'));
 for(const [form,expected] of [['3-point type',[]],['three-point type',[['three','3']]],['8-point font',[]],['eight-point font',[['eight','8']]]]){
  const text=`The statements shall be enclosed in a box with ${form} rule lines. The office accepts 3 reports.`;
  assert.deepEqual(changes(text).filter(i=>i.checkId==='numerals').map(i=>[i.text,i.suggestion]),[...expected,['3','three']],form);
 }
 assert.deepEqual(changes('The office uses a 3-point plan and accepts 4 reports.').filter(i=>i.checkId==='numerals').map(i=>[i.text,i.suggestion]),[['3','three'],['4','four']]);
 assert.ok(changes('3-point type is required.').some(i=>i.text==='3'&&i.suggestion==='Three'),'A sentence-opening number remains reviewable');
 assert.deepEqual(numeralIssues(makeDocument(['The form uses 3-point type.'],'Current'),refs),[],'The guides agree on typography measures');
});

test('AB 121 in-service teacher training retains its source-listed LCB check across printed wraps',()=>{
 for(const text of ['The program supports in-service teacher training.','The program supports in service teacher training.','line 1 The program supports in-service teacher\nline 2 training.']){
  const doc=makeDocument([text],'Current'),issues=jointStylisticIssues(doc,refs).filter(i=>i.suggestion==='inservice');
  assert.equal(issues.length,1,text);assert.equal(doc.text.slice(issues[0].start,issues[0].end),text.includes('in-service')?'in-service':'in service');
 }
 for(const text of ['The program supports inservice teacher training.','The agency reports a change in service due to amended requirements.','The agency reports an increase in service intensity.','The term “in-service teacher training” is literal.'])assert.ok(!changes(text).some(i=>i.suggestion==='inservice'),text);
});

test('source Revised date footer and version remain displayed but excluded from substantive review',()=>{
 const footer='Revised 7-9-25—See last page. 95',doc=makeDocument(['SENATE BILL No. 243\nThe office accepts records.\n'+footer,'SB 243 — 2 —\nline 1 The office accepts 3 reports.'],'Current');
 const b=doc.blocks.find(b=>b.text===footer);assert.ok(b.ignored);assert.equal(doc.text.slice(b.start,b.end),footer);
 assert.ok(!doc.tokens.some(t=>t.start>=b.start&&t.end<=b.end));
 assert.deepEqual(jointStylisticIssues(doc,refs).filter(i=>i.checkId==='numerals').map(i=>[i.text,i.suggestion]),[['3','three']]);
});

test('revision-footer lookalikes in body text or nonlegislative documents remain substantive',()=>{
 for(const pages of [
  ['SENATE BILL No. 243\nline 1 Revised 7-9-25—See last page. 95\nline 2 The office accepts records.'],
  ['Project memo\nRevised 7-9-25—See last page. 95'],
  ['SENATE BILL No. 243\nRevised 7-9-25 the office accepts 3 reports.'],
 ]){
  const doc=makeDocument(pages,'Current'),b=doc.blocks.find(b=>b.text.includes('Revised'));assert.equal(b.ignored,false);assert.ok(doc.tokens.some(t=>t.start>=b.start&&t.end<=b.end));
 }
});
