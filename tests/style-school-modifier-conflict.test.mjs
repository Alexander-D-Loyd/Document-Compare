import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
test('the explicit LCB open school modifier takes priority while its compliant form stays quiet',()=>{
 for(const phrase of ['before and after school','before- and after-school','before-and-after-school'])for(const head of ['programs','services','care','activities','instruction']){
  const doc=makeDocument(['The '+phrase+' '+head+' are provided.'],'Current'),issues=jointStylisticIssues(doc,refs);assert.deepEqual(issues.map(i=>i.suggestion),phrase==='before and after school'?[]:['before and after school'],phrase+' '+head);assert.ok(issues.every(i=>i.guideId==='lcb'&&!i.conflict));
 }
 const row=styleRuleInventory(refs).find(r=>r.text==='before and after school (u.m.)');assert.equal(row.status,'Partially automated');assert.ok(row.scope.includes('LCB takes priority'));assert.ok(row.scope.includes('role exceptions'));
});
test('independent errors beyond the conflicting modifier remain checkable',()=>{
 const doc=makeDocument(['The before and after school programs include 3 public members.'],'Current'),found=jointStylisticIssues(doc,refs);assert.deepEqual(found.map(i=>i.suggestion),['three']);assert.equal(found[0].text,'3');
});
