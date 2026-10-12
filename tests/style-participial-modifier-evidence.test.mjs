import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const review=t=>jointStylisticIssues(makeDocument([t],'Current'),refs).filter(i=>i.checkId==='lcb-contextual'&&i.category==='Modifier hyphenation');

test('finite based and related verbs are not mistaken for unit modifiers',()=>{
 for(const text of ['The department based payments on records.','The agency based plans on evidence.','The community based funding on needs.','The court related information to its members.','The department related events to the council.','The board approved plans.','The state adopted rules.'])assert.equal(review(text).length,0,text);
 // Clipped wording with only an article and adjacent words is ambiguous.
 for(const text of ['The department based payments.','A community based program.','The court related information.','The public health based funding.'])assert.equal(review(text).length,0,text);
});

test('independent noun-phrase evidence retains real participial modifiers',()=>{
 for(const [text,preferred] of [['The department based payments are prohibited.','department-based'],['The agency requires community based funding.','community-based'],['The provider serves a community based program.','community-based'],['The report concerns a community based program that operates locally.','community-based'],['The plan is a community based program.','community-based'],['The agency acts within a community based program.','community-based'],['The agency shall only support CSPS project related activities.','project-related'],['A community based program and a board approved policy are adopted.','community-based'],['A mental health related service provides assistance.','mental-health-related']]){
  assert.ok(review(text).some(i=>i.suggestion===preferred),text);
  assert.ok(!review(text.replace(preferred.replaceAll('-',' '),preferred)).some(i=>i.suggestion===preferred),text+' corrected');
 }
});

test('unknown roots, literal wording, proper names and source removals remain protected',()=>{
 for(const text of ['The unfamiliarword based program applies.','The term “community based program” appears.','COMMUNITY BASED PROGRAM applies.','The Department Based Program applies.'])assert.equal(review(text).length,0,text);
 const doc=makeDocument(['The community based program applies.'],'Current');doc.struck=[{start:4,end:19}];assert.equal(jointStylisticIssues(doc,refs).filter(i=>i.checkId==='lcb-contextual').length,0);
});

test('printed margins and page boundaries preserve full modifier offsets',()=>{
 const doc=makeDocument(['ASSEMBLY BILL No. 577\nThe people of the State of California do enact as follows:\nline 1 The community\n94','AB 577 — 2 —\nline 1 based program applies.'],'Current');
 // Supply the native reader's identification of these printed page labels.
 // Unclassified ignored content is now protected as grammatical evidence.
 for(const b of doc.blocks.filter(b=>b.ignored))b.formatting={headerParts:[{text:b.text}]};
 const found=jointStylisticIssues(doc,refs).filter(i=>i.checkId==='lcb-contextual'&&i.suggestion==='community-based');
 assert.equal(found.length,1);assert.equal(found[0].start,doc.text.indexOf('community'));assert.equal(found[0].end,doc.text.indexOf('based')+5);assert.equal(found[0].text,doc.text.slice(found[0].start,found[0].end));
 const verb=makeDocument(['The community\n94','AB 577 — 2 —\nline 1 based funding on needs.'],'Current');assert.equal(jointStylisticIssues(verb,refs).filter(i=>i.checkId==='lcb-contextual').length,0);
});

test('source-grounded AB 116 list contexts retain real modifiers while rejecting set forth',()=>{
 for(const text of ['Existing law sets forth related provisions regarding the department’s collection of overpayments.','The agency shall use his related records.','The agency shall use their related records.','Existing law sets forth related provisions are applicable.'])assert.equal(review(text).length,0,text);
 for(const text of ['Health care benefits are available through employment, retirement, military service, work related injuries or settlements from prior injuries.','Health care benefits are available through employment,\nline 4 retirement, military service, work related injuries or settlements\nline 5 from prior injuries.'])assert.ok(review(text).some(i=>i.suggestion==='work-related'),text);
 const text='The program shall include all of the following:\nline 34 (A) Family planning related services and male and female\nline 35 sterilization.',found=review(text);assert.equal(found.length,1);assert.equal(found[0].suggestion,'Family-planning-related');assert.equal(found[0].start,text.indexOf('Family'));assert.equal(found[0].end,text.indexOf('related')+7);
 for(const text of ['The program shall include all of the following: (A) The department based payments on records.','The program shall include all of the following: (A) The court related information to its members.','The policy came through the department, the community based funding on needs.'])assert.equal(review(text).length,0,text);
});

test('source-listed childcare spelling is preserved within the complete unit modifier',()=>{
 for(const text of ['The child care based program applies.','The agency requires child care related services.']){
  const found=review(text);assert.equal(found.length,1);assert.ok(['childcare-based','childcare-related'].includes(found[0].suggestion));assert.ok(found[0].references.some(r=>r.guideId==='lcb'&&r.guidePage===9&&r.preferred==='childcare'));assert.equal(found[0].start,text.indexOf('child'));assert.equal(found[0].text,text.slice(found[0].start,found[0].end));
 }
 for(const text of ['The childcare-based program applies.','The childcare-related services apply.','The program is health-care-based.'])assert.equal(review(text).length,0,text);
});

test('protected whole nominal bases never fall back to partial suffix corrections',()=>{
 for(const text of ['The Mental Health related services apply.','The Family Planning related services apply.','The Public Health based program applies.','The Mental Health related program is reviewed.'])assert.equal(review(text).length,0,text);
 const text='The family planning related services apply.',found=review(text);assert.equal(found.length,1);assert.equal(found[0].text,'family planning related');assert.equal(found[0].suggestion,'family-planning-related');
});
