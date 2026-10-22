import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {numeralIssues} from '../app/style-numerals.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
import {reviewStyleIssues} from '../app/style-review.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const changes=text=>numeralIssues(makeDocument([text],'Current'),refs).filter(i=>!i.matchesPrimary).map(i=>[i.text,i.suggestion]);

test('AB 1148 chemical registry identifiers retain their complete numeric form',()=>{
 const text='Subparagraph (A) does not apply to tetramethyl bisphenol F (TMBPF, CAS 5384-21-4). The department may limit CAS 5384-21-4 in food packaging.';
 assert.deepEqual(changes(text),[]);
 assert.deepEqual(jointStylisticIssues(makeDocument([text],'Current'),refs).filter(i=>i.checkId==='numerals'),[]);
});

test('explicit CAS labels and wrapped identifiers protect only the identifier',()=>{
 for(const label of ['CAS','CAS RN','CAS Registry Number','CAS Registry No.','CAS Number','CAS No.']){
  assert.deepEqual(changes(`The product is identified by ${label}: 50-00-0. The office takes 4 samples.`),[['4','four']],label);
 }
 const doc=makeDocument(['line 1 The substance is CAS\nline 2 5384-21-\nline 3 4. The office takes 3 samples.'],'Current');
 const found=numeralIssues(doc,refs).filter(i=>!i.matchesPrimary);
 assert.deepEqual(found.map(i=>[i.text,i.suggestion]),[['3','three']]);
 assert.equal(doc.text.slice(found[0].start,found[0].end),'3');
});

test('ordinary quantities and unlabelled expressions are not globally exempted',()=>{
 assert.deepEqual(changes('The office takes 4 samples and 3 containers.'),[['4','four'],['3','three']]);
 assert.deepEqual(changes('The product is CAS 5384-21-4 for 4 samples.'),[['4','four']]);
 for(const text of ['The sequence is 5384-21-4. The office takes 3 samples.','The case is 5384-21-4. The office takes 3 samples.']){assert.deepEqual(changes(text),[['3','three']]);const whole=reviewStyleIssues(makeDocument([text],'Current'),refs,{includeReviewSuggestions:true,includeCompleteLcbReview:true}).find(i=>i.checkId==='lcb-numerical-uncertainty-review'&&i.text==='5384-21-4');assert.ok(whole,'An unlabelled multipart figure needs complete-role review without an inferred CAS identity');assert.equal(whole.suggestion,null);}
});
