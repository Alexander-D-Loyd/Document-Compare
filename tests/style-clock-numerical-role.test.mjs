import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {labelledNumericalRoleRanges} from '../app/style-lcb-labelled-numerical-roles.mjs';
import {reviewStyleIssues} from '../app/style-review.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=text=>makeDocument(['The people do enact as follows:\n'+text],'Current');
const check=doc=>reviewStyleIssues(doc,refs,{includeReviewSuggestions:true,includeCompleteLcbReview:true});
test('complete dotted clock components are not separate numerical quantities',()=>{
 for(const phrase of ['2:30 p.m.','10:03 a.m.','2:30 o’clock p.m.','10 a.m.','2:30 PM','10 AM.','2:30 o’clock PM','two o’clock PM','two o’clock p.m.']){
  const doc=make('The hearing begins at '+phrase),saved=JSON.stringify(doc);
  assert.ok(labelledNumericalRoleRanges(doc).some(r=>r.role==='clock'));
  assert.ok(!check(doc).some(i=>i.checkId==='lcb-sentence-number-review'),phrase);
  assert.equal(JSON.stringify(doc),saved);
 }
 const issues=check(make('The hearing begins at 2:30 p.m.; 3 offices retain 12 records.'));
 assert.ok(issues.some(i=>i.checkId==='lcb-sentence-number-review'),'Independent ordinary counts retain review');
 for(const text of ['Meet at 2:30 o’clock PM.','The hearing starts at two o’clock PM, and 12 offices shall attend.','The hearing starts at two o’clock p.m., and 12 offices shall attend.'])
  assert.ok(!check(make(text)).some(i=>i.checkId==='lcb-sentence-number-review'),text);
});
test('undotted clocks need the intact finite clock lead rather than bare AM/PM letters',()=>{
 assert.ok(!labelledNumericalRoleRanges(make('The label contains 2:30 AM.')).some(r=>r.role==='clock'));
 assert.ok(!labelledNumericalRoleRanges(make('Meet path/at 2:30 PM.')).some(r=>r.role==='clock'));
 const doc=make('The hearing begins at 2:30 PM.'),range=labelledNumericalRoleRanges(doc).find(r=>r.role==='clock');assert.ok(range);
 for(const field of ['struck','excluded'])for(let at=range.evidenceStart;at<range.evidenceEnd;at++){
  const damaged=structuredClone(doc);damaged[field].push({start:at,end:at+1});assert.ok(!labelledNumericalRoleRanges(damaged).some(r=>r.role==='clock'),field+' '+at);
 }
});
test('clock roles require the complete original finite expression',()=>{
 const doc=make('The hearing begins at 2:30 p.m.'),range=labelledNumericalRoleRanges(doc).find(r=>r.role==='clock');
 for(const field of ['struck','excluded'])for(let at=range.evidenceStart;at<range.evidenceEnd;at++){
  const damaged=structuredClone(doc);damaged[field].push({start:at,end:at+1});
  assert.ok(!labelledNumericalRoleRanges(damaged).some(r=>r.role==='clock'),field+' '+at);
 }
 for(const phrase of ['02:30 p.m.','13:30 p.m.','2:60 p.m.','2:3 p.m.','X2:30 p.m.','2:30 p.m.X','-2:30 p.m.','2/2:30 p.m.','2:30 p.m. + 5','2:30 p.m.1'])
  assert.ok(!labelledNumericalRoleRanges(make('The hearing begins at '+phrase)).some(r=>r.role==='clock'),phrase);
});
