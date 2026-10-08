import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
import {searchGuide} from '../app/gpo-style.mjs';
import {STYLE_GUIDES} from '../app/style-guides.mjs';
import {createReviewIgnores} from '../app/review-ignores.mjs';
const references=Object.fromEntries(STYLE_GUIDES.map(g=>[g.id,JSON.parse(fs.readFileSync(new URL('../app/'+g.referenceUrl,import.meta.url),'utf8'))]));
const check=text=>jointStylisticIssues(makeDocument([text],'Current'),references);
test('expanded contractions and sourced spelling variants detect violations while accepting corrected prose',()=>{
 const found=check('The board hasn’t approved the fibre. It should’ve addressed the anaemia.');assert.deepEqual(found.map(i=>i.suggestion),['has not','fiber','should have','anemia']);
 assert.equal(check('The board has not approved the fiber. It should have addressed the anemia.').length,0);
});
test('LCB unit modifier flags data sharing before agreement, including numbered wrapping, but accepts noun and hyphenated uses',()=>{
 const issues=check('A data sharing agreement, data sharing agreements, data-sharing agreement, and data sharing are discussed.');
 assert.equal(issues.length,2);assert.ok(issues.every(i=>i.suggestion==='data-sharing'&&i.guidePage===8&&i.guideId==='lcb'&&!i.conflict));
 const doc=makeDocument(['line 1 The data\nline 2 sharing agreement covers records.'],'Current');
 const wrapped=jointStylisticIssues(doc,references);assert.equal(wrapped.length,1);assert.match(doc.text.slice(wrapped[0].start,wrapped[0].end),/data\nline 2 sharing/);
 doc.struck=[{start:wrapped[0].start,end:wrapped[0].end}];assert.equal(jointStylisticIssues(doc,references).length,0);
});
test('LCB spelling preferences take priority, with GPO retained as a secondary reference',()=>{
 const issues=check('The cancelled catalogue lists monies and wilful conduct.');
 assert.deepEqual(issues.map(i=>i.suggestion),['canceled','catalog','moneys','willful']);
 assert.ok(issues.every(i=>i.guideId==='lcb'));
 assert.equal(issues[0].references[0].guideId,'lcb');assert.ok(issues[0].references.some(r=>r.guideId==='gpo'));assert.equal(issues[0].conflict,false);
 assert.equal(check('The canceled catalog lists moneys and willful conduct.').length,0);
});
test('LCB/GPO disagreements are ignored in both directions while agreed rules remain active',()=>{
 assert.equal(check('The federal government and Federal Government provide health care and healthcare.').length,0);
 assert.equal(check('The African American program offers collective bargaining rights and groundwater levels for children 2 years of age. It takes three minutes.').length,0);
 assert.deepEqual(check('Use healthcare and a data sharing agreement with eleven requests.').map(i=>i.suggestion),['data-sharing','11']);
});
test('LCB numeral form supersedes a hyphen-only suggestion, with both guides agreeing on figures',()=>{
 const issues=check('The office schedules twenty one events and eleven requests. Twenty-one people attend.');
 assert.deepEqual(issues.map(i=>i.suggestion),['21','11']);assert.ok(issues.every(i=>i.guideId==='lcb'&&!i.conflict&&i.references.length===2));
});
test('existing source strikeouts do not generate new conflicts and numbered wrapping is supported',()=>{
 const doc=makeDocument(['line 1 healthcare and health\nline 2 care are provided.'],'Current');
 const start=doc.text.indexOf('healthcare');doc.struck=[{start,end:start+10}];
 const issues=jointStylisticIssues(doc,references);assert.equal(issues.length,0);
});
test('LCB entire manual and GPO entire manual are separately searchable with accurate physical pages',()=>{
 assert.equal(references.lcb.pages.length,23);assert.equal(references.gpo.pages.length,475);
 assert.ok(searchGuide(references.lcb,'"health care"').some(p=>p.page===11));
 assert.ok(searchGuide(references.gpo,'healthcare').some(p=>p.page===157));
 assert.ok(searchGuide(references.lcb,'groundwater').some(p=>p.page===15));
 assert.ok(searchGuide(references.lcb,'Reference Guides').some(p=>p.page===1));
});

test('fraction form disagreements are excluded while agreed standalone bill fractions remain checked',()=>{
 assert.equal(check('Wait 3 1/2 hours or three and one half hours. Use a 1/2-inch pipe.').length,0);
 assert.equal(check('LEGISLATIVE COUNSEL’S DIGEST\nAllocate one-half of the revenue.').length,0);
 assert.deepEqual(check('Allocate 1/2 of the revenue.').map(i=>i.suggestion),['one-half']);
 assert.equal(check('The term “1/2 of the revenue” is quoted.').length,0);
});

test('related sentence-opening numeral disagreements do not create extra later-number findings',()=>{
 assert.equal(check('Fifty or sixty more requests are submitted.').length,0);
 assert.deepEqual(check('50 or 60 more requests are submitted.').map(i=>i.suggestion),['Fifty']);
 assert.deepEqual(check('The office receives sixty more requests.').map(i=>i.suggestion),['60']);
});

test('digest percent-sign conflicts are ignored while agreed bill percent wording is checked',()=>{
 assert.equal(check('LEGISLATIVE COUNSEL’S DIGEST\nThe rate is 5 percent.').length,0);
 assert.equal(check('LEGISLATIVE COUNSEL’S DIGEST\nThe rate is 5%.').length,0);
 assert.deepEqual(check('The rate is 5%.').map(i=>i.suggestion),['5 percent']);
});

test('Ignore All treats wrapped compound findings as the same wording without losing exact source positions',()=>{
 const doc=makeDocument(['line 1 The twenty-first applicant and the twenty-\nline 2 first applicant qualify.\nline 3 The cambrian period and the cambrian\nline 4 period are discussed.'],'Current'),found=jointStylisticIssues(doc,references),state=createReviewIgnores();
 const ordinals=found.filter(i=>i.suggestion==='21st'),geology=found.filter(i=>i.suggestion==='Cambrian Period');assert.equal(ordinals.length,2);assert.equal(geology.length,2);
 assert.deepEqual(ordinals.map(i=>i.matchText),['twenty-first','twenty-first']);assert.equal(state.matchingCount('style',ordinals[0],found,doc.text),2);
 state.ignore('style',ordinals[0],doc.text,true);assert.ok(ordinals.every(i=>state.has('style',i,doc.text)));assert.ok(geology.every(i=>!state.has('style',i,doc.text)));
 state.undo();assert.ok(ordinals.every(i=>!state.has('style',i,doc.text)));
 assert.equal(doc.text.slice(ordinals[1].start,ordinals[1].end),'twenty-\nline 2 first');
});

test('source-table groundwater and wildland disagreements are excluded outside the former levels-only exception',()=>{
 assert.equal(check('Protect ground water and groundwater. Preserve wild land and wildland.').length,0);
 assert.equal(check('Monitor ground-water samples and wild-land conditions.').length,0);
 assert.deepEqual(check('The credential holder protects ground water.').map(i=>i.suggestion),['credentialholder']);
});
