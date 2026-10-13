import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {wordChoiceIssues} from '../app/style-word-choice.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>wordChoiceIssues(makeDocument([text],'Current'),refs);
const pairs=[
 ['assure','ensure','compliance'],['insure','ensure','accuracy'],['ensure','insure','the building against fire'],['guaranty','guarantee','payment'],['forego','forgo','the right to appeal']
];
const inflections={assure:['assures','assured','assuring','assured'],insure:['insures','insured','insuring','insured'],ensure:['ensures','ensured','ensuring','ensured'],guaranty:['guaranties','guarantied','guarantying','guarantied'],forego:['foregoes','forewent','foregoing','foregone'],forgo:['forgoes','forwent','forgoing','forgone'],guarantee:['guarantees','guaranteed','guaranteeing','guaranteed']};
test('explicit outcome and legal verb pairs preserve their selected inflections',()=>{
 for(const [bad,good,object] of pairs){
  const badForms=[bad,...inflections[bad]],goodForms=[good,...inflections[good]];
  for(const [role,prefix] of [[0,'The agency shall not '],[0,'The agencies regularly '],[1,'The agency also '],[2,'The agency '],[4,'The agency has already '],[3,'The agency is properly '],[3,'The agency acts by ']]){
   const text=prefix+badForms[role]+' '+object+'.',issues=check(text);assert.equal(issues.length,1,text);assert.equal(issues[0].suggestion,goodForms[role],text);assert.equal(text.slice(issues[0].start,issues[0].end),badForms[role],text);
   assert.equal(check(prefix+goodForms[role]+' '+object+'.').length,0,text);
   assert.ok(jointStylisticIssues(makeDocument([text],'Current'),refs).some(i=>i.suggestion===goodForms[role]),text);
  }
 }
 assert.equal(check('Insure accuracy.')[0].suggestion,'Ensure');
});
test('grammar and meaning guards protect insurance, reassurance, nominal guaranties and unclear subjects',()=>{
 for(const text of ['The agency insures the building against fire.','The agency ensures accuracy.','The agency has assured the applicant that the record is correct.','Staff are insuring a vehicle.','The guaranties payment schedule is defined.','The guaranties are enforceable.','The foregoing provisions apply.','The foregone conclusion remains.','The foregone payment was disputed.','The device insures accuracy.','The agency has an insured accuracy certificate.','The agency shall assure compliance officers that the report is correct.','The agency assures compliance personnel that the report is correct.','The agency shall ensure the building remains safe.','The agency is ensuring the building has fire exits.','The Agency Insures Accuracy Program is named.','The term “the agency has insured accuracy” is literal.','The word "guaranties payment" is quoted.'])assert.equal(check(text).length,0,text);
});
test('resume employment nouns support inflected submission verbs without changing the verb resume',()=>{
 for(const action of ['submits','submitted','submitting','provides','provided','providing','attaches','attached','attaching','reviews','reviewed','reviewing','includes','included','including']){
  const text='The agency '+action+' the resumes.',issues=check(text);assert.equal(issues.length,1,text);assert.equal(issues[0].suggestion,'résumés',text);
 }
 for(const text of ['The agency resumes operations.','The agency has resumed work.','The phrase “submitted a resume” is literal.'])assert.equal(check(text).length,0,text);
});
test('selected verb findings preserve margins, page offsets, removed text and review freshness',()=>{
 const d=makeDocument(['line 1 The agency has already\nline 2 insured accuracy.','line 1 The agency is\nline 2 ensuring the building against fire.'],'Current');
 const issues=wordChoiceIssues(d,refs);assert.deepEqual(issues.map(i=>i.suggestion),['ensured','insuring']);for(const i of issues)assert.equal(d.text.slice(i.start,i.end),i.text);
 d.struck=issues.map(({start,end})=>({start,end}));assert.equal(wordChoiceIssues(d,refs).length,0);
 d.struck=[];assert.equal(wordChoiceIssues(d,refs).length,2);
 const table=makeDocument(['The agency has insured accuracy........ 100'],'Current');assert.equal(wordChoiceIssues(table,refs).length,0);
 const heading=makeDocument(['The agency has insured accuracy\nLEGISLATIVE COUNSEL’S DIGEST\nThe agency acts.\nThe people of the State of California do enact as follows:\nThe agency acts.'],'Current');assert.equal(wordChoiceIssues(heading,refs).length,0);
});
test('LCB lexical and duration choices remain active beside independent word-choice findings',()=>{
 const d=makeDocument(['The agency has insured accuracy. Use healthcare. Provide 4 days’ notice.'],'Current'),issues=jointStylisticIssues(d,refs);
 assert.ok(issues.some(i=>i.suggestion==='ensured'));assert.ok(issues.some(i=>i.text==='healthcare'&&i.suggestion==='health care'));assert.ok(issues.some(i=>i.text==='4'&&i.suggestion==='four'));assert.ok(!issues.some(i=>i.conflict));
});
