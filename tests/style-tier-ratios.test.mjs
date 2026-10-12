import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {numeralIssues} from '../app/style-numerals.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const changes=text=>numeralIssues(makeDocument([text],'Current'),refs).filter(i=>!i.matchesPrimary).map(i=>[i.text,i.suggestion]);

test('SB 79 numbered Tier classifications are labels while nearby quantities are checked',()=>{
 assert.deepEqual(changes('The Tier 1 transit-oriented development stop serves Tier 2 and Tier 3 stops. The office takes 4 samples.'),[['4','four']]);
 assert.deepEqual(changes('The office uses 3 tiers.'),[['3','three']]);
 assert.deepEqual(changes('The Tier 1 stop serves 3 projects.'),[['3','three']]);
 assert.deepEqual(changes('A Level 1 manufacturer processes 4 samples.'),[['4','four']]);
 assert.deepEqual(changes('There are 3 levels.'),[['3','three']]);
});

test('explicit ratio bounds and increments use figures under LCB general item 2',()=>{
 for(const bridge of ['of up to','of at least','of at most','of not less than','of not more than','by','is','was','to']){
  assert.deepEqual(changes(`The floor area ratio ${bridge} 3 applies.`),[],bridge);
  assert.deepEqual(changes(`The floor area ratio ${bridge} three applies.`),[['three','3']],bridge);
 }
 assert.deepEqual(changes('The office has 3 ratio tests.'),[['3','three']]);
});

test('ratio context survives printed line wrapping without suppressing unrelated counts',()=>{
 const doc=makeDocument(['line 1 The Tier\nline 2 2 stop has a floor area ratio of up\nline 3 to 3. The office takes 4 samples.'],'Current');
 const issues=numeralIssues(doc,refs).filter(i=>!i.matchesPrimary);
 assert.deepEqual(issues.map(i=>[doc.text.slice(i.start,i.end),i.suggestion]),[['4','four']]);
 const words=makeDocument(['line 1 The floor area ratio of up\nline 2 to three applies.'],'Current');
 const issue=numeralIssues(words,refs).find(i=>!i.matchesPrimary);
 assert.equal(words.text.slice(issue.start,issue.end),'three');
 words.struck=[{start:issue.start,end:issue.end}];
 assert.equal(numeralIssues(words,refs).filter(i=>!i.matchesPrimary).length,0);
});
