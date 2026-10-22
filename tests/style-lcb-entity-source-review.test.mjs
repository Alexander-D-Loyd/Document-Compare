import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {CALIFORNIA_ENTITIES} from '../app/data/california-entities.mjs';
import {lcbEntitySourceReviewIssues} from '../app/style-lcb-entity-source-review.mjs';
import {lcbReviewReadiness} from '../app/lcb-review-readiness.mjs';
import {reviewStyleIssues} from '../app/style-review.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=t=>lcbEntitySourceReviewIssues(makeDocument([t],'Current'),refs);
test('all 30 source-ineligible exact entries stay quiet without changing their eligibility',()=>{
 const entries=CALIFORNIA_ENTITIES.entries.filter(e=>!e.checkEligible);assert.equal(entries.length,30);
 for(const entry of entries){
  const text='The '+entry.name+' shall act.',found=check(text);
  assert.deepEqual(found,[],entry.name);
 }
 assert.equal(CALIFORNIA_ENTITIES.entries.filter(e=>e.checkEligible).length,482);
});
test('index inversions, abbreviation omissions and instantiated templates do not establish discrepancies',()=>{
 const samples=[['The Chancellor of the California State University shall act.','California State University, Chancellor of the'],['The Racial and Identity Profiling Advisory Board shall act.','Racial and Identity Profiling Advisory Board (RIPA)'],['The California Regional Water Quality Control Board, San Diego Region shall act.','California Regional Water Quality Control Board, [name of region]']];
 for(const [text] of samples)assert.deepEqual(check(text),[],text);
});
test('unlisted institutional wording does not establish a source-list discrepancy',()=>{
 const found=check('The Department of Imaginative Services shall act. The department of independent protocols may act.');
 assert.deepEqual(found,[]);
 assert.deepEqual(check('The Department of Consumer Affairs shall act.'),[]);
 assert.deepEqual(check('The California Imaginary Services Agency shall act.'),[]);
 assert.deepEqual(check('The Specimen Review Commission shall act.'),[]);
});

test('institutional questions stop at clauses and omit generic metadata labels',()=>{
 const text='The board of I-Bank from holding closed sessions when considering a financing plan is described.',found=check(text);assert.deepEqual(found,[]);
 assert.deepEqual(check('Fiscal committee: yes. This measure provides assistance to the applicant.'),[]);
 assert.deepEqual(check('The program provides support to an Independent Review Commission shall act.'),[]);
});
test('demonstrative complements do not become invented complete entity names',()=>{
 for(const text of ['The secretary notifies the Committee of this action.','The director informs the Board of each transfer.','The chair informs the Commission of such proceedings.'])assert.ok(!check(text).some(i=>i.entitySource.sourceName===null),text);
 for(const text of ['The Department of This New Research shall act.','The Department of That Field shall act.'])assert.deepEqual(check(text),[],text);
});
test('prior findings, exact registry identities, literal wording and damaged original text stay protected',()=>{
 for(const text of ['The text “Controller” and \'Attorney General\' is literal.','The Department of Consumer Affairs shall act.','CONTROLLER','The controllerα shall act.'])assert.deepEqual(check(text),[],text);
 const doc=makeDocument(['The attorney general shall act.'],'Current'),start=doc.text.indexOf('attorney');assert.equal(lcbEntitySourceReviewIssues(doc,refs).length,1);
 for(const field of ['struck','excluded']){const copy=structuredClone(doc);copy[field]=[...(copy[field]||[]),{start,end:start+1}];assert.deepEqual(lcbEntitySourceReviewIssues(copy,refs),[]);}
 assert.deepEqual(lcbEntitySourceReviewIssues(doc,refs,{existingIssues:[{start:0,end:doc.text.length}]}),[]);
});

test('complete multiword ineligible title case discrepancies retain source evidence without replacement',()=>{
 const text='The attorney general shall act.',found=check(text);assert.equal(found.length,1);
 assert.equal(found[0].text,'attorney general');assert.equal(found[0].entitySource.sourceName,'Attorney General');assert.equal(found[0].entitySource.checkEligible,false);assert.equal(found[0].suggestion,null);assert.match(found[0].message,/capitalization/);
 assert.deepEqual(check('The controller shall act.'),[]);
});
test('complete desktop mode keeps compliant eligible entity names quiet and retains exact case corrections',()=>{
 for(const text of ['The Department of Consumer Affairs shall act.','The State Department of Health Care Services shall act.']){
  const found=reviewStyleIssues(makeDocument([text],'Current'),refs,{includeReviewSuggestions:true,includeCompleteLcbReview:true});
  assert.equal(found.filter(i=>['lcb-entity-source-review','lcb-source-form-review'].includes(i.checkId)).length,0,text);
 }
 const bad=reviewStyleIssues(makeDocument(['The department of consumer affairs shall act.'],'Current'),refs,{includeReviewSuggestions:true,includeCompleteLcbReview:true});
 assert.deepEqual(bad.filter(i=>i.checkId==='california-entities').map(i=>i.suggestion),['Department of Consumer Affairs']);
 assert.equal(bad.some(i=>i.checkId==='lcb-entity-source-review'),false);
});
test('dictionary subsets cannot masquerade as complete authority and current source counts stay distinct',()=>{
 for(const authority of [null,{authority:'Merriam-Webster',entries:[{entry:'controlled',spellings:['gray','grey']}]}]){
  const readiness=lcbReviewReadiness(refs,{authority});
  assert.equal(readiness.dictionary.completeOrderedAuthority,false);assert.equal(readiness.wholeRuleCertification,false);assert.equal(readiness.lexicalSourceRows,663);assert.equal(readiness.endWordSourceRows,47);
  assert.deepEqual([readiness.entitySource.entries,readiness.entitySource.eligible,readiness.entitySource.readerReview],[512,482,30]);
  assert.match(readiness.warning,/unavailable/);
 }
});
