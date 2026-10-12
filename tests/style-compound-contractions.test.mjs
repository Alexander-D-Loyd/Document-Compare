import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {CONTRACTION_FORMS} from '../app/style-contractions.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
test('compound contractions highlight the entire token and retain a complete expansion',()=>{
 for(const r of CONTRACTION_FORMS.filter(r=>(r.form.match(/'/g)||[]).length>1))for(const apostrophe of ["'",'’']){
  const form=r.form.replaceAll("'",apostrophe),text='The agency says '+form+' proceeded.',issues=jointStylisticIssues(makeDocument([text],'Current'),refs),i=issues.find(i=>i.text===form);
  assert.ok(i,form);assert.equal(text.slice(i.start,i.end),form);assert.equal(i.suggestion,r.expansions.join(' / '));assert.equal(issues.filter(n=>n.start<i.end&&n.end>i.start).length,1);
 }
});
test('uncontracted phrases, literal titles and quotations remain unchanged',()=>{
 for(const t of ["The term “couldn't've” is literal.",'The Day Care Center applies.','The Grey Research Institute is named.','The Monies Act is named.','Dr. Marshall is named.','The agency says they would have proceeded.'])assert.equal(jointStylisticIssues(makeDocument([t],'Current'),refs).length,0,t);
 assert.ok(jointStylisticIssues(makeDocument(['The day care is available.'],'Current'),refs).some(i=>i.suggestion==='daycare'));
});
