import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument}from '../app/core.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),check=text=>jointStylisticIssues(makeDocument([text],'Current'),refs,{includeReviewSuggestions:true});
test('actual new bill form and roadway identifiers preserve digits while nearby quantities stay checked',()=>{
 for(const label of ['form FW-001','form fw-001','form CIV-003','form FW - 001','Interstate 5','State Route 4','U.S. Highway 3']){
  const text='The agency shall use '+label+' and issue 3 permits.',found=check(text).filter(i=>i.checkId==='numerals');assert.deepEqual(found.map(i=>[i.text,i.suggestion]),[['3','three']],label);
 }
 for(const text of ['The agency shall provide 3 forms.','The commission shall build 3 highways.','The agency shall issue 3 permits under an FW-001 designation.'])assert.ok(check(text).some(i=>i.text==='3'&&i.suggestion==='three'),text);
});
test('exact published program and fund heading names protect their figures without hiding other quantities',()=>{
 for(const text of ['The Clean Cars 4 All Program serves 3 applicants.','Article 8. 2026 University Capital Outlay Bond Fund Conditions\nThe agency shall issue 3 permits.']){
  const found=check(text).filter(i=>i.checkId==='numerals');assert.deepEqual(found.map(i=>[i.text,i.suggestion]),[['3','three']],text);
 }
 assert.ok(check('The agency shall provide 4 cars.').some(i=>i.text==='4'&&i.suggestion==='four'));
});
