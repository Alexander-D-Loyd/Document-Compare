import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {reviewStyleIssues} from '../app/style-review.mjs';
import {CHECK_COVERAGE} from '../app/style-coverage.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const review=text=>reviewStyleIssues(makeDocument([text],'Current'),refs,{includeReviewSuggestions:true,includeCompleteLcbReview:true});

test('AB 2266 legislative prose stays quiet without a noun-group or meaning interpretation',()=>{
 const text='Existing law requires the Public Utilities Commission to set resource adequacy and resource procurement obligations for load-serving entities, which include electrical corporations, electric service providers, and community choice aggregators. Existing law requires various compliance reporting for load-serving entities.';
 assert.deepEqual(review(text),[]);
});
test('interrupted clauses and a two-part alternative are not evidence of a serial list',()=>{
 for(const text of ['The bill would require the commission, if it determines that the consolidation is not feasible, to set forth its reasons in a specified decision or ruling.','The commission shall, when feasible, consolidate compliance reporting for reliability requirements established pursuant to Sections 380 and 454.52.'])assert.ok(!review(text).some(i=>i.checkId==='lcb-sentence-series-review'),text);
});
test('standalone state and exact listed state-mandated remain accepted in Digest and Bill text',()=>{
 const text='LEGISLATIVE COUNSEL’S DIGEST\nThe California Constitution requires the state to reimburse local agencies and school districts for certain costs mandated by the state.\nState-mandated local program: yes.\nThe people do enact as follows:\nThe act imposes a state-mandated local program.';
 assert.deepEqual(review(text),[]);
});
test('explicit listed discrepancies and independent supplied lists remain checked',()=>{
 for(const [text,expected] of [['The board provides other in kind or cash assistance.','in-kind'],['The load serving entities shall report.','load-serving'],['The state mandated local program applies.','state-mandated'],['The cancelled catalogue is filed.','canceled'],['The civil code section 51 applies.','Civil Code'],['Los Angeles County shall report.','County of Los Angeles']]){
  const issues=review(text);assert.ok(issues.some(i=>i.suggestion===expected),text+' -> '+expected);for(const i of issues)assert.equal(makeDocument([text],'Current').text.slice(i.start,i.end),i.text);
 }
});
test('unlisted constructions do not acquire hyphens from the general modifier rule',()=>{
 for(const text of ['A data sharing agreement is required.','An asteroid related protocol applies.','The information security standards apply.'])assert.ok(!review(text).some(i=>/modifier|productive-ending|parsed-/u.test(i.checkId||i.reviewKind||'')),text);
});
test('coverage display does not describe retired parser and meaning reviews as active',()=>{
 for(const title of ['Parsed predicate compounds','Postnominal participial compounds','Qualified noun-prefix review','Complete noun-prefix review','Unfamiliar unit modifiers','LCB meaning and grammatical-role review'])assert.match(CHECK_COVERAGE.find(i=>i.title===title).status,/Disabled/);
 assert.ok(!CHECK_COVERAGE.some(i=>i.title==='LCB complete-sentence numerical and series review'));
});
