import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';import {ratioIssues,explicitRatioParts}from '../app/style-ratios.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=d=>ratioIssues(typeof d==='string'?makeDocument([d],'Current'):d,refs);
test('ratio formatting retains exact integer and decimal figures without floating-point conversion',()=>{
 for(const [text,suggestion]of [['Use a ratio of 9007199254740993 to five.','9007199254740993 to 5'],['Use a ratio of 123456789012345678901234567890:five.','123456789012345678901234567890:5'],['Use a ratio of 1.00000000000000001 to five.','1.00000000000000001 to 5'],['Use odds of 1.00 : 2.00.','1.00:2.00']]){
  const doc=makeDocument([text],'Current'),before=JSON.stringify(doc),found=check(doc);assert.equal(found.length,1,text);assert.equal(found[0].suggestion,suggestion);assert.equal(doc.text.slice(found[0].start,found[0].end),found[0].text);assert.equal(JSON.stringify(doc),before);
 }
 for(const text of ['Use a ratio of 9007199254740993 to 5.','Use a ratio of 1.00000000000000001 to 5.','Use odds of 1.00:2.00.'])assert.equal(check(text).length,0,text);
});
test('ratio introducers and endpoint words require complete Unicode boundaries',()=>{
 for(const text of ['Use ératio of one to five.','Use ratio\u0301 of one to five.','Use a ratio of one to fiveé.','Use a ratio of one to five\u0301.','Use a ratio of one to 5é.'])assert.equal(check(text).length,0,text);
});
test('masked introducer or quantity characters cannot establish ratio evidence',()=>{
 for(const text of ['Use a ratiox of one to five.','Use a ratio of x one to five.','Use a ratio of one x to five.','Use a ratio of one to fivex.'])for(const kind of ['struck','excluded']){
  const doc=makeDocument([text],'Current'),start=text.indexOf('x');doc[kind]=[...(doc[kind]||[]),{start,end:start+1}];assert.equal(check(doc).length,0,text+' '+kind);
 }
});
test('coordinated ratios inherit only intact establishing label and prior ratio evidence',()=>{
 const text='Use a ratiox of one to five or two to three.',doc=makeDocument([text],'Current'),start=text.indexOf('x');doc.struck=[{start,end:start+1}];assert.equal(check(doc).length,0);
 const valid='Use a ratio of one to five or two to three.';assert.deepEqual(check(valid).map(i=>i.suggestion),['1 to 5','2 to 3']);
});
test('ratio parser does not trim malformed decimal or comma-grouped endpoints',()=>{
 for(const text of ['Use a ratio of one to 1.2.3.','Use a ratio of one to 1,20.','Use a ratio of one to 3/4.','Use a ratio of one to 5_abc.'])assert.equal(check(text).length,0,text);
});
test('ratio evidence survives recognized page heads but rejects uncertain bridges and tables',()=>{
 const doc=makeDocument(['ASSEMBLY BILL No. 121\nThe people do enact as follows:\nline 1 Use a ratio\n97','AB 121 — 2 —\nline 1 of one to five.'],'Current');for(const b of doc.blocks.filter(b=>b.ignored))b.formatting={headerParts:[{start:0,end:b.text.length,anchor:'left'}]};
 assert.equal(check(doc).length,1);const i=check(doc)[0];assert.equal(doc.text.slice(i.evidenceStart,i.evidenceEnd).includes('ratio'),true);assert.equal(i.suggestion,'1 to 5');for(const b of doc.blocks.filter(b=>b.ignored))b.formatting={};assert.equal(check(doc).length,0);
 assert.equal(check('Use a ratio of one to five..........100').length,0);
});
test('wrapped ratio literals stay protected and joint review never changes exact figures',()=>{
 assert.equal(check('The text reads "a ratio of one\nto five" as a literal.').length,0);
 const doc=makeDocument(['Use a ratio of 9007199254740993 to five.'],'Current'),i=jointStylisticIssues(doc,refs).find(i=>i.checkId==='ratios');assert.ok(i);assert.equal(i.suggestion,'9007199254740993 to 5');
});
