import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
test('production Article review owns one complete selection and restores every nested physical coordinate',()=>{
 for(const alias of ['XIIIB','XIII-B'])for(const physical of [false,true]){
  const pages=physical?['The people do enact as follows:\nline 1 Under Article '+alias+' of the','AB 224 — 2 —\nline 1 California Constitution the rule applies.']:['The people do enact as follows:\nline 1 Under Article '+alias+' of the California Constitution the rule applies.'];
  const doc=makeDocument(pages,'Current');
  if(physical){const head=doc.blocks.find(b=>b.text==='AB 224 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};}
  const saved=JSON.stringify(doc),all=jointStylisticIssues(doc,refs),found=all.filter(i=>i.checkId==='lcb-listed-reference-form');assert.equal(found.length,1,alias+' '+physical);
  const i=found[0],e=i.listedReferenceEvidence;assert.equal(i.text,'Article '+alias);assert.equal(i.suggestion,'Article XIII B');assert.equal(doc.text.slice(i.start,i.end),i.text);
  assert.equal(e.sourceText,doc.text.slice(e.start,e.end));for(const span of [e.selection,e.identifier,e.continuation])assert.equal(span.text,doc.text.slice(span.start,span.end));
  assert.equal(refs.lcb.pages[21].text.slice(e.sourceExample.start,e.sourceExample.end),e.sourceExample.text);assert.equal(all.filter(other=>other.start<i.end&&other.end>i.start).length,1);assert.equal(JSON.stringify(doc),saved);
 }
});
