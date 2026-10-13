import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';import {contractionIssues}from '../app/style-contractions.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=d=>contractionIssues(typeof d==='string'?makeDocument([d],'Current'):d,refs);
test('remaining common relative/interrogative have contractions keep complete exact source selections',()=>{
 for(const [form,expanded]of [["who've",'who have'],["what've",'what have'],["where've",'where have'],["when've",'when have'],["why've",'why have'],["how've",'how have'],["there've",'there have'],["which've",'which have']])for(const apostrophe of ["'",'’']){
  const word=form.replace("'",apostrophe),text='The quoted subject '+word+' applied is reviewed.',i=check(text)[0];assert.ok(i,word);assert.equal(i.text,word);assert.deepEqual(i.alternatives,[expanded]);assert.equal(check(text.replace(word,expanded)).length,0);
 }
});
test('demonstrative and relative will and compound contractions expand only their full tokens',()=>{
 for(const subject of ['this','these','those','which'])for(const [suffix,expanded]of [["'ll",'will'],["'ll've",'will have'],["'d've",'would have']]){
  const form=subject+suffix,text='The language '+form+' apply is reviewed.',i=check(text)[0];assert.ok(i,form);assert.equal(i.text,form);assert.deepEqual(i.alternatives,[subject+' '+expanded]);assert.equal(check(text.replace(form,subject+' '+expanded)).length,0);
 }
});
test('demonstrative d contractions retain meaning alternatives and do not prescribe both at once',()=>{
 for(const subject of ['this','these','those']){
  const text='The language '+subject+'’d apply is reviewed.',i=check(text)[0];assert.ok(i);assert.deepEqual(i.alternatives,[subject+' had',subject+' would']);assert.match(i.message,/choices, not text to insert together/);
 }
});
test('here is has a direct contraction while literal text and possessive pronoun forms remain protected',()=>{
 const i=check('Here’s the required report.')[0];assert.ok(i);assert.deepEqual(i.alternatives,['Here is']);
 for(const text of ['The term “who’ve” is literal.','The text reads "the clause\nthose’ll apply" as a literal.','The persons whose rights apply.','The phrase there’veé applies.','The expression these’ll\u0301 applies.'])assert.equal(check(text).length,0,text);
});
test('new contraction forms use original boundaries across struck source and joint review',()=>{
 for(const form of ['who’ve','those’ll','this’d’ve','Here’s']){
  const text='The '+form+'x term applies.',doc=makeDocument([text],'Current'),start=4+form.length;doc.struck=[{start,end:start+1}];assert.equal(check(doc).length,0,form);assert.ok(!jointStylisticIssues(doc,refs).some(i=>i.category==='Contractions'),form);
 }
 assert.ok(jointStylisticIssues(makeDocument(['The applicants who’ve complied are eligible.'],'Current'),refs).some(i=>i.text==='who’ve'&&i.alternatives?.[0]==='who have'));
});
