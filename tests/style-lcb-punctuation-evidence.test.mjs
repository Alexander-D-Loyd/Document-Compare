import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';import {contextualPunctuationIssues}from '../app/style-punctuation.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const rules=new Set(['Punctuation: Apostrophes','Punctuation: Full dates','Punctuation: Month and year','Punctuation: Listed possessive forms','Punctuation: Listed parenthetic phrases','Punctuation: Introductory existing-law phrase']);
const check=d=>contextualPunctuationIssues(typeof d==='string'?makeDocument([d],'Current'):d,refs).filter(i=>rules.has(i.rule));
test('LCB parenthetic includes phrase covers its regular plural include form without changing verb agreement',()=>{
 for(const [text,suggestion]of [['The definition includes but is not limited to apples.','includes, but is not limited to,'],['The benefits include but are not limited to apples.','include, but are not limited to,'],['The benefits include, but are not limited to apples.','include, but are not limited to,'],['The definition includes but is not limited to, apples.','includes, but is not limited to,']]){
  const found=check(text);assert.equal(found.length,1,text);assert.equal(found[0].suggestion,suggestion);assert.equal(check(text.replace(found[0].text,suggestion)).length,0);
 }
 for(const text of ['The definition includes, but is not limited to, apples.','The benefits include, but are not limited to, apples.','The benefits include apples.','The benefits include but is not limited to apples.'])assert.equal(check(text).length,0,text);
});
test('fixed LCB punctuation examples reject complete original Unicode token fragments',()=>{
 for(const body of ['workers compensation','drivers license','including but not limited to apples','includes but is not limited to apples','January 1, 2027 the rule applies','April, 2001 changed']){
  for(const extra of ['é','\u0301'])assert.equal(check('The '+extra+body+'.').length,0,extra+body);
 }
 for(const text of ['The workers compensationé applies.','The drivers license\u0301 applies.','In April, 2001é it changed.','On January 1, 2027é the rule applies.'])assert.equal(check(text).length,0,text);
});
test('struck or uncertain excluded source cannot form a listed punctuation phrase',()=>{
 for(const text of ['The workers x compensation applies.','The drivers x license applies.','The values includes x but is not limited to apples.','The values including x but not limited to apples apply.','In April, x 2001 it changed.','On January x 1, 2027 the rule applies.'])for(const kind of ['struck','excluded']){
  const doc=makeDocument([text],'Current'),start=text.indexOf(' x ')+1;doc[kind]=[...(doc[kind]||[]),{start,end:start+1}];assert.equal(check(doc).length,0,text+' '+kind);
 }
});
test('wrapped straight quotations protect fixed source punctuation examples',()=>{
 for(const text of ['The text reads "the workers\ncompensation applies".','The text reads "including\nbut not limited to apples".','The text reads "April,\n2001 changed".'])assert.equal(check(text).length,0,text);
});
test('four-digit decade plurals retain no apostrophe beyond only the nineteenth and twentieth centuries',()=>{
 for(const decade of ['1700','1790','2090','2100','2990']){
  const text='The '+decade+'’s were different.',found=check(text);assert.equal(found.length,1,text);assert.equal(found[0].suggestion,decade+'s');assert.equal(check(text.replace(decade+'’s',decade+'s')).length,0);
 }
 for(const text of ['The 1990’s culture changed.','The 1890’s legislation changed.','The 1990s were different.','The identifier X1990’s were changed.','The amount is $1990’s.','The value is 1.1990’s.','The value is 12,1990’s.'])assert.equal(check(text).length,0,text);
});
test('decade plural role and token boundaries require intact original evidence',()=>{
 for(const text of ['The 1990’sé were different.','The 1990’s wereé different.','The 1990’s\u0301 were different.'])assert.equal(check(text).length,0,text);
 for(const text of ['The 1990’sx were different.','The 1990’s x were different.'])for(const kind of ['struck','excluded']){
  const doc=makeDocument([text],'Current'),start=text.indexOf('x');doc[kind]=[...(doc[kind]||[]),{start,end:start+1}];assert.equal(check(doc).length,0,text+' '+kind);
 }
});
test('existing-law punctuation requires a complete sentence or digest entry boundary rather than any printed newline',()=>{
 for(const text of ['Under existing law the board may act.','The rule changed.\nUnder existing law the board may act.','LEGISLATIVE COUNSEL’S DIGEST\nUnder existing law the board may act.\nThe people do enact as follows:\nThe provision applies.'])assert.ok(check(text).some(i=>i.rule==='Punctuation: Introductory existing-law phrase'),text);
 for(const text of ['The report lists a clause\nUnder existing law the board may act.','The text includes the phrase Under existing law the board may act.','Under existing law, the board may act.'])assert.ok(!check(text).some(i=>i.rule==='Punctuation: Introductory existing-law phrase'),text);
});
test('full date and fixed phrase marks retain recognized cross-page original source ranges',()=>{
 const doc=makeDocument(['ASSEMBLY BILL No. 577\nline 1 The people do enact as follows:\nline 2 On January 1,\n94','AB 577 — 2 —\nline 1 2027 the rule applies.\nline 2 The workers\nline 3 compensation applies.'],'Current'),before=JSON.stringify(doc),found=check(doc);
 assert.ok(found.some(i=>i.suggestion==='January 1, 2027,'));assert.ok(found.some(i=>i.suggestion==='workers’ compensation'));for(const i of found)assert.equal(doc.text.slice(i.start,i.end),i.text);assert.equal(JSON.stringify(doc),before);
 assert.ok(jointStylisticIssues(doc,refs).some(i=>i.rule==='Punctuation: Full dates'));
});
