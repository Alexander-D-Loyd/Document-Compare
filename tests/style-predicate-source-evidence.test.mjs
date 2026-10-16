import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {styleContext} from '../app/style-context.mjs';
import {listedPredicateCandidates} from '../app/style-predicate-examples.mjs';
import {productiveEndWordCandidates} from '../app/style-end-word-predicates.mjs';
import {guardedPredicateCompoundEvidence} from '../app/style-predicate-source-evidence.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=t=>makeDocument(['The people do enact as follows:\nline 1 '+t],'Current');
const guarded=doc=>{const ctx=styleContext(doc);return guardedPredicateCompoundEvidence(doc,[...listedPredicateCandidates(ctx.source,doc.text).map(p=>p.m),...productiveEndWordCandidates(ctx.source)],ctx);};
test('production predicate guard requires every source support character including whitespace and closing punctuation',()=>{
 for(const body of ['The program is not very cloud-based.','The program is cost-effective, age-appropriate, and clear.','The program is cloud-based, subject to this section.']){
  const doc=make(body),saved=structuredClone(doc),proof=guarded(doc);assert.ok(proof.size,body);
  for(const[key,e]of proof)for(const field of ['struck','excluded'])for(let at=e.start;at<e.end;at++){const d=structuredClone(doc);d[field].push({start:at,end:at+1});assert.equal(guarded(d).has(key),false,body+' '+field+' '+at);}
  assert.deepEqual(doc,saved);
 }
});
test('original identifier noun quote and copula continuations cannot manufacture predicate evidence',()=>{
 for(const[body,remove]of [['The program is-code cloud-based.','-code'],['The program mis cloud-based.','m'],['The program is cloud-based software.','software'],['The program is cloud-based-code.','-code'],['The program is cloud-based/unrecognized.','/unrecognized'],['The word “is” cloud-based.','”']])for(const field of ['struck','excluded']){
  const doc=make(body),start=remove==='m'?doc.text.indexOf('mis'):doc.text.indexOf(remove,doc.text.indexOf('The program')>=0?doc.text.indexOf('The program'):0);doc[field].push({start,end:start+remove.length});assert.equal(guarded(doc).size,0,body+' '+field);
  assert.equal(jointStylisticIssues(doc,refs,{includeReviewSuggestions:true}).filter(i=>i.predicateContextEvidence).length,0,body);
 }
});
test('lexical priority owner retains complete validated predicate evidence and rejects fabricated grammar',()=>{
 for(const base of ['health-care','ground-water','wild-land']){
  const body='The program is '+base+'-based.',doc=make(body),[i]=jointStylisticIssues(doc,refs).filter(i=>i.checkId==='lcb-guide-priority');assert.ok(i,body);assert.equal(doc.text.slice(i.evidenceStart,i.evidenceEnd),'is '+base+'-based.');assert.equal(i.predicateContextEvidence.sourceText,doc.text.slice(i.predicateContextEvidence.start,i.predicateContextEvidence.end));
  for(const[bad,remove]of [['The program is-code '+base+'-based.','-code'],['The program is '+base+'-based software.','software'],['The program is '+base+'-based/key.','/key']])for(const field of ['struck','excluded']){const d=make(bad),start=d.text.indexOf(remove);d[field].push({start,end:start+remove.length});assert.equal(jointStylisticIssues(d,refs).filter(i=>i.checkId==='lcb-guide-priority').length,0,bad+' '+field);}
 }
});
test('joint restores complete predicate evidence across physical page margins and accepted word divisions',()=>{
 const doc=makeDocument(['The people do enact as follows:\nline 1 The program is mental-','AB 224 — 2 —\nline 1 health-related for this purpose.'],'Current');const head=doc.blocks.find(b=>b.text==='AB 224 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};
 const saved=structuredClone(doc),[i]=jointStylisticIssues(doc,refs).filter(i=>i.rule==='Hyphenation, item 2 and End words');assert.ok(i);const e=i.predicateContextEvidence;assert.equal(e.kind,'copula-and-closing-role');assert.equal(e.sourceText,doc.text.slice(e.start,e.end));assert.match(e.sourceText,/mental-\nAB 224 — 2 —\nline 1 health-related for/u);assert.equal(e.start,i.evidenceStart);assert.equal(e.end,i.evidenceEnd);assert.deepEqual(doc,saved);
});
test('source evidence ignores unrelated removals after the established closing sentence',()=>{
 const doc=make('The program is cloud-based. Another deleted phrase follows.'),start=doc.text.indexOf('deleted');doc.struck.push({start,end:start+7});assert.equal(guarded(doc).size,1);assert.equal(jointStylisticIssues(doc,refs).filter(i=>i.rule==='Hyphenation, item 2 and End words').length,1);
});
