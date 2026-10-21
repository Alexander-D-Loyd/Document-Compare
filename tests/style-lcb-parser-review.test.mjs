import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {makeDocument} from '../app/core.mjs';
import {mapOfflineIssues,prepareOfflineLanguage,reviewOfflineLanguage} from '../app/offline-language.mjs';
import {reviewStyleIssues} from '../app/style-review.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const run=spawnSync(fileURLToPath(new URL('../engines/runtime/python/python.exe',import.meta.url)),['-I','-B',fileURLToPath(new URL('./lcb-reader-parser.py',import.meta.url))],{encoding:'utf8',windowsHide:true});
if(run.error)throw run.error;assert.equal(run.status,0,run.stderr);
const rows=JSON.parse(run.stdout);
const mapped=(doc,row,enabled=true)=>mapOfflineIssues(doc,prepareOfflineLanguage(doc),row.candidates,'style',{includeLcbReaderReview:enabled});
test('fresh actual parser witnesses reach the reader layer for nouns, qualified prefixes, predicates and following phrases',()=>{
 const controls=[[1,'information security','lcb-parser-modifier-review'],[2,'public health assessment','lcb-parser-modifier-review'],[3,'signal-driven','lcb-parsed-predicate-compound-review'],[5,'signal-driven','lcb-postnominal-compound-review'],[10,'fast growing','lcb-parser-modifier-review'],[11,'sugar free','lcb-parser-modifier-review']];
 for(const [index,term,id] of controls){
  const row=rows[index],doc=makeDocument([row.text],'Current'),before=JSON.stringify(doc),engineIssues=mapped(doc,row);
  assert.ok(engineIssues.some(i=>i.matchText===term),term+' mapped');
  assert.deepEqual(mapped(doc,row,false),[],term+' ordinary mode stays exact-only');
  const result=reviewStyleIssues(doc,refs,{engineIssues,includeReviewSuggestions:true,includeCompleteLcbReview:true});
  assert.ok(result.some(i=>i.matchText===term&&i.checkId===id),term+' desktop finding');
  for(const i of result.filter(i=>i.checkId===id)){assert.equal(i.suggestion,null);assert.equal(i.reviewSuggested,true);assert.equal(doc.text.slice(i.start,i.end),i.text);assert.match(i.message,/No .*replacement|no replacement/u);}
  assert.equal(JSON.stringify(doc),before);
 }
});
test('reader mapping rejects damaged source anywhere in the complete grammatical witness',()=>{
 for(const index of [1,2,3,5,10,11]){
  const row=rows[index],original=makeDocument([row.text],'Current');
  for(let at=0;at<original.text.length;at++)for(const field of ['struck','excluded']){
   const doc=structuredClone(original);doc[field]=[...(doc[field]||[]),{start:at,end:at+1}];
   assert.deepEqual(mapped(doc,row),[],index+' '+field+' '+at);
  }
 }
});
test('missing or tampered component/head/predicate source proof never creates a question',()=>{
 for(const index of [1,2,3,5,10,11]){
  const row=rows[index],doc=makeDocument([row.text],'Current');
  for(const mutation of ['component','predicate','suggestion']){
   const bad=structuredClone(row);const c=bad.candidates[0],proof=c.nounRoleEvidence||c.predicateRoleEvidence||c.postnominalRoleEvidence||c.attributiveRoleEvidence;
   if(mutation==='component')proof.components[0].text='fabricated';
   if(mutation==='predicate'){if(proof.predicate)proof.predicate.text='fabricated';else proof.modifiedNoun.text='fabricated';}
   if(mutation==='suggestion')c.suggestion='fabricated-replacement';
   assert.deepEqual(mapped(doc,bad),[],index+' '+mutation);
  }
 }
 const row=structuredClone(rows[1]);delete row.candidates[0].nounRoleEvidence.head;assert.deepEqual(mapped(makeDocument([row.text],'Current'),row),[]);
});
test('a parsed -ly adverb retains the explicit open exception while a hyphenated version asks for review',()=>{
 assert.deepEqual(mapped(makeDocument([rows[12].text],'Current'),rows[12]),[]);
 const doc=makeDocument([rows[13].text],'Current'),engineIssues=mapped(doc,rows[13]);
 assert.ok(engineIssues.length);assert.ok(engineIssues.every(i=>i.suggestion===null));
 assert.ok(reviewStyleIssues(doc,refs,{engineIssues,includeReviewSuggestions:true,includeCompleteLcbReview:true}).some(i=>i.checkId==='lcb-parser-modifier-review'&&i.references.some(r=>r.rule==='Hyphenation, item 3')));
});
test('explicit reader mode crosses the native bridge without changing grammar or precise defaults',async()=>{
 const row=rows[1],doc=makeDocument([row.text],'Current');let request;
 const bridge={review:async(...args)=>{request=args;return {issues:row.candidates};}};
 assert.ok((await reviewOfflineLanguage(doc,'style','reader-control',bridge,{includeLcbReaderReview:true})).issues.length);
 assert.equal(request[3].includeLcbReaderReview,true);
 assert.deepEqual((await reviewOfflineLanguage(doc,'style','ordinary-control',bridge)).issues,[]);
 assert.equal(request[3].includeLcbReaderReview,false);
});
