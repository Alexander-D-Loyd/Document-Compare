import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {wordChoiceIssues} from '../app/style-word-choice.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=doc=>wordChoiceIssues(doc,refs).filter(i=>i.rule==='Spelling and usage: biennial-frequency');
test('explicit every-other-year intervals identify the LCB biennial frequency for the same event',()=>{
 for(const event of ['report','review','audit','inspection','meeting'])for(const link of ['', 'is held ', 'shall be conducted ', 'has been prepared ', 'occurs ', 'takes place '])for(const frequency of ['every other year','once every other year']){
  const text='The biannual '+event+' '+link+frequency+'.',d=makeDocument([text],'Current'),issues=check(d);assert.equal(issues.length,1,text);assert.equal(issues[0].suggestion,'biennial',text);assert.equal(issues[0].text,'biannual');assert.equal(issues[0].guidePage,3);
  assert.ok(d.text.slice(issues[0].evidenceStart,issues[0].evidenceEnd).endsWith('other year'),text);
  assert.equal(check(makeDocument([text.replace('biannual','biennial')],'Current')).length,0,text);
 }
});
test('negative, uncertain, unrelated and non-year intervals cannot manufacture biennial evidence',()=>{
 for(const text of ['The biannual audit is not held every other year.','The agency shall not conduct a biannual audit every other year.','The agency prohibits a biannual report every other year.','The biannual report every other year is not required.','The biannual report may be issued every other year.','The biannual report is issued at least every other year.','The biannual report applies; the separate audit occurs every other year.','The biannual report every other month applies.','The biannual report every other years applies.','The biannual report every other yearlong cycle applies.'])assert.equal(check(makeDocument([text],'Current')).length,0,text);
});
test('alternate-year evidence retains physical page offsets and excludes struck, masked and table cues',()=>{
 const d=makeDocument(['line 1 The biannual report shall be\nline 2 issued every other','line 1 year.'],'Current'),issues=check(d);assert.equal(issues.length,1);assert.equal(d.text.slice(issues[0].start,issues[0].end),'biannual');assert.match(d.text.slice(issues[0].evidenceStart,issues[0].evidenceEnd),/other\nline 1 year/u);
 for(const target of ['other','issued','year']){const copy=makeDocument(['The biannual report is issued every other year.'],'Current'),start=copy.text.indexOf(target);copy.struck=[{start,end:start+target.length}];assert.equal(check(copy).length,0,target);}
 const hidden=makeDocument(['The biannual report is issued every\nunknown marker\nother year.'],'Current'),b=hidden.blocks[1];b.ignored=true;hidden.excluded=[{start:b.start,end:b.end}];assert.equal(check(hidden).length,0);
 const table=makeDocument(['The biannual report every other year........ 100'],'Current');assert.equal(check(table).length,0);
 assert.equal(check(makeDocument(['The phrase “biannual report every other year” is literal.'],'Current')).length,0);
});
test('bill-specific quote authority covers whole timing targets and resets for subsequent bills',()=>{
 const quoted=makeDocument(['The form calls it “any time”. The applicant has applied any time after the deadline.'],'Current'),before=JSON.stringify(quoted);
 assert.equal(wordChoiceIssues(quoted,refs).filter(i=>i.rule==='Spelling and usage: anytime-adverb').length,1);
 assert.equal(jointStylisticIssues(quoted,refs).filter(i=>i.suggestion==='anytime').length,0);assert.equal(JSON.stringify(quoted),before);
 assert.ok(jointStylisticIssues(makeDocument(['The applicant has applied any time after the deadline.'],'Current'),refs).some(i=>i.suggestion==='anytime'));
 assert.ok(jointStylisticIssues(makeDocument(['The form calls it “time”. The applicant has applied any time after the deadline.'],'Current'),refs).some(i=>i.suggestion==='anytime'));
 const frequency=makeDocument(['The term “biannual” is stated. The biannual report every other year applies.'],'Current');assert.equal(check(frequency).length,1);assert.ok(!jointStylisticIssues(frequency,refs).some(i=>i.suggestion==='biennial'));
 assert.ok(jointStylisticIssues(makeDocument(['The biannual report every other year applies.'],'Current'),refs).some(i=>i.suggestion==='biennial'));
});
