import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';import {wordChoiceIssues}from '../app/style-word-choice.mjs';import {styleContext}from '../app/style-context.mjs';import {explicitVerbRange}from '../app/style-verb-evidence.mjs';
const refs={lcb:JSON.parse(fs.readFileSync(new URL('../app/data/lcb-reference.json',import.meta.url)))};
const check=d=>wordChoiceIssues(typeof d==='string'?makeDocument([d],'Current'):d,refs);
test('finite LCB meaning-verb cues remain complete through long actual layout whitespace',()=>{
 const gap=' '.repeat(1000);
 for(const [lead,term,preferred]of [['The agency shall','assure','ensure'],['The agency','assures','ensures'],['The agency has','assured','ensured'],['The agency is','assuring','ensuring'],['The board must','device','devise']]){
  const text=lead+gap+term+(term==='device'?' a plan.':' compliance.'),doc=makeDocument([text],'Current'),before=JSON.stringify(doc),i=check(doc).find(i=>i.suggestion===preferred);assert.ok(i,text.slice(0,30));assert.equal(doc.text.slice(i.start,i.end),term);assert.equal(JSON.stringify(doc),before);
 }
});
test('a whitespace-clipped window cannot turn an ordinary noun into an imperative verb',()=>{
 const gap=' '.repeat(1000);
 for(const text of ['The policy requires'+gap+'advice the applicant requested.','The policy discusses'+gap+'assure compliance wording.'])assert.equal(check(text).length,0,text.slice(0,30));
 assert.equal(check('Advice services are available.').length,0);assert.equal(check('Advice the applicant.')[0].suggestion,'Advise');
});
test('finite adverb and subject vocabulary is preserved rather than widened by source scanning',()=>{
 assert.ok(check('The agency shall not usually directly assure compliance.').some(i=>i.suggestion==='ensure'));
 for(const text of ['The agency shall not usually directly fully assure compliance.','The unknownactor assures compliance.','The agency shall vaguely assure compliance.'])assert.equal(check(text).length,0,text);
});
test('original struck or uncertain source still cannot establish a finite verb cue',()=>{
 const text='The agency shall x'+(' '.repeat(1000))+'assure compliance.',doc=makeDocument([text],'Current'),start=text.indexOf(' x')+1;doc.struck=[{start,end:start+1}];assert.equal(check(doc).length,0);
 const text2='The policy requires advice the applicant requested.',bad=makeDocument([text2],'Current'),end=text2.indexOf('advice');bad.excluded=[...(bad.excluded||[]),{start:0,end}];assert.equal(check(bad).length,0);
});
test('the complete source cue retains original positions and never crosses a real sentence boundary',()=>{
 const text='The agency shall'+(' '.repeat(1000))+'assure compliance.',doc=makeDocument([text],'Current'),start=text.indexOf('assure'),r=explicitVerbRange(styleContext(doc),start,'base');assert.ok(r);assert.equal(doc.text.slice(r.start,r.end).trim(),'shall');
 assert.equal(explicitVerbRange(styleContext(makeDocument(['The agency shall act. Unknown wording assures compliance.'],'Current')), 'The agency shall act. Unknown wording '.length,'third'),null);
});
