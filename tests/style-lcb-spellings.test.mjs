import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {LCB_SPELLING_VARIANTS,lcbSpellingIssues} from '../app/style-lcb-spellings.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const phrase=r=>r.variant==='busses'?'The public busses are inspected.':r.variant==='calender'?'Use calender days.':r.sourceForm==='descendant'?'The '+r.variant+' of the decedent is eligible.':'The '+r.variant+' is shown.';
test('listed LCB close spellings retain a genuine source entry, precise span and compliant counterpart',()=>{
 for(const r of LCB_SPELLING_VARIANTS){
  assert.ok(refs.lcb.pages[r.page-1].text.toLowerCase().includes(r.sourceForm.toLowerCase()),r.sourceForm);
  const text=phrase(r),doc=makeDocument([text],'Current'),i=lcbSpellingIssues(doc,refs).find(i=>i.suggestion===r.preferred);
  assert.ok(i,r.variant);assert.equal(text.slice(i.start,i.end),r.variant);assert.equal(lcbSpellingIssues(makeDocument([text.replace(r.variant,r.preferred)],'Current'),refs).length,0);
  assert.ok(jointStylisticIssues(doc,refs).some(i=>i.suggestion===r.preferred),r.variant);
 }
});
test('listed spellings protect valid alternate senses, names, quotes, tables and removed text',()=>{
 for(const text of ['The calender machine is required.','The descendent lineage is shown.','Confectionary products are sold.','The term “accomodate” is literal.','The term "cemetary" is literal.','Cemetary Foundation is named.','Dr. Calender is named.','The cemetary..........100'])assert.equal(lcbSpellingIssues(makeDocument([text],'Current'),refs).length,0,text);
 const doc=makeDocument(['The cemetary is shown.'],'Current');doc.struck=[{start:4,end:12}];assert.equal(lcbSpellingIssues(doc,refs).length,0);
});
test('capitalization and original offsets survive wrapped source text',()=>{
 const doc=makeDocument(['line 1 Cemetary is shown.'],'Current'),i=lcbSpellingIssues(doc,refs)[0];assert.equal(i.suggestion,'Cemetery');assert.equal(doc.text.slice(i.start,i.end),'Cemetary');
});
