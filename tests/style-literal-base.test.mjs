import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
test('base guide checks preserve contractions, usage and source spellings in literal quotations',()=>{
 for(const quote of ['“','"']){const end=quote==='“'?'”':'"';for(const term of ["don't",'and/or','advisor','judgement','self control','cancelled','includes apples, pears and bananas','1990’s','30 days notice']){
  const text='The term '+quote+term+end+' is quoted.';assert.equal(jointStylisticIssues(makeDocument([text],'Current'),refs).length,0,text);
 }}
});
test('literal protection does not suppress adjacent active prose checks',()=>{
 const text='The term “advisor” is quoted, but the advisor shall not use and/or.';const issues=jointStylisticIssues(makeDocument([text],'Current'),refs);assert.ok(issues.some(i=>i.suggestion==='adviser'&&i.start===text.lastIndexOf('advisor')));assert.ok(issues.some(i=>i.suggestion==='or'));
});
