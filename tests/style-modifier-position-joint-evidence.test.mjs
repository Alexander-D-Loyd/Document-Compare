import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const review=doc=>jointStylisticIssues(doc,refs,{includeReviewSuggestions:true}).filter(i=>i.checkId==='modifier-positions');

test('final joint preserves real source examples and rejects manufactured full noun/predicate roles',()=>{
 for(const [text,mask]of [
  ['The water is-code crystal-clear.','-code'],['The water-code is crystal-clear.','-code'],
  ['The water is crystal-clear-coated.','-coated'],['The water is crystal-clear glass.','glass'],
  ['Use crystal clear water-code.','-code'],['Use crystal clear watermarked.','marked'],
  ['The material-code is fire-tested.','-code'],['The material is fire-tested-coated.','-coated'],
 ])for(const mode of ['struck','excluded']){
  const doc=makeDocument([text],'Current'),start=doc.text.indexOf(mask);doc[mode]=[{start,end:start+mask.length}];const before=structuredClone(doc);
  assert.equal(review(doc).length,0,text+' '+mode);assert.deepEqual(doc,before);
 }
 for(const text of ['The water is crystal-clear.','Use crystal clear water.','The material is fire-tested.','Use fire tested material.'])assert.equal(review(makeDocument([text],'Current')).length,1,text);
});

test('final joint restores complete nested predicate evidence across physical page/margin coordinates',()=>{
 const doc=makeDocument(['ASSEMBLY BILL No. 577\nThe people of the State of California do enact as follows:\nline 1 The water is','line 1 crystal-clear.'],'Current'),before=structuredClone(doc),issues=review(doc);
 assert.equal(issues.length,1);const [issue]=issues;
 assert.equal(issue.text,'crystal-clear');assert.equal(issue.text,doc.text.slice(issue.start,issue.end));
 assert.equal(issue.evidenceStart,doc.text.indexOf('water'));
 assert.equal(issue.predicateContextEvidence.start,issue.evidenceStart);assert.equal(issue.predicateContextEvidence.end,issue.evidenceEnd);
 assert.equal(issue.predicateContextEvidence.sourceText,doc.text.slice(issue.evidenceStart,issue.evidenceEnd));
 assert.ok(doc.blocks.some(b=>b.page===1&&b.start<=issue.evidenceStart&&b.end>issue.evidenceStart));
 assert.ok(doc.blocks.some(b=>b.page===2&&b.start<=issue.start&&b.end>issue.start));
 assert.deepEqual(doc,before);
});

test('final joint bill-local quote exception and same-object review reset remain independent',()=>{
 const quoted=makeDocument(['The term “crystal clear water” means water. Use crystal clear water.'],'Current');assert.equal(review(quoted).length,0);
 const plain=makeDocument(['Use crystal clear water.'],'Current');assert.equal(review(plain).length,1);assert.equal(review(quoted).length,0);
 const doc=makeDocument(['The water is crystal-clear.'],'Current');assert.equal(review(doc).length,1);
 const start=doc.text.indexOf('water');doc.struck=[{start,end:start+5}];assert.equal(review(doc).length,0);doc.struck=[];assert.equal(review(doc).length,1);
});
