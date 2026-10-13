import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';import {LCB_MAPPED_CONTEXTS} from '../app/lcb-mapped-contexts.mjs';import {officeTitleIssues}from '../app/style-office-titles.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
test('every added source mapping has a working contextual check and a compliant counterpart',()=>{
 const rows=styleRuleInventory(refs);
 for(const r of LCB_MAPPED_CONTEXTS){
  assert.ok(refs.lcb.pages[r.page-1].text.includes(r.preferred),r.preferred);
  const bad=makeDocument([r.bad],'Current'),displayed=jointStylisticIssues(bad,refs);if(r.suggestion==='Superintendent'){assert.ok(officeTitleIssues(bad,refs).some(i=>i.suggestion===r.suggestion),r.bad);assert.ok(!displayed.some(i=>i.suggestion===r.suggestion),'exact quoted alias overrides the direct Education Code preference');}else assert.ok(displayed.some(i=>i.suggestion===r.suggestion),r.bad);
  assert.ok(!jointStylisticIssues(makeDocument([r.good],'Current'),refs).some(i=>i.suggestion===r.suggestion),r.good);
  if([9,10,11,12,18,19].includes(r.page))assert.ok(rows.some(x=>x.guide==='lcb'&&x.page===r.page&&x.text.startsWith(r.preferred)&&x.status==='Partially automated'),r.preferred);
 }
 assert.ok(!rows.some(r=>r.guide==='lcb'&&r.status==='Fully automated'));
 assert.equal(rows.find(r=>r.id==='lcb-17-7').status,'Partially automated');
});
