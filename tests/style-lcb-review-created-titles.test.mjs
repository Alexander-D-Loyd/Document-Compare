import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {lcbCreatedOfficialTitleReviewIssues,lcbCreatedOfficialTitleProtectionRanges,lcbCreatedOfficialTitleRecords} from '../app/style-lcb-review-created-titles.mjs';
const refs={lcb:JSON.parse(fs.readFileSync(new URL('../app/data/lcb-reference.json',import.meta.url)))},doc=text=>makeDocument([text],'Current'),check=text=>lcbCreatedOfficialTitleReviewIssues(doc(text),refs);
test('unknown formally created fund/account titles gain a bounded checking method',()=>{
 for(const [text,title]of [['The community transportation accountability fund is hereby created in the State Treasury.','community transportation accountability fund'],['The regional safety reserve account is established within the General Fund.','regional safety reserve account'],['The AIDS Drug Assistance Program rebate fund is hereby created as a special fund in the State Treasury.','AIDS Drug Assistance Program rebate fund']]){
  const d=doc(text),saved=JSON.stringify(d),found=lcbCreatedOfficialTitleReviewIssues(d,refs);assert.equal(found.length,1,text);assert.equal(found[0].text,title);assert.equal(found[0].suggestion,null);assert.equal(found[0].reviewSuggested,true);assert.equal(found[0].references[0].guidePage,17);assert.equal(d.text.slice(found[0].start,found[0].end),title);assert.equal(JSON.stringify(d),saved);
 }
});
test('authentic correctly capitalized AB116 creation titles do not add reader work',()=>{
 for(const title of ['Skilled Nursing Facility Minimum Staffing Penalty Account','Pharmacy Benefit Manager Administrative Fines and Penalties Fund','AIDS Drug Assistance Program Rebate Fund','Medi-Cal Anti-Fraud Special Deposit Fund','Nondesignated Public Hospital Supplemental Fund'])assert.equal(check('The '+title+' is hereby created in the State Treasury.').length,0,title);
});
test('mere fund descriptions possibilities continuation and known conflicting forms stay protected',()=>{
 for(const text of ['A community transportation fund may be established by each county.','The community transportation fund is continued in the State Treasury.','The special revenue fund is hereby created in the State Treasury.','The regional safety reserve account is maintained within the General Fund.','The community transportation fund is hereby created by each county.','The highway trust fund is hereby created in the State Treasury.','The civil service retirement fund is hereby created in the State Treasury.'])assert.equal(check(text).length,0,text);
});
test('an explicit local naming clause retains the complete unquoted title',()=>{
 const found=check('A fund is hereby created in the State Treasury and shall be known as the regional environmental accountability fund.');assert.equal(found.length,1);assert.equal(found[0].text,'regional environmental accountability fund');
 assert.equal(check('A fund may be established and named the regional environmental accountability fund.').length,0);
});
test('all source naming and creation evidence remains required',()=>{
 const text='The community transportation accountability fund is hereby created in the State Treasury.';
 for(const fragment of ['community','fund','is','created','in','State Treasury'])for(const field of ['struck','excluded']){const d=doc(text),start=d.text.indexOf(fragment);d[field].push({start,end:start+fragment.length});assert.equal(lcbCreatedOfficialTitleReviewIssues(d,refs).length,0,field+' '+fragment);}
 for(const wrapper of ['“'+text+'”','"'+text+'"','‘'+text+'’',"'"+text+"'"])assert.equal(check(wrapper).length,0,wrapper);
 assert.equal(check(text+'................20').length,0);
});
test('known interior page heads restore full titles and complete establishing evidence',()=>{
 const d=makeDocument(['The community transportation','AB 192 — 2 —\nline 1 accountability fund is hereby created in the State Treasury.'],'Current'),head=d.blocks.find(b=>b.text==='AB 192 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};
 const found=lcbCreatedOfficialTitleReviewIssues(d,refs);assert.equal(found.length,1);assert.equal(d.text.slice(found[0].start,found[0].end),found[0].text);assert.ok(found[0].text.includes('accountability fund'));
 head.runningHead=false;head.layoutLabel=false;head.formatting={};assert.equal(lcbCreatedOfficialTitleReviewIssues(d,refs).length,0);
});
test('a later separate fund creation cannot supply an official-title witness to an earlier clause',()=>{
 const text='The community transportation accountability fund shall receive grants after a special fund is established in the State Treasury.';assert.equal(check(text).length,0);
 assert.equal(check('The department declares that the regional environmental accountability fund is hereby created in the State Treasury.')[0].text,'regional environmental accountability fund');
});
test('source-created title protection avoids generic prefix alteration independently of review visibility',()=>{
 const text='The Medi-Cal anti-fraud special deposit fund is hereby created in the State Treasury.',d=doc(text),prefix={start:text.indexOf('anti-fraud'),end:text.indexOf('anti-fraud')+10,checkId:'lcb-prefixes',suggestion:'antifraud'};
 const ranges=lcbCreatedOfficialTitleProtectionRanges(d,refs);assert.equal(ranges.length,1);assert.equal(d.text.slice(ranges[0].start,ranges[0].end),'Medi-Cal anti-fraud special deposit fund');assert.deepEqual(ranges[0].supersedesCheckIds,['lcb-prefixes']);
 assert.equal(lcbCreatedOfficialTitleReviewIssues(d,refs,{existingIssues:[prefix]}).length,1);
 assert.equal(lcbCreatedOfficialTitleProtectionRanges(doc('The highway trust fund is hereby created in the State Treasury.'),refs).length,0);
});
test('selected reporting predicates do not become part of a source-created title',()=>{
 for(const verb of ['notes','confirms','acknowledges','specifies']){
  const d=doc('The department '+verb+' the Community Transportation Accountability Fund is hereby created in the State Treasury.'),records=lcbCreatedOfficialTitleRecords(d,refs);
  assert.equal(records.length,1,verb);assert.equal(records[0].name,'Community Transportation Accountability Fund');assert.equal(records[0].text,records[0].name);assert.equal(d.text.slice(records[0].evidenceStart,records[0].evidenceEnd),records[0].declarationText);assert.equal(lcbCreatedOfficialTitleReviewIssues(d,refs).length,0,verb);
 }
 const d=doc('The State Transportation Accountability Fund is hereby created in the State Treasury.');assert.equal(lcbCreatedOfficialTitleRecords(d,refs)[0].name,'State Transportation Accountability Fund');
});
test('an intact creation preserves grammatical hyphens across actual line breaks',()=>{
 const text='The Medi-Cal Anti-\nFraud Special Deposit Fund is hereby created in the State Treasury.',d=doc(text),saved=JSON.stringify(d),records=lcbCreatedOfficialTitleRecords(d,refs);assert.equal(records.length,1);assert.equal(records[0].name,'Medi-Cal Anti-Fraud Special Deposit Fund');assert.equal(records[0].text,'Medi-Cal Anti-\nFraud Special Deposit Fund');assert.ok(records[0].evidenceText.includes('Anti-Fraud'));assert.equal(d.text.slice(records[0].evidenceStart,records[0].evidenceEnd),records[0].declarationText);assert.equal(lcbCreatedOfficialTitleReviewIssues(d,refs).length,0);assert.equal(JSON.stringify(d),saved);
 const lower=doc(text.replace('Fraud','fraud'));assert.equal(lcbCreatedOfficialTitleReviewIssues(lower,refs).length,0);
 assert.equal(lcbCreatedOfficialTitleRecords(doc(text.replace('Anti-\nFraud','Anti- Fraud')),refs).length,0);
 for(const part of ['-','\n','Fraud'])for(const field of ['struck','excluded']){const damaged=doc(text),start=text.indexOf(part);damaged[field].push({start,end:start+part.length});assert.equal(lcbCreatedOfficialTitleRecords(damaged,refs).length,0,field+' '+part);}
});
