import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {monetaryPairIssues,writtenMoneyNumber} from '../app/style-money.mjs';
const refs={lcb:JSON.parse(fs.readFileSync(new URL('../app/data/lcb-reference.json',import.meta.url)))};
const check=text=>monetaryPairIssues(makeDocument([text],'Current'),refs);
test('LCB monetary examples keep matching dollars, cents, mills and large amounts intact',()=>{
 const examples=['two mills ($0.002)','one cent ($0.01)','fifty cents ($0.50)','ten dollars ($10)','two thousand forty-five dollars ($2,045)','four hundred fifty-seven dollars and forty-two cents ($457.42)','three million dollars ($3,000,000)','two hundred billion dollars ($200,000,000,000)'];
 for(const example of examples)assert.equal(check('Pay '+example+'.').length,0,example);
 assert.equal(writtenMoneyNumber('four hundred fifty-seven'),457);assert.equal(writtenMoneyNumber('one two'),null);
});
test('disagreeing written and parenthetical amounts produce one whole-expression finding',()=>{
 const text='Pay four hundred fifty-seven dollars and forty-two cents ($457.24).';
 const found=check(text);assert.equal(found.length,1);assert.equal(found[0].suggestion,'four hundred fifty-seven dollars and forty-two cents ($457.42)');assert.match(found[0].message,/confirm which amount/i);
 const doc=makeDocument(['line 1 Pay ten dollars\nline 2 ($20).'],'Current');const issue=monetaryPairIssues(doc,refs)[0];assert.equal(doc.text.slice(issue.start,issue.end),issue.text);assert.equal(issue.suggestion,'ten dollars ($10)');
 doc.struck=[{start:issue.start,end:issue.end}];assert.equal(monetaryPairIssues(doc,refs).length,0);
});

test('hyphenated monetary modifiers compare the whole amount and digest pairs use figures alone',()=>{
 assert.equal(check('Use a two-hundred-dollar ($200) minimum.').length,0);
 assert.equal(check('Use a two-hundred-dollar ($250) minimum.')[0].suggestion,'two-hundred-dollar ($200)');
 const digest='LEGISLATIVE COUNSEL’S DIGEST\nThis bill requires ten dollars ($10) and fifty cents ($0.50).\nThe people of the State of California do enact as follows:\nPay ten dollars ($10).';
 assert.deepEqual(check(digest).map(i=>i.suggestion),['$10','$0.50']);
 assert.equal(check('LEGISLATIVE COUNSEL’S DIGEST\nThis bill requires $10.\nThe people of the State of California do enact as follows:\nPay ten dollars ($10).').length,0);
});
