import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';
import {introducedSeriesReviewIssues,INTRODUCED_SERIES_REVIEW_SCOPE}from '../app/style-introduced-series-review.mjs';
import {styleRuleInventory}from '../app/style-rule-inventory.mjs';import {CHECK_COVERAGE}from '../app/style-coverage.mjs';
import {GENERAL_MODIFIER_REVIEW_RULE}from '../app/offline-rules.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),make=text=>makeDocument([text],'Current'),all=d=>jointStylisticIssues(d,refs,{includeReviewSuggestions:true}),find=d=>all(d).filter(i=>i.introducedSeriesEvidence);
const long='The record includes '+('retained '.repeat(16))+'affidavits, '+('sealed '.repeat(18))+'invoices and '+('sworn '.repeat(15))+'attestations.';
function exact(d,i){const e=i.introducedSeriesEvidence;assert.equal(i.suggestion,null);assert.ok(i.references.every(r=>r.preferred===null));assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(d.text.slice(e.evidenceStart,e.evidenceEnd),e.text);for(const r of [e.introducer,...e.items,e.conjunction])assert.equal(d.text.slice(r.start,r.end),r.text);}
test('long introduced phrases have no eight-word item or total source cap',()=>{
 const d=make(long),before=JSON.stringify(d),[i]=find(d);assert.ok(i);exact(d,i);assert.equal(i.checkId,'lcb-introduced-series-review');assert.equal(i.introducedSeriesEvidence.items.length,3);assert.ok(i.text.length>350);assert.equal(JSON.stringify(d),before);
 const huge=make('The record includes '+Array(40).fill('retained '.repeat(12)+'affidavits').join(', ')+' and '+('sworn '.repeat(90))+'attestations.'),[x]=find(huge);assert.ok(x);exact(huge,x);assert.equal(x.introducedSeriesEvidence.items.length,41);
});
test('unfamiliar clauses remain conditional candidates rather than asserted noun roles',()=>{
 const d=make('The record includes records apply, workers remain and notices are required.'),[i]=find(d);assert.ok(i);exact(d,i);assert.equal(i.introducedSeriesEvidence.items.length,3);assert.match(i.message,/no grammatical role, parallelism or replacement/);assert.equal(i.suggestion,null);
});
test('existing conditional series questions retain their key and gain whole introduced context',()=>{
 const d=make('The record includes applicants qualify, officers decide and residents register.'),[i]=find(d);assert.ok(i);assert.equal(i.checkId,'lcb-series-punctuation-review');assert.equal(i.hasIntroducedSeriesReview,true);assert.equal(all(d).filter(i=>i.checkId==='lcb-introduced-series-review').length,0);exact(d,i);assert.ok(i.introducedSeriesEvidence.text.startsWith('includes '));
});
test('independent lexical and number findings within items do not hide punctuation questions',()=>{
 const d=make('The record includes audio-video communication, sworn affidavits and retained invoices.'),issues=all(d);assert.ok(issues.some(i=>i.suggestion==='audiovideo'));const i=issues.find(i=>i.introducedSeriesEvidence);assert.ok(i);exact(d,i);
 const start=d.text.indexOf('sworn');assert.equal(introducedSeriesReviewIssues(d,refs,{existingIssues:[{start,end:start+5,checkId:'unrelated-number',suggestion:'3'}]}).length,1);
});
test('precise punctuation retains conjunction ownership and default review stays opt-in',()=>{
 const d=make('The department shall collect applications, reports and records.');assert.equal(find(d).length,0);assert.ok(all(d).some(i=>i.rule==='Punctuation: Commas'));assert.equal(jointStylisticIssues(make(long),refs).filter(i=>i.introducedSeriesEvidence).length,0);
});
test('correct commas pairs nested alternatives qualifiers and pure labels stay protected',()=>{
 for(const text of [long.replace(' and ', ', and '),'The record includes affidavits and attestations.','The record includes a hotel, motel, bed and breakfast inn, or lodging.','The project includes bonus, incentives or concessions, waivers or reductions, and parking ratios.','The record includes one, two and three.','The record includes a, b or c.','The record includes 1,000, 2,000 and 3,000.','The commission shall review institutions, public and private.'])assert.equal(introducedSeriesReviewIssues(make(text),refs).length,0,text);
});
test('complete establishing introducer items commas and spaces reject source damage',()=>{
 const text='The record includes retained affidavits, sealed invoices and sworn attestations.',d=make(text),start=d.text.indexOf('includes'),end=d.text.lastIndexOf('.');
 for(const property of ['struck','excluded'])for(let n=start;n<end;n++){const clone=structuredClone(d);clone[property]=[{start:n,end:n+1}];assert.equal(introducedSeriesReviewIssues(clone,refs).length,0,property+' '+n);}
});
test('removed literal openers known names tables headings and partial Unicode compounds stay protected',()=>{
 for(const [open,close]of [['“','”'],['"','"'],['‘','’'],["'","'"]]){const d=make('The officer’s report states '+open+long+close),at=d.text.indexOf(open);assert.equal(introducedSeriesReviewIssues(d,refs).length,0);d.struck=[{start:at,end:at+1}];assert.equal(introducedSeriesReviewIssues(d,refs).length,0,'removed '+open);}
 for(const text of [long.replace('includes','αincludes'),long.replace('attestations.','attestationsα.'),long.replace('attestations.','attestations\u0301.'),long.replace('attestations.','attestations-.'),long.replace('affidavits','California Healthcare, Research and Prevention Tobacco Tax Act')])assert.equal(introducedSeriesReviewIssues(make(text),refs).length,0,text);
 const d=make(long);d.blocks[0].formatting={headerGaps:[{},{}]};assert.equal(introducedSeriesReviewIssues(d,refs).length,0);
});
test('nested witnesses retain original source positions across known page headers and divisions',()=>{
 const d=makeDocument(['The record includes retained affida-','AB 192 — 2 —\nline 1 vits, sealed invoices and sworn attestations.'],'Current',[],[],new Set(['affidavits'])),head=d.blocks.find(b=>b.text==='AB 192 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};const before=JSON.stringify(d),[i]=find(d);assert.ok(i);exact(d,i);assert.ok(i.introducedSeriesEvidence.items[0].text.includes('AB 192'));assert.equal(JSON.stringify(d),before);head.formatting={};head.runningHead=false;head.layoutLabel=false;assert.equal(introducedSeriesReviewIssues(d,refs).length,0);
});
test('known thousands commas remain inside items and unknown names get no identity assertion',()=>{
 const d=make('The record includes 1,000 unfamiliar objects, 2,000 unusual devices and 3,000 unlisted products.'),[i]=find(d);assert.ok(i);exact(d,i);assert.equal(i.introducedSeriesEvidence.items.length,3);assert.equal(i.introducedSeriesEvidence.items[0].text,'1,000 unfamiliar objects');
 const n=make('The record includes John Smith, Jane Doe and Sam Roe.'),[x]=find(n);assert.ok(x);assert.equal(x.suggestion,null);assert.match(INTRODUCED_SERIES_REVIEW_SCOPE,/not authenticated or edited/);
});
test('source coverage records selected complete method and keeps semantic limits partial',()=>{
 const rows=styleRuleInventory(refs);for(const id of ['lcb-page-6','gpo-8.46']){const r=rows.find(r=>r.id===id);assert.equal(r.status,'Partially automated');assert.match(r.scope,/without an item-word or source-length cap/);assert.match(r.scope,/not whole serial-comma automation/);}assert.equal(CHECK_COVERAGE.find(r=>r.title==='Complete introduced series context').text,INTRODUCED_SERIES_REVIEW_SCOPE);
});
test('incidental preposition or conditional clauses cannot become extra parallel items',()=>{
 for(const text of ['The record includes contracted hospitals, to claim for emergency department services and as an outpatient followup.','The record includes retained records, if applicants qualify and workers register.'])assert.equal(introducedSeriesReviewIssues(make(text),refs).length,0,text);
 const d=make('The record includes to retain records, to archive forms and to submit affidavits.'),[i]=find(d);assert.ok(i);exact(d,i);
});
test('new broad punctuation questions retain independent offline noun-sequence findings',()=>{
 const text='The record includes '+('retained '.repeat(12))+'community health worker services, '+('sealed '.repeat(12))+'invoices and '+('sworn '.repeat(12))+'attestations.',d=make(text),start=text.indexOf('community health'),end=start+'community health worker'.length,headStart=text.indexOf('services'),headEnd=headStart+8,engine={start,end,text:text.slice(start,end),matchText:text.slice(start,end),head:'services',headStart,headEnd,suggestion:null,engineRule:GENERAL_MODIFIER_REVIEW_RULE,reviewSuggested:true,reviewVariant:'noun-sequence'};
 const found=jointStylisticIssues(d,refs,{includeReviewSuggestions:true,engineIssues:[engine]});assert.ok(found.some(i=>i.checkId==='lcb-introduced-series-review'));assert.ok(found.some(i=>i.checkId==='lcb-general-unit-modifier-review'&&i.start===start&&i.end===end));
});
test('finite continuations reduced qualifications and inner name components are not separate items',()=>{
 for(const text of ['The record includes a synthetic cannabinoid, is a cannabis product, regardless of the nature or source of the cannabinoid.','The record includes pupils served by a charter school, shall not participate in a program and a local agency shall not generate funding.','The agency shall not issue another prescription unless an examination is conducted, either in person or using telehealth.','The record includes the proceeds of bonds issued under Section 101221, issued and sold for the purposes of this chapter.','The allocation includes fuel reduction efforts, performed by the Military Department in conjunction with the Department of Forestry and Fire Protection.','The allocation includes a financial literacy initiative, associated with the California Kids Investment and Development Savings Program.'])assert.equal(introducedSeriesReviewIssues(make(text),refs).length,0,text);
});
