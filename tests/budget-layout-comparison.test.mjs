import test from 'node:test';import assert from 'node:assert/strict';
import {makeDocument,substantiveTokens} from '../app/core.mjs';
import {budgetLeaderRanges} from '../app/budget-layout.mjs';
import {verifyAmendments,nonAmendmentEdits} from '../app/amendments.mjs';
import {styleContext} from '../app/style-context.mjs';
const heading='This act is the Budget Act of 2026.';
test('budget dot leaders stay displayed but do not become wording differences',()=>{
 const old=makeDocument([heading+'\nline 1 Senate.............. 196,942,000'],'Previous'),now=makeDocument([heading+'\nline 1 Senate.... 196,942,000'],'Current');
 assert.deepEqual(old.effectiveTokens.map(t=>t.value),now.effectiveTokens.map(t=>t.value));
 assert.ok(now.text.includes('Senate....'));assert.equal(now.excluded.length,1);assert.equal(now.comparisonExcluded.length,2);
 const context=styleContext(now);assert.ok(context.tableAt(now.text.indexOf('Senate')));assert.ok(context.source.includes('Senate....'));
 const diff=nonAmendmentEdits('',old,now,[]);assert.deepEqual(diff.ranges,[[],[]]);
});
test('budget replacement retains actual amounts while excluding leaders from both amendment and document',()=>{
 const old=makeDocument([heading+'\nline 1 Old law.'],'Previous'),now=makeDocument([heading+'\nline 1 For support of Senate.... 206,258,000\nline 2 Salaries........ (7,361,000)'],'Current');
 const instruction='On page 1, in line 1, strike out "Old law." and insert:\nFor support of Senate........................ 196,942,000\nSalaries................ (7,045,000)';
 const r=verifyAmendments(instruction,old,now)[0];assert.equal(r.status,'incorrect');assert.equal(r.evidence[0].missingPoints.length,0);
 assert.deepEqual(r.evidence[0].discrepancies.map(d=>[d.expectedText.replaceAll(' ',''),d.actualText.replaceAll(' ','')]),[['196,942,000','206,258,000'],['7,045,000','7,361,000']]);
});
test('budget-only layout matching also works for unchanged and absent amounts',()=>{
 const old=makeDocument([heading+'\nline 1 Old law.'],'Previous'),instruction='On page 1, in line 1, strike out "Old law." and insert:\nFor support of Senate.................... 196,942,000';
 const match=verifyAmendments(instruction,old,makeDocument([heading+'\nline 1 For support of Senate.... 196,942,000'],'Current'))[0];assert.equal(match.status,'implemented');
 const missing=verifyAmendments(instruction,old,makeDocument([heading+'\nline 1 For support of Senate'],'Current'))[0];assert.equal(missing.status,'incorrect');assert.ok(missing.evidence[0].missingPoints.some(p=>p.text.replaceAll(' ','')==='196,942,000'));
});
test('prose ellipses, ordinary periods, and leaders outside a budget retain punctuation',()=>{
 for(const text of ['Senate................ 196,942,000',heading+'\nThe director ... 1',heading+'\nThe director .... shall act.',heading+'\nConsider Section 2.00.']){
  assert.equal(budgetLeaderRanges(text).length,0);
 }
 const text=heading+'\nSupport.... $123\nRefund........ (−1,000)\nFees....... 12.50';
 assert.equal(budgetLeaderRanges(text).length,3);assert.ok(substantiveTokens(text).some(t=>t.value==='123'));
});
test('comparison-only omissions preserve exact PDF character offsets across pages and strikeouts',()=>{
 const pages=[heading+'\nline 1 Senate............. 196,942,000','line 1 Senate.... 206,258,000'],strikeStart=pages[0].indexOf('196');
 const doc=makeDocument(pages,'Current',[[{start:strikeStart,end:pages[0].length}],[]]);
 assert.ok(!doc.effectiveTokens.some(t=>t.value==='196'));assert.ok(doc.tokens.some(t=>t.value==='196'));
 for(const token of doc.tokens)assert.equal(doc.text.slice(token.start,token.end),token.value);
 assert.equal(doc.blocks.at(-1).page,2);assert.ok(doc.text.includes('Senate.............'));
});
test('quoted budget row targets use the same comparison exclusions as the source and payload',()=>{
 const old=makeDocument([heading+'\nline 1 Senate.............. 196,942,000'],'Previous'),now=makeDocument([heading+'\nline 1 Senate.... 206,258,000'],'Current');
 const instruction='On page 1, in line 1, strike out "Senate...... 196,942,000" and insert:\nSenate.............. 206,258,000';
 assert.equal(verifyAmendments(instruction,old,now)[0].status,'implemented');
 const insertion='On page 1, in line 1, after "Senate...... 196,942,000" insert:\nfor support of the Senate';
 const inserted=makeDocument([heading+'\nline 1 Senate.... 196,942,000\nline 2 for support of the Senate'],'Current');
 assert.equal(verifyAmendments(insertion,old,inserted)[0].status,'implemented');
});
