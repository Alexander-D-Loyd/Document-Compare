import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';import {wordChoiceIssues}from '../app/style-word-choice.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=doc=>wordChoiceIssues(doc,refs).filter(i=>i.rule==='Spelling and usage: pleaded-legal-response');
test('LCB pleaded supports explicit plural and past-perfect legal response constructions',()=>{
 for(const subject of ['defendant','defendants','person','persons','applicant','applicants'])for(const response of ['guilty','not guilty','no contest'])for(const link of ['', 'previously ', 'recently ', 'never ', 'had ', 'had not ', 'had already ', 'had not previously ', subject.endsWith('s')?'have already ':'has already ']){
  const text='The '+subject+' '+link+'pled '+response+'.',d=makeDocument([text],'Current'),issues=check(d);assert.equal(issues.length,1,text);assert.equal(issues[0].suggestion,'pleaded',text);assert.equal(d.text.slice(issues[0].start,issues[0].end),'pled');assert.equal(issues[0].guidePage,4);
  assert.equal(check(makeDocument([text.replace('pled','pleaded')],'Current')).length,0,text);
 }
 assert.ok(jointStylisticIssues(makeDocument(['The defendants have already pled no contest.'],'Current'),refs).some(i=>i.suggestion==='pleaded'));
});
test('unknown legal roles and base or future verbs cannot become past-tense suggestions',()=>{
 for(const text of ['The defendant shall pled guilty.','The defendant may pled guilty.','The defendant must pled guilty.','The defendant will have pled guilty.','The defendant did not pled guilty.','The defendant should have pled guilty.','The defendant is pled guilty.','The defendant not pled guilty.','The defendant knowingly pled guilty.','The defendant had allegedly pled guilty.','The defendant had not previously knowingly already pled guilty.','The agency pled resources to the program.','The defendant pled funds to the account.','The Defendant Pled Guilty Program is named.','The acronym PLED guilty is stated.'])assert.equal(check(makeDocument([text],'Current')).length,0,text);
});
test('whole original subject auxiliary adverb and response evidence stays protected',()=>{
 const text='The defendants have already pled no contest.';
 for(const field of ['struck','excluded'])for(const term of ['defendants','have','already','pled','no','contest']){const d=makeDocument([text],'Current'),start=d.text.indexOf(term);d[field].push({start,end:start+term.length});assert.equal(check(d).length,0,field+' '+term);}
 for(const text of ['The défendants had pled guilty.','The defendanté had pled guilty.','The defendant had pléd guilty.','The defendant had pled guiltyé.','The defendant had pled no contesté.'])assert.equal(check(makeDocument([text],'Current')).length,0,text);
 const unknown=makeDocument(['The defendants have\nunknown marker\nalready pled no contest.'],'Current'),b=unknown.blocks[1];b.ignored=true;unknown.excluded=[{start:b.start,end:b.end}];assert.equal(check(unknown).length,0);
 const table=makeDocument(['The defendants have already pled no contest........ 100'],'Current');assert.equal(check(table).length,0);
});
test('quoted response evidence and bill-local quoted word authority preserve their forms',()=>{
 for(const text of ['The phrase “defendants have already pled no contest” is literal.','The defendant had pled “guilty”.','The literal "defendants have\nalready pled no contest" remains.'])assert.equal(check(makeDocument([text],'Current')).length,0,text);
 const protectedBill=makeDocument(['The form uses “pled”. The defendants have already pled no contest.'],'Current');assert.equal(check(protectedBill).length,1);assert.ok(!jointStylisticIssues(protectedBill,refs).some(i=>i.suggestion==='pleaded'));
 assert.ok(jointStylisticIssues(makeDocument(['The defendants have already pled no contest.'],'Current'),refs).some(i=>i.suggestion==='pleaded'));
});
test('legal response evidence keeps physical pages and margins without mutating the PDF source model',()=>{
 const d=makeDocument(['line 1 The defendants have\nline 2 already pled no','line 1 contest.'],'Current'),before=JSON.stringify(d),issues=check(d);assert.equal(issues.length,1);assert.equal(issues[0].text,'pled');assert.equal(d.text.slice(issues[0].start,issues[0].end),'pled');assert.match(d.text.slice(issues[0].evidenceStart,issues[0].evidenceEnd),/no\nline 1 contest/u);assert.equal(JSON.stringify(d),before);
});
