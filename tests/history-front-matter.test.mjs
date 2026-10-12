import test from 'node:test';
import assert from 'node:assert/strict';
import {makeDocument} from '../app/core.mjs';
import {compareTokenValues} from '../app/text-diff.mjs';
import {documentComparisonTokens} from '../app/document-comparison.mjs';
import {nonAmendmentEdits} from '../app/amendments.mjs';
const date='AMENDED IN SENATE JUNE 3, 2026',bill='ASSEMBLY BILL No. 109';
const historyDiff=(a,b)=>compareTokenValues(documentComparisonTokens(a).map(t=>t.value),documentComparisonTokens(b).map(t=>t.value));

test('budget history without legislature masthead is separate from an adjacent removed masthead',()=>{
 const previous=makeDocument(['california legislature—2025–26 regular session\n'+bill+'\nIntroduced by Assembly Member Gabriel\nline 1 Old wording.'],'previous');
 const current=makeDocument([date+'\n'+bill+'\nIntroduced by Assembly Member Gabriel\nline 1 New wording.'],'current');
 assert.deepEqual(current.effectiveTokens[0],{value:date,start:0,end:date.length,history:true});
 const edits=historyDiff(previous,current).filter(c=>c.added||c.removed),row=edits.find(c=>c.history);
 assert.ok(row?.added);assert.equal(row.count,1);assert.ok(edits.some(c=>c.removed&&!c.history));
 const ranges=nonAmendmentEdits('',previous,current,[]).ranges,history=ranges[1].filter(r=>r.start<date.length);
 assert.equal(history.length,1);assert.equal(current.text.slice(history[0].start,history[0].end),date);
 assert.ok(!ranges[0].some(r=>r.group===history[0].group));
 assert.ok(!ranges[1].some(r=>r.group===history[0].group&&r.start>=date.length));
});

test('multiple masthead-free history rows retain individual targets and unchanged dates',()=>{
 const oldDate='AMENDED IN ASSEMBLY APRIL 23, 2025',newDate='AMENDED IN SENATE JUNE 4, 2026';
 const previous=makeDocument([oldDate+'\n'+bill+'\nline 1 First.'],'previous'),current=makeDocument([newDate+'\n'+date+'\n'+oldDate+'\n'+bill+'\nline 1 First.'],'current');
 const edits=historyDiff(previous,current).filter(c=>c.added||c.removed);assert.equal(edits.length,2);assert.ok(edits.every(c=>c.history&&c.added&&c.count===1));
 const ranges=nonAmendmentEdits('',previous,current,[]).ranges;assert.equal(ranges[0].length,0);assert.equal(ranges[1].length,2);assert.equal(new Set(ranges[1].map(r=>r.group)).size,2);
 assert.deepEqual(ranges[1].map(r=>current.text.slice(r.start,r.end)),[newDate,date]);
});

test('dated body rows, margin rows, later pages and documents without a bill heading are ordinary text',()=>{
 for(const pages of [[date+'\nAn ordinary document.'],[bill+'\n'+date],['line 1 '+date+'\n'+bill],[bill,date+'\n'+bill]]){
  const doc=makeDocument(pages,'protected');assert.ok(!doc.tokens.some(t=>t.history));assert.ok(doc.tokens.some(t=>t.value==='AMENDED'));
 }
});

test('a legislature masthead still bounds history before a later bill heading',()=>{
 const after='AMENDED IN SENATE MAY 1, 2026';
 const doc=makeDocument([date+'\ncalifornia legislature—2025–26 regular session\n'+after+'\n'+bill+'\nline 1 First.'],'bounded');
 assert.deepEqual(doc.tokens.filter(t=>t.history).map(t=>t.value),[date]);assert.ok(doc.tokens.some(t=>t.value==='MAY'));
});
