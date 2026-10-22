import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {makeDocument} from '../app/core.mjs';
import {mapOfflineIssues,prepareOfflineLanguage,reviewOfflineLanguage} from '../app/offline-language.mjs';
import {reviewStyleIssues} from '../app/style-review.mjs';
import engineHost from '../engine-host.cjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const run=spawnSync(fileURLToPath(new URL('../engines/runtime/python/python.exe',import.meta.url)),['-I','-B',fileURLToPath(new URL('./lcb-reader-parser.py',import.meta.url))],{encoding:'utf8',windowsHide:true});
if(run.error)throw run.error;assert.equal(run.status,0,run.stderr);
const rows=JSON.parse(run.stdout);
const mapped=(doc,row,enabled=true)=>mapOfflineIssues(doc,prepareOfflineLanguage(doc),row.candidates,'style',{includeLcbReaderReview:enabled});
test('production excludes speculative candidates: fresh actual parser witnesses reach the reader layer for nouns, qualified prefixes, predicates and following phrases',()=>{
 for(const index of [1, 2, 3, 5, 10, 11]){const row=rows[index],doc=makeDocument([row.text],'Current'),before=JSON.stringify(doc),engineIssues=mapped(doc,row);const found=reviewStyleIssues(doc,refs,{engineIssues,includeReviewSuggestions:true,includeCompleteLcbReview:true});assert.ok(!found.some(i=>/^(?:lcb-parser-modifier|lcb-grouped-modifier|lcb-ambiguous-modifier|lcb-parsed-predicate-compound|lcb-postnominal-compound|lcb-unresolved-modifier)/u.test(i.checkId||'')),row.text);assert.equal(JSON.stringify(doc),before);}
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
test('production excludes speculative candidates: a parsed -ly adverb retains the explicit open exception while a hyphenated version asks for review',()=>{
 for(const index of [12, 13]){const row=rows[index],doc=makeDocument([row.text],'Current'),before=JSON.stringify(doc),engineIssues=mapped(doc,row);const found=reviewStyleIssues(doc,refs,{engineIssues,includeReviewSuggestions:true,includeCompleteLcbReview:true});assert.ok(!found.some(i=>/^(?:lcb-parser-modifier|lcb-grouped-modifier|lcb-ambiguous-modifier|lcb-parsed-predicate-compound|lcb-postnominal-compound|lcb-unresolved-modifier)/u.test(i.checkId||'')),row.text);assert.equal(JSON.stringify(doc),before);}
});

test('explicit reader mode crosses the native bridge without changing grammar or precise defaults',async()=>{
 const row=rows[1],doc=makeDocument([row.text],'Current');let request;
 const bridge={review:async(...args)=>{request=args;return {issues:row.candidates};}};
 assert.ok((await reviewOfflineLanguage(doc,'style','reader-control',bridge,{includeLcbReaderReview:true})).issues.length);
 assert.equal(request[3].includeLcbReaderReview,true);
 assert.deepEqual((await reviewOfflineLanguage(doc,'style','ordinary-control',bridge)).issues,[]);
 assert.equal(request[3].includeLcbReaderReview,false);
});

test('production excludes speculative candidates: source-visible coordinated and stacked groups cover modifiers before intervening groups',()=>{
 for(const index of [14, 15, 17, 19, 20]){const row=rows[index],doc=makeDocument([row.text],'Current'),before=JSON.stringify(doc),engineIssues=mapped(doc,row);const found=reviewStyleIssues(doc,refs,{engineIssues,includeReviewSuggestions:true,includeCompleteLcbReview:true});assert.ok(!found.some(i=>/^(?:lcb-parser-modifier|lcb-grouped-modifier|lcb-ambiguous-modifier|lcb-parsed-predicate-compound|lcb-postnominal-compound|lcb-unresolved-modifier)/u.test(i.checkId||'')),row.text);assert.equal(JSON.stringify(doc),before);}
});

test('grouped modifier source proof rejects damage and fabricated group separator head or predicate evidence',()=>{
 for(const index of [14,15,19,20]){
  const row=rows[index],doc=makeDocument([row.text],'Current'),candidate=row.candidates.find(c=>c.engineRule==='LCB_GROUPED_MODIFIER_REVIEW');assert.ok(candidate,index);
  const only={...row,candidates:[candidate]};assert.equal(mapped(doc,only).length,1,index);
  for(const field of ['struck','excluded'])for(let at=0;at<doc.text.length;at++){const d=structuredClone(doc);d[field].push({start:at,end:at+1});assert.deepEqual(mapped(d,only),[],index+' '+field+' '+at);}
  for(const part of ['group','head','predicate','separator','selection']){const bad=structuredClone(only),c=bad.candidates[0],proof=c.groupedModifierRoleEvidence;if(part==='group')proof.groups[0].components[0].text='fabricated';if(part==='head')proof.head.text='fabricated';if(part==='predicate')proof.predicate.text='fabricated';if(part==='separator'){if(proof.separators.length)proof.separators[0].text='fabricated';else proof.mode='coordinated';}if(part==='selection')proof.selectedGroup=99;assert.deepEqual(mapped(doc,bad),[],index+' '+part);}
 }
});

test('production excludes speculative candidates: a competing noun/verb analysis produces an explicit uncertainty question instead of a silent missed modifier',()=>{
 for(const index of [21, 22, 23]){const row=rows[index],doc=makeDocument([row.text],'Current'),before=JSON.stringify(doc),engineIssues=mapped(doc,row);const found=reviewStyleIssues(doc,refs,{engineIssues,includeReviewSuggestions:true,includeCompleteLcbReview:true});assert.ok(!found.some(i=>/^(?:lcb-parser-modifier|lcb-grouped-modifier|lcb-ambiguous-modifier|lcb-parsed-predicate-compound|lcb-postnominal-compound|lcb-unresolved-modifier)/u.test(i.checkId||'')),row.text);assert.equal(JSON.stringify(doc),before);}
});

test('grouped and ambiguous role witnesses survive recognized physical heads without accepting body dashes',()=>{
 for(const [index,term]of [[14,'fast growing'],[19,'low temperature'],[21,'risk adjustment']]){
  const row=rows[index],cut=row.text.indexOf(' ',row.text.indexOf(term))+1;
  const doc=makeDocument(['line 1 '+row.text.slice(0,cut),'AB 224 — 2 —\nline 1 '+row.text.slice(cut)],'Current'),head=doc.blocks.find(b=>b.text==='AB 224 — 2 —');assert.ok(head);head.ignored=true;head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};doc.excluded.push({start:head.start,end:head.end});
  const plan=prepareOfflineLanguage(doc);assert.equal(plan.text,row.text);const engineIssues=mapOfflineIssues(doc,plan,row.candidates,'style',{includeLcbReaderReview:true});assert.ok(engineIssues.some(i=>i.matchText===term),term);for(const i of engineIssues)assert.equal(doc.text.slice(i.start,i.end),i.text);
 }
 const row=rows[14],bad=makeDocument([row.text.replace('fast growing','fast—growing')],'Current');assert.ok(!mapped(bad,row).some(i=>i.engineRule==='LCB_GROUPED_MODIFIER_REVIEW'));
});
test('production excludes speculative candidates: single-word coordinated groups preserve the neighboring multiword modifier and remain silent themselves',()=>{
 for(const index of [24, 25, 26]){const row=rows[index],doc=makeDocument([row.text],'Current'),before=JSON.stringify(doc),engineIssues=mapped(doc,row);const found=reviewStyleIssues(doc,refs,{engineIssues,includeReviewSuggestions:true,includeCompleteLcbReview:true});assert.ok(!found.some(i=>/^(?:lcb-parser-modifier|lcb-grouped-modifier|lcb-ambiguous-modifier|lcb-parsed-predicate-compound|lcb-postnominal-compound|lcb-unresolved-modifier)/u.test(i.checkId||'')),row.text);assert.equal(JSON.stringify(doc),before);}
});

test('real offline worker transports grouped and ambiguous witnesses with UTF-16 offsets and explicit mode isolation',async()=>{
 const host=engineHost.createEngineHost({runtimeRoot:fileURLToPath(new URL('../engines/runtime',import.meta.url)),idleMs:1000}),bridge={review:(id,kind,chunks,options)=>host.review({id,kind,chunks,...options})};
 try{
  const text='An 🦉 observation is recorded. The agency evaluates fast growing or slow moving organisms. The agency evaluates low temperature high pressure reactors. The agency evaluates risk adjustment algorithms. The agency evaluates ordinary and slow moving organisms. The agency evaluates slow moving and ordinary organisms.',doc=makeDocument([text],'Current');
  const result=await reviewOfflineLanguage(doc,'style','actual-reader-protocol',bridge,{includeLcbReaderReview:true});assert.equal(result.warning,undefined);assert.ok(result.issues.some(i=>i.engineRule==='LCB_GROUPED_MODIFIER_REVIEW'&&i.matchText==='fast growing'));assert.ok(result.issues.some(i=>i.engineRule==='LCB_GROUPED_MODIFIER_REVIEW'&&i.matchText==='low temperature'));assert.ok(result.issues.some(i=>i.engineRule==='LCB_AMBIGUOUS_MODIFIER_HEAD_REVIEW'&&i.matchText==='risk adjustment'));
  for(const i of result.issues)assert.equal(doc.text.slice(i.start,i.end),i.text);
  assert.equal(result.issues.filter(i=>i.engineRule==='LCB_GROUPED_MODIFIER_REVIEW'&&i.matchText==='slow moving').length,3);
  const ordinary=await reviewOfflineLanguage(doc,'style','actual-precise-protocol',bridge);assert.ok(!ordinary.issues.some(i=>['LCB_GROUPED_MODIFIER_REVIEW','LCB_AMBIGUOUS_MODIFIER_HEAD_REVIEW'].includes(i.engineRule)));
 }finally{host.stop();}
});
