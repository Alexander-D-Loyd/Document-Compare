import test from 'node:test';import assert from 'node:assert/strict';
import {makeDocument} from '../app/core.mjs';import {documentComparisonTokens} from '../app/document-comparison.mjs';import {sequenceDiff} from '../app/sequence-diff.mjs';
import {verifyAmendments,nonAmendmentEdits} from '../app/amendments.mjs';
const values=d=>documentComparisonTokens(d).map(t=>t.value),edits=(a,b)=>sequenceDiff(values(a),values(b)).filter(c=>c.added||c.removed);
const struck=(text,word,name='Current')=>{const at=text.indexOf(word);assert.ok(at>=0);return makeDocument([text],name,[[{start:at,end:at+word.length}]]);};

test('identical source strikeouts cannot become newly added Current wording',()=>{
 const text='line 1 A previous old provision applies.\nline 2 A new provision remains.',a=struck(text,'old','Previous'),b=struck(text,'old');
 assert.deepEqual(edits(a,b),[]);assert.equal(a.text,text);assert.equal(b.text,text);assert.deepEqual(a.struck,b.struck);assert.ok(b.tokens.some(t=>t.value==='old'));
});

test('a newly struck Current word is a real removal from previously active text',()=>{
 const text='line 1 The old provision applies.',a=makeDocument([text],'Previous'),b=struck(text,'old');
 assert.deepEqual(edits(a,b).map(c=>({value:c.value,added:!!c.added,removed:!!c.removed})),[{value:['old'],added:false,removed:true}]);
 assert.equal(b.text,text);assert.equal(b.text.slice(b.struck[0].start,b.struck[0].end),'old');
});

test('a current replacement compares active added wording and the original removal separately',()=>{
 const a=makeDocument(['line 1 The old provision applies.'],'Previous'),b=struck('line 1 The old new provision applies.','old');
 const change=edits(a,b);assert.equal(change.filter(c=>c.removed).flatMap(c=>c.value).join(' '),'old');assert.equal(change.filter(c=>c.added).flatMap(c=>c.value).join(' '),'new');
});

test('deletion instructions retain the Current printed strike range without a non-amendment change',()=>{
 const text='line 1 The old provision applies.',a=makeDocument([text],'Previous'),b=struck(text,'old'),instruction='On page 1, in line 1, strike out "old".';
 const results=verifyAmendments(instruction,a,b);assert.equal(results[0].status,'implemented');assert.ok(results[0].evidence[0].currentDeletionRanges.length);assert.deepEqual(nonAmendmentEdits(instruction,a,b,results).ranges,[[],[]]);
});

test('genuine amendment amount discrepancies remain visible under active comparison',()=>{
 const a=makeDocument(['line 1 Old law.'],'Previous'),b=struck('This act is the Budget Act of 2026.\nline 1 For support.... 196,942,000\nline 2 206,258,000','196,942,000'),instruction='On page 1, in line 1, strike out "Old law." and insert:\nThis act is the Budget Act of 2026.\nFor support.... 196,942,000';
 const result=verifyAmendments(instruction,a,b)[0];assert.equal(result.status,'incorrect');assert.ok(result.evidence[0].discrepancies.some(d=>d.actualText.replaceAll(' ','')==='206,258,000'));
});

test('active token offsets still point to the original divided-page text',()=>{
 const pages=['line 1 Delete this.','line 1 Keep that.'],a=makeDocument(pages,'Current',[[{start:7,end:13}],[]]);
 for(const t of documentComparisonTokens(a))assert.equal(a.text.slice(t.start,t.end),t.value);assert.ok(documentComparisonTokens(a).some(t=>a.blocks.find(b=>b.start<=t.start&&b.end>=t.end)?.page===2));
 assert.ok(!documentComparisonTokens(a).some(t=>t.value==='Delete'));assert.ok(a.tokens.some(t=>t.value==='Delete'));
});
