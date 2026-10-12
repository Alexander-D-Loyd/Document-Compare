import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {LCB_EXPRESSION_FORMS,lcbExpressionIssues} from '../app/style-lcb-expressions.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=t=>lcbExpressionIssues(makeDocument([t],'Current'),refs);
test('listed LCB expressions check complete source spans and accept corrected counterparts',()=>{
 for(const r of LCB_EXPRESSION_FORMS.filter(r=>r.variant!=='coop')){
  const sentence=r.role==='verb'?'The agency shall '+r.variant+' the person.':r.role==='adverb'?'The agency shall '+r.variant+' operate.':'The '+r.variant+' is required.';
  const found=check(sentence);assert.equal(found.length,1,sentence);assert.equal(found[0].suggestion,r.preferred);assert.equal(sentence.slice(found[0].start,found[0].end),r.variant);
  assert.equal(check(sentence.replace(r.variant,r.preferred)).length,0,r.preferred);
  assert.ok(jointStylisticIssues(makeDocument([sentence],'Current'),refs).some(i=>i.suggestion===r.preferred),sentence);
  const source=refs.lcb.pages[r.page-1].text.toLowerCase();assert.ok(source.includes(r.sourceForm||r.preferred),r.sourceForm||r.preferred);
 }
});
test('listed expression guards preserve verb/noun distinctions, names and literal text',()=>{
 for(const text of ['The loan shark is convicted.','The right of way program is established.','The cost-of-living adjustment applies.','A common-sense program applies.','The chicken coop is protected.','The phrase “right of way” is quoted.','The "co op" term is quoted.','The Right of Way Agency is named.','The Cost Effectiveness Institute is named.','The agency cross examine........100','LEGISLATIVE COUNSEL’S DIGEST\nThe term applies.'])assert.equal(check(text).length,0,text);
 const doc=makeDocument(['The right of way is established.'],'Current');doc.struck=[{start:4,end:16}];assert.equal(lcbExpressionIssues(doc,refs).length,0);
});
test('listed expressions preserve source offsets through margin and page wrapping',()=>{
 const doc=makeDocument(['line 1 The first come\nline 2 first served basis is established.'],'Current'),i=lcbExpressionIssues(doc,refs)[0];assert.equal(i.suggestion,'first-come-first-served basis');assert.equal(doc.text.slice(i.start,i.end),i.text);
 assert.equal(check('The cross-\ncomplaint is filed.').length,0);
});
