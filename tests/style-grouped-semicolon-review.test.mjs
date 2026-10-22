import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument}from '../app/core.mjs';import {workerWords}from './helpers/spelling-worker.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';import {groupedSemicolonReviewIssues,GROUPED_SEMICOLON_REVIEW_SCOPE}from '../app/style-grouped-semicolon-review.mjs';import {styleRuleInventory}from '../app/style-rule-inventory.mjs';import {CHECK_COVERAGE}from '../app/style-coverage.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),words=await workerWords(),make=t=>makeDocument([t],'Current',[],[],words),find=d=>jointStylisticIssues(d,refs,{includeReviewSuggestions:true}).filter(i=>i.checkId==='lcb-grouped-semicolon-review'),base='The commission shall review agronomists, demographers; cartographers, lexicographers and geologists, climatologists.';
const exact=(d,i)=>{const e=i.groupedSeriesEvidence;assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(d.text.slice(i.evidenceStart,i.evidenceEnd),e.text);assert.equal(d.text.slice(e.evidenceStart,e.evidenceEnd),e.text);for(const r of [e.introducer,...e.groups,...e.candidateConjunctions])assert.equal(d.text.slice(r.start,r.end),r.text);assert.equal(i.suggestion,null);assert.ok(i.references.every(r=>r.preferred===null));};
test('unfamiliar semicolon-separated noun and clause groups receive full conditional structural evidence',()=>{
 for(const text of [base,'The record includes applicants qualify, officers decide; residents register, workers apply and notices issue, records remain.']){const d=make(text),before=JSON.stringify(d),found=find(d);assert.equal(found.length,1,text);const i=found[0];exact(d,i);assert.equal(i.groupedSeriesEvidence.groups.length,2);assert.equal(i.groupedSeriesEvidence.candidateConjunctions.length,1);assert.equal(i.groupedSeriesEvidence.candidateConjunctions[0].separatorBefore,'none');assert.match(i.message,/may belong inside that group/);assert.equal(JSON.stringify(d),before);}
});
test('unfamiliar phrases and many groups have no vocabulary or source-length cap',()=>{
 const text='The record includes '+('qualified '.repeat(40))+'agronomists, demographers; '+Array(35).fill('cartographers, lexicographers').join('; ')+' and geologists, climatologists.',d=make(text),[i]=find(d);assert.ok(i);exact(d,i);assert.equal(i.groupedSeriesEvidence.groups.length,36);assert.ok(i.text.length>1000);
});
test('a comma before and remains reviewable only for two possible comma-containing groups',()=>{
 const d=make(base.replace(' and ',' , and ')),[i]=find(d);assert.ok(i);assert.equal(i.groupedSeriesEvidence.candidateConjunctions[0].separatorBefore,'comma');exact(d,i);assert.equal(find(make('The record includes agronomists, demographers; cartographers, lexicographers, and geologists.')).length,0);
});
test('correct final semicolons simple lists pairs empty groups and numeric grouping stay protected',()=>{
 for(const text of [base.replace(' and ','; and '),'The record includes agronomists, demographers, and cartographers.','The record includes agronomists; demographers and cartographers.','The record includes agronomists, demographers;; cartographers, lexicographers and geologists, climatologists.','The record includes 1,000; 2,000 and 3,000.'])assert.equal(find(make(text)).length,0,text);
});
test('existing precise conjunction ownership stays one stop and does not become a conditional duplicate',()=>{
 const d=make('The department shall collect applications, reports; permits, licenses and records, notices.'),all=jointStylisticIssues(d,refs,{includeReviewSuggestions:true});assert.equal(all.filter(i=>i.checkId==='semicolon-series').length,1);assert.equal(find(d).length,0);assert.equal(all.find(i=>i.checkId==='semicolon-series').suggestion,'; and');
});
test('complete semicolon construction has one grouped owner without the broad unfamiliar-series question',()=>{
 const d=make('The commission shall review agronomists, demographers; cartographers, lexicographers and geologists.'),all=jointStylisticIssues(d,refs,{includeReviewSuggestions:true});assert.equal(all.filter(i=>i.checkId==='lcb-series-punctuation-review').length,0);const grouped=all.filter(i=>i.checkId==='lcb-grouped-semicolon-review');assert.equal(grouped.length,1);assert.equal(grouped[0].text,'agronomists, demographers; cartographers, lexicographers and geologists');assert.ok(grouped[0].references.some(r=>r.rule==='8.148'));exact(d,grouped[0]);
});
test('unrelated lexical findings within the groups do not suppress the distinct group question',()=>{
 const text=base.replace('agronomists','audio-video communication'),d=make(text),all=jointStylisticIssues(d,refs,{includeReviewSuggestions:true});assert.ok(all.some(i=>i.suggestion==='audiovideo'));assert.equal(find(d).length,1);const start=d.text.indexOf('demographers');assert.equal(groupedSemicolonReviewIssues(d,refs,{existingIssues:[{start,end:start+12,checkId:'unrelated-count'}]}).length,1);
});
test('every introducer group connector and internal gap remains original source evidence',()=>{
 const d=make(base),start=d.text.indexOf('shall'),end=d.text.lastIndexOf('.');for(const property of ['struck','excluded'])for(let n=start;n<end;n++){const a=structuredClone(d);a[property]=[{start:n,end:n+1}];assert.equal(find(a).length,0,property+' '+n);}
});
test('literal quotes removed enclosures names tables and original Unicode boundaries stay protected',()=>{
 for(const [open,close]of [['“','”'],['"','"'],['‘','’'],["'","'"]]){const d=make('The officer’s report states '+open+base+close);assert.equal(find(d).length,0,open);const at=d.text.indexOf(open);d.struck=[{start:at,end:at+1}];assert.equal(find(d).length,0,'removed '+open);}
 for(const text of [base.replace('climatologists','climatologistsα'),base.replace('shall','αshall'),base.replace('agronomists','California Healthcare, Research and Prevention Tobacco Tax Act'),base.replace('climatologists','climatologists-')])assert.equal(find(make(text)).length,0,text);const d=make(base);d.blocks[0].formatting={headerGaps:[{},{}]};assert.equal(find(d).length,0);
});
test('groups and candidate conjunctions preserve original nested coordinates through recognized page divisions',()=>{
 const d=makeDocument(['The commission shall review agrono-','AB 192 — 2 —\nline 1 mists, demographers; cartographers, lexicographers and geologists, climatologists.'],'Current',[],[],new Set([...words,'agronomists'])),head=d.blocks.find(b=>b.text==='AB 192 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};const before=JSON.stringify(d),[i]=find(d);assert.ok(i);exact(d,i);assert.ok(i.groupedSeriesEvidence.groups[0].text.includes('AB 192'));assert.equal(JSON.stringify(d),before);head.formatting={};head.runningHead=false;head.layoutLabel=false;assert.equal(find(d).length,0);
});
test('grouped context coverage uses actual LCB6 and GPO8.148 with unresolved parallelism explicit',()=>{
 const rows=styleRuleInventory(refs);for(const id of ['lcb-page-6','gpo-8.148']){const r=rows.find(r=>r.id===id);assert.equal(r.status,'Partially automated');assert.match(r.scope,/without a fixed noun vocabulary/);assert.match(r.scope,/parallelism or legal scope is asserted/);assert.match(r.scope,/not whole punctuation automation/);}assert.equal(CHECK_COVERAGE.find(r=>r.title==='Grouped series structure').text,GROUPED_SEMICOLON_REVIEW_SCOPE);
});
test('unclassified personal wording can receive a group question without a name or identity assertion',()=>{
 const d=make(base.replace('agronomists','John Smith')),before=JSON.stringify(d),[i]=find(d);assert.ok(i);assert.equal(i.suggestion,null);assert.ok(i.references.every(r=>r.guidePage===6||r.rule==='8.148'));assert.ok(i.groupedSeriesEvidence.groups[0].text.includes('John Smith'));assert.equal(JSON.stringify(d),before);assert.match(GROUPED_SEMICOLON_REVIEW_SCOPE,/do not establish or change identity/);
});
test('source-example clause layouts can have no commas in either final possible group',()=>{
 // GPO8.148's bird example has commas in the first clause and no commas in
 // the final clauses. An introduced synthetic variant lacks its final
 // semicolon. Earlier comma-containing evidence still matters; requiring
 // commas on both sides of the last and would miss this source layout.
 const text='The record includes reptiles, amphibians, and predatory mammals swallow their prey whole or in large pieces, bones included; waterfowl habitually take shellfish entire and gallinaceous birds are provided with gizzards.',d=make(text),[i]=find(d);assert.ok(i);exact(d,i);const c=i.groupedSeriesEvidence.candidateConjunctions[0];assert.equal(c.leftItemCount,1);assert.equal(c.rightItemCount,1);assert.equal(find(make(text.replace('entire and','entire; and'))).length,0);assert.equal(find(make(text.replace('The record includes ',''))).length,0);
});
