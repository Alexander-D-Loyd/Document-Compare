import test from 'node:test';import assert from 'node:assert/strict';
import {makeDocument} from '../app/core.mjs';
import {verifyAmendments,nonAmendmentEdits} from '../app/amendments.mjs';
const old=()=>makeDocument(['line 1 SECTION 1. Existing law.\nline 2 This act takes effect immediately.\n- 0 -'],'Previous');
const current=(text='SEC. 2. New law.',afterZero=false)=>makeDocument(['line 1 SECTION 1. Existing law.\nline 2 This act takes effect immediately.\n'+(afterZero?'- 0 -\n':'')+'line 3 '+text+(afterZero?'':'\n- 0 -')],'Current');
const instruction=directive=>'Amendment 1\n'+directive+'\nSEC. 2. New law.';
for(const directive of ['On page 1, in line 2, after the period, insert:','On page 1, in line 2, after the last period, insert:','On page 1, in line 2, after the period at the end of the line, insert:','After the period at the end of the bill, insert:','After the last sentence of the bill, insert:','On page 1, in line 2, after “.”, insert:','On page 1, in line 2, after “immediately.”, insert:'])test('final sentence insertion verifies and rejects misplaced content: '+directive,()=>{
 const previous=old(),now=current(),before=JSON.stringify([previous,now]),text=instruction(directive),result=verifyAmendments(text,previous,now)[0];
 assert.equal(result.status,'implemented',result.message);assert.equal(result.evidence[0].previousOffset,previous.text.indexOf('immediately.')+'immediately.'.length);
 assert.deepEqual(nonAmendmentEdits(text,previous,now,[result]).ranges,[[],[]]);
 assert.equal(verifyAmendments(text,previous,previous)[0].status,'not-implemented');
 assert.equal(verifyAmendments(text,previous,current('SEC. 2. Wrong law.'))[0].status,'incorrect');
 assert.equal(verifyAmendments(text,previous,current('SEC. 2. New law.',true))[0].status,'incorrect','Text after zero cannot verify');
 assert.equal(JSON.stringify([previous,now]),before);
});
test('a period anchor with multiple occurrences requires an explicit occurrence or end location',()=>{
 const previous=makeDocument(['line 1 SEC. 1. Existing law.\n- 0 -'],'Previous');
 assert.equal(verifyAmendments(instruction('On page 1, in line 1, after the period, insert:'),previous,previous)[0].status,'needs-review');
 assert.equal(verifyAmendments(instruction('On page 1, in line 1, after the last period, insert:'),previous,makeDocument(['line 1 SEC. 1. Existing law.\nline 2 SEC. 2. New law.\n- 0 -'],'Current'))[0].status,'implemented');
 assert.equal(verifyAmendments(instruction('On page 1, in line 1, after the first period and after the last period, insert:'),previous,previous)[0].status,'needs-review');
});
test('nonfinal punctuation stays scoped and decimal points are not sentence periods',()=>{
 const previous=makeDocument(['line 1 The rate is 1.5 percent.\nline 2 Later law applies.\n- 0 -'],'Previous'),now=makeDocument(['line 1 The rate is 1.5 percent.\nline 2 SEC. 2. New law.\nline 3 Later law applies.\n- 0 -'],'Current');
 assert.equal(verifyAmendments(instruction('On page 1, in line 1, after the period, insert:'),previous,now)[0].status,'implemented');
 assert.equal(verifyAmendments(instruction('On page 1, in line 1, after the period at the end of the bill, insert:'),previous,now)[0].status,'needs-review');
});
