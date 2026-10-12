import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {lcbContextualIssues,lcbModifierForms} from '../app/lcb-contextual.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
test('three-word listed modifiers detect each partial hyphen combination',()=>{
 for(const item of lcbModifierForms(refs.lcb).filter(i=>i.form.split('-').length>=3)){
  const parts=item.form.split('-'),separators=parts.length-1;
  for(let mask=0;mask<(1<<separators)-1;mask++){
   const variant=parts.map((p,i)=>(i?(mask&(1<<(i-1))?'-':' '):'')+p).join('');
   const text='The '+variant+' program applies.',found=lcbContextualIssues(makeDocument([text],'Current'),refs);assert.ok(found.some(i=>i.suggestion===item.form),variant);assert.ok(jointStylisticIssues(makeDocument([text],'Current'),refs).some(i=>i.suggestion===item.form),variant);
  }
 }
});
test('listed possessive modifiers retain apostrophe forms and source ranges',()=>{
 for(const [bad,wanted] of [["water's edge","water's-edge"],['water’s edge','water’s-edge']]){
  const text='The '+bad+' election applies.',doc=makeDocument([text],'Current'),i=lcbContextualIssues(doc,refs)[0];assert.equal(i.suggestion,wanted);assert.equal(doc.text.slice(i.start,i.end),bad);
  assert.equal(lcbContextualIssues(makeDocument([text.replace(bad,wanted)],'Current'),refs).length,0);
 }
});
test('valid wrapped hyphens, names and predicate phrases do not gain findings',()=>{
 for(const text of ['The out-of-\nline 2 state program applies.','The water’s-edge election applies.','The Water’s Edge Election Program is named.','The Tax Exempt Plan is named.','The quoted “out of-state” program applies.','The project is out of state.'])assert.equal(lcbContextualIssues(makeDocument([text],'Current'),refs).length,0,text);
 const doc=makeDocument(['line 1 The out of-\nline 2 state program applies.'],'Current'),i=lcbContextualIssues(doc,refs)[0];assert.equal(i.suggestion,'out-of-state');assert.equal(doc.text.slice(i.start,i.end),i.text);
});
