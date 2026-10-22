import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {reviewStyleIssues} from '../app/style-review.mjs';import {openingMeasureIssues} from '../app/style-opening-measures.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
test('an exact complete era reference cannot become a partial SI symbol at an opening',()=>{
 for(const text of ['937 A.D. marked the event.','937 A.D.']){
  const doc=makeDocument([text],'Current'),before=JSON.stringify(doc),issues=reviewStyleIssues(doc,refs,{includeReviewSuggestions:true,includeCompleteLcbReview:true});
  assert.equal(openingMeasureIssues(doc,refs).length,0);assert.equal(issues.length,1);assert.equal(issues[0].text,'937 A.D.');assert.equal(issues[0].suggestion,'A.D. 937');assert.equal(JSON.stringify(doc),before);
 }
 const measure=openingMeasureIssues(makeDocument(['937 A flows through the conductor.'],'Current'),refs);
 assert.equal(measure.length,1);assert.match(measure[0].suggestion,/amperes/u);
 const opening=reviewStyleIssues(makeDocument(['254 B.C. marked the event.'],'Current'),refs,{includeReviewSuggestions:true,includeCompleteLcbReview:true});
 assert.ok(opening.some(i=>i.guideId==='lcb'&&i.rule==='Numerals, general item 1'));assert.ok(!opening.some(i=>i.checkId==='opening-measures'));
 for(const field of ['struck','excluded'])for(let start=0;start<'937 A.D.'.length;start++){
  const damaged=makeDocument(['937 A.D. marked the event.'],'Current');damaged[field].push({start,end:start+1});
  assert.equal(openingMeasureIssues(damaged,refs).length,0,field+' '+start);
 }
});
