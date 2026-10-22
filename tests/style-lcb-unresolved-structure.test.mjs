import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {makeDocument} from '../app/core.mjs';
import {mapOfflineIssues,prepareOfflineLanguage,reviewOfflineLanguage} from '../app/offline-language.mjs';
import {reviewStyleIssues} from '../app/style-review.mjs';
import {lcbParserReviewIssues} from '../app/style-lcb-parser-review.mjs';
import engineHost from '../engine-host.cjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const run=spawnSync(fileURLToPath(new URL('../engines/runtime/python/python.exe',import.meta.url)),['-I','-B',fileURLToPath(new URL('./lcb-unresolved-structure-parser.py',import.meta.url))],{encoding:'utf8',windowsHide:true});
if(run.error)throw run.error;assert.equal(run.status,0,run.stderr);
const rows=JSON.parse(run.stdout),checkId='lcb-unresolved-modifier-structure-review';
const mapped=(doc,row)=>mapOfflineIssues(doc,prepareOfflineLanguage(doc),row.candidates,'style',{includeLcbReaderReview:true});
// Legacy source-proof validators remain tested in isolation; their generic
// questions are deliberately excluded from production style review.
const reviewed=(doc,row)=>lcbParserReviewIssues(doc,refs,{engineIssues:mapped(doc,row)}).filter(i=>i.checkId===checkId);

test('fresh parser fragments and interrupted or infinitival wording produce a rule-and-reason question without a grammatical choice',()=>{
 for(const [index,mode]of [[0,'nominal-fragment'],[1,'nominal-fragment'],[2,'interrupted-coordination'],[3,'infinitival-ambiguity'],[4,'infinitival-ambiguity'],[26,'nominal-fragment'],[27,'nominal-fragment']]){
  const row=rows[index],doc=makeDocument([row.text],'Current'),before=JSON.stringify(doc),found=reviewed(doc,row);
  assert.equal(found.length,1,row.text);const i=found[0];assert.equal(i.unresolvedStructureMode,mode);assert.equal(i.suggestion,null);assert.equal(i.reviewSuggested,true);assert.match(i.message,/may be correct/);assert.match(i.message,/No grammatical interpretation/);assert.equal(i.references[0].rule,'Hyphenation, item 1');assert.equal(doc.text.slice(i.start,i.end),i.text);assert.equal(JSON.stringify(doc),before);
  assert.deepEqual(mapOfflineIssues(doc,prepareOfflineLanguage(doc),row.candidates,'style'),[],'Reader mode is explicit.');
 }
 assert.match(reviewed(makeDocument([rows[0].text],'Current'),rows[0])[0].message,/no finite-clause witness/);
 assert.match(reviewed(makeDocument([rows[2].text],'Current'),rows[2])[0].message,/parenthetical interruption/);
 assert.match(reviewed(makeDocument([rows[3].text],'Current'),rows[3])[0].message,/competing noun-phrase and clause readings/);
 assert.ok(reviewed(makeDocument([rows[27].text],'Current'),rows[27])[0].references.some(r=>r.rule==='Hyphenation, item 3'));
});

test('settled clause and independent coordination controls do not become unresolved-structure questions',()=>{
 for(const index of [5,6,7,8,9,10,11,12,23,24,31,32,33,34])assert.deepEqual(rows[index].candidates,[],rows[index].text);
});

test('requires and evaluates infinitival constructions preserve competing adjective and adverb analyses without selecting verb valency',()=>{
 for(const index of [19,28,29,30]){
  const row=rows[index],doc=makeDocument([row.text],'Current'),found=reviewed(doc,row);assert.equal(found.length,1,row.text);assert.equal(found[0].unresolvedStructureMode,'infinitival-ambiguity');assert.equal(found[0].suggestion,null);assert.match(found[0].message,/may be correct/);assert.match(found[0].message,/No grammatical interpretation/);
 }
 for(const index of [28,29]){const row=rows[index],doc=makeDocument([row.text],'Current'),[i]=reviewed(doc,row);assert.deepEqual(i.unresolvedAdverbAlternative,{chosenTag:'RB',alternativeTag:'JJ',meaningResolved:false});assert.match(i.message,/first component as an adverb/);assert.match(i.message,/competing adjective analysis/);for(const mutation of ['missing','tag','score']){const bad=structuredClone(row),p=bad.candidates[0].unresolvedModifierEvidence;if(mutation==='missing')delete p.adverbAlternative;if(mutation==='tag')p.adverbAlternative.alternativeTag='NN';if(mutation==='score')p.adverbAlternative.margin=-1;assert.deepEqual(mapped(doc,bad),[],index+' '+mutation);}}
});

test('unsupported post-head verb, small-clause, reduced and nonfinite structures retain uncertainty instead of an asserted modified noun',()=>{
 for(const index of [13,14,15,16,17,18]){
  const row=rows[index],doc=makeDocument([row.text],'Current'),found=reviewed(doc,row);assert.ok(found.length,row.text);
  for(const i of found){assert.equal(i.unresolvedStructureMode,'post-head-ambiguity');assert.equal(i.suggestion,null);assert.equal(i.references[0].rule,'Hyphenation, item 2');assert.match(i.message,/locator, not an asserted modified noun/);assert.match(i.message,/verbal, adjectival or adverbial/);}
 }
 for(const index of [19,20,21,22]){const row=rows[index],doc=makeDocument([row.text],'Current');assert.equal(reviewed(doc,row).length,1,row.text);}
 assert.deepEqual(reviewed(makeDocument([rows[25].text],'Current'),rows[25]),[],'Printed lexical noun spelling is not reopened by a generic role question.');
});

test('complete sentence and component witnesses reject removed, quoted, excluded and forged source',()=>{
 for(const index of [0,1,2,3,4,13,14,15,16,17,18,19,20,21,22,26,27,28,29,30]){
  const row=rows[index],original=makeDocument([row.text],'Current');assert.ok(mapped(original,row).length,row.text);
  for(const field of ['struck','excluded'])for(let at=0;at<original.text.length;at++){const doc=structuredClone(original);doc[field].push({start:at,end:at+1});assert.deepEqual(mapped(doc,row),[],index+' '+field+' '+at);}
  for(const mutation of ['missing-token','token-text','head','component','extra-replacement','mode']){
   const bad=structuredClone(row);bad.candidates=bad.candidates.slice(0,1);const c=bad.candidates[0],p=c.unresolvedModifierEvidence;
   if(mutation==='missing-token')p.tokens.splice(1,1);
   if(mutation==='token-text')p.tokens[0].text='fabricated';
   if(mutation==='head')p.head.headText='fabricated';
   if(mutation==='component')p.components[0].text='fabricated';
   if(mutation==='extra-replacement')c.suggestion='fabricated-replacement';
   if(mutation==='mode')p.mode='unrestricted-guess';
   assert.deepEqual(mapped(original,bad),[],index+' '+mutation);
  }
 }
 const row=rows[2],doc=makeDocument([row.text],'Current');
 for(const field of ['aside','separators','left','right']){const bad=structuredClone(row);bad.candidates[0].unresolvedModifierEvidence[field].splice(0,1);assert.deepEqual(mapped(doc,bad),[],field);}
});

test('actual offline worker carries each new source-proof mode with UTF-16 offsets and isolates ordinary style mode',async()=>{
 const host=engineHost.createEngineHost({runtimeRoot:fileURLToPath(new URL('../engines/runtime',import.meta.url)),idleMs:1000}),bridge={review:(id,kind,chunks,options)=>host.review({id,kind,chunks,...options})};
 try{
  const doc=makeDocument(['An 🦉 observation is recorded. '+[0,2,3,13,14,17,21,22,28,29,30].map(n=>rows[n].text).join(' ')],'Current'),result=await reviewOfflineLanguage(doc,'style','unresolved-source-transport',bridge,{includeLcbReaderReview:true});assert.equal(result.warning,undefined);
  const actual=result.issues.filter(i=>i.engineRule==='LCB_UNRESOLVED_MODIFIER_STRUCTURE_REVIEW');
  for(const mode of ['nominal-fragment','coordinated-fragment','infinitival-ambiguity','interrupted-coordination','post-head-ambiguity'])assert.ok(actual.some(i=>i.unresolvedStructureMode===mode),mode);
  for(const needle of ['requires hard to obtain permits','works hard to obtain permits','requires difficult to replace equipment']){const at=doc.text.indexOf(needle),end=at+needle.length;assert.ok(actual.some(i=>i.start>=at&&i.end<=end&&i.unresolvedStructureMode==='infinitival-ambiguity'),needle);}
  for(const i of actual)assert.equal(doc.text.slice(i.start,i.end),i.text);
  const ordinary=await reviewOfflineLanguage(doc,'style','unresolved-ordinary-transport',bridge);assert.ok(!ordinary.issues.some(i=>i.engineRule==='LCB_UNRESOLVED_MODIFIER_STRUCTURE_REVIEW'));
 }finally{host.stop();}
});

test('noncontiguous source selections retain exact physical text and do not gain invented components',()=>{
 const row=rows[2],cut=row.text.indexOf('slow'),doc=makeDocument(['line 1 '+row.text.slice(0,cut),'line 2 '+row.text.slice(cut)],'Current'),found=reviewed(doc,row);
 assert.equal(found.length,1);assert.equal(doc.text.slice(found[0].start,found[0].end),found[0].text);assert.ok(found[0].text.includes('line 2'));
 const bad=structuredClone(row);bad.candidates[0].unresolvedModifierEvidence.components.splice(1,1);assert.deepEqual(mapped(makeDocument([row.text],'Current'),bad),[]);
});

test('legacy ambiguity candidates cannot reenable production grammar questions',()=>{for(const row of rows){const doc=makeDocument([row.text],'Current');assert.ok(!reviewStyleIssues(doc,refs,{engineIssues:mapped(doc,row),includeCompleteLcbReview:true,includeReviewSuggestions:true}).some(i=>i.checkId===checkId));}});
