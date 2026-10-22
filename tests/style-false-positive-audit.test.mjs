import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {reviewStyleIssues} from '../app/style-review.mjs';
import {labelledNumericalRoleRanges} from '../app/style-lcb-labelled-numerical-roles.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const review=doc=>reviewStyleIssues(typeof doc==='string'?makeDocument([doc],'Current'):doc,refs,{includeReviewSuggestions:true,includeCompleteLcbReview:true});

test('original bill noun phrases do not inherit conditional modifier or title requirements',()=>{
 for(const text of ['This bill would include a change in state statute.','The negotiator may be a member of the state body.','The state body or any member agency shall act.','The employer acts directly or through a third party.','The proposal shall be cost effective.','A clinic is maintained as an outpatient department of a hospital.','The director of the office and staff shall report.','The school district, county office of education, or charter school shall report.','The governing board of a school district shall report.','The Attorney General shall bring a civil action.','The Insurance Commissioner shall review the agreement.'])assert.deepEqual(review(text),[],text);
});

test('source-labelled dialing codes retain their exact identity across later references',()=>{
 const text='The PUC has established procedures for implementing 2-1-1 dialing in California. The 2-1-1 lead entity shall support 2-1-1 providers and integrate 2-1-1 into emergency planning. The agency shall act under Public Utilities Commission Decision 11-09-016. The agency retains 2 records.';
 const doc=makeDocument([text],'Current'),before=JSON.stringify(doc),issues=review(doc);
 assert.ok(!issues.some(i=>i.checkId==='lcb-numerical-uncertainty-review'));
 assert.ok(issues.some(i=>i.text==='2'&&i.suggestion==='two'));
 assert.equal(JSON.stringify(doc),before);
 for(const token of ['2-1-1','11-09-016'])for(const m of text.matchAll(new RegExp(token,'g')))assert.ok(!issues.some(i=>i.start<m.index+token.length&&i.end>m.index),token);
});

test('dialing identity cannot be manufactured by removing any part of its label or token',()=>{
 const text='The telephone number 2-1-1 is available. The 2-1-1 lead entity shall report.',doc=makeDocument([text],'Current'),labelStart=text.indexOf('telephone'),labelEnd=text.indexOf(' is available');
 for(const field of ['struck','excluded'])for(let at=labelStart;at<labelEnd;at++){
  const changed=structuredClone(doc);changed[field].push({start:at,end:at+1});
  assert.equal(labelledNumericalRoleRanges(changed).filter(r=>r.role==='phone').length,0,field+' '+at);
 }
 for(const text of ['The model 2-1-1 widgets apply.','The telephone number 2-1-1XYZ is available. The 2-1-1 lead entity shall report.','The telephone number 2-1-1 is available. The model 2-1-1-7 applies.']){
  const changed=makeDocument([text],'Current'),ranges=labelledNumericalRoleRanges(changed);
  if(text.includes('2-1-1-7'))assert.ok(!ranges.some(r=>r.start===text.indexOf('2-1-1-7')));else assert.equal(ranges.length,0,text);
 }
 for(const [term,cut]of [['2-1-1XYZ','XYZ'],['X2-1-1','X'],['2-1-1-7','-7']]){
  const text='The telephone number 2-1-1 is available. The model '+term+' applies.',doc=makeDocument([text],'Current'),termStart=text.indexOf(term),at=text.indexOf(cut,termStart);
  for(const field of ['struck','excluded']){const changed=structuredClone(doc);changed[field].push({start:at,end:at+cut.length});assert.ok(!labelledNumericalRoleRanges(changed).some(r=>r.start>=termStart&&r.end<=termStart+term.length),field+' '+term);}
 }
});

test('acronym annotations retain unconditional complete listed-form comparisons',()=>{
 for(const term of ['acquired-immunodeficiency syndrome','autism-spectrum disorder','human-immunodeficiency virus','California-Redemption Value']){
  const text='The program considers '+term+' carefully.',found=review(text);assert.ok(found.some(i=>i.checkId==='lcb-source-form-review'&&i.text===term),term);
 }
});

test('serial structural labels and complete duration modifiers do not become ordinary mixed counts',()=>{
 for(const text of ['Subarticle 7 of Title 17 governs credits for at least 10 years.','The covered ADS affects more than 6,000 people in a given three-year period.','The covered ADS affects more than 6,000 people in a given three-year period, if the deployer complies with Section 22756.1.'])assert.ok(!review(text).some(i=>i.checkId==='lcb-sentence-number-review'),text);
 const related=review('The program employs 12 zoologists and contracts with 3 ornithologists.');assert.ok(related.some(i=>i.checkId==='lcb-sentence-number-review'));
 for(const text of ['The program covers three-year and 12-year periods.','The program covers three-year periods and twelve-year periods.','The program covers 3-year and 12-year periods.','The program covers a three-year period and 12 years.','The program covers three years and 12-year periods.','The office provides a three-year term and 12.','The office provides a three-year term and 12 floozles.'])assert.ok(review(text).some(i=>i.checkId==='lcb-sentence-number-review'||i.text==='three'&&i.suggestion==='3'),text);
 for(const text of ['The program covers three years and 12 months.','The office retains two projects for 12 years.'])assert.ok(!review(text).some(i=>i.checkId==='lcb-sentence-number-review'),text);
 const text='The office provides a three-year term and a 12-year term.',doc=makeDocument([text],'Current'),at=text.indexOf('-year');
 for(const field of ['struck','excluded']){const changed=structuredClone(doc);changed[field].push({start:at,end:at+5});assert.ok(!review(changed).some(i=>i.checkId==='lcb-sentence-number-review'),'Source damage cannot establish comparison evidence.');}
});

test('source-labelled Item lists can wrap into numeric-only budget continuation lines',()=>{
 const text='The Budget Act of 2025 applies.\nline 1 The funds may be transferred to Item 2660-101-0042, 2660-102-0890,\nline 2 2660-108-0042, 2660-301-0042, or 2660-308-0042.',doc=makeDocument([text],'Current');
 assert.ok(!review(doc).some(i=>i.checkId==='lcb-numerical-uncertainty-review'));
 const table=structuredClone(doc);for(const block of table.blocks)block.formatting={headerGaps:[{},{}]};assert.equal(labelledNumericalRoleRanges(table).length,0);
});

test('interrupted clauses do not reappear through a narrower generic series owner',()=>{
 for(const text of ['The department receives information on expenditure of funds, as required by the Judicial Council, for evaluation of the programs and practices.','The allocation includes a financial literacy initiative, associated with the California Kids Investment and Development Savings Program.'])assert.ok(!review(text).some(i=>/series.*review|review.*series/u.test(i.checkId||'')),text);
});

test('noise reduction preserves finite listed mismatches and supplied-name comparisons',()=>{
 for(const [text,wanted] of [['The load serving entities shall report.','load-serving'],['The state mandated program applies.','state-mandated'],['The board provides other in kind or cash assistance.','in-kind'],['The cancelled catalogue is filed.','canceled'],['The department of consumer affairs shall act.','Department of Consumer Affairs'],['The civil code applies.','Civil Code'],['Los Angeles County shall report.','County of Los Angeles']]){
  const doc=makeDocument([text],'Current'),issues=review(doc);assert.ok(issues.some(i=>i.suggestion===wanted),text);
  for(const issue of issues)assert.equal(doc.text.slice(issue.start,issue.end),issue.text);
 }
});
