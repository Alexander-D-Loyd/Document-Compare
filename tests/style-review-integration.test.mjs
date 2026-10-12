import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument}from '../app/core.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=t=>makeDocument([t],'Current');
test('table numeral methods remain visible through the joint table filter with optional reader review',()=>{
 const budget=make('Budget Act of 2024.\n3900-101-3122—For local assistance, State Air Resources\nBoard, payable from the Enhanced Fleet Modernization\nSubaccount, High Polluter Repair or Removal Account.... nineteen million eight hundred thousand'),found=jointStylisticIssues(budget,refs);assert.ok(found.some(i=>i.text==='nineteen million eight hundred thousand'&&i.suggestion==='19,800,000'&&i.checkId==='lcb-table-cell-figures'));
 const d=make('The following table applies:\nCounty             Alpha             Beta\nAlpine             three             two');for(const b of d.blocks.slice(1))b.formatting={headerGaps:[{start:18,end:20},{start:35,end:37}]};
 assert.equal(jointStylisticIssues(d,refs).filter(i=>i.checkId==='lcb-table-cell-review').length,0);const review=jointStylisticIssues(d,refs,{includeReviewSuggestions:true}).filter(i=>i.checkId==='lcb-table-cell-review');assert.deepEqual(review.map(i=>i.matchText),['three','two']);assert.ok(review.every(i=>i.suggestion===null&&i.context==='Table'));
});
test('complete plural legal references check every written member and avoid unsafe constitutional replacements',()=>{
 const text='Sections one and two of the Government Code apply. Sections 1 and three apply.',found=jointStylisticIssues(make(text),refs);assert.deepEqual(found.filter(i=>i.suggestion&&/^\d+$/.test(i.suggestion)).map(i=>[i.text,i.suggestion]),[['one','1'],['two','2'],['three','3']]);
 const doc=make('Article thirteen B of the California Constitution applies.');for(const options of [{},{includeReviewSuggestions:true}])assert.ok(!jointStylisticIssues(doc,refs,options).some(i=>i.text==='thirteen'&&i.suggestion==='13'));const review=jointStylisticIssues(doc,refs,{includeReviewSuggestions:true}).find(i=>i.reviewKind==='constitutional-reference');assert.ok(review);assert.equal(review.suggestion,null);assert.equal(review.matchText,'thirteen');
});
test('desktop review integrates uncertain money and unfamiliar related-number contexts without invented replacements',()=>{
 const d=make('The people of the State of California do enact as follows:\nSEC. 1. The laboratory receives three zygotes, four zygotes, and 10 zygotes. The department shall charge $5 or five dollars.'),source=JSON.stringify(d),precise=jointStylisticIssues(d,refs),review=jointStylisticIssues(d,refs,{includeReviewSuggestions:true});
 assert.deepEqual(review.filter(i=>i.reviewKind==='numerical-relationship').map(i=>i.matchText),['three','four']);assert.deepEqual(review.filter(i=>i.checkId==='lcb-unknown-money-review').map(i=>i.matchText),['$5','five dollars']);
 assert.ok(review.filter(i=>i.reviewSuggested).every(i=>i.suggestion===null));for(const older of precise)assert.ok(review.some(i=>i.start===older.start&&i.end===older.end&&i.suggestion===older.suggestion));assert.equal(JSON.stringify(d),source);
});
test('nested monetary and number-series evidence restores original source positions after preceding page divisions',()=>{
 const d=makeDocument(['The people of the State of California do enact as follows:\nSEC. 1. The princi-','line 1 pal office receives three zygotes, four zygotes, and 10 zygotes. Pay $5.'],'Current',[],[],new Set(['principal'])),review=jointStylisticIssues(d,refs,{includeReviewSuggestions:true}),numbers=review.filter(i=>i.reviewKind==='numerical-relationship'),money=review.find(i=>i.checkId==='lcb-unknown-money-review');
 assert.equal(numbers.length,2);for(const n of numbers){assert.equal(d.text.slice(n.start,n.end),n.matchText);assert.equal(d.text.slice(n.relationshipEvidence.start,n.relationshipEvidence.end),'three zygotes, four zygotes, and 10 zygotes');for(const m of n.relationshipEvidence.members)assert.equal(Number.isNaN(m.value),false);assert.deepEqual(n.relationshipEvidence.members.map(m=>d.text.slice(m.start,m.end)),['three','four','10']);}
 assert.ok(money);assert.equal(d.text.slice(money.start,money.end),'$5');assert.ok(d.text.slice(money.sectionContext.start,money.sectionContext.end).includes('princi-\nline 1 pal'));
});
test('reader-assisted review closes unresolved meaning gaps alongside unchanged precise corrections',()=>{
 const d=make('The commission must device its allocation framework. Staff purchase stationary supplies. The tenant occupies the property.'),source=JSON.stringify(d),base=jointStylisticIssues(d,refs),broad=jointStylisticIssues(d,refs,{includeReviewSuggestions:true});
 assert.ok(!base.some(i=>i.text==='device'));assert.ok(broad.some(i=>i.text==='device'&&i.reviewSuggested&&i.suggestion===null));assert.ok(broad.some(i=>i.text==='tenant'&&i.reviewSuggested));
 for(const issue of base)assert.ok(broad.some(i=>i.start===issue.start&&i.end===issue.end&&i.suggestion===issue.suggestion&&JSON.stringify(i.references)===JSON.stringify(issue.references)));
 assert.equal(broad.filter(i=>i.text==='stationary').length,1);assert.equal(broad.find(i=>i.text==='stationary').suggestion,'stationery');assert.equal(JSON.stringify(d),source);
});
test('review meanings retain full word divisions and original offsets through joint integration',()=>{
 const d=makeDocument(['line 1 The princi-','line 1 pal relationship remains.'],'Current',[],[],new Set(['principal'])),found=jointStylisticIssues(d,refs,{includeReviewSuggestions:true}).filter(i=>i.reviewKind==='meaning');assert.equal(found.length,1);assert.equal(found[0].matchText,'principal');assert.equal(d.text.slice(found[0].start,found[0].end),'princi-\nline 1 pal');assert.ok(found[0].sourceWordDivisions.length);
});
test('review integration preserves quotes and full source strike protections',()=>{
 for(const text of ['The label “principal” applies.',"The label 'device' applies.",'The Principal Institute applies.'])assert.equal(jointStylisticIssues(make(text),refs,{includeReviewSuggestions:true}).filter(i=>i.reviewKind==='meaning').length,0,text);
 const d=make('A device applies.'),at=d.text.indexOf('device');d.struck.push({start:at+2,end:at+3});assert.equal(jointStylisticIssues(d,refs,{includeReviewSuggestions:true}).filter(i=>i.reviewKind==='meaning').length,0);
});
