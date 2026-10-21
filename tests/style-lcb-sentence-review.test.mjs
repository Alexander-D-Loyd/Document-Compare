import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {reviewStyleIssues} from '../app/style-review.mjs';
import {lcbSentenceReview} from '../app/style-lcb-sentence-review.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>reviewStyleIssues(makeDocument([text],'Current'),refs,{includeReviewSuggestions:true,includeCompleteLcbReview:true});
test('unfamiliar multiword series has a complete source question without a guessed comma',()=>{
 const text='The bill covers alpha mechanisms, beta pathways and gamma receptors.',issues=check(text),question=issues.find(i=>i.checkId==='lcb-sentence-series-review');
 assert.ok(question);assert.equal(question.text,text);assert.equal(question.suggestion,null);assert.match(question.message,/may be correct/);assert.equal(question.guidePage,6);
 assert.equal(check('The bill covers alpha mechanisms, beta pathways, and gamma receptors.').some(i=>i.checkId==='lcb-sentence-series-review'),false);
});
test('different heads and intervening clauses no longer silently bypass Bill item 3',()=>{
 const text='The program employs twelve zoologists and contracts with three ornithologists.',issues=check(text),question=issues.find(i=>i.checkId==='lcb-sentence-number-review');
 assert.ok(question);assert.equal(question.text,text);assert.equal(question.suggestion,null);assert.match(question.message,/different numerical expressions/);
 assert.ok(issues.some(i=>i.text==='twelve'&&i.suggestion==='12'),'The independent large-count form remains checked.');
});
test('a base small-figure correction becomes conditional when numerical relationship is unresolved',()=>{
 const text='The program employs 12 zoologists and contracts with 3 ornithologists.',issues=check(text),question=issues.find(i=>i.checkId==='lcb-sentence-number-review');
 assert.ok(question);assert.ok(!issues.some(i=>i.text==='3'&&i.suggestion==='three'));assert.deepEqual(question.conditionalNumeralComparisons.map(i=>[i.text,i.suggestion]),[['3','three']]);
});
test('identifiers, money pairs, single quantities and wholly smaller quantities do not invent a threshold',()=>{
 for(const text of ['Section 12 requires three aardvarks.','Part 3 of Division 9 governs the 21-year-old applicant.','(3) The petition must be filed within 15 judicial days.','Paragraph (1) of subdivision (c) requires action within 60 calendar days.','The department shall act until January 1, 2028.','The appropriation is twelve dollars ($12).','The shelter holds three aardvarks.','The program employs two zoologists and three ornithologists.'])assert.equal(check(text).some(i=>i.checkId==='lcb-sentence-number-review'),false,text);
});
test('a complete protected sentence cannot become positive punctuation or numerical evidence',()=>{
 for(const text of ['The bill covers alpha mechanisms, beta pathways and gamma receptors.','The program employs 12 zoologists and contracts with three ornithologists.']){
  const original=makeDocument([text],'Current');assert.ok(lcbSentenceReview(original,refs).issues.length);
  for(let at=0;at<text.length;at++)for(const field of ['struck','excluded']){
   const doc=structuredClone(original);doc[field]=[...(doc[field]||[]),{start:at,end:at+1}];assert.deepEqual(lcbSentenceReview(doc,refs).issues,[],field+' '+at);
  }
 }
 assert.deepEqual(lcbSentenceReview(makeDocument(['The text “12 zoologists and three ornithologists” is literal.'],'Current'),refs).issues,[]);
});
test('questions about sentence structure do not suppress independent meanings or modifiers',()=>{
 const issues=check('The bill covers alpha mechanisms, beta pathways and in kind thermotherapy.');
 assert.ok(issues.some(i=>i.checkId==='lcb-sentence-series-review'));assert.ok(issues.some(i=>i.checkId==='lcb-source-form-review'&&i.matchText==='in kind'));
});
