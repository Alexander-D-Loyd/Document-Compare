import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=doc=>jointStylisticIssues(typeof doc==='string'?makeDocument([doc],'Current'):doc,refs).filter(i=>i.checkId==='shared-modifiers');
test('multiple shared time modifiers retain every omitted ending hyphen',()=>{
 assert.deepEqual(check('Provide full, half, and part-time employment.').map(i=>i.suggestion),['full-, half-, and part-time']);
 assert.deepEqual(check('Provide full-, half and part-time employment.').map(i=>i.suggestion),['full-, half- and part-time']);
 assert.equal(check('Provide full-, half-, and part-time employment.').length,0);
 assert.equal(check('Provide young, qualified, and part-time workers.').length,0);
 assert.equal(check('The term “full, half, and part-time employment” is literal.').length,0);
});
test('the explicit GPO covered-wall example retains the first hyphen',()=>{
 assert.deepEqual(check('Restore moss and ivy-covered walls.').map(i=>i.suggestion),['moss- and ivy-covered']);
 for(const text of ['Restore moss- and ivy-covered walls.','The walls are moss and ivy covered.','Remove moss and ivy.','Use goat, sheep, and calf skins.','The term “moss and ivy-covered walls” is literal.'])assert.equal(check(text).length,0,text);
});

test('shared time and term modifiers retain suspended hyphens with both guide citations',()=>{
 const doc=makeDocument(['Provide full or part-time employment. Evaluate long and short-term loans. Hire half and full-time workers. Support low and moderate-income households.'],'Current');
 const found=check(doc);
 assert.deepEqual(found.map(i=>i.suggestion),['full- or part-time','long- and short-term','half- and full-time','low- and moderate-income']);
 for(const i of found){assert.equal(doc.text.slice(i.start,i.end),i.text);assert.deepEqual(i.references.map(r=>r.guideId),['lcb','gpo']);assert.equal(i.references[1].rule,'6.23');}
 assert.equal(check('Provide full- or part-time employment. Evaluate long- and short-term loans. Hire half- and full-time workers. Support low- and moderate-income households.').length,0);
});

test('independent adjectives, predicates and nonhyphenated shared elements are not suspended',()=>{
 for(const text of ['Hire young and part-time workers.','The services are full and part time.','Full or part-time is a label.','Review a long and short story.','Include full and full-time workers.','Prepare pre-full or part-time employment.','Use preoperative and postoperative examination.','Use two or threefold rates.','The incomes are low and moderate.','Use public and private schools.'])assert.equal(check(text).length,0,text);
});

test('quotes, mastheads, source strikeouts and recognized budget tables stay protected',()=>{
 for(const text of ['The term “full or part-time employment” is literal.','The term "long and short-term loans" is literal.','The Long and Short-Term Financing Program applies.','The Full or Part-Time Employment Act applies.','Long and short-term loans\nLEGISLATIVE COUNSEL’S DIGEST\nAn act.\nThe people do enact as follows:\nEligible workers qualify.','Budget Act of 2026\nfull or part-time employment.................. 1000'])assert.equal(check(text).length,0,text);
 const text='Provide full or part-time employment.';const doc=makeDocument([text],'Current');doc.struck=[{start:0,end:text.length}];assert.equal(check(doc).length,0);
});

test('source wrapping preserves exact highlight offsets and marks only the modifier',()=>{
 const doc=makeDocument(['line 1 Provide full or\nline 2 part-time employment.'],'Current');
 const found=check(doc);assert.equal(found.length,1);assert.equal(found[0].suggestion,'full- or part-time');assert.equal(doc.text.slice(found[0].start,found[0].end),found[0].text);assert.ok(!found[0].text.includes('employment'));
});
