import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const review=t=>jointStylisticIssues(makeDocument([t],'Current'),refs);
const cases=[
 ['The board re-elects the officer.','re-elects','reelects'],['The board re-elected the officer.','re-elected','reelected'],['The officer was duly re-elected.','re-elected','reelected'],['The agency is re-electing the director.','re-electing','reelecting'],
 ['The person was cross examined.','cross examined','cross-examined'],['The court cross examines the witness.','cross examines','cross-examines'],['The court is cross examining the witness.','cross examining','cross-examining'],['Before cross examining the witness, the court shall act.','cross examining','cross-examining'],
 ['The agency co-locates the offices.','co-locates','colocates'],['The agency has co-located the offices.','co-located','colocated'],['The agency is co-locating the offices.','co-locating','colocating'],
 ['The guide-dogs are trained.','guide-dogs','guide dogs'],['The fruit-flies are studied.','fruit-flies','fruit flies'],['The half-brothers are eligible.','half-brothers','half brothers'],['Their half-sisters are eligible.','half-sisters','half sisters'],['These advance-directives are valid.','advance-directives','advance directives'],['The advisory-councils shall act.','advisory-councils','advisory councils'],
];
test('Recognized verb and noun inflections retain office compounding in explicit grammatical positions',()=>{
 for(const [sentence,variant,preferred] of cases){const issue=review(sentence).find(i=>i.checkId==='lcb-expressions'&&i.suggestion===preferred);assert.ok(issue,sentence);assert.equal(sentence.slice(issue.start,issue.end),variant);assert.ok(!review(sentence.replace(variant,preferred)).some(i=>i.checkId==='lcb-expressions'),sentence);}
});
test('Inflected expression checks protect literal names, unknown roles and extended modifiers',()=>{
 for(const t of ['The Re-Elected Officers Association is named.','The term “re-elected” is literal.','The term "guide-dogs" is literal.','The guide-dogs training program is required.','The fruit-flies research project is funded.','The agency has a cross examined witness.','The agency cross examines........100','The document describes cross examining.'])assert.ok(!review(t).some(i=>i.checkId==='lcb-expressions'),t);
 const d=makeDocument(['The officer was re-elected.'],'Current');d.struck=[{start:16,end:26}];assert.ok(!jointStylisticIssues(d,refs).some(i=>i.checkId==='lcb-expressions'));
});
test('Inflected verb findings span printed margin wrapping without changing offsets',()=>{
 const d=makeDocument(['line 1 The officer was cross\nline 2 examined.'],'Current');const i=jointStylisticIssues(d,refs).find(i=>i.suggestion==='cross-examined');assert.ok(i);assert.equal(d.text.slice(i.start,i.end),i.text);
});
