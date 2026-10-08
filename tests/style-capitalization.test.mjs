import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {capitalizationIssues} from '../app/style-capitalization.mjs';
const refs={lcb:JSON.parse(fs.readFileSync(new URL('../app/data/lcb-reference.json',import.meta.url)))};
const check=text=>capitalizationIssues(makeDocument([text],'Current'),refs);
test('complete listed names handle mixed case while descriptive uses and sentence starts remain contextual',()=>{
 assert.deepEqual(check('The health and Safety Code and state treasury apply to this Act. The Governor’s Office oversees the General Election.').map(i=>i.suggestion).sort(),['Health and Safety Code','State Treasury','this act','Governor’s office','general election'].sort());
 assert.equal(check('The Health and Safety Code and State Treasury apply to this act. The Governor’s office oversees the general election. Website content is public. See Section 1 and Chapter 2.').length,0);
});
test('source headings, tables and crossed wording do not create capitalization findings',()=>{
 const doc=makeDocument(['LEGISLATIVE COUNSEL’S DIGEST\nThe Health and Safety Code applies.\nThe people of the State of California do enact as follows:\nline 1 The state treasury is the account.'],'Current');
 const found=capitalizationIssues(doc,refs);assert.equal(found.length,1);assert.equal(doc.text.slice(found[0].start,found[0].end),found[0].text);
 doc.struck=[{start:found[0].start,end:found[0].end}];assert.equal(capitalizationIssues(doc,refs).length,0);
});
test('formal agency names, fund names and private attorney general doctrine stay intact',()=>{
 const text='The Governor’s Office of Business and Economic Development and the Division of the State Architect act. The Appellate Court Trust Fund pays under the private attorney general doctrine.\n0500-001-0140—For support of the Governor’s Office, payable from the fund.';
 assert.equal(check(text).length,0);
});
