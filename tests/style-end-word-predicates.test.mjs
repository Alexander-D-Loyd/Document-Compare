import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
import {styleRuleInventory} from '../app/style-rule-inventory.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const review=t=>jointStylisticIssues(makeDocument([t],'Current'),refs).filter(i=>i.rule==='Hyphenation, item 2 and End words');

test('LCB productive end words use complete lexical bases beyond the fixed root list',()=>{
 const scope=styleRuleInventory(refs).find(r=>r.id==='gpo-6.18');assert.equal(scope.status,'Partially automated');assert.match(scope.scope,/manual/);
 for(const form of ['cloud-based','web-based','content-based','location-based','performance-based','project-related','minister-approved','district-adopted']){
  const open=form.replaceAll('-',' ');
  for(const text of ['The program is '+form+'.','The program shall be fully '+form+' for this purpose.','The program remains '+form+' when used.']){
   const found=review(text);assert.equal(found.length,1,text);assert.equal(found[0].suggestion,open);assert.equal(text.slice(found[0].start,found[0].end),form);
   assert.equal(review(text.replace(form,open)).length,0);
   assert.ok(found[0].references.some(r=>r.guideId==='lcb'&&r.guidePage===16));assert.ok(found[0].references.some(r=>r.guideId==='gpo'&&r.rule==='6.18'&&r.guidePage===116));
  }
 }
});

test('whole compound bases receive one complete predicate suggestion rather than a suffix fragment',()=>{
 for(const [form,preferred] of [['mental-health-related','mental health related'],['public-health-based','public health based'],['data-sharing-approved','data sharing approved'],['district-board-adopted','district-board adopted'],['public-health-data-sharing-related','public-health-data-sharing related']]){
  const text='The program is '+form+'.',found=review(text);assert.equal(found.length,1,text);assert.equal(found[0].text,form);assert.equal(found[0].suggestion,preferred);
  assert.equal(review(text.replace(form,preferred)).length,0);
 }
 for(const form of ['unknownroot-health-related','unfamiliarword-content-based','unfamiliarword-based'])assert.equal(review('The program is '+form+'.').length,0,form);
});

test('predicate corrections preserve complete source-listed noun spellings and cite their authority',()=>{
 for(const [form,preferred,page] of [['cross-complaint-related','cross-complaint related',10],['child-care-based','childcare based',9],['right-of-way-related','right-of-way related',13],['attorney-in-fact-approved','attorney-in-fact approved',9],['cost-of-living-related','cost of living related',10],['certificate-of-need-based','certificate of need based',9]]){
  const text='The program is '+form+'.',found=review(text);assert.equal(found.length,1,text);assert.equal(found[0].suggestion,preferred);assert.equal(found[0].text,form);
  assert.ok(found[0].references.some(r=>r.guideId==='lcb'&&r.guidePage===page&&r.preferred===preferred.slice(0,preferred.lastIndexOf(' '))));
  assert.equal(review(text.replace(form,preferred)).length,0);
 }
 for(const form of ['unknown-of-way-related','unknown-in-fact-approved','unfamiliarword-child-care-related'])assert.equal(review('The program is '+form+'.').length,0,form);
 assert.equal(review('The program is health-care-based.').length,0,'Conflicting base choices remain excluded');
});

test('coordinated predicate adjectives share an explicit copula and preserve separate exact ranges',()=>{
 for(const forms of [['cloud-based','location-based'],['court-approved','science-based','mental-health-related'],['web-based','content-based','performance-based','project-related'],['cloud-based','web-based','content-based','location-based','science-based','project-related']]){
  const phrase=forms.length===2?forms.join(' and '):forms.slice(0,-1).join(', ')+', and '+forms.at(-1),text='The program shall be '+phrase+'.',found=review(text);
  assert.deepEqual(found.map(i=>i.text),forms,text);for(const i of found)assert.equal(text.slice(i.start,i.end),i.text);
  assert.equal(review(text.replaceAll('-',' ')).length,0);
 }
 assert.deepEqual(review('The program is cloud-based or location-based when used.').map(i=>i.text),['cloud-based','location-based']);
 assert.equal(review('The program is cloud-based, and the agency shall review it.').length,1);
 assert.equal(review('The program is cloud-based, subject to this section.').length,1);
});

test('embedded noun phrases, independent clauses, unknown compounds, capitals and literals remain protected',()=>{
 for(const text of ['The program is a cloud-based program.','The program is cloud-based software.','Use a location-based program.','The program is court-approved and web-based software.','The program is court-approved, web-based, flexible software.','The program is cloud-based and unknownword-related.','The cloud-based program was reviewed.','The officer has court-approved records.','The program is CLOUD-BASED.','The program is Cloud-Based.','The term “the program is cloud-based” is literal.','The program is cloud-based............100'])assert.equal(review(text).length,0,text);
 assert.equal(review('The program is approved and the cloud-based program applies.').length,0);
 for(const text of ['The program is cloud—based.','The program is content–based.','The program is cloud-based-public.'])assert.equal(review(text).length,0,text);
 const doc=makeDocument(['The program is cloud-based.'],'Current');doc.struck=[{start:15,end:26}];assert.ok(!jointStylisticIssues(doc,refs).some(i=>i.text==='cloud-based'));
});

test('hyphenated predicate fragments across margins and pages keep whole source offsets',()=>{
 const doc=makeDocument(['ASSEMBLY BILL No. 577\nThe people of the State of California do enact as follows:\nline 1 The program is mental-\n94','AB 577 — 2 —\nline 1 health-related for this purpose.'],'Current'),found=jointStylisticIssues(doc,refs).filter(i=>i.rule==='Hyphenation, item 2 and End words');
 assert.equal(found.length,1);assert.equal(found[0].start,doc.text.indexOf('mental-'));assert.equal(found[0].end,doc.text.indexOf('health-related')+'health-related'.length);assert.equal(found[0].suggestion,'mental health related');assert.equal(found[0].matchText,'mental-health-related');assert.equal(doc.text.slice(found[0].start,found[0].end),found[0].text);
 assert.equal(review('The program is communi-\nline 2 ty-based.').length,0,'A divided base word is not two independent lexical roots');
});

test('guide disagreements inside compound bases stay excluded under the user policy',()=>{
 for(const text of ['The program is health-care-based.','The program is ground-water-related.','The program is wild-land-related.'])assert.equal(review(text).length,0,text);
 assert.equal(review('The program is public-health-based.').length,1,'Unrelated compound bases remain checkable');
});
