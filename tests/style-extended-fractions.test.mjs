import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {fractionIssues} from '../app/style-fractions.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {extendedFractionWords} from '../app/extended-fraction-forms.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
test('larger explicit partitive fractions retain their values and compound hyphen rules',()=>{
 for(let d=21;d<100;d++)for(const n of [1,2,9,d-1]){const preferred=extendedFractionWords(n,d),bad='Use '+n+'/'+d+' of the appropriation.',found=fractionIssues(makeDocument([bad],'Current'),refs);assert.equal(found[0].suggestion,preferred);assert.equal(jointStylisticIssues(makeDocument(['Use '+preferred+' of the appropriation.'],'Current'),refs).length,0,preferred);}
 assert.equal(extendedFractionWords(21,32),'twenty-one thirty-seconds');assert.equal(extendedFractionWords(23,30),'twenty-three thirtieths');
 assert.equal(extendedFractionWords(1,32),'one thirty-second');assert.equal(extendedFractionWords(2,30),'two-thirtieths');
 const wrong=jointStylisticIssues(makeDocument(['Use one-thirty-second of the appropriation.'],'Current'),refs);assert.ok(wrong.some(i=>i.suggestion==='one thirty-second'));
});
test('dates, references, mixed quantities, ambiguous fractions and literal readings are protected',()=>{
 for(const text of ['File on 1/22 of this year.','See Section 1/32 of the code.','Use 3 1/32 of the amount.','Use three and one thirty-second of the amount.','Use 1/32 units.','The term “1/32 of the amount” is literal.','Use 1/32 of the amount........100'])assert.equal(fractionIssues(makeDocument([text],'Current'),refs).length,0,text);
 const doc=makeDocument(['Use 1/32 of the amount.'],'Current');doc.struck=[{start:4,end:8}];assert.equal(fractionIssues(doc,refs).length,0);
});
test('digest disagreements remain excluded and wrapped source offsets remain precise',()=>{
 const text='LEGISLATIVE COUNSEL’S DIGEST\nUse one thirty-second of the appropriation.';assert.ok(fractionIssues(makeDocument([text],'Current'),refs).some(i=>i.conflict));assert.equal(jointStylisticIssues(makeDocument([text],'Current'),refs).length,0);
 const doc=makeDocument(['line 1 Use 1/32\nline 2 of the appropriation.'],'Current');const i=fractionIssues(doc,refs)[0];assert.equal(doc.text.slice(i.start,i.end),'1/32');assert.equal(i.suggestion,'one thirty-second');
});
