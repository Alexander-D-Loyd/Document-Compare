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

test('source-visible coordinated and stacked groups cover modifiers before intervening groups',()=>{
 for(const [index,term]of [[14,'fast growing'],[14,'slow moving'],[15,'fast growing'],[19,'low temperature'],[20,'fast growing']]){
  const row=rows[index],doc=makeDocument([row.text],'Current'),engineIssues=mapped(doc,row),issues=reviewStyleIssues(doc,refs,{engineIssues,includeReviewSuggestions:true,includeCompleteLcbReview:true});
  const found=issues.find(i=>i.text===term&&i.checkId==='lcb-grouped-modifier-review');assert.ok(found,index+' '+term);assert.equal(found.suggestion,null);assert.match(found.message,/has its own head/);assert.match(found.message,/may be correct/);
 }
 const row=rows[15],doc=makeDocument([row.text],'Current'),issues=reviewStyleIssues(doc,refs,{engineIssues:mapped(doc,row),includeReviewSuggestions:true,includeCompleteLcbReview:true});assert.equal(issues.filter(i=>i.text==='sugar free').length,1,'Direct and grouped analysis retain one owner.');
 for(const index of [16,18])assert.ok(!mapped(makeDocument([rows[index].text],'Current'),rows[index]).some(i=>i.engineRule==='LCB_GROUPED_MODIFIER_REVIEW'),rows[index].text);
 const ly=rows[17],lyDoc=makeDocument([ly.text],'Current'),lyIssues=reviewStyleIssues(lyDoc,refs,{engineIssues:mapped(lyDoc,ly),includeReviewSuggestions:true,includeCompleteLcbReview:true});assert.ok(lyIssues.some(i=>i.checkId==='lcb-grouped-modifier-review'&&i.references.some(r=>r.rule==='Hyphenation, item 3')));
});

test('grouped modifier source proof rejects damage and fabricated group separator head or predicate evidence',()=>{
 for(const index of [14,15,19,20]){
  const row=rows[index],doc=makeDocument([row.text],'Current'),candidate=row.candidates.find(c=>c.engineRule==='LCB_GROUPED_MODIFIER_REVIEW');assert.ok(candidate,index);
  const only={...row,candidates:[candidate]};assert.equal(mapped(doc,only).length,1,index);
  for(const field of ['struck','excluded'])for(let at=0;at<doc.text.length;at++){const d=structuredClone(doc);d[field].push({start:at,end:at+1});assert.deepEqual(mapped(d,only),[],index+' '+field+' '+at);}
  for(const part of ['group','head','predicate','separator','selection']){const bad=structuredClone(only),c=bad.candidates[0],proof=c.groupedModifierRoleEvidence;if(part==='group')proof.groups[0].components[0].text='fabricated';if(part==='head')proof.head.text='fabricated';if(part==='predicate')proof.predicate.text='fabricated';if(part==='separator'){if(proof.separators.length)proof.separators[0].text='fabricated';else proof.mode='coordinated';}if(part==='selection')proof.selectedGroup=99;assert.deepEqual(mapped(doc,bad),[],index+' '+part);}
 }
});

test('a competing noun/verb analysis produces an explicit uncertainty question instead of a silent missed modifier',()=>{
 const row=rows[21],doc=makeDocument([row.text],'Current'),engineIssues=mapped(doc,row),issues=reviewStyleIssues(doc,refs,{engineIssues,includeReviewSuggestions:true,includeCompleteLcbReview:true}),i=issues.find(i=>i.checkId==='lcb-ambiguous-modifier-review');assert.ok(i);assert.equal(i.text,'risk adjustment');assert.equal(i.head,'algorithms');assert.equal(i.suggestion,null);assert.equal(i.parserAlternatives.meaningResolved,false);assert.match(i.message,/Neither analysis/);
 for(const index of [22,23])assert.ok(!rows[index].candidates.some(c=>c.engineRule==='LCB_AMBIGUOUS_MODIFIER_HEAD_REVIEW'),rows[index].text);
 const candidate=row.candidates.find(c=>c.engineRule==='LCB_AMBIGUOUS_MODIFIER_HEAD_REVIEW'),only={...row,candidates:[candidate]};assert.equal(mapped(doc,only).length,1);
 for(const field of ['struck','excluded'])for(let at=0;at<doc.text.length;at++){const d=structuredClone(doc);d[field].push({start:at,end:at+1});assert.deepEqual(mapped(d,only),[],field+' '+at);}
 for(const part of ['score','token','missing','head','predicate']){const bad=structuredClone(only),p=bad.candidates[0].ambiguousModifierRoleEvidence;if(part==='score')p.margin=-1;if(part==='token')p.tokens[0].text='fabricated';if(part==='missing')p.tokens.splice(1,1);if(part==='head')p.head.tag='NNS';if(part==='predicate')p.predicate.text='fabricated';assert.deepEqual(mapped(doc,bad),[],part);}
});

test('grouped and ambiguous role witnesses survive recognized physical heads without accepting body dashes',()=>{
 for(const [index,term]of [[14,'fast growing'],[19,'low temperature'],[21,'risk adjustment']]){
  const row=rows[index],cut=row.text.indexOf(' ',row.text.indexOf(term))+1;
  const doc=makeDocument(['line 1 '+row.text.slice(0,cut),'AB 224 — 2 —\nline 1 '+row.text.slice(cut)],'Current'),head=doc.blocks.find(b=>b.text==='AB 224 — 2 —');assert.ok(head);head.ignored=true;head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};doc.excluded.push({start:head.start,end:head.end});
  const plan=prepareOfflineLanguage(doc);assert.equal(plan.text,row.text);const engineIssues=mapOfflineIssues(doc,plan,row.candidates,'style',{includeLcbReaderReview:true});assert.ok(engineIssues.some(i=>i.matchText===term),term);for(const i of engineIssues)assert.equal(doc.text.slice(i.start,i.end),i.text);
 }
 const row=rows[14],bad=makeDocument([row.text.replace('fast growing','fast—growing')],'Current');assert.ok(!mapped(bad,row).some(i=>i.engineRule==='LCB_GROUPED_MODIFIER_REVIEW'));
});
test('single-word coordinated groups preserve the neighboring multiword modifier and remain silent themselves',()=>{
 for(const index of [24,25]){const row=rows[index],doc=makeDocument([row.text],'Current'),engineIssues=mapped(doc,row),found=reviewStyleIssues(doc,refs,{engineIssues,includeReviewSuggestions:true,includeCompleteLcbReview:true}).filter(i=>i.checkId==='lcb-grouped-modifier-review');assert.deepEqual(found.map(i=>i.text),['slow moving'],row.text);assert.equal(found[0].suggestion,null);for(const field of ['struck','excluded'])for(let p=0;p<doc.text.length;p++){const d=structuredClone(doc);d[field].push({start:p,end:p+1});assert.deepEqual(mapped(d,row),[],field+' '+p);}
  const bad=structuredClone(row),candidate=bad.candidates.find(c=>c.engineRule==='LCB_GROUPED_MODIFIER_REVIEW'),proof=candidate.groupedModifierRoleEvidence;proof.selectedGroup=proof.groups.findIndex(g=>g.components.length===1);const single=proof.groups[proof.selectedGroup].components[0];candidate.start=single.start;candidate.end=single.end;assert.deepEqual(mapped(doc,bad),[],'A single adjective is not a multiword modifier question.');
 }
 assert.ok(!rows[26].candidates.some(c=>c.engineRule==='LCB_GROUPED_MODIFIER_REVIEW'));
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
