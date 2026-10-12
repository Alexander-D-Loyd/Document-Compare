import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {wordChoiceIssues} from '../app/style-word-choice.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=t=>wordChoiceIssues(makeDocument([t],'Current'),refs);
test('passive meanings are supported by explicit outcome, property-peril and legal subject evidence',()=>{
 for(const [subject,bad,good,tail] of [['Accuracy','insured','ensured','.'],['Confidentiality','assured','ensured',' by the agency.'],['The building','ensured','insured',' against fire.'],['The payment','guarantied','guaranteed','.'],['The right','foregone','forgone',' by the applicant.']])for(const copula of ['is','was not','shall be','shall not be','has already been','will be properly']){
  const text=subject+' '+copula+' '+bad+tail,found=check(text);assert.equal(found.length,1,text);assert.equal(found[0].suggestion,good,text);assert.equal(text.slice(found[0].start,found[0].end),bad,text);
  assert.equal(check(text.replace(bad,good)).length,0,text);
  assert.ok(jointStylisticIssues(makeDocument([text],'Current'),refs).some(i=>i.suggestion===good),text);
 }
});
test('passive outcome evidence does not confuse people, insured assets, missing perils or lexical nouns',()=>{
 for(const t of ['The applicant was assured that the record is correct.','The building is insured against fire.','The building is ensured to remain safe.','The vehicle is insured.','Accuracy is an insured benefit.','The accuracy report is insured.','A foregone conclusion is discussed.','The guarantied payment schedule is a label.','The insured confidentiality policy is a title.','The requirement “accuracy shall be insured” is quoted.','The Accuracy Is Insured Program is named.','The payment is foregone conclusion material.'])assert.equal(check(t).length,0,t);
});
test('passive findings retain margins and page offsets, with source exclusions and tables protected',()=>{
 const d=makeDocument(['line 1 Accuracy shall be\nline 2 properly insured','line 1 by the agency.\nline 2 The vessels are ensured against theft.'],'Current');
 const found=wordChoiceIssues(d,refs);assert.deepEqual(found.map(i=>i.suggestion),['ensured','insured']);for(const i of found)assert.equal(d.text.slice(i.start,i.end),i.text);
 d.struck=found.map(({start,end})=>({start,end}));assert.equal(wordChoiceIssues(d,refs).length,0);
 assert.equal(check('Accuracy is insured................... 100').length,0);
});
