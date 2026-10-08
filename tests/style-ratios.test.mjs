import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {ratioIssues} from '../app/style-ratios.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>ratioIssues(makeDocument([text],'Current'),refs);
test('explicit ratios produce one complete correction and distinguish ordinary ranges and in-proportions',()=>{
 assert.deepEqual(check('Use a ratio of one to five and odds of two:three.').map(i=>i.suggestion),['1 to 5','2:3']);
 assert.equal(check('Use a ratio of 1 to 5. Wait one to five years. One in five workers applies.').length,0);
 const found=jointStylisticIssues(makeDocument(['Use a ratio of one to five.'],'Current'),refs);assert.equal(found.length,1);assert.equal(found[0].text,'one to five');
});
test('ratios preserve source offsets across margins and exclude crossed text',()=>{
 const doc=makeDocument(['line 1 Use a ratio of one\nline 2 to five.'],'Current');const issue=ratioIssues(doc,refs)[0];assert.equal(doc.text.slice(issue.start,issue.end),issue.text);assert.equal(issue.suggestion,'1 to 5');
 doc.struck=[{start:issue.start,end:issue.end}];assert.equal(ratioIssues(doc,refs).length,0);
});
test('LCB first grade exception accepts bill/digest wording but still detects ordinal figures',()=>{
 const found=jointStylisticIssues(makeDocument(['Use 1st grade pupils and first grade pupils.'],'Current'),refs);assert.ok(found.some(i=>i.text==='1st'&&i.suggestion==='first'));assert.ok(!found.some(i=>i.text==='first'));
});
