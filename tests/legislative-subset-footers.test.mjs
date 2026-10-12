import test from 'node:test';import assert from 'node:assert/strict';
import {makeDocument,cleanLayoutLabels} from '../app/core.mjs';
test('an exact combined bill running head establishes two-digit footer context without a masthead',()=>{
 for(const head of ['— 41 — AB 116','AB 116 — 41 —','SB 879 — 2 —']){
  const d=makeDocument([head+'\nThe agency accepts 3 reports.\n97'],'Current');assert.equal(d.blocks.at(-1).ignored,true,head);assert.ok(!d.tokens.some(t=>t.value==='97'));assert.ok(d.tokens.some(t=>t.value==='3'));assert.ok(d.text.endsWith('97'));
  assert.equal(cleanLayoutLabels(d.rawPages)[0],'The agency accepts 3 reports.');
 }
});
test('separate bill and folio running-head rows require both exact labels at the top',()=>{
 for(const head of ['AB 116\n— 41 —','— 41 —\nAB 116'])assert.equal(makeDocument([head+'\nThe agency accepts records.\n97'],'Current').blocks.at(-1).ignored,true);
 for(const head of ['AB 116','— 41 —','Memo concerning AB 116 — 41 —','AB 116 is discussed\n— 41 —','AB 116\n41'])assert.equal(makeDocument([head+'\nThe agency accepts records.\n97'],'Current').blocks.at(-1).ignored,false,head);
});
test('bill-like text inside the body does not establish a footer or suppress a numbered body clause',()=>{
 const d=makeDocument(['Report\nContents\nAB 116 — 41 —\n97'],'Current');assert.equal(d.blocks.at(-1).ignored,false);
 for(const body of ['line 1 97','97 applicants are eligible.','97. The agency shall act.'])assert.equal(makeDocument(['AB 116 — 41 —\n'+body],'Current').blocks.at(-1).ignored,false,body);
});
test('recognized subset heads retain revised/corrected footer labels and all source offsets',()=>{
 for(const footer of ['Corrected 6-4-26 98','Revised 7-9-25—See last page. 95']){
  const d=makeDocument(['— 41 — AB 116\nThe agency accepts 3 reports.\n'+footer],'Current');assert.equal(d.blocks.at(-1).ignored,true);assert.equal(d.text.slice(d.blocks[1].start,d.blocks[1].end),d.blocks[1].text);assert.ok(d.tokens.some(t=>t.value==='3'));
 }
});
