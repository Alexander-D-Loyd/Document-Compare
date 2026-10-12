import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const review=t=>jointStylisticIssues(makeDocument([t],'Current'),refs);
test('LCB predicate modifiers support negation, degrees, modals and subordinate complements',()=>{
 for(const form of ['cost-effective','hearing-impaired','hands-free','age-appropriate','high-quality','tax-exempt','well-known']){
  for(const copula of ['is not','shall be','remains highly','was already','seems sufficiently'])for(const ending of ['.',' for this purpose.',' when used.',' because the standard applies.']){
   const t='The program '+copula+' '+form+ending,expected=form.replaceAll('-',' '),found=review(t).find(i=>i.suggestion===expected);assert.ok(found,t);assert.equal(t.slice(found.start,found.end),form,t);
   assert.ok(!review(t.replace(form,expected)).some(i=>i.suggestion===form),t);
  }
 }
 for(const [noun,form] of [['water','crystal-clear'],['material','fire-tested']])for(const copula of ['shall be','is not','remains fully']){
  const t='The '+noun+' '+copula+' '+form+' for this purpose.';assert.ok(review(t).some(i=>i.suggestion===form.replaceAll('-',' ')),t);
 }
});
test('predicate expansion preserves embedded modifiers, coordination, names and literal wording',()=>{
 for(const t of ['The system is a cost-effective program.','The system is cost-effective software.','The system is cost-effective and user-friendly software.','Use a cost-effective program.','The Cost-Effective Program is named.','The term “the program is cost-effective for this purpose” is literal.','The material is a fire-tested product.'])assert.ok(!review(t).some(i=>['cost effective','fire tested'].includes(i.suggestion)),t);
 const d=makeDocument(['The program is not cost-effective for this purpose.'],'Current');d.struck=[{start:19,end:33}];assert.ok(!jointStylisticIssues(d,refs).some(i=>i.suggestion==='cost effective'));
});
test('predicate findings retain offsets across printed margins and page boundaries',()=>{
 const d=makeDocument(['line 1 The program shall be\nline 2 highly cost-effective\nline 3 for this purpose.','line 1 The material shall be fire-tested\nline 2 when used.'],'Current');
 const issues=jointStylisticIssues(d,refs).filter(i=>['cost effective','fire tested'].includes(i.suggestion));assert.equal(issues.length,2);for(const i of issues)assert.equal(d.text.slice(i.start,i.end),i.text);
});
