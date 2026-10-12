import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';import {prepareOfflineLanguage,mapOfflineIssues}from '../app/offline-language.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';import {GENERAL_MODIFIER_REVIEW_RULE}from '../app/offline-rules.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=t=>makeDocument([t],'Current');
function candidate(plan,term,head,variant='open-modifier'){
 const start=plan.text.indexOf(term),headStart=plan.text.indexOf(head,start+term.length);return {start,end:start+term.length,headStart,headEnd:headStart+head.length,head,evidenceStart:0,evidenceEnd:plan.text.length,suggestion:null,engineRule:GENERAL_MODIFIER_REVIEW_RULE,reviewSuggested:true,reviewVariant:variant};
}
test('unfamiliar modifier review maps complete selections and real rules without inventing a replacement',()=>{
 for(const [text,term,head,variant]of [['The hospital collects patient reported outcome measures.','patient reported','measures','open-modifier'],['The system requires cryptographically-signed attestations.','cryptographically-signed','attestations','ly-hyphen']]){
  const doc=make(text),source=JSON.stringify(doc),plan=prepareOfflineLanguage(doc),mapped=mapOfflineIssues(doc,plan,[candidate(plan,term,head,variant)],'style'),merged=jointStylisticIssues(doc,refs,{engineIssues:mapped}),found=merged.find(i=>i.checkId==='lcb-general-unit-modifier-review');
  assert.equal(mapped.length,1);assert.ok(found);assert.equal(found.matchText,term);assert.equal(found.suggestion,null);assert.equal(found.confidence,'Review Suggested');assert.equal(doc.text.slice(found.start,found.end),term);assert.deepEqual(found.references.map(r=>r.rule),variant==='ly-hyphen'?['Hyphenation, item 3','6.20']:['Hyphenation, item 1','6.15']);assert.equal(JSON.stringify(doc),source);
 }
});
test('null-suggestion review accepts only the recognized rule and validated variant',()=>{
 const doc=make('The hospital collects patient reported outcome measures.'),p=prepareOfflineLanguage(doc),raw=candidate(p,'patient reported','measures');
 for(const bad of [{...raw,reviewSuggested:false},{...raw,engineRule:'UNKNOWN'},{...raw,reviewVariant:'arbitrary'},{...raw,headStart:raw.headStart+1},{...raw,start:-1},{...raw,suggestion:''}])assert.equal(mapOfflineIssues(doc,p,[bad],'style').length,0);
 assert.equal(mapOfflineIssues(doc,p,[raw],'grammar').length,0);
});
test('complete source guards protect unfamiliar selected words connecting spaces and noun evidence',()=>{
 const text='The hospital collects patient reported outcome measures.';
 for(const field of ['struck','excluded'])for(let at=0;at<text.length;at++){
  const doc=make(text),p=prepareOfflineLanguage(doc),raw=candidate(p,'patient reported','measures');doc[field].push({start:at,end:at+1});assert.equal(mapOfflineIssues(doc,p,[raw],'style').length,0,field+' '+at);
 }
 const doc=make('The hospital collects patient reported "outcome" measures.'),p=prepareOfflineLanguage(doc);assert.equal(mapOfflineIssues(doc,p,[candidate(p,'patient reported','measures')],'style').length,0);
});
test('unfamiliar review preserves precise existing corrections and known guide conflict exclusions',()=>{
 for(const text of ['The agency requires data sharing agreements.','The agency requires collective bargaining agreements.']){
  const doc=make(text),p=prepareOfflineLanguage(doc),term=text.includes('data')?'data sharing':'collective bargaining',raw=candidate(p,term,'agreements'),mapped=mapOfflineIssues(doc,p,[raw],'style'),merged=jointStylisticIssues(doc,refs,{engineIssues:mapped});assert.ok(!merged.some(i=>i.checkId==='lcb-general-unit-modifier-review'));if(term==='data sharing')assert.ok(merged.some(i=>i.suggestion==='data-sharing'));
 }
});
