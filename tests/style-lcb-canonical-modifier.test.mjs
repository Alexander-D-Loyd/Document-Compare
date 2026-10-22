import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {makeDocument} from '../app/core.mjs';
import {mapOfflineIssues,prepareOfflineLanguage} from '../app/offline-language.mjs';
import {reviewStyleIssues} from '../app/style-review.mjs';
import {canonicalLcbModifierForm,settledCanonicalModifierRanges} from '../app/style-lcb-canonical-modifier.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const run=spawnSync(fileURLToPath(new URL('../engines/runtime/python/python.exe',import.meta.url)),['-I','-B',fileURLToPath(new URL('./lcb-canonical-modifier-parser.py',import.meta.url))],{encoding:'utf8',windowsHide:true});
if(run.error)throw run.error;assert.equal(run.status,0,run.stderr);
const rows=JSON.parse(run.stdout),options={includeCompleteLcbReview:true,includeReviewSuggestions:true};
const mapped=(doc,row)=>mapOfflineIssues(doc,prepareOfflineLanguage(doc),row.candidates,'style',{includeLcbReaderReview:true});
const review=(doc,row)=>reviewStyleIssues(doc,refs,{...options,engineIssues:mapped(doc,row)});
const lexicalQuestions=issues=>issues.filter(i=>['lcb-source-form-review','lcb-parser-modifier-review'].includes(i.checkId));

test('complete exact source forms with validated direct before-head roles settle redundant modifier and source-entry questions',()=>{
 for(const index of [0,1,2,3,4,5,6,7]){
  const row=rows[index],doc=makeDocument([row.text],'Current'),before=JSON.stringify(doc),engineIssues=mapped(doc,row),settled=settledCanonicalModifierRanges(doc,refs,engineIssues);
  assert.ok(settled.length,row.text);assert.deepEqual(lexicalQuestions(review(doc,row)),[],row.text);assert.equal(JSON.stringify(doc),before);
  for(const r of settled){assert.ok(r.sourcePage>=3&&r.sourcePage<=20);assert.ok(r.sourceEntry);assert.equal(r.sourceForm,r.sourceForm.toLowerCase());assert.equal(r.role,'Validated direct before-head source form');}
 }
 assert.deepEqual(lexicalQuestions(reviewStyleIssues(makeDocument([rows[1].text],'Current'),refs,options)),[],'A matching listed form needs no parser permission.');
});

test('unqualified noun spellings cannot override the same source family’s role-specific modifier spelling',()=>{
 for(const index of [15,16,17]){
  const row=rows[index],doc=makeDocument([row.text],'Current'),engineIssues=mapped(doc,row);if(index!==17)assert.ok(engineIssues.length,row.text);assert.deepEqual(settledCanonicalModifierRanges(doc,refs,engineIssues),[],row.text);assert.ok(review(doc,row).some(i=>i.start<row.text.indexOf('workers')||i.matchText==='cost of living'),row.text);
 }
 const doc=makeDocument([rows[18].text],'Current');assert.deepEqual(settledCanonicalModifierRanges(doc,refs,mapped(doc,rows[18])),[],'A source spelling without a complete parsed role witness is not automatically settled.');
});

test('unlisted groupings and matching listed meaning-qualified forms do not become speculative questions',()=>{
 for(const index of [8,9,10,11,12,13,14,19]){const row=rows[index],doc=makeDocument([row.text],'Current'),found=review(doc,row);assert.ok(!found.some(i=>['lcb-parser-modifier-review','lcb-grouped-modifier-review','lcb-ambiguous-modifier-review','lcb-parsed-predicate-compound-review','lcb-postnominal-compound-review'].includes(i.checkId)||i.checkId?.startsWith('lcb-semantic-review:')),row.text);}
});

test('source-canonical settlement requires original intact evidence and exact current source, head and source-case conditions',()=>{
 for(const index of [0,1,7]){
  const row=rows[index],original=makeDocument([row.text],'Current'),engineIssues=mapped(original,row);assert.ok(settledCanonicalModifierRanges(original,refs,engineIssues).length);
  for(const field of ['struck','excluded'])for(let at=0;at<original.text.length;at++){const doc=structuredClone(original);doc[field].push({start:at,end:at+1});assert.deepEqual(settledCanonicalModifierRanges(doc,refs,engineIssues),[],field+' '+at+' '+row.text);}
  for(const mutation of ['head','range','case','replacement']){const bad=structuredClone(engineIssues),c=bad[0];if(mutation==='head')c.head='fabricated';if(mutation==='range')c.headEnd--;if(mutation==='case')c.matchText=c.matchText[0].toUpperCase()+c.matchText.slice(1);if(mutation==='replacement')c.suggestion='fabricated';assert.deepEqual(settledCanonicalModifierRanges(original,refs,bad),[],mutation);}
 }
 const row=rows[0],doc=makeDocument([row.text],'Current'),engineIssues=mapped(doc,row),bad=structuredClone(engineIssues);bad[0].nounRoleEvidence.predicate.parsedText='fabricated';assert.deepEqual(settledCanonicalModifierRanges(doc,refs,bad),[]);
 const dash=makeDocument([rows[1].text.replace('full-time','full—time')],'Current');assert.deepEqual(settledCanonicalModifierRanges(dash,refs,mapped(makeDocument([rows[1].text],'Current'),rows[1])),[]);
});

test('source-canonical forms preserve exact physical line ownership without changing independent protections',()=>{
 const row=rows[0],cut=row.text.indexOf('care'),doc=makeDocument(['line 1 '+row.text.slice(0,cut),'line 2 '+row.text.slice(cut)],'Current'),engineIssues=mapped(doc,row),settled=settledCanonicalModifierRanges(doc,refs,engineIssues);assert.ok(settled.length);assert.ok(doc.text.slice(settled[0].start,settled[0].end).includes('line 2'));assert.deepEqual(lexicalQuestions(review(doc,row)),[]);
 for(const term of ['“'+row.text+'”',"'"+row.text+"'"]){const d=makeDocument([term],'Current');assert.deepEqual(mapped(d,row),[]);}
});
