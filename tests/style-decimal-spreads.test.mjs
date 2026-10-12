import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument}from '../app/core.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';import {numeralIssues}from '../app/style-numerals.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),check=doc=>jointStylisticIssues(doc,refs).filter(i=>i.checkId==='numerals'),plain=text=>check(makeDocument([text],'Current'));
test('a complete decimal at least ten assigns figures to every small shared-unit count',()=>{
 for(const unit of ['years','applications','permits'])for(const peer of ['10.0','13.5','1,000.25','9007199254740993.125']){
  const text='The term includes one, two, or '+peer+' '+unit+'.',doc=makeDocument([text],'Current'),before=JSON.stringify(doc),issues=check(doc);
  assert.deepEqual(issues.map(i=>[i.text,i.suggestion]),[['one','1'],['two','2']],text);assert.ok(issues.every(i=>doc.text.slice(i.start,i.end)===i.text));assert.equal(JSON.stringify(doc),before);
 }
});
test('a correct figure remains intact beside a complete decimal magnitude witness',()=>{
 for(const peer of ['10.0','13.5','1,000.25'])assert.deepEqual(plain('The term includes 1 or '+peer+' years.'),[]);
});
test('decimal magnitude below ten never rounds into the related-number threshold',()=>{
 for(const peer of ['0.5','1.5','9.5','9.999999999999999999999']){
  assert.ok(!plain('The office grants one or '+peer+' permits.').some(i=>i.text==='one'));
  assert.deepEqual(plain('The office grants 1 or '+peer+' permits.').map(i=>[i.text,i.suggestion]),[['1','one']]);
 }
});
test('decimal magnitudes at ten remain exact with arbitrarily many fractional digits',()=>{
 for(const peer of ['10.000000000000000000001','10.'+'0'.repeat(1000)+'1'])assert.deepEqual(plain('The office grants one or '+peer+' permits.').map(i=>[i.text,i.suggestion]),[['one','1']]);
});
test('a decimal witness in the first or interior position governs the complete intact spread',()=>{
 for(const body of ['13.5, one, or two','one, 13.5, or two','one, two, or 13.5'])assert.deepEqual(plain('The term includes '+body+' years.').map(i=>i.suggestion),['1','2']);
});
test('separate units and decimal code identifiers do not change neighboring prose quantities',()=>{
 assert.deepEqual(plain('The office grants 2 permits or 13.5 years.').map(i=>[i.text,i.suggestion]),[['2','two']]);
 assert.deepEqual(plain('The board includes 4 veterinarians under Section 13.5, 1 technician under Sections 1 and 13.5, and 3 members.').map(i=>[i.text,i.suggestion]),[['4','four'],['1','one'],['3','three']]);
});
test('partial, signed and malformed decimal peers cannot supply a magnitude relationship',()=>{
 for(const peer of ['.13','+13.5','−13.5','013.5','13.5.2','13.5/2','13.5e2','13,5.2','13.'])assert.ok(!plain('The office grants one or '+peer+' permits.').some(i=>i.text==='one'&&i.suggestion==='1'),peer);
});
test('every original strike and unknown exclusion inside a decimal spread prevents inference',()=>{
 const text='The term is one or 13.5 years.';
 for(const field of ['struck','excluded'])for(let at=text.indexOf('one');at<text.indexOf('years')+5;at++){
  const doc=makeDocument([text],'Current');doc[field].push({start:at,end:at+1});assert.ok(!numeralIssues(doc,refs).some(i=>i.text==='one'&&i.suggestion==='1'),field+' '+at);
 }
});
test('sentence opening, digest conflicts, tables and literal decimal spreads stay protected',()=>{
 for(const text of ['One or 13.5 years is allowed.','LEGISLATIVE COUNSEL’S DIGEST\nThe term is one or 13.5 years.','The office quotes “one or 13.5 years”.','The term is one or 13.5 years........20.'])assert.ok(!plain(text).some(i=>i.text==='one'||i.text==='One'),text);
});
test('all members and original offsets survive long decimal spreads and recognized page heads',()=>{
 const doc=makeDocument(['The term is one or','AB 192 — 2 —\nline 1 13.5 years.'],'Current'),h=doc.blocks.find(b=>b.text==='AB 192 — 2 —');h.formatting={headerParts:[{start:0,end:h.text.length,anchor:'left'}]};assert.deepEqual(check(doc).map(i=>[i.text,i.suggestion]),[['one','1']]);
 const text='The term is '+Array(100).fill('one').join(', ')+', or 13.5 years.',issues=plain(text);assert.equal(issues.length,100);assert.ok(issues.every(i=>text.slice(i.start,i.end)==='one'&&i.suggestion==='1'));
});
