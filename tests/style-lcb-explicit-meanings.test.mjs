import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {wordChoiceIssues} from '../app/style-word-choice.mjs';import {lcbSpellingIssues} from '../app/style-lcb-spellings.mjs';import {lcbRoleFormIssues} from '../app/style-lcb-role-forms.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
test('additional meaning-dependent choices require an explicit source sense',()=>{
 for(const [text,term,wanted] of [['It is a forgone conclusion.','forgone','foregone'],['The trust shall enure to the benefit of the beneficiary.','enure','inure'],['Review it from the prospective of the applicant.','prospective','perspective']]){
  const doc=makeDocument([text],'Current'),i=wordChoiceIssues(doc,refs)[0];assert.equal(i.suggestion,wanted);assert.equal(text.slice(i.start,i.end),term);assert.equal(wordChoiceIssues(makeDocument([text.replace(term,wanted)],'Current'),refs).length,0);
  assert.ok(jointStylisticIssues(doc,refs).some(i=>i.suggestion===wanted));
 }
 for(const text of ['The forgone payment is waived.','The prospective applicant is eligible.','The decedent shall be inurned.','The “forgone conclusion” is quoted.','The enure machine is shown.'])assert.equal(wordChoiceIssues(makeDocument([text],'Current'),refs).length,0,text);
});
test('buses require transport evidence while unrelated busses remain protected',()=>{
 assert.equal(lcbSpellingIssues(makeDocument(['The school busses are inspected.'],'Current'),refs)[0].suggestion,'buses');
 assert.equal(lcbSpellingIssues(makeDocument(['The busses transport passengers.'],'Current'),refs)[0].suggestion,'buses');
 for(const text of ['The busses are affectionate kisses.','Busses is named.','The school buses are inspected.','The “school busses” term is quoted.'])assert.equal(lcbSpellingIssues(makeDocument([text],'Current'),refs).length,0,text);
});
test('full listed compound phrases constrain exception heads',()=>{
 for(const [bad,wanted] of [['The man made lake is protected.','man-made'],['The home-health agencies are inspected.','home health'],['The medical-record information is confidential.','medical record'],['The bold-face type is visible.','boldface'],['The green house gases are measured.','greenhouse']])assert.ok(lcbRoleFormIssues(makeDocument([bad],'Current'),refs).some(i=>i.suggestion===wanted),bad);
 for(const text of ['The man made structures.','Their common sense rules out that option.','The common sense rules.','The home-health software is shown.','The health-maintenance schedule applies.','The medical-care plan applies.','The medical-record preservation rule applies.','The water is above ground level.'])assert.equal(lcbRoleFormIssues(makeDocument([text],'Current'),refs).length,0,text);
});
