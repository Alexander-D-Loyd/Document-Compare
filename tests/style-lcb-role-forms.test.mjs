import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {lcbRoleFormIssues,LCB_ROLE_FORMS} from '../app/style-lcb-role-forms.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>lcbRoleFormIssues(makeDocument([text],'Current'),refs);
test('each listed role checks a variant and accepts its preferred form',()=>{
 for(const r of LCB_ROLE_FORMS){
  assert.ok(refs.lcb.pages[r.page-1].text.includes(r.sourceForm||r.preferred),r.sourceForm||r.preferred);
  const ending=r.role==='modifier'?' '+(r.heads?.split('|')[0]||'program')+' applies.':r.selectedPlural?' are required.':' is required.',bad='The '+r.variant+ending,good='The '+r.preferred+ending;
  const found=check(bad);assert.equal(found.length,1,bad);assert.equal(found[0].suggestion,r.preferred);assert.equal(bad.slice(found[0].start,found[0].end),r.variant);assert.equal(check(good).length,0);
  assert.ok(jointStylisticIssues(makeDocument([bad],'Current'),refs).some(i=>i.suggestion===r.preferred),bad);
 }
});
test('source-listed noun and verb distinctions cover driveby, phase-in and runoff',()=>{
 for(const [open,closed] of [['drive by','driveby'],['phase in','phase-in'],['run off','runoff']]){
  const a=jointStylisticIssues(makeDocument(['The '+open+' is required.'],'Current'),refs);assert.ok(a.some(i=>i.suggestion===closed),open);
  const b=jointStylisticIssues(makeDocument(['The agency shall '+closed+' the process.'],'Current'),refs);assert.ok(b.some(i=>i.suggestion===open),closed);
  assert.ok(!jointStylisticIssues(makeDocument(['The agency shall '+open+' the process.'],'Current'),refs).some(i=>i.suggestion===closed));
 }
});
test('literal wording, uncertain roles, titles and removed text remain protected',()=>{
 for(const text of ['The term “common-law” is quoted.','The Common-Law Institute acts.','COMMON-LAW PROGRAM','The worker shall loan-shark the applicant.','The process is on line.','The common sense of the rule applies.','The week long ago was different.','The life-cycle program applies.','The common-law program.............100'])assert.equal(check(text).length,0,text);
 const doc=makeDocument(['The common-law rights apply.'],'Current');doc.struck=[{start:4,end:14}];assert.equal(lcbRoleFormIssues(doc,refs).length,0);
});
test('wrapped role phrases retain exact source ranges without including the following noun',()=>{
 const doc=makeDocument(['line 1 A week\nline 2 long program applies.'],'Current');const i=lcbRoleFormIssues(doc,refs)[0];assert.equal(i.suggestion,'weeklong');assert.equal(doc.text.slice(i.start,i.end),'week\nline 2 long');
});
