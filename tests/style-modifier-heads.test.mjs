import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {lcbContextualIssues} from '../app/lcb-contextual.mjs';import {participleModifierIssues} from '../app/style-participle-modifiers.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
test('LCB listed modifiers recognize actual irregular noun plurals',()=>{
 for(const noun of ['facilities','policies','entities','properties','families','utilities','activities','authorities','categories','responsibilities','curricula','strategies','people','children','agencies','studies']){
  const text='The cost effective '+noun+' are reviewed.';const i=lcbContextualIssues(makeDocument([text],'Current'),refs);assert.ok(i.some(x=>x.suggestion==='cost-effective'),noun);
  assert.ok(jointStylisticIssues(makeDocument([text],'Current'),refs).some(x=>x.suggestion==='cost-effective'),noun);
  assert.equal(lcbContextualIssues(makeDocument([text.replace('cost effective','cost-effective')],'Current'),refs).length,0,noun);
 }
 for(const noun of ['facilitys','policys','entityes','responsibilitys','unfamiliarhead'])assert.equal(lcbContextualIssues(makeDocument(['The cost effective '+noun+' are reviewed.'],'Current'),refs).length,0,noun);
});
test('approved/adopted participles preserve ordinary subject-verb-object clauses',()=>{
 for(const text of ['The board approved plans.','The state adopted rules.','The court approved policies.','The county adopted regulations.','The agency approved facilities.','The board approved plans to expand services.','The state adopted rules and the county acted.'])assert.equal(jointStylisticIssues(makeDocument([text],'Current'),refs).length,0,text);
 for(const text of ['The board approved plans are reviewed.','The state adopted rules apply.','The court approved policies are adopted.','Use state approved facilities.','The agency requires county adopted regulations.'])assert.ok(lcbContextualIssues(makeDocument([text],'Current'),refs).some(i=>i.suggestion.includes('-')),text);
});
test('participle heads extend only with independent noun-phrase evidence',()=>{
 for(const [bad,noun] of [['county owned','assets'],['state licensed','activities'],['government sponsored','audits'],['agency managed','allocations']]){
  // Assets are deliberately outside this finite vocabulary for now.
  if(noun==='assets'){assert.equal(participleModifierIssues(makeDocument(['The '+bad+' '+noun+' are reviewed.'],'Current'),refs).length,0);continue;}
  const text='The '+bad+' '+noun+' are reviewed.',i=participleModifierIssues(makeDocument([text],'Current'),refs)[0];assert.equal(i.suggestion,bad.replace(' ','-'));assert.equal(text.slice(i.start,i.end),bad);
  assert.equal(participleModifierIssues(makeDocument(['The '+bad+' '+noun+'.'],'Current'),refs).length,0);
 }
});
