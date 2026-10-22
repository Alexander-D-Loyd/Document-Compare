import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {reviewStyleIssues} from '../app/style-review.mjs';
import {lcbSentenceReview} from '../app/style-lcb-sentence-review.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>reviewStyleIssues(makeDocument([text],'Current'),refs,{includeReviewSuggestions:true,includeCompleteLcbReview:true});
test('production does not infer a series from comma-separated ordinary prose',()=>{
 const text='The bill covers alpha mechanisms, beta pathways and gamma receptors.',issues=check(text),question=issues.find(i=>i.checkId==='lcb-sentence-series-review');
 assert.equal(question,undefined);
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
test('ordinary sentence structure and unsupported modifier roles do not produce questions',()=>{
 const issues=check('The bill covers alpha mechanisms, beta pathways and in kind thermotherapy.');
 assert.ok(!issues.some(i=>i.checkId==='lcb-sentence-series-review'));assert.ok(!issues.some(i=>i.checkId==='lcb-source-form-review'&&i.matchText==='in kind'));
});
test('a comma internal to an intact calendar date is not evidence of a three-member series',()=>{
 for(const text of ['On January 1, 2028 the agency reviews alpha mechanisms and beta pathways.','The agency acts until June 30, 2028 and pays the obligation.'])assert.ok(!check(text).some(i=>i.checkId==='lcb-sentence-series-review'),text);
 for(const text of ['On January 1, 2028 the agency reviews alpha mechanisms, beta pathways and gamma receptors.','On February 30, 2028 the agency reviews alpha mechanisms and beta pathways.'])assert.ok(!check(text).some(i=>i.checkId==='lcb-sentence-series-review'),text);
});

test('intact grouped figures do not supply list commas while real and malformed separators remain reviewable',()=>{
 for(const text of ['The department may transfer $2,000,000 and administer the program.','A total of 300,000,000 records shall be stored or removed.','The total is 12,345.67 and the balance is payable.'])assert.ok(!check(text).some(i=>i.checkId==='lcb-sentence-series-review'),text);
 for(const text of ['The department allocates $2,000,000 for alpha mechanisms, beta pathways and gamma receptors.','The total is 12,34 and the balance is payable.','The total is 1,000,00 and the balance is payable.'])assert.ok(!check(text).some(i=>i.checkId==='lcb-sentence-series-review'),text);
 const text='The department may transfer $2,000,000 and administer the program.',original=makeDocument([text],'Current');
 for(let at=0;at<text.length;at++)for(const field of ['struck','excluded']){
  const doc=structuredClone(original);doc[field]=[...(doc[field]||[]),{start:at,end:at+1}];assert.deepEqual(lcbSentenceReview(doc,refs).issues,[],field+' '+at);
 }
 const mixed=check('The department retains 2,000,000 records and employs 3 clerks.');assert.ok(mixed.some(i=>i.checkId==='lcb-sentence-number-review'),'Grouping-comma protection must not settle the separate numerical-relationship rule.');
});
