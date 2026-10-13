import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';import {corporationLetterIssues}from '../app/style-corporation-letters.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=d=>corporationLetterIssues(typeof d==='string'?makeDocument([d],'Current'):d,refs);
test('quoted corporation classification requires a complete original noun and Unicode boundary',()=>{
 for(const text of ['The “c” corporationé is registered.','The "s" corporations\u0301 are registered.','The “c” corporation_identifier applies.'])assert.equal(check(text).length,0,text);
 for(const [letter,noun]of [['c','corporation'],['s','corporations']]){
  const text='The “'+letter+'” '+noun+' shall report.',i=check(text)[0];assert.ok(i);assert.equal(i.text,letter);assert.equal(i.suggestion,letter.toUpperCase());assert.equal(text.slice(i.evidenceStart,i.evidenceEnd),'“'+letter+'” '+noun);
 }
});
test('source deletion or unknown exclusion cannot create a classification-to-noun bridge',()=>{
 for(const text of ['The “c” x corporation is registered.','The "s" x corporations are registered.','The “c” corporationx is registered.'])for(const kind of ['struck','excluded']){
  const doc=makeDocument([text],'Current'),start=text.indexOf('x');doc[kind]=[...(doc[kind]||[]),{start,end:start+1}];assert.equal(check(doc).length,0,text+' '+kind);
 }
});
test('classification evidence spanning a source table cannot supply a noun role',()=>{
 const doc=makeDocument(['The “c”\nAmount..........100\ncorporation is registered.'],'Current');assert.equal(check(doc).length,0);
});
test('recognized physical page heads preserve complete classification evidence and exact letter-only marks',()=>{
 const doc=makeDocument(['ASSEMBLY BILL No. 121\nThe people do enact as follows:\nline 1 The “s”\n97','AB 121 — 2 —\nline 1 corporations shall report.'],'Current'),before=JSON.stringify(doc),found=check(doc);assert.equal(found.length,1);assert.equal(found[0].text,'s');assert.equal(doc.text.slice(found[0].start,found[0].end),'s');assert.ok(doc.text.slice(found[0].evidenceStart,found[0].evidenceEnd).includes('corporations'));assert.equal(JSON.stringify(doc),before);
 assert.ok(!jointStylisticIssues(doc,refs).some(i=>i.checkId==='corporation-letter'),'quoted Current Version form overrides the direct source classification finding');
});
test('enclosing literal contexts remain distinct from the one-letter quoted classification form',()=>{
 for(const text of ['The text reads “the "c" corporation shall report” as a literal.','The text reads "the clause\n“s” corporations shall report" as a literal.','The “c” corporation Institute is named.','The “x” corporation is named.'])assert.equal(check(text).length,0,text);
});
test('a rejected uncertain classification does not hide an independent intact source example',()=>{
 const text='The “c” x corporation is named. The “s” corporation shall report.',doc=makeDocument([text],'Current'),start=text.indexOf(' x ')+1;doc.excluded=[...(doc.excluded||[]),{start,end:start+1}];const found=check(doc);assert.equal(found.length,1);assert.equal(found[0].start,text.lastIndexOf('“s”')+1);
});
