import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {wordChoiceIssues} from '../app/style-word-choice.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {lcbRoleFormIssues} from '../app/style-lcb-role-forms.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
test('LCB person nouns and its exact program modifier stay distinct from unknown named contexts',()=>{
 for(const [form,article] of [['African American','An'],['Asian American','An'],['Mexican American','A']])for(const bad of [form.replace(' ','-'),form.toLowerCase(),form.toLowerCase().replace(' ','-')]){
  const text=article+' '+bad+' is eligible.',doc=makeDocument([text],'Current'),i=wordChoiceIssues(doc,refs)[0];assert.equal(i.suggestion,form,text);assert.equal(text.slice(i.start,i.end),bad);assert.equal(wordChoiceIssues(makeDocument([text.replace(bad,form)],'Current'),refs).length,0);assert.ok(jointStylisticIssues(doc,refs).some(i=>i.suggestion===form),text);
 }
 assert.ok(refs.gpo.pages[58].text.includes('African American (noun)'));assert.ok(refs.gpo.pages[61].text.includes('Asian American (noun)'));assert.ok(refs.gpo.pages[115].text.includes('a Mexican American'));
 for(const t of ['The African-American program applies.','The African American program applies.','The Asian-American organization is named.','The Mexican-American applicant is eligible.','The African American Cultural Association is named.','The term “an African-American is eligible” is literal.'])assert.equal(wordChoiceIssues(makeDocument([t],'Current'),refs).length,0,t);
 assert.deepEqual(jointStylisticIssues(makeDocument(['The African-American program applies.'],'Current'),refs).map(i=>i.suggestion),['African American']);assert.equal(jointStylisticIssues(makeDocument(['The African American program applies.'],'Current'),refs).length,0);
});
test('collective bargaining noun and exact listed unit-modifier contexts follow LCB',()=>{
 const text='The collective-bargaining is required.',doc=makeDocument([text],'Current'),i=lcbRoleFormIssues(doc,refs)[0];assert.equal(i.suggestion,'collective bargaining');assert.equal(text.slice(i.start,i.end),'collective-bargaining');assert.ok(jointStylisticIssues(doc,refs).some(i=>i.suggestion==='collective bargaining'));
 for(const t of ['The collective bargaining is required.','The collective-bargaining agreement applies.','The collective bargaining agreement applies.','The term “collective-bargaining” is literal.','The Collective-Bargaining Association is named.'])assert.equal(lcbRoleFormIssues(makeDocument([t],'Current'),refs).length,0,t);
 assert.deepEqual(jointStylisticIssues(makeDocument(['The collective-bargaining agreement applies.'],'Current'),refs).map(i=>i.suggestion),['collective bargaining']);assert.equal(jointStylisticIssues(makeDocument(['The collective bargaining agreement applies.'],'Current'),refs).length,0);
});
