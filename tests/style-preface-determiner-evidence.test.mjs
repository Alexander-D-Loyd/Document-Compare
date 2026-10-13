import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';import {wordChoiceIssues}from '../app/style-word-choice.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=doc=>wordChoiceIssues(doc,refs).filter(i=>i.rule==='Spelling and usage: foreword-preface');
test('LCB preface noun retains its complete original determiner and publication cue',()=>{
 for(const determiner of ['a','an','the','its','their','his','her','our','your'])for(const publication of ['book','manual','report','publication']){
  const d=makeDocument(['They included '+determiner+' forward to the '+publication+'.'],'Current'),i=check(d)[0];assert.ok(i,determiner+' '+publication);assert.equal(i.suggestion,'foreword');assert.equal(d.text.slice(i.start,i.end),'forward');assert.equal(d.text.slice(i.evidenceStart,i.evidenceEnd),determiner+' forward to the '+publication);assert.equal(check(makeDocument([d.text.replace('forward','foreword')],'Current')).length,0);
 }
 for(const spacing of [' '.repeat(80),'\nline 2 ']){const d=makeDocument(['They included the'+spacing+'forward to the manual.'],'Current');assert.equal(check(d).length,1,JSON.stringify(spacing));}
});
test('unknown determiner rows quoted nouns and Unicode partial determiners do not establish a preface',()=>{
 for(const text of ['They included éthe forward to the book.','They included _the forward to the book.','They included 2the forward to the book.','They included other forward to the book.','They included “the forward to the book”.','They included the "forward to the book".'])assert.equal(check(makeDocument([text],'Current')).length,0,text);
 const d=makeDocument(['the\nforward to the book.'],'Current'),b=d.blocks[0];b.ignored=true;assert.equal(check(d).length,0);
 const table=makeDocument(['the\nforward to the book.'],'Current');table.blocks[0].formatting={headerGaps:[10,20]};assert.equal(check(table).length,0);
});
test('removed source inside the whole determiner and preface relation stays protected',()=>{
 const text='They included the forward to the book.';
 for(const field of ['struck','excluded'])for(const term of ['the','forward','to','book']){const d=makeDocument([text],'Current'),start=d.text.indexOf(term);d[field].push({start,end:start+term.length});assert.equal(check(d).length,0,field+' '+term);}
 const d=makeDocument(['They included the X forward to the book.'],'Current'),start=d.text.indexOf('X');d.struck.push({start,end:start+1});assert.equal(check(d).length,0);
});
test('imperative and verbal directions unstated prefaces and possessive-source offsets remain distinct',()=>{
 for(const text of ['Forward to the book.','They shall forward to the book.','They will forward the report.','They included a forward movement.','They included a forward to an account.'])assert.equal(check(makeDocument([text],'Current')).length,0,text);
 const d=makeDocument(['line 1 They included their','line 1 forward to the\nline 2 manual.'],'Current'),before=JSON.stringify(d),i=check(d)[0];assert.ok(i);assert.equal(i.text,'forward');assert.match(d.text.slice(i.evidenceStart,i.evidenceEnd),/their\nline 1 forward/u);assert.match(d.text.slice(i.evidenceStart,i.evidenceEnd),/line 2 manual/u);assert.equal(JSON.stringify(d),before);
});
