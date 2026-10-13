import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=doc=>jointStylisticIssues(typeof doc==='string'?makeDocument([doc],'Current'):doc,refs).filter(i=>i.checkId==='serial-commas');

test('multiword noun lists identify the final conjunction and agreed guide rules',()=>{
 for(const [text,expected] of [['The list includes public schools, private hospitals and local clinics.',', and'],['Eligible entities are county agencies, city boards or regional commissions.',', or'],['The plan comprises financial reports, written applications nor oral agreements.',', nor'],['Such as public schools, private hospitals, local clinics and county agencies.',', and']]){
  const doc=makeDocument([text],'Current');const found=check(doc);assert.equal(found.length,1,text);assert.equal(found[0].suggestion,expected);assert.equal(doc.text.slice(found[0].start,found[0].end),expected.slice(2));assert.deepEqual(found[0].references.map(r=>r.rule),['Punctuation: Commas','8.46']);
 }
});

test('corrected lists, nested alternatives, two items and clauses are not flattened',()=>{
 for(const text of ['The list includes public schools, private hospitals, and local clinics.','The list includes public schools and private hospitals.','The list includes city, county, or city and county.','The list includes cities, counties or cities and counties.','The list includes public schools, if eligible and local clinics.','The list includes public schools, hospitals approve plans and local clinics.','The list includes John Smith, Mary Jones and Jane Brown.','Section 1, Section 2 and Article 3 apply.','The list includes public schools, private hospitals and local clinics that qualify.'])assert.equal(check(text).length,0,text);
});

test('existing single-word serial checks do not produce duplicate highlights',()=>{
 const found=jointStylisticIssues(makeDocument(['The list includes apples, pears and bananas.'],'Current'),refs).filter(i=>i.rule==='Punctuation: Commas');
 assert.equal(found.length,1);assert.equal(found[0].suggestion,', and');
});

test('quotes, table labels, headings and removed text do not produce serial corrections',()=>{
 for(const text of ['The title “The list includes public schools, private hospitals and local clinics.” is literal.','Budget Act of 2026\nIncludes public schools, private hospitals and local clinics................... 1000','The list includes public schools, private hospitals and local clinics.\nLEGISLATIVE COUNSEL’S DIGEST\nAn act.\nThe people do enact as follows:\nA requirement applies.'])assert.equal(check(text).length,0,text);
 const text='The list includes public schools, private hospitals and local clinics.';const doc=makeDocument([text],'Current');doc.struck=[{start:0,end:text.length}];assert.equal(check(doc).length,0);
});

test('wrapped multiword lists keep source mapping without including margin numbers',()=>{
 const doc=makeDocument(['line 1 The list includes public schools,\nline 2 private hospitals and\nline 3 local clinics.'],'Current');const found=check(doc);assert.equal(found.length,1);assert.equal(doc.text.slice(found[0].start,found[0].end),'and');assert.equal(found[0].suggestion,', and');
});
