import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {largeOrdinalParts} from '../app/style-large-ordinals.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=t=>jointStylisticIssues(makeDocument([t],'Current'),refs);
test('compound scale ordinals convert the whole rank rather than its final hundredth fragment',()=>{
 for(const [words,wanted] of [['two hundredth','200th'],['three hundredth','300th'],['two thousandth','2,000th'],['one thousand two hundredth','1,200th'],['two millionth','2,000,000th'],['one billion first','1,000,000,001st'],['two trillionth','2,000,000,000,000th']]){
  const t='The '+words+' applicant qualifies.',found=check(t);assert.equal(found.length,1,t);assert.equal(found[0].suggestion,wanted);assert.equal(t.slice(found[0].start,found[0].end),words);assert.equal(check(t.replace(words,wanted)).length,0,wanted);
 }
 for(const t of ['The two hundredths of the amount apply.','The two hundredth share applies.','Two hundredth applicant qualifies.','The Two Hundredth Applicant Program is named.','The “two hundredth” applicant qualifies.'])assert.ok(!check(t).some(i=>i.checkId==='large-ordinals'),t);
});
test('unclassified compound scale roles never produce fragment numeral findings',()=>{
 for(const t of ['The two hundredth share applies.','The three thousandth fraction is allocated.','Two hundredth applicant qualifies.'])assert.equal(check(t).length,0,t);
 assert.ok(check('The one hundred first applicants are eligible.').some(i=>i.suggestion==='100'));
});
test('additional singular administrative rank heads support whole ordinal checks without swallowing plural counts',()=>{
 for(const head of ['place','floor','step','stage','attempt','round','phase','batch','record','request','candidate','appointment','term','period','occasion','recipient','license','application','provision','paragraph','subdivision','subchapter','division','part']){
  const t='The one hundred first '+head+' is recorded.',i=check(t);assert.equal(i.length,1,t);assert.equal(i[0].suggestion,'101st');assert.equal(i[0].text,'one hundred first');assert.equal(check(t.replace(i[0].text,i[0].suggestion)).length,0);
  assert.ok(!check('The one hundred first '+head+'s are recorded.').some(i=>i.checkId==='large-ordinals'),head);
 }
});
test('larger compound ordinals are one expression with the correct suffix',()=>{
 for(const [words,digits] of [['one hundred first','101st'],['two hundred twelfth','212th'],['one thousand twenty-first','1,021st'],['twenty-one thousand fifth','21,005th'],['one hundred and thirteenth','113th'],['nine hundred ninety-ninth','999th']]){
  const text='The '+words+' applicant is eligible.',found=check(text);assert.equal(found.length,1,words);assert.equal(found[0].suggestion,digits);assert.equal(text.slice(found[0].start,found[0].end),words);assert.equal(check(text.replace(words,digits)).length,0,digits);
 }
});
test('compound ranks preserve fractions, names, sentence starts and count-plus-adjective phrases',()=>{
 for(const text of ['One hundred first applicant is eligible.','The one-hundredth share is allocated.','The two one-thousandths of the amount apply.','The “one hundred first” applicant is eligible.','The One Hundred First Applicant Agency is named.','The one thousand first-grade pupils attend.','The one hundred first applicants are eligible.'])assert.ok(!check(text).some(i=>i.checkId==='large-ordinals'),text);
 for(const text of ['one thousand first-grade pupils','one hundred first applicants','one hundred hundred first applicant is eligible','one hundred twenty thirtieth applicant is eligible'])assert.equal(largeOrdinalParts(text).length,0,text);
});
test('rank spans survive source wrapping and digest context without fragment highlights',()=>{
 const doc=makeDocument(['LEGISLATIVE COUNSEL’S DIGEST\nThe one hundred\nfirst applicant is eligible.'],'Current'),i=jointStylisticIssues(doc,refs)[0];assert.equal(i.suggestion,'101st');assert.equal(doc.text.slice(i.start,i.end),'one hundred\nfirst');
 doc.struck=[{start:i.start,end:i.end}];assert.equal(jointStylisticIssues(doc,refs).length,0);
});
test('ordinal grouping follows the number rule while named serial identifiers stay protected',()=>{
 for(const [text,wanted] of [['The 1001st applicant qualifies.','1,001st'],['The one million first applicant qualifies.','1,000,001st'],['The one thousandth applicant qualifies.','1,000th']])assert.ok(check(text).some(i=>i.suggestion===wanted),text);
 for(const text of ['The 1,001st applicant qualifies.','The 1001st Street address applies.','The 1021st Congress is named.','The One Thousand First Amendment is named.'])assert.equal(check(text).length,0,text);
});
