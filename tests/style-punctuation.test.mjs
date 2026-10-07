import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument} from '../app/core.mjs';import {contextualPunctuationIssues} from '../app/style-punctuation.mjs';import {searchCoverage} from '../app/style-coverage.mjs';
const refs={lcb:JSON.parse(fs.readFileSync(new URL('../app/data/lcb-reference.json',import.meta.url)))};
test('percent representation depends on digest/bill context; time possessives and plural decades are targeted',()=>{
 const text='LEGISLATIVE COUNSEL’S DIGEST\nThe rate is 5 percent.\nThe people do enact as follows:\nThe rate is 5%. Provide 30 days notice. The 1990’s were different.';
 const doc=makeDocument([text],'Current'),found=contextualPunctuationIssues(doc,refs);assert.deepEqual(found.map(i=>i.suggestion),['1990s','30 days’ notice','5%','5 percent']);assert.ok(found.every(i=>doc.text.slice(i.start,i.end)===i.text));
 assert.equal(contextualPunctuationIssues(makeDocument(['The 1990’s culture changed. Give one week’s notice. The rate is 5 percent.'],'Current'),refs).length,0);
 doc.struck=[{start:text.indexOf('5%'),end:text.indexOf('5%')+2}];assert.equal(contextualPunctuationIssues(doc,refs).some(i=>i.suggestion==='5 percent'),false);
});
test('coverage searches include contextual rules and explicit manual-review limitations',()=>{assert.equal(searchCoverage('identifiers')[0].page,22);assert.ok(searchCoverage('meaning').some(i=>i.status==='Manual review required'));assert.ok(searchCoverage('dollar').some(i=>i.status==='Manual review required'));});
