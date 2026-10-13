import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
test('unlisted actor-participle vocabulary cannot create generic style flags',()=>{
 for(const text of ['The county owned properties are reviewed.','The board funded programs are reviewed.','The family operated businesses are reviewed.','The manufacturer provided equipment is reviewed.','The employer financed plans are reviewed.']){
  const doc=makeDocument([text],'Current'),saved=JSON.stringify(doc),found=jointStylisticIssues(doc,refs,{includeReviewSuggestions:true});
  assert.ok(!found.some(i=>i.checkId==='participle-modifiers'));assert.equal(JSON.stringify(doc),saved);
 }
 const doc=makeDocument(['The agency uses a cost effective plan.'],'Current');assert.ok(jointStylisticIssues(doc,refs).some(i=>i.suggestion==='cost-effective'));
});
test('retired generic actor-modifier paths remain quiet across margin and page boundaries',()=>{
 const doc=makeDocument(['line 1 The county','line 2 owned properties are reviewed.'],'Current'),saved=JSON.stringify(doc);
 assert.ok(!jointStylisticIssues(doc,refs,{includeReviewSuggestions:true}).some(i=>i.checkId==='participle-modifiers'));assert.equal(JSON.stringify(doc),saved);
});
