import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';import {styleContext}from '../app/style-context.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=t=>jointStylisticIssues(makeDocument([t],'Current'),refs);
test('LCB spelling and contraction preferences do not modify complete explicit URL identifiers',()=>{
 for(const link of ['https://agency.gov/and/or/criteria','https://agency.gov/non-profit/advisor','http://agency.gov/cemetary/wilfully','ftp://agency.gov/judgement.pdf',"https://agency.gov/query?word=can't"]){
  const text='Visit '+link+' for the source.',doc=makeDocument([text],'Current'),before=JSON.stringify(doc);assert.equal(jointStylisticIssues(doc,refs).length,0,link);assert.equal(JSON.stringify(doc),before);
 }
});
test('conventional email addresses and selected bare domains or file names remain exact source literals',()=>{
 for(const text of ["Write to can't@agency.gov for the source.",'Use advisor@example.org for contact.','Refer to wilful.pdf for the source.','Visit advisor.org for the source.','Use cemetary.docx for the source.'])assert.equal(check(text).length,0,text);
});
test('identifier protection does not leak into neighboring ordinary LCB prose',()=>{
 const text="Use https://agency.gov/advisor. The advisor can't use and/or.",found=check(text);assert.ok(found.some(i=>i.text==='advisor'&&i.start>text.indexOf('The advisor')));assert.ok(found.some(i=>i.category==='Contractions'));assert.ok(found.some(i=>i.rule==='Spelling and usage, item 4'));assert.equal(found.filter(i=>i.start<text.indexOf('The advisor')).length,0);
});
test('explicit technical ranges retain exact offsets and do not become quotation enclosures',()=>{
 const text='See https://agency.gov/advisor and the phrase “eligible”.',doc=makeDocument([text],'Current'),ctx=styleContext(doc);assert.ok(ctx.literalAt(text.indexOf('advisor'),text.indexOf('advisor')+7));assert.ok(check(text).some(i=>i.rule==='Punctuation: Quotation Marks'));
});
test('unfamiliar technical syntax stays manual while bare ordinary source words remain checked',()=>{
 assert.ok(check('The advisor may act.').some(i=>i.suggestion==='adviser'));assert.ok(check('The non-profit program applies.').some(i=>i.suggestion==='nonprofit'));assert.equal(check('Use /and/or/options for the input.').filter(i=>i.rule==='Spelling and usage, item 4').length,0);
});
test('uppercase serial identifiers retain their numeric components alongside ordinary bill counts',()=>{
 for(const serial of ['FCC/2','AB-12','FCC\\2','XML/2/A']){const text='Use a '+serial+' identifier. Appoint 3 workers.',found=check(text);assert.deepEqual(found.map(i=>[i.text,i.suggestion]),[['3','three']],serial);}
});
test('serial identifier protection keeps full source offsets and does not exempt bare quantities',()=>{
 const doc=makeDocument(['Use a FCC/2 identifier. Appoint 2 workers.'],'Current'),before=JSON.stringify(doc),found=jointStylisticIssues(doc,refs);assert.equal(found.length,1);assert.equal(found[0].start,doc.text.indexOf('2 workers'));assert.equal(found[0].suggestion,'two');assert.equal(JSON.stringify(doc),before);assert.ok(styleContext(doc).technicalAt(doc.text.indexOf('FCC/2'),doc.text.indexOf('FCC/2')+5));
});
test('serial-looking groups need an intact original label rather than hidden source characters',()=>{
 const text='Use FCC/2 x identifier.',doc=makeDocument([text],'Current'),start=text.indexOf(' x ')+1;doc.excluded=[...(doc.excluded||[]),{start,end:start+1}];assert.equal(styleContext(doc).technicalRanges.length,0);
 assert.equal(styleContext(makeDocument(['Use FCC/2 identifieré.'],'Current')).technicalRanges.length,0);
 assert.ok(check('Use PK-3 unlisted program.').some(i=>i.text==='3'));
});
