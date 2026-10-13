import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
test('source-established horse race noun uses LCB while compliant forms and other findings remain independent',()=>{
 for(const [phrase,wanted]of [['horserace','horse race'],['horse-race','horse race'],['horseraces','horse races']])assert.deepEqual(jointStylisticIssues(makeDocument(['The '+phrase+' is required.'],'Current'),refs).map(i=>i.suggestion),[wanted],phrase);for(const phrase of ['horse race','horse races'])assert.equal(jointStylisticIssues(makeDocument(['The '+phrase+' is required.'],'Current'),refs).length,0,phrase);assert.equal(jointStylisticIssues(makeDocument(['The term “horse-race” is defined. A horse-race is required.'],'Current'),refs).length,0);
 const issues=jointStylisticIssues(makeDocument(['The horse race uses a cemetary.'],'Current'),refs);assert.ok(issues.some(i=>i.suggestion==='cemetery'));
 assert.ok(styleRuleInventory(refs).some(r=>r.guide==='lcb'&&r.text.includes('horse race')&&r.status==='Partially automated'&&r.scope.includes('LCB takes priority')));
});
test('roll call vote follows the complete source-listed rollcall form',()=>{
 const text='A roll call vote is required.',issues=jointStylisticIssues(makeDocument([text],'Current'),refs),i=issues.find(i=>i.suggestion==='rollcall');assert.ok(i);assert.equal(text.slice(i.start,i.end),'roll call');assert.equal(jointStylisticIssues(makeDocument(['A rollcall vote is required.'],'Current'),refs).length,0);
});
