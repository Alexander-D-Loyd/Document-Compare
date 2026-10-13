import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';import {introducedSeriesReviewIssues}from '../app/style-introduced-series-review.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),make=text=>makeDocument([text],'Current'),check=text=>introducedSeriesReviewIssues(make(text),refs);
const indemnity='The agreement shall include an indemnification clause that provides that if an action occurs after disposition violates this subparagraph, the person or entity that acquired the property shall be liable for the penalties.';

test('AB 76 conditional indemnification wording is not a three-item parallel series',()=>{
 const d=make(indemnity),before=JSON.stringify(d);assert.equal(introducedSeriesReviewIssues(d,refs).length,0);assert.equal(jointStylisticIssues(d,refs,{includeReviewSuggestions:true}).filter(i=>i.introducedSeriesEvidence).length,0);assert.equal(JSON.stringify(d),before);
});

test('bounded embedded that-if predicates protect incidental commas and inner binary alternatives',()=>{
 for(const verb of ['provides','provide','states','state','requires','require']){const text='The agreement includes a clause that '+verb+' that if an action occurs, the person or entity shall report.';assert.equal(check(text).length,0,text);}
 for(const text of ['The agreement includes a condition that provides that if an action occurs, the person and entity shall report.','The record includes an affidavit that states that if a permit expires, the applicant or recipient shall report.'])assert.equal(check(text).length,0,text);
});

test('independent parallel lists and uniformly conditional candidate clauses stay reviewable',()=>{
 const ordinary='The record includes retained affidavits, sealed invoices and sworn attestations.';assert.equal(check(ordinary).length,1);
 const uniform='The agreement includes a clause that provides that if a permit expires notice is required, a covenant that provides that if a permit is renewed notice is required and a condition that provides that if a permit is suspended notice is required.';assert.equal(check(uniform).length,1);
 const text=indemnity+' '+ordinary,d=make(text),found=introducedSeriesReviewIssues(d,refs);assert.equal(found.length,1);assert.ok(found[0].start>text.indexOf('The record'));assert.equal(d.text.slice(found[0].start,found[0].end),found[0].text);
});

test('conditional qualifiers span recognized physical rows without changing the source',()=>{
 const d=makeDocument(['line 1 The agreement includes a clause that provides\nline 2 that if an action occurs, the person or entity shall report.'],'Current'),before=JSON.stringify(d);assert.equal(introducedSeriesReviewIssues(d,refs).length,0);assert.equal(JSON.stringify(d),before);
});
