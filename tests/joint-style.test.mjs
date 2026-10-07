import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
import {searchGuide} from '../app/gpo-style.mjs';
import {STYLE_GUIDES} from '../app/style-guides.mjs';
const references=Object.fromEntries(STYLE_GUIDES.map(g=>[g.id,JSON.parse(fs.readFileSync(new URL('../app/'+g.referenceUrl,import.meta.url),'utf8'))]));
const check=text=>jointStylisticIssues(makeDocument([text],'Current'),references);
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
test('both directions of guide conflicts stay highlighted, while LCB remains the recommendation',()=>{
 const issues=check('The federal government and Federal Government provide health care and healthcare.');
 assert.equal(issues.length,4);assert.ok(issues.every(i=>i.conflict&&i.references.length===2));
 assert.deepEqual(issues.map(i=>i.matchesPrimary),[true,false,true,false]);
 assert.deepEqual(issues.map(i=>i.suggestion),['federal government','federal government','health care','health care']);
 for(const issue of issues){assert.match(issue.conflictNote,/LCB takes priority/);assert.ok(issue.references.every(r=>r.ruleText&&r.guidePage>0));}
});
test('modifier and age/time conflicts preserve context and skip digest-specific numeral cases',()=>{
 const issues=check('The African American program offers collective bargaining rights and groundwater levels for children 2 years of age. It takes three minutes.');
 assert.equal(issues.length,5);assert.ok(issues.every(i=>i.conflict));
 assert.deepEqual(issues.map(i=>i.suggestion),['African American','collective bargaining','groundwater','two','three']);
 const digest=check("LEGISLATIVE COUNSEL’S DIGEST\nChildren 2 years of age wait 3 minutes.\nThe people of the State of California do enact as follows:\nChildren 2 years of age wait 3 minutes.");
 assert.equal(digest.filter(i=>i.conflict).length,2);
 assert.ok(digest.filter(i=>i.conflict).every(i=>i.start>100));
 assert.equal(check('African American people bargain collectively.').length,0);
});
test('LCB numeral form supersedes a hyphen-only suggestion, with both guides agreeing on figures',()=>{
 const issues=check('The office schedules twenty one events and eleven requests. Twenty-one people attend.');
 assert.deepEqual(issues.map(i=>i.suggestion),['21','11']);assert.ok(issues.every(i=>i.guideId==='lcb'&&!i.conflict&&i.references.length===2));
});
test('existing source strikeouts do not generate new conflicts and numbered wrapping is supported',()=>{
 const doc=makeDocument(['line 1 healthcare and health\nline 2 care are provided.'],'Current');
 const start=doc.text.indexOf('healthcare');doc.struck=[{start,end:start+10}];
 const issues=jointStylisticIssues(doc,references);assert.equal(issues.length,1);assert.equal(issues[0].text,'health care');assert.equal(issues[0].matchesPrimary,true);
});
test('LCB entire manual and GPO entire manual are separately searchable with accurate physical pages',()=>{
 assert.equal(references.lcb.pages.length,23);assert.equal(references.gpo.pages.length,475);
 assert.ok(searchGuide(references.lcb,'"health care"').some(p=>p.page===11));
 assert.ok(searchGuide(references.gpo,'healthcare').some(p=>p.page===157));
 assert.ok(searchGuide(references.lcb,'groundwater').some(p=>p.page===15));
 assert.ok(searchGuide(references.lcb,'Reference Guides').some(p=>p.page===1));
});
