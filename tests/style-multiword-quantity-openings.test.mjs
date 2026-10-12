import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument}from '../app/core.mjs';import {workerWords}from './helpers/spelling-worker.mjs';import {decimalOpeningReviewIssues}from '../app/style-decimal-openings.mjs';import {fractionOpeningReviewIssues}from '../app/style-fraction-openings.mjs';import {integerOpeningReviewIssues}from '../app/style-integer-opening-review.mjs';import {largeIntegerOpeningReviewIssues}from '../app/style-large-integer-openings.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),words=await workerWords(),make=t=>makeDocument([t],'Current',[],[],words),digest='LEGISLATIVE COUNSEL’S DIGEST\n';
function evidence(d,i,selected){assert.ok(i);assert.equal(i.text,selected);assert.equal(i.text,d.text.slice(i.start,i.end));assert.equal(i.openingClauseText,d.text.slice(i.evidenceStart,i.evidenceEnd));assert.ok(i.evidenceEnd>i.end);assert.equal(i.suggestion,null);assert.equal(i.reviewSuggested,true);assert.equal(i.conflict,false);assert.ok(i.references.some(r=>r.guideId==='lcb'&&r.guidePage===21));assert.ok(i.references.some(r=>r.guideId==='gpo'&&r.rule==='12.16'));}
test('complete decimal multiword measures and FTE quantities receive whole selections and conditional guide review',()=>{
 for(const phrase of ['cubic meters','square feet','fluid ounces','acre-feet','acre feet','kilowatt-hours','full-time equivalent positions','part-time-equivalent employees','additional licensed positions'])for(const prefix of ['',digest]){
  const d=make(prefix+'0.5 '+phrase+' are required.'),saved=JSON.stringify(d),[i]=decimalOpeningReviewIssues(d,refs);evidence(d,i,'0.5 '+phrase);assert.equal(JSON.stringify(d),saved);assert.equal(jointStylisticIssues(d,refs,{includeReviewSuggestions:true}).filter(i=>i.checkId==='lcb-decimal-opening-review').length,1,phrase);
 }
});
test('finite quantity evidence retains complete of-phrases and selected auxiliaries',()=>{
 for(const tail of ['are required','shall remain','may be sufficient','of the available material must be retained']){
  const d=make('0.5 cubic meters '+tail+'.'),[i]=decimalOpeningReviewIssues(d,refs);evidence(d,i,'0.5 cubic meters');assert.equal(i.openingClauseText,'0.5 cubic meters '+tail);
 }
});
test('proper fractional openings retain whole source quantities and prior precise findings retain ownership',()=>{
 for(const num of ['1/2','2⁄3','½']){const d=make(digest+num+' cubic meters are required.'),[i]=fractionOpeningReviewIssues(d,refs);evidence(d,i,num+' cubic meters');assert.equal(fractionOpeningReviewIssues(d,refs,{existingIssues:[{start:i.start,end:i.end}]}).length,0);}
});
test('ordinary and exact large integers gain complete finite evidence without inventing wording',()=>{
 for(const [num,check]of [['3',integerOpeningReviewIssues],['9007199254740993',largeIntegerOpeningReviewIssues]]){const d=make(num+' full-time equivalent positions are required.'),[i]=check(d,refs);assert.ok(i);assert.equal(i.suggestion,null);assert.equal(i.openingEvidenceKind,'selected-finite-clause');assert.equal(i.openingClauseText,num+' full-time equivalent positions are required');assert.equal(i.exactSourceInteger,num);}
});
test('incomplete phrases, monetary words, legal labels and nonopening quantities cannot supply new review',()=>{
 for(const text of ['0.5 cubic meters','0.5 cubic meters are','0.5 full-time equivalent positions that are required shall remain.','0.5 cubic meters per hour are required.','The office requires 0.5 cubic meters.','Section 0.5 cubic meters are required.','0.5 total dollars are available.','0.5 total million is available.','0.5 additional eligible are required.','0.5 additional Federal officers are required.'])assert.equal(decimalOpeningReviewIssues(make(text),refs).length,0,text);
});
test('literal, table and source-strike evidence remains protected over the whole phrase and predicate',()=>{
 for(const text of ['“0.5 cubic meters are required.”',"'0.5 full-time equivalent positions are required.'",'‘0.5 cubic meters are required.’'])assert.equal(decimalOpeningReviewIssues(make(text),refs).length,0,text);
 const text='0.5 additional licensed positions are required.';
 for(const kind of ['struck','excluded'])for(const token of ['additional','licensed','positions','required']){const d=make(text),at=d.text.indexOf(token);d[kind]=[{start:at,end:at+token.length}];assert.equal(decimalOpeningReviewIssues(d,refs).length,0,kind+' '+token);}
 const d=make('0.5 cubic meters are required.');d.blocks[0].formatting={...(d.blocks[0].formatting||{}),headerGaps:[{start:3,end:4},{start:10,end:11}]};assert.equal(decimalOpeningReviewIssues(d,refs).length,0,'A geometry-identified table row is protected');
});
test('normalization and damaged suffixes cannot turn a body dash or partial word into a quantity clause',()=>{
 for(const text of ['0.5 full—time equivalent positions are required.','0.5 full–time equivalent positions are required.','0.5 full-time equivalent positions are requiredα.','0.5 cubic metersα are required.','0.5 cubic meters are required-extra.'])assert.equal(decimalOpeningReviewIssues(make(text),refs).length,0,text);
});
test('recognized page divisions and printed margins retain all original phrase and predicate coordinates',()=>{
 const d=makeDocument(['line 1 0.5 cubic me-','line 1 ters of the available material are required.'],'Current',[],[],words),saved=JSON.stringify(d),[i]=decimalOpeningReviewIssues(d,refs);assert.ok(i);assert.equal(i.text,d.text.slice(i.start,i.end));assert.ok(i.text.includes('me-\nline 1 ters'));assert.equal(i.openingClauseText,d.text.slice(i.evidenceStart,i.evidenceEnd));assert.ok(i.openingClauseText.endsWith('are required'));assert.equal(i.suggestion,null);assert.equal(JSON.stringify(d),saved);
});
