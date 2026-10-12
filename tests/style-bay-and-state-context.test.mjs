import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=t=>jointStylisticIssues(makeDocument([t],'Current'),refs);
test('the descriptive bay area follows both guides without changing the named bay',()=>{
 for(const phrase of ['Bay Area','Bay area','bay Area']){const t='The '+phrase+' is described.',found=check(t);assert.equal(found.length,1,t);assert.equal(found[0].suggestion,'bay area');assert.equal(found[0].text,phrase);assert.equal(check(t.replace(phrase,'bay area')).length,0);}
 for(const t of ['The San Francisco Bay area is described.','The Bay Area Council is named.','The Bay Area Air Quality Management District is named.','The Bay Area of California is described.','The term “the Bay Area is described” is literal.','BAY AREA'])assert.equal(check(t).length,0,t);
});
test('the state government case disagreement is excluded independently of adjacent checks',()=>{
 for(const t of ['The State government shall act.','The state Government shall act.','The State Government shall act.','The state government shall act.'])assert.equal(check(t).length,0,t);
 const found=check('The State government has 3 public members.');assert.deepEqual(found.map(i=>i.suggestion),['three']);assert.equal(found[0].text,'3');
 assert.equal(styleRuleInventory(refs).find(r=>r.text==='state government').status,'Excluded guide conflict');
});
test('a bay-area finding retains precise page/line offsets and strikeout protection',()=>{
 const doc=makeDocument(['line 1 The Bay\nline 2 Area is described.'],'Current'),found=jointStylisticIssues(doc,refs);assert.equal(found.length,1);assert.equal(doc.text.slice(found[0].start,found[0].end),found[0].text);assert.equal(found[0].suggestion,'bay area');doc.struck=[{start:found[0].start,end:found[0].end}];assert.equal(jointStylisticIssues(doc,refs).length,0);
});
