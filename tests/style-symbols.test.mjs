import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>jointStylisticIssues(makeDocument([text],'Current'),refs).filter(i=>i.checkId==='symbols');
test('simple explicitly identified mathematical expressions close operators while preserving source offsets',()=>{
 const doc=makeDocument(['line 1 Apply the formula A + B × 4. Use the equation 4 ±\nline 2 2 is the permitted expression.'],'Current');
 const found=jointStylisticIssues(doc,refs).filter(i=>i.checkId==='symbols');assert.deepEqual(found.map(i=>i.suggestion),['A+B×4','4±2']);assert.ok(found.every(i=>doc.text.slice(i.start,i.end)===i.text));
 assert.equal(check('Apply the formula A+B×4.').length,0);
});
test('crossed species, magnification, ordinary lists, quoted formulas and tables remain literal',()=>{
 assert.equal(check('Early June × Bright is a breeding cross. Use × 4 magnification. A + B are labels. The term “formula A + B” is quoted. The formula total + revenue is complex.').length,0);
 const doc=makeDocument(['Use the formula A + B.'],'Current');doc.struck=[{start:doc.text.indexOf('A +'),end:doc.text.indexOf('A +')+5}];assert.equal(jointStylisticIssues(doc,refs).filter(i=>i.checkId==='symbols').length,0);
});
test('simple repeated percent series is distinguished from distinct labeled percentages and digest conflicts',()=>{
 assert.deepEqual(check('The prices rose 12 percent, 15 percent, and 19 percent.').map(i=>i.suggestion),['12, 15, and 19 percent']);
 assert.equal(check('The prices rose 12, 15, and 19 percent. Apply a 12 percent increase, a 15 percent decrease, and a 19 percent allowance.').length,0);
 assert.equal(jointStylisticIssues(makeDocument(['LEGISLATIVE COUNSEL’S DIGEST\nThe prices rose 12 percent, 15 percent, and 19 percent.'],'Current'),refs).length,0);
});
