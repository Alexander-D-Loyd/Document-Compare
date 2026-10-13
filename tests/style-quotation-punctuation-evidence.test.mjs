import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';import {contextualPunctuationIssues}from '../app/style-punctuation.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=d=>contextualPunctuationIssues(typeof d==='string'?makeDocument([d],'Current'):d,refs).filter(i=>['Punctuation: Quotation Marks','8.120'].includes(i.rule));
test('LCB period and comma placement uses complete quote ownership beyond a 600-character excerpt',()=>{
 for(const [open,close]of [['“','”'],['"','"']])for(const mark of ['.',',']){
  const text='The text reads '+open+('eligible applicants shall comply with the requirements '.repeat(35)).trim()+close+mark+' The next sentence applies.',doc=makeDocument([text],'Current'),before=JSON.stringify(doc),found=check(doc);
  assert.equal(found.length,1,text.slice(-70));assert.equal(found[0].suggestion,mark+close);assert.equal(doc.text.slice(found[0].start,found[0].end),close+mark);assert.equal(JSON.stringify(doc),before);
 }
});
test('redundant quote-final periods use the full original enclosure while ellipses remain protected',()=>{
 for(const [open,close]of [['“','”'],['"','"']]){
  const text='The text reads '+open+'The clause '+('contains eligible words '.repeat(40))+'applies.'+close+'.';assert.deepEqual(check(text).map(i=>i.suggestion),['.'+close]);
  assert.equal(check(text.replace('applies.'+close+'.','applies...'+close+'.')).length,0);
 }
});
test('complete amendment-directive lead preserves the LCB/GPO outside-punctuation conflict',()=>{
 const lead='Strike out the following words '+('from the subsection '.repeat(40));
 for(const [open,close]of [['“','”'],['"','"']])assert.equal(check(lead+open+'eligible'+close+'.').length,0);
 assert.equal(check('Replace the following statutory language “eligible”.').length,0);
 assert.equal(check('The phrase “eligible”. is ordinary prose.').length,1);
});
test('unknown or struck quote content cannot establish a punctuation correction',()=>{
 for(const text of ['The text reads “a x clause”.','The text reads "a x clause".','The text reads “a x clause.”.'])for(const kind of ['struck','excluded']){
  const doc=makeDocument([text],'Current'),start=text.indexOf(' x ')+1;doc[kind]=[...(doc[kind]||[]),{start,end:start+1}];assert.equal(check(doc).length,0,text+' '+kind);
 }
});
test('quoted source body table fragments and incomplete or inch-mark enclosures remain protected',()=>{
 for(const text of ['The text reads “amount..........100”.','The board measures 6".','The text ends eligible”.','The text reads “”.'])assert.equal(check(text).length,0,text);
});
test('long wrapped quotes preserve physical closing-mark offsets across recognized page heads',()=>{
 const doc=makeDocument(['ASSEMBLY BILL No. 121\nThe people do enact as follows:\nline 1 The text reads “'+('eligible applicants comply '.repeat(30))+'\n97','AB 121 — 2 —\nline 1 with the requirements”.'],'Current'),before=JSON.stringify(doc),found=check(doc);
 assert.equal(found.length,1);assert.equal(found[0].text,'”.');assert.equal(found[0].start,doc.text.lastIndexOf('”.'));assert.equal(JSON.stringify(doc),before);
 assert.ok(jointStylisticIssues(doc,refs).some(i=>i.rule==='Punctuation: Quotation Marks'));
});
test('an uncertain quote owner does not suppress an independent intact punctuation finding',()=>{
 const text='The text reads “a x clause”. The next text reads “eligible”.',doc=makeDocument([text],'Current'),start=text.indexOf(' x ')+1;doc.excluded=[...(doc.excluded||[]),{start,end:start+1}];const found=check(doc);assert.equal(found.length,1);assert.equal(found[0].start,text.lastIndexOf('”.'));
});
