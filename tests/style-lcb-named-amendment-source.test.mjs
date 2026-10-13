import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
import {lcbReferenceChainIssues,lcbReferenceIdentityProtectionRanges} from '../app/style-lcb-review-reference-chains.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=(text,context='Bill')=>makeDocument([context==='Digest'?'LEGISLATIVE COUNSEL’S DIGEST\n'+text+'\nThe people do enact as follows:':'The people do enact as follows:\nline 1 '+text],'Current');
const named=d=>jointStylisticIssues(d,refs,{includeReviewSuggestions:true}).filter(i=>i.checkId==='lcb-named-amendment');
const phrase='Fourteenth Amendment to the United States Constitution';

test('exact printed named amendment owns case variants before generic Bill and Digest ordinals',()=>{
 for(const context of ['Bill','Digest'])for(const [name,wanted]of [
  ['fourteenth Amendment to the United States Constitution',[['fourteenth','Fourteenth']]],
  ['Fourteenth amendment to the United States Constitution',[['amendment','Amendment']]],
  ['14th amendment to the United States Constitution',[['14th','Fourteenth'],['amendment','Amendment']]],
  ['14th Amendment to the United States Constitution',[['14th','Fourteenth']]],
 ]){
  const d=make('The agency applies the '+name+'.',context),before=JSON.stringify(d),all=jointStylisticIssues(d,refs,{includeReviewSuggestions:true}),found=all.filter(i=>i.checkId==='lcb-named-amendment');
  assert.deepEqual(found.map(i=>[d.text.slice(i.start,i.end),i.suggestion]),wanted,context+' '+name);
  assert.ok(!all.some(i=>i.checkId==='numerals'&&i.suggestion==='14th'));
  for(const i of found){assert.equal(d.text.slice(i.evidenceStart,i.evidenceEnd),name);assert.equal(i.guidePage,22);assert.ok(i.references.some(r=>r.guideId==='lcb'&&r.ruleText===phrase+'.'));assert.ok(i.references[0].sourcePassage.text.includes('Fourteenth Amendment'));}
  assert.equal(JSON.stringify(d),before);
 }
});

test('complete lowercase printed name restores its words while retaining existing complete-name case ownership',()=>{
 const d=make('The agency applies the fourteenth amendment to the united states constitution.'),found=jointStylisticIssues(d,refs,{includeReviewSuggestions:true});
 assert.deepEqual(found.map(i=>[d.text.slice(i.start,i.end),i.suggestion]),[['fourteenth','Fourteenth'],['amendment','Amendment'],['united states constitution','United States Constitution']]);
 assert.ok(!found.some(i=>i.suggestion==='14th'));
});

test('compliant source variants remain quiet without claiming unrelated amendment identity',()=>{
 for(const context of ['Bill','Digest'])for(const text of [phrase,phrase.toUpperCase(),'14th amendment to the contract','Fourteenth Amendment to a state constitution','14th Amendment of the United States Constitution','14th Amendment to the California Constitution','13th Amendment to the United States Constitution','Fourteenth Amendment to the United States Constitutional Foundation','xFourteenth Amendment to the United States Constitution','Fourteenth Amendment to the United States Constitutioné','non-fourteenth Amendment to the United States Constitution','14th Amendment to the United States Constitution-identifier'])assert.equal(named(make('The agency applies the '+text+'.',context)).length,0,text);
 const ordinary=jointStylisticIssues(make('The agency applies the fourteenth amendment to the contract.'),refs,{includeReviewSuggestions:true});assert.ok(ordinary.some(i=>i.checkId==='numerals'&&i.suggestion==='14th'));
});

test('complete quoted name is protected and its exact quoted case controls later instances only in this bill',()=>{
 const term='fourteenth Amendment to the United States Constitution';
 for(const quote of [['“','”'],['"','"']])assert.equal(named(make('The label '+quote[0]+term+quote[1]+' is literal.')).length,0);
 const d=make('“'+term+'” means the referenced text. The agency applies the '+term+'.');assert.equal(named(d).length,0);
 assert.equal(named(make('The agency applies the '+term+'.')).length,1);
});

test('every original character establishing the exact name remains mandatory source evidence',()=>{
 const d=make('The agency applies the fourteenth amendment to the United States Constitution.'),start=d.text.indexOf('fourteenth'),end=start+'fourteenth amendment to the United States Constitution'.length;
 assert.equal(lcbReferenceChainIssues(d,refs).filter(i=>i.checkId==='lcb-named-amendment').length,2);
 for(const field of ['struck','excluded'])for(let at=start;at<end;at++){
  const bad=structuredClone(d);bad[field].push({start:at,end:at+1});
  assert.equal(lcbReferenceChainIssues(bad,refs).filter(i=>i.checkId==='lcb-named-amendment').length,0,field+' '+at);
  assert.ok(!lcbReferenceIdentityProtectionRanges(bad,refs).some(r=>r.start===start));
 }
});

test('headings and table fields cannot manufacture the exact name role',()=>{
 const heading=makeDocument(['fourteenth Amendment to the United States Constitution\nThe people do enact as follows:\nline 1 An unrelated provision applies.'],'Current');assert.equal(named(heading).length,0);
 const table=make('The agency applies the fourteenth amendment to the United States Constitution.');table.blocks.at(-1).formatting={headerGaps:[{},{},{}]};assert.equal(named(table).length,0);
});

test('recognized page heads and margins preserve complete evidence and precise word-only selections',()=>{
 const d=makeDocument(['The people do enact as follows:\nline 1 The agency applies the fourteenth amendment to the','AB 192 — 2 —\nline 1 United States Constitution.'],'Current'),head=d.blocks.find(b=>b.text==='AB 192 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};
 const before=JSON.stringify(d),found=named(d);assert.deepEqual(found.map(i=>[d.text.slice(i.start,i.end),i.suggestion]),[['fourteenth','Fourteenth'],['amendment','Amendment']]);assert.equal(JSON.stringify(d),before);
 head.runningHead=false;head.layoutLabel=false;head.formatting={};assert.equal(named(d).length,0);
});
