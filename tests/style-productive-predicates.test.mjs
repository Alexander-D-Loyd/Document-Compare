import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const review=t=>jointStylisticIssues(makeDocument([t],'Current'),refs);
test('LCB productive participle endings distinguish predicates from noun modifiers',()=>{
 for(const form of ['state-adopted','board-approved','court-approved','voter-approved','community-based','school-based','evidence-based','research-based','work-related','child-related','employment-related','health-related']){
  for(const copula of ['is','shall be','remains fully','was not'])for(const end of ['.',' for this purpose.',' when used.']){
   const text='The program '+copula+' '+form+end;assert.ok(review(text).some(i=>i.text===form&&i.suggestion===form.replaceAll('-',' ')),text);
   assert.ok(!review(text.replace(form,form.replaceAll('-',' '))).some(i=>i.suggestion===form),text);
  }
  for(const text of ['The program is a '+form+' program.','The program is '+form+' software.','Use a '+form+' program.','The term “the program is '+form+'” is literal.'])assert.ok(!review(text).some(i=>i.suggestion===form.replaceAll('-',' ')),text);
 }
});
test('Productive predicate findings preserve printed offsets and exempt names and removed language',()=>{
 const d=makeDocument(['line 1 The program shall be\nline 2 evidence-based\nline 3 for this purpose.'],'Current');
 const issue=jointStylisticIssues(d,refs).find(i=>i.suggestion==='evidence based');assert.ok(issue);assert.equal(d.text.slice(issue.start,issue.end),'evidence-based');
 d.struck=[{start:issue.start,end:issue.end}];assert.ok(!jointStylisticIssues(d,refs).some(i=>i.suggestion==='evidence based'));
 for(const text of ['The program is State-Approved.','The program is STATE-APPROVED.','The program is unfamiliarword-based.'])assert.ok(!review(text).some(i=>i.rule==='Hyphenation, item 2 and End words'),text);
});
