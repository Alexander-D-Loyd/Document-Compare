import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {fractionIssues} from '../app/style-fractions.mjs';
const refs={lcb:JSON.parse(fs.readFileSync(new URL('../app/data/lcb-reference.json',import.meta.url)))};
const check=text=>fractionIssues(makeDocument([text],'Current'),refs);
test('larger simple denominators preserve whole bill fractions and use digest figures',()=>{
 const words=['eleventh','twelfth','thirteenth','fourteenth','fifteenth','sixteenth','seventeenth','eighteenth','nineteenth','twentieth'];
 for(let i=0;i<words.length;i++){const d=i+11,name=words[i];assert.equal(check('Use 1/'+d+' of the appropriation.')[0].suggestion,'one-'+name);assert.equal(check('Use one-'+name+' of the appropriation.').length,0);assert.equal(check('Use one '+name+' of the appropriation.')[0].suggestion,'one-'+name);assert.equal(check('LEGISLATIVE COUNSEL’S DIGEST\nUse one-'+name+' of the appropriation.')[0].suggestion,'1⁄'+d);}
 assert.equal(check('Use Section 1/12. File on 1/12/2026.').length,0);
});
test('simple fraction checks distinguish bills and digests and protect specialized expressions',()=>{
 assert.deepEqual(check('Use 1/2 of the revenue and two thirds of the votes.').map(i=>i.suggestion),['one-half','two-thirds']);
 const digest='LEGISLATIVE COUNSEL’S DIGEST\nThe bill allocates one-half of revenue.\nThe people of the State of California do enact as follows:\nThe board allocates one-half of revenue.';
 assert.deepEqual(check(digest).map(i=>i.suggestion),['1⁄2']);
 assert.equal(check('Use Section 1/2. Pay 1 1/2 percent on 1/2/2026. One quarter of a year passes in one quarter.').length,1);
 assert.equal(check('Use one-half of the revenue and two-thirds of votes.').length,0);
});

test('mixed durations and fractional percentages follow LCB bill and digest examples',()=>{
 assert.deepEqual(check('Wait 3 1/2 hours. Allocate 1/2 of 1 percent.').map(i=>i.suggestion),['one-half','three and one-half']);
 assert.deepEqual(check('Wait three and one half hours or ten and one-half hours.').map(i=>i.suggestion),['three and one-half','10 1⁄2']);
 assert.equal(check('Wait three and one-half hours or 10 1/2 hours. Cite Section 3 1/2.').length,0);
 const digest='LEGISLATIVE COUNSEL’S DIGEST\nWait three and one-half hours.\nThe people of the State of California do enact as follows:\nWait three and one-half hours.';
 assert.deepEqual(check(digest).map(i=>i.suggestion),['3 1⁄2']);
});
