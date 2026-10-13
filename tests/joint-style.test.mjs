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
test('explicit state-office titles follow LCB priority without excluding federal or person-name uses',()=>{
 assert.ok(references.gpo.pages[51].text.includes('secretary of state of'));
 for(const [text,wanted] of [['The California secretary of state shall act.','Secretary of State'],['The state attorney general shall act.','Attorney General'],['The secretary of state of California shall act.','Secretary of State'],['The attorney general of the state of California shall act.','Attorney General']]){const issues=check(text);assert.deepEqual(issues.map(i=>i.suggestion),[wanted],text);assert.ok(issues.every(i=>i.guideId==='lcb'&&!i.conflict));assert.equal(check(text.replace(text.includes('secretary')?'secretary of state':'attorney general',wanted)).length,0);}for(const text of ['The California Secretary of State shall act.','The state Attorney General shall act.'])assert.equal(check(text).length,0,text);
 assert.ok(check('The United States secretary of state shall act.').some(i=>i.suggestion==='Secretary of State'));
 assert.deepEqual(check('State veterinary technician associations recognized by the secretary of state in that state.').map(i=>i.suggestion),['Secretary of State']);
 assert.ok(check('The California attorney general Jane Smith shall act.').some(i=>i.suggestion==='Attorney General'));
 assert.deepEqual(check('The California secretary of state shall use a data sharing agreement.').map(i=>i.suggestion),['Secretary of State']);
});
test('expanded contractions and sourced spelling variants detect violations while accepting corrected prose',()=>{
 const found=check('The board hasn’t approved the fibre. It should’ve addressed the anaemia.');assert.deepEqual(found.map(i=>i.suggestion),['has not','fiber','should have','anemia']);
 assert.equal(check('The board has not approved the fiber. It should have addressed the anemia.').length,0);
});
test('unlisted data sharing remains quiet while printed data-processing retains exact source evidence',()=>{
 assert.equal(check('A data sharing agreement, data sharing agreements, data-sharing agreement, and data sharing are discussed.').length,0);
 const doc=makeDocument(['line 1 The data\nline 2 sharing agreement covers records.'],'Current');
 const original=JSON.stringify(doc);assert.equal(jointStylisticIssues(doc,references).length,0);assert.equal(JSON.stringify(doc),original);
 const printed=makeDocument(['line 1 The data\nline 2 processing system covers records.'],'Current'),before=JSON.stringify(printed),wrapped=jointStylisticIssues(printed,references);assert.equal(wrapped.length,1);assert.equal(wrapped[0].suggestion,'data-processing');assert.equal(wrapped[0].guidePage,10);assert.match(references.lcb.pages[9].text,/data-processing/);assert.equal(printed.text.slice(wrapped[0].start,wrapped[0].end),wrapped[0].text);assert.equal(JSON.stringify(printed),before);
 printed.struck=[{start:wrapped[0].start,end:wrapped[0].end}];assert.equal(jointStylisticIssues(printed,references).length,0);
});
test('LCB spelling preferences take priority, with GPO retained as a secondary reference',()=>{
 const issues=check('The cancelled catalogue lists monies and wilful conduct.');
 assert.deepEqual(issues.map(i=>i.suggestion),['canceled','catalog','moneys','willful']);
 assert.ok(issues.every(i=>i.guideId==='lcb'));
 assert.equal(issues[0].references[0].guideId,'lcb');assert.ok(issues[0].references.some(r=>r.guideId==='gpo'));assert.equal(issues[0].conflict,false);
 assert.equal(check('The canceled catalog lists moneys and willful conduct.').length,0);
});
test('LCB preferred forms override GPO differences while compliant forms and agreed rules remain active',()=>{
 assert.deepEqual(check('The federal government and Federal Government provide health care and healthcare.').map(i=>i.suggestion),['federal government','health care']);assert.equal(check('The federal government provides health care.').length,0);assert.equal(check('The term “healthcare” is stated. The healthcare is provided.').length,0);
 assert.deepEqual(check('The African American program offers collective bargaining rights and groundwater levels for children 2 years of age. It takes three minutes.').map(i=>i.suggestion),['two']);
 assert.deepEqual(check('Use healthcare and a data sharing agreement with eleven requests.').map(i=>i.suggestion),['health care','11']);
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

test('fraction roles follow LCB forms while exact quoted copy remains protected',()=>{
 assert.deepEqual(check('Wait 3 1/2 hours or three and one half hours. Use a 1/2-inch pipe.').map(i=>i.suggestion),['three and one-half','three and one-half','one-half']);
 assert.deepEqual(check('LEGISLATIVE COUNSEL’S DIGEST\nAllocate one-half of the revenue.').map(i=>i.suggestion),['1⁄2']);
 assert.deepEqual(check('Allocate 1/2 of the revenue.').map(i=>i.suggestion),['one-half']);
 assert.equal(check('The term “1/2 of the revenue” is quoted.').length,0);
});

test('sentence-opening spelling and later related figures retain their distinct LCB roles',()=>{
 assert.deepEqual(check('Fifty or sixty more requests are submitted.').map(i=>i.suggestion),['60']);
 assert.deepEqual(check('50 or 60 more requests are submitted.').map(i=>i.suggestion),['Fifty']);
 assert.deepEqual(check('The office receives sixty more requests.').map(i=>i.suggestion),['60']);
});

test('digest percent signs and bill percent wording follow their printed LCB contexts',()=>{
 assert.deepEqual(check('LEGISLATIVE COUNSEL’S DIGEST\nThe rate is 5 percent.').map(i=>i.suggestion),['5%']);
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

test('source-listed groundwater and wildland follow LCB while their compliant forms stay quiet',()=>{
 assert.deepEqual(check('Protect ground water and groundwater. Preserve wild land and wildland.').map(i=>i.suggestion),['groundwater','wildland']);
 assert.deepEqual(check('Monitor ground-water samples and wild-land conditions.').map(i=>i.suggestion),['groundwater','wildland']);
 assert.deepEqual(check('The credential holder protects ground water.').map(i=>i.suggestion),['credentialholder','groundwater']);
});
