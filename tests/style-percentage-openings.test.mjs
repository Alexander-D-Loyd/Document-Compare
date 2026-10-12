import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>jointStylisticIssues(makeDocument([text],'Current'),refs);

test('complete percentage openings preserve written forms and expand the entire integer expression',()=>{
 for(const [bad,good,term,suggestion]of [['50 percent shall be available.','Fifty percent shall be available.','50 percent','Fifty percent'],['60% is allocated.','Sixty percent is allocated.','60%','Sixty percent'],['The program applies. 20 percent remains available.','The program applies. Twenty percent remains available.','20 percent','Twenty percent']]){
  const found=check(bad);assert.deepEqual(found.map(i=>[i.text,i.suggestion]),[[term,suggestion]]);assert.equal(found[0].checkId,'opening-percentages');assert.ok(found[0].references.some(r=>r.rule==='12.16'&&r.guidePage===294));assert.equal(check(good).length,0);
 }
});

test('source-derived complete labelled percentage clauses differ from allocation fragments after a colon',()=>{
 for(const text of ['The committee has the following composition:\n(A) Fifty percent of the committee consists of representatives.','Of the remaining funds after allocations:\n(i) Sixty percent shall be available as enrollment grants.'])assert.equal(check(text).length,0,text);
 assert.deepEqual(check('The committee has the following composition:\n(A) 50 percent of the committee consists of representatives.').map(i=>[i.text,i.suggestion]),[['50 percent','Fifty percent']]);
 for(const text of ['Penalties shall be distributed as follows:\n(1) Fifty percent to the employees.','The transfer shall not exceed during the fiscal year:\n(1) Twenty percent of the amount scheduled on that line.'])assert.deepEqual(check(text).map(i=>[i.text,i.suggestion]),[[text.includes('Fifty')?'Fifty':'Twenty',text.includes('Fifty')?'50':'20']],text);
});

test('source-derived allocation fragments retain percentage figures across item-ending periods',()=>{
 const text='Penalties shall be distributed as follows:\n(1) Fifty percent to the employee or employees in whose favor the judgment was rendered.\n(2) Fifty percent to the Division of Labor Standards Enforcement for enforcement of labor laws.';
 assert.deepEqual(check(text).map(i=>[i.text,i.suggestion]),[['Fifty','50'],['Fifty','50']]);assert.equal(check(text.replaceAll('Fifty','50')).length,0);
 assert.equal(check('The committee has the following composition:\n(A) Fifty percent of the committee consists of representatives.').length,0);
 const doc=makeDocument([text],'Current'),start=doc.text.indexOf('Division');doc.struck=[{start,end:start+'Division'.length}];assert.equal(jointStylisticIssues(doc,refs).filter(i=>i.text==='Fifty').length,1,'Removed recipient cannot establish the second allocation fragment');
});

test('an inline colon or ambiguous unlabelled wrap does not establish a sentence opening',()=>{
 for(const text of ['The allocation is as follows: Fifty percent shall be available.','The allocation is as follows:\nFifty percent shall be available.','The allocation is as follows:\n(1) Fifty percent of the unknown resource moves elsewhere.'])assert.ok(check(text).some(i=>i.text==='Fifty'&&i.suggestion==='50'),text);
 assert.equal(check('The rate is 50 percent. The rate is 50%.').filter(i=>i.checkId==='opening-percentages').length,0);
 assert.equal(check('The transfer shall not exceed:\n(a) 30 percent of the amount appropriated, for appropriations that are $4,000,000 or less.\n(b) 20 percent of the amount appropriated, for appropriations that are more than $4,000,000.').some(i=>i.checkId==='opening-percentages'),false,'Source AB109 allocation clauses remain fragments even after an item-ending period');
});

test('figures inside decimals, ranges, signed amounts, quotations and source strikes are not partial openings',()=>{
 for(const text of ['0.5 percent is allocated.','-5 percent is allocated.','5 to 7 percent is allocated.','“50 percent shall be available.”','The phrase "50 percent\nshall be available" is literal.'])assert.equal(check(text).some(i=>i.checkId==='opening-percentages'),false,text);
 const doc=makeDocument(['The committee has the following composition:\n(A) Fifty percent of the committee consists of representatives.'],'Current');doc.struck=[{start:doc.text.indexOf('consists'),end:doc.text.indexOf('consists')+8}];assert.equal(jointStylisticIssues(doc,refs).some(i=>i.checkId==='opening-percentages'),false);
});

test('a percentage spanning a real page break selects both body fragments without trusting unknown heads',()=>{
 const doc=makeDocument(['The allocation applies.\nline 1 60','AB 1 — 2 —\nline 1 percent shall be available.'],'Current'),head=doc.blocks.find(b=>b.ignored);head.formatting={headerParts:[{text:head.text}]};
 const found=jointStylisticIssues(doc,refs).filter(i=>i.checkId==='opening-percentages');assert.equal(found.length,1);assert.equal(found[0].start,doc.text.indexOf('60'));assert.equal(found[0].end,doc.text.indexOf('percent')+7);assert.equal(found[0].suggestion,'Sixty percent');head.formatting={};assert.equal(jointStylisticIssues(doc,refs).some(i=>i.checkId==='opening-percentages'),false);
});

test('digest openings agree with sentence spelling while technical fragments and guide conflicts remain independent',()=>{
 assert.equal(check('LEGISLATIVE COUNSEL’S DIGEST\nSixty percent shall be available.').length,0);
 assert.deepEqual(check('LEGISLATIVE COUNSEL’S DIGEST\n60% shall be available.').map(i=>i.suggestion),['Sixty percent']);
 assert.equal(check('LEGISLATIVE COUNSEL’S DIGEST\nThe allocation is sixty percent.').filter(i=>i.checkId==='opening-percentages').length,0);
});
