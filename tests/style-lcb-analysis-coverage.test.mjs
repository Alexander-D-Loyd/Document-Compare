import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {prepareOfflineLanguage,reviewOfflineLanguage} from '../app/offline-language.mjs';
import {lcbIncompleteAnalysisIssues} from '../app/style-lcb-analysis-coverage.mjs';
import {lcbReviewReadiness} from '../app/lcb-review-readiness.mjs';
import {reviewStyleIssues} from '../app/style-review.mjs';
import {offlineSentenceEndings} from '../app/offline-sentence-boundaries.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const long='The agency evaluates '+('ordinary specimens and ').repeat(1100)+'fast growing organisms.';
const make=text=>makeDocument([text],'Current');

test('citation and bibliographic abbreviations do not certify truncated chunk sentences',()=>{
 for(const term of ['Cal. App.','U.S.C.','C.F.R.','Sen. Bill No.','tit.','subd.','Sept.','ed.']){
  const source='The source '+term+' 3 is discussed.';
  assert.deepEqual(offlineSentenceEndings(source),[source.length],term);
 }
 const text='The agency examines '+('the Cal. App. reporter and ').repeat(650)+'the records.';
 const doc=make(text),plan=prepareOfflineLanguage(doc);assert.ok(plan.chunks.some(c=>!c.completeEnd));
 assert.equal(lcbIncompleteAnalysisIssues(doc,refs).length,1);
 assert.equal(lcbIncompleteAnalysisIssues(doc,refs)[0].text,text);
});

test('multiple hard splits own one complete source sentence task and leave following sentences separate',()=>{
 const doc=make('The report is filed. '+long+' The notice is sent.'),before=JSON.stringify(doc),plan=prepareOfflineLanguage(doc);
 assert.ok(plan.chunks.filter(c=>!c.completeEnd).length>1);
 assert.equal(plan.incompleteRanges.length,1);
 const issues=lcbIncompleteAnalysisIssues(doc,refs);assert.equal(issues.length,1);
 assert.equal(issues[0].text,long);assert.equal(doc.text.slice(issues[0].start,issues[0].end),long);
 assert.equal(issues[0].suggestion,null);assert.match(issues[0].message,/not been checked/);
 assert.match(issues[0].message,/items 1–2/);assert.match(issues[0].message,/item 3/);
 assert.equal(JSON.stringify(doc),before);
 const all=reviewStyleIssues(doc,refs,{includeCompleteLcbReview:true,includeReviewSuggestions:true});
 assert.equal(all.filter(i=>i.checkId==='lcb-incomplete-analysis-review').length,1);
 assert.ok(!reviewStyleIssues(doc,refs).some(i=>i.checkId==='lcb-incomplete-analysis-review'));
 const contextual=make(long.replace('fast growing organisms','enough evidence to ensure the outcome'));
 const contextualIssues=reviewStyleIssues(contextual,refs,{includeCompleteLcbReview:true,includeReviewSuggestions:true});
 assert.ok(contextualIssues.some(i=>i.checkId==='lcb-incomplete-analysis-review'));
 assert.ok(contextualIssues.some(i=>i.text==='ensure'),'An analysis-limit task cannot own unrelated word-meaning review.');
});

test('normal sentences have no size-limit question and protected source cannot manufacture one',()=>{
 assert.deepEqual(lcbIncompleteAnalysisIssues(make('The agency evaluates fast growing organisms.'),refs),[]);
 for(const field of ['struck','excluded'])for(const part of ['agency','fast growing','organisms']){
  const doc=make(long),start=doc.text.indexOf(part);doc[field].push({start,end:start+part.length});
  assert.deepEqual(lcbIncompleteAnalysisIssues(doc,refs),[],field+' '+part);
 }
 const quoted=make('The agency calls the report "complete" and '+long);
 assert.deepEqual(lcbIncompleteAnalysisIssues(quoted,refs),[]);
});

test('actual run status distinguishes a completed engine with skipped sentence structure from an unavailable engine',async()=>{
 const doc=make(long),bridge={review:async()=>({issues:[]})};
 const result=await reviewOfflineLanguage(doc,'style','large',bridge,{includeLcbReaderReview:true});
 assert.deepEqual(result.analysisCoverage,{requested:true,completed:true,incompleteSentenceRegions:1});
 assert.match(result.warning,/long sentence/);
 const readiness=lcbReviewReadiness(refs,{analysisCoverage:result.analysisCoverage});
 assert.equal(readiness.grammarAnalysis.engineCompleted,true);assert.equal(readiness.grammarAnalysis.completeInterpretation,false);
 for(const bridge of [{},{review:async()=>({error:'Parser unavailable'})},{review:async()=>{throw Error('private details');}}]){
  const failed=await reviewOfflineLanguage(doc,'style','failure',bridge,{includeLcbReaderReview:true});
  assert.equal(failed.analysisCoverage.completed,false);assert.equal(failed.analysisCoverage.incompleteSentenceRegions,null);assert.match(failed.warning,/LCB8 items 1–3/);
  assert.equal(lcbReviewReadiness(refs,{analysisCoverage:failed.analysisCoverage}).grammarAnalysis.engineCompleted,false);
 }
 const ordinary=await reviewOfflineLanguage(doc,'grammar','normal',bridge);assert.equal(ordinary.analysisCoverage,undefined);
});
