import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
test('source-established horse race noun disagreement is excluded without suppressing other findings',()=>{
 for(const phrase of ['horse race','horserace','horse-race','horse races','horseraces'])assert.equal(jointStylisticIssues(makeDocument(['The '+phrase+' is required.'],'Current'),refs).length,0,phrase);
 const issues=jointStylisticIssues(makeDocument(['The horse race uses a cemetary.'],'Current'),refs);assert.ok(issues.some(i=>i.suggestion==='cemetery'));
 assert.ok(styleRuleInventory(refs).some(r=>r.guide==='lcb'&&r.text.includes('horse race')&&r.scope.includes('guide disagreement')));
});
test('roll call vote follows the complete source-listed rollcall form',()=>{
 const text='A roll call vote is required.',issues=jointStylisticIssues(makeDocument([text],'Current'),refs),i=issues.find(i=>i.suggestion==='rollcall');assert.ok(i);assert.equal(text.slice(i.start,i.end),'roll call');assert.equal(jointStylisticIssues(makeDocument(['A rollcall vote is required.'],'Current'),refs).length,0);
});
