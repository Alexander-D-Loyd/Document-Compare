import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';import {CALIFORNIA_ENTITIES,californiaEntityReview} from '../app/style-california-entities.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=t=>jointStylisticIssues(makeDocument([t],'Current'),refs);
test('source export is bundled with categories, citations, source hash and unresolved forms',()=>{
 assert.equal(CALIFORNIA_ENTITIES.source.file,'California Entities.docx');assert.match(CALIFORNIA_ENTITIES.source.sha256,/^[a-f0-9]{64}$/);assert.equal(CALIFORNIA_ENTITIES.sourceSections.length,16);assert.equal(CALIFORNIA_ENTITIES.entries.length,512);assert.equal(CALIFORNIA_ENTITIES.unparsed.length,0);
 for(const name of ['California Environmental Protection Agency','Department of Consumer Affairs','California Building Standards Commission','California Citizens Compensation Commission','California Maritime Academy','California Open Education Resources Council'])assert.ok(CALIFORNIA_ENTITIES.entries.some(e=>e.name===name),name);
 assert.ok(CALIFORNIA_ENTITIES.entries.some(e=>e.name.includes('[name of region]')&&!e.checkEligible));assert.ok(!CALIFORNIA_ENTITIES.entries.some(e=>e.name.includes('Commission (formerly')));
});
test('every eligible listed name has an exact compliant and capitalization witness',()=>{
 for(const entry of CALIFORNIA_ENTITIES.entries.filter(e=>e.checkEligible)){
  const good=makeDocument(['The '+entry.name+' shall act.'],'Current');assert.equal(californiaEntityReview(good,refs).issues.length,0,entry.name);
  const bad=makeDocument(['The '+entry.name.toLowerCase()+' shall act.'],'Current'),r=californiaEntityReview(bad,refs);assert.ok(r.issues.some(i=>i.suggestion===entry.name),entry.name);
  for(const i of r.issues)assert.equal(bad.text.slice(i.start,i.end),i.text);
  assert.deepEqual(jointStylisticIssues(bad,refs).filter(i=>i.checkId==='california-entities').map(i=>i.suggestion),[entry.name],entry.name+' remains active through final guide/name filtering');
 }
});
test('entity corrections replace generic fragments and preserve official name wording',()=>{
 const found=check('The department of consumer affairs shall act.');assert.equal(found.length,1);assert.equal(found[0].suggestion,'Department of Consumer Affairs');assert.equal(found[0].checkId,'california-entities');assert.equal(found[0].entitySource.citation,'Sec. 100, B.& P.C.');
 assert.equal(check('The Department of Consumer Affairs shall act.').length,0);
 assert.equal(check('The California Hope, Opportunity, Perseverance and Empowerment (HOPE) for Children Trust Account Program Board shall act.').length,0);
});
test('unknown, longer, literal and short office names do not become missing-list errors',()=>{
 for(const t of ['The California Imaginary Services Agency shall act.','The Department of Consumer Affairs Advisory Committee shall act.','The department of consumer affairs advisory committee shall act.','The term “department of consumer affairs” is literal.','DEPARTMENT OF CONSUMER AFFAIRS','The controller shall act.','The Department of Consumer Affairs Foundation shall act.'])assert.equal(californiaEntityReview(makeDocument([t],'Current'),refs).issues.length,0,t);
 const d=makeDocument(['line 1 The department of\nline 2 consumer affairs shall act.'],'Current'),i=jointStylisticIssues(d,refs).find(i=>i.checkId==='california-entities');assert.ok(i);assert.equal(d.text.slice(i.start,i.end),i.text);d.struck=[{start:i.start,end:i.end}];assert.equal(californiaEntityReview(d,refs).issues.length,0);
});
test('remaining LCB reference rule has partial implementation without whole-rule certification',()=>{
 const rows=styleRuleInventory(refs),rule=rows.find(r=>r.id==='lcb-17-7');assert.equal(rule.status,'Partially automated');assert.match(rule.scope,/snapshot/);assert.match(rule.scope,/remain manual/);assert.deepEqual(rows.filter(r=>r.guide==='lcb'&&r.status==='Manual review required').map(r=>r.id),['lcb-21-opinions-and-cover-letters-source']);assert.ok(!rows.some(r=>r.guide==='lcb'&&r.status==='Fully automated'));
});

test('every eligible entity keeps its complete identity through a printed internal word division',()=>{
 for(const entry of CALIFORNIA_ENTITIES.entries.filter(e=>e.checkEligible)){
  const divide=text=>text.replace(/\p{L}{5,}/u,w=>w.slice(0,3)+'-\nline 2 '+w.slice(3));
  const good=makeDocument(['line 1 The '+divide(entry.name)+' shall act.'],'Current');
  const bad=makeDocument(['line 1 The '+divide(entry.name.toLowerCase())+' shall act.'],'Current');
  assert.equal(californiaEntityReview(good,refs).issues.length,0,entry.name);
  const result=californiaEntityReview(bad,refs).issues.find(i=>i.suggestion===entry.name);assert.ok(result,entry.name);
  assert.equal(bad.text.slice(result.start,result.end),result.text);assert.ok(result.text.includes('-\nline 2 '));
 }
});

test('a divided complete entity across page labels retains the full original range and neighboring count',()=>{
 const doc=makeDocument(['ASSEMBLY BILL No. 2\nThe people do enact as follows:\nline 1 The depa-\n97','AB 2 — 2 —\nline 1 rtment of consumer affairs shall appoint 3 workers.'],'Current');
 const result=jointStylisticIssues(doc,refs);assert.deepEqual(result.map(i=>i.suggestion),['Department of Consumer Affairs','three']);
 const entity=result[0];assert.equal(entity.start,doc.text.indexOf('depa-'));assert.equal(entity.end,doc.text.indexOf('affairs')+'affairs'.length);assert.equal(entity.text,doc.text.slice(entity.start,entity.end));assert.equal(result[1].start,doc.text.indexOf('3 workers'));
});

test('multiple entity word divisions preserve apostrophes and official compound hyphens',()=>{
 const examples=[['The low-\nline 2 income oversight board shall act.','Low-Income Oversight Board'],["The alzhei-\nline 2 mer’s disease and related conditions advi-\nline 3 sory committee shall act.","Alzheimer's Disease and Related Conditions Advisory Committee"]];
 for(const [text,preferred] of examples){const doc=makeDocument(['line 1 '+text],'Current'),r=jointStylisticIssues(doc,refs);assert.equal(r.length,1,text);assert.equal(r[0].suggestion,preferred.replaceAll("'",text.includes('’')?'’':"'"));assert.equal(doc.text.slice(r[0].start,r[0].end),r[0].text);}
 assert.equal(check('The low income oversight board shall act.').filter(i=>i.checkId==='california-entities').length,0,'An absent authoritative compound hyphen is a substantive difference, not just case');
});

test('divided literal and extended names do not become authoritative entity corrections',()=>{
 for(const t of ['The term “department of consu-\nline 2 mer affairs” is literal.','The department of consu-\nline 2 mer affairs advi-\nline 3 sory committee shall act.','The department of consu-\nline 2 mer affairs Imaginary Office shall act.']){
  const doc=makeDocument(['line 1 '+t],'Current'),r=californiaEntityReview(doc,refs);assert.equal(r.issues.length,0,t);
 }
 const doc=makeDocument(['line 1 The department of consu-\nline 2 mer affairs shall act.'],'Current');doc.struck=[{start:doc.text.indexOf('department'),end:doc.text.indexOf('affairs')+7}];assert.equal(californiaEntityReview(doc,refs).issues.length,0);
 const heading=makeDocument(['ASSEMBLY BILL No. 2\nDEPARTMENT OF CONSU-\nMER AFFAIRS\nThe people do enact as follows:'],'Current');assert.equal(californiaEntityReview(heading,refs).issues.length,0);
});

test('entity division joining requires a physical line boundary and exact complete token sequence',()=>{
 for(const t of ['The depa-rtment of consumer affairs shall act.','The depa- rtment of consumer affairs shall act.','The depart-\nline 2 ment of consumer affair shall act.','The Alzheimer’s Disease and Related Disorders Advisory Committee shall act.'])assert.equal(californiaEntityReview(makeDocument(['line 1 '+t],'Current'),refs).issues.length,0,t);
 const doc=makeDocument(['line 1 The department of consu-\nline 2 mer affairs shall act.'],'Current'),before=doc.text;californiaEntityReview(doc,refs);assert.equal(doc.text,before,'Review does not rewrite source text');
});

test('complete supplied entity case stays independent of generic compound-word guide conflicts',()=>{
 for(const name of ['State Department of Health Care Services','California Healthcare Workforce Policy Commission']){
  for(const text of [name.toLowerCase(),name.toLowerCase().replace(/\p{L}{5,}/u,w=>w.slice(0,3)+'-\nline 2 '+w.slice(3))])assert.deepEqual(check('line 1 The '+text+' shall act.').map(i=>[i.suggestion,i.checkId]),[[name,'california-entities']]);
  assert.equal(check('The '+name+' shall act.').length,0);
 }
 for(const t of ['The board provides healthcare benefits.','The board provides health care benefits.'])assert.equal(check(t).length,0,'Generic guide disagreements remain excluded');
});
