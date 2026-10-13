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

test('written fractions preserve full wrapped words and a genuine printed line-end hyphen',()=>{
 const doc=makeDocument(['line 1 Use two\nline 2 thirds of the votes.'],'Current'),found=fractionIssues(doc,refs);assert.equal(found.length,1);assert.equal(found[0].suggestion,'two-thirds');assert.equal(found[0].start,doc.text.indexOf('two'));assert.equal(found[0].end,doc.text.indexOf('thirds')+6);assert.equal(doc.text.slice(found[0].start,found[0].end),found[0].text);
 assert.equal(check('Use two-\nline 2 thirds of the votes.').length,0);
 assert.equal(check('Use one\nline 2 third party.').length,0);
 assert.equal(check('Use “two\nline 2 thirds” as printed.').length,0);
 assert.equal(check('Use "two\nline 2 thirds" as printed.').length,0);
 assert.equal(check('Use one\nline 2 quarter.').length,0);
});

test('complete fractions across identified running heads retain exact offsets and both source references',()=>{
 const both={...refs,gpo:JSON.parse(fs.readFileSync(new URL('../app/data/gpo-reference.json',import.meta.url)))},doc=makeDocument(['ASSEMBLY BILL No. 121\nThe people do enact as follows:\nline 1 Use one\n97','AB 121 — 2 —\nline 1 half of the funds.'],'Current');for(const b of doc.blocks.filter(b=>b.ignored))b.formatting={headerParts:[{start:0,end:b.text.length,anchor:'left'}]};
 const [issue]=fractionIssues(doc,both);assert.ok(issue);assert.equal(issue.suggestion,'one-half');assert.equal(issue.start,doc.text.indexOf('one'));assert.equal(issue.end,doc.text.indexOf('half')+4);assert.equal(doc.text.slice(issue.start,issue.end),issue.text);assert.ok(issue.references.some(r=>r.guideId==='gpo'&&r.rule==='6.38'&&r.guidePage===121));
 for(const b of doc.blocks.filter(b=>b.ignored))b.formatting={};assert.equal(fractionIssues(doc,both).length,0);doc.struck=[{start:issue.start,end:issue.end}];assert.equal(fractionIssues(doc,both).length,0);
});

test('wrapped mixed durations are checked as whole quantities while their conflicts remain marked',()=>{
 const found=check('Wait ten and one\nline 2 half hours.');assert.equal(found.length,1);assert.equal(found[0].suggestion,'10 1⁄2');assert.match(found[0].text,/ten and one/);
 const small=check('Wait three and one\nline 2 half hours.');assert.equal(small.length,1);assert.equal(small[0].suggestion,'three and one-half');assert.equal(small[0].conflict,true);
 assert.equal(check('Wait three and one-\nline 2 half hours.').length,0);
});

test('AB 109 ranked fiscal-year quarters are period counts rather than mathematical fractions',()=>{
 for(const t of ['the first three\nline 13 quarters of the current fiscal year','the last two\nline 2 quarters of the calendar year','the next two quarters of the following year'])assert.equal(check('Report '+t+'.').length,0,t);
 assert.equal(check('Allocate three\nline 2 quarters of the funds.')[0].suggestion,'three-quarters');
 assert.equal(check('Allocate three\nline 2 quarters of the year.')[0].suggestion,'three-quarters','Without an explicit ranked-period cue this fraction reading remains supported.');
});
