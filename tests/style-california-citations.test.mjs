import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {californiaCitationReview,CALIFORNIA_CITATION_SOURCE} from '../app/style-california-citations.mjs';import {reviewStyleIssues} from '../app/style-review.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=(text,type='opinion')=>({...makeDocument([text],'Current'),styleDocumentType:type}),check=(t,type)=>californiaCitationReview(typeof t==='string'?make(t,type):t,refs).issues;
test('explicit opinion and cover letter choices receive bounded supplementary citation forms',()=>{
 for(const type of ['opinion','cover-letter'])for(const [text,term,wanted]of [['Alpha v. Beta (1998) 12 Cal. App. 4th 186.','Cal. App. 4th','Cal.App.4th'],['Alpha v. Beta (1998) 12 Cal. 4th 186.','Cal. 4th','Cal.4th'],['Alpha v. Beta (1998) 480 U. S. 709.','U. S.','U.S.'],['The statute applies (Civ. Code § 51).',' ', ', ']]){const found=check(text,type);assert.equal(found.length,1,text);const i=found[0];assert.equal(i.text,term);assert.equal(i.suggestion,wanted);assert.equal(i.guidePage,1);assert.equal(i.supplementarySource.sha256,CALIFORNIA_CITATION_SOURCE.sha256);assert.match(i.supplementarySource.section,/^§/u);}
 for(const t of ['Alpha v. Beta (1998) 12 Cal.App.4th 186.','The statute applies (Civ. Code, § 51).','Alpha v. Beta (2025) 12 Cal. App. 5th 186.'])assert.deepEqual(check(t),[],t);
 assert.deepEqual(check('Alpha v. Beta (1998) 12 Cal. 4th 186.','bill'),[]);
});
test('date order code supra and unresolved short forms ask without invented authority or replacement',()=>{
 for(const text of ['Alpha v. Beta, 12 Cal.4th 186 (1998).','The statute applies (Civ. Code, supra, § 51).','The opinion states otherwise. (Id. at p. 12.)','The opinion states otherwise. (Ibid.)']){const found=check(text);assert.equal(found.length,1,text);assert.equal(found[0].suggestion,null);assert.equal(found[0].reviewSuggested,true);assert.match(found[0].message,/have not been verified/);}
});
test('actual full citations preserve numerical coordinates without hiding unrelated quantities',()=>{
 const text='Alpha v. Beta (1998) 2 Cal.4th 1, 3 governs the 2 employees.',doc=make(text),review=reviewStyleIssues(doc,refs,{includeReviewSuggestions:true,includeCompleteLcbReview:true}),at=text.lastIndexOf('2');
 assert.ok(!review.some(i=>i.checkId==='numerals'&&i.start<at),JSON.stringify(review.map(i=>[i.text,i.checkId])));assert.ok(review.some(i=>i.start===at&&i.suggestion==='two'));
 assert.equal(californiaCitationReview(doc,refs).ranges.length,1);
});
test('literal citations damaged evidence and technical boundaries cannot manufacture supplementary findings',()=>{
 const texts=['Alpha v. Beta (1998) 12 Cal. App. 4th 186.','Alpha v. Beta, 12 Cal.4th 186 (1998).','The statute applies (Civ. Code § 51).','The authority states (Id. at p. 12).'];
 for(const text of texts){const doc=make(text),i=check(doc)[0];assert.ok(i,text);for(const field of ['struck','excluded'])for(let p=i.evidenceStart;p<i.evidenceEnd;p++){const d=structuredClone(doc);d[field].push({start:p,end:p+1});assert.ok(!check(d).some(q=>q.start===i.start&&q.end===i.end),field+' '+p+' '+text);}
  assert.deepEqual(check('The literal “'+text+'” is preserved.'),[]);
 }
 const changed=structuredClone(refs);changed.lcb.pages[0].text='No supplementary citation authority.';assert.deepEqual(californiaCitationReview(make(texts[0]),changed),{issues:[],ranges:[]});
});
