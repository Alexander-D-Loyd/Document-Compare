import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {lcbReferenceChainIssues} from '../app/style-lcb-review-reference-chains.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=text=>makeDocument(['The people do enact as follows:\nline 1 '+text],'Current');
const marked=d=>jointStylisticIssues(d,refs,{includeReviewSuggestions:true}).filter(i=>i.checkId==='lcb-bill-et-seq');

test('complete numeric Bill Section reference corrects only the extra et period against the printed LCB source',()=>{
 for(const text of ['The agency follows Section 123 et. seq.','The agency follows Sections 123 et. seq.','The agency follows Section 123.4 et. seq.','The agency follows section 123 et. seq.']){
  const d=make(text),saved=JSON.stringify(d),found=marked(d);assert.equal(found.length,1,text);const i=found[0];assert.equal(d.text.slice(i.start,i.end),'et.');assert.equal(i.suggestion,'et');assert.equal(i.guidePage,22);assert.equal(i.references.length,1);assert.equal(i.references[0].guideId,'lcb');assert.equal(i.references[0].ruleText,'Section 123 et seq. (bill)');assert.ok(i.references[0].sourcePassage.text.includes('Section 123 et seq. (bill)'));assert.equal(JSON.stringify(d),saved);
 }
});

test('compliant forms and unsupported document type context remain quiet',()=>{
 for(const text of ['Section 123 et seq. applies.','Section 123 and following applies.','Article 123 et. seq. applies.','Section one et. seq. applies.','Section 123(a) et. seq. applies.','Section 123..4 et. seq. applies.','Section 123é et. seq. applies.','xSection 123 et. seq. applies.','Section 123 et. seq.é applies.','The paragraph contains et. seq. text.'])assert.equal(marked(make(text)).length,0,text);
 for(const source of ['OPINION\nSection 123 et. seq. applies.','COVER LETTER\nSection 123 et. seq. applies.','Section 123 et. seq. applies.','LEGISLATIVE COUNSEL’S DIGEST\nSection 123 et. seq. applies.\nThe people do enact as follows:\nline 1 An unrelated provision applies.'])assert.equal(marked(makeDocument([source],'Current')).length,0,source);
});

test('quoted bill-local wording retains authority and does not carry to another bill',()=>{
 for(const text of ['The phrase “Section 123 et. seq.” is quoted.','The phrase "Section 123 et. seq." is quoted.','“et. seq.” means the reference form. The agency follows Section 123 et. seq.'])assert.equal(marked(make(text)).length,0,text);
 assert.equal(marked(make('The agency follows Section 123 et. seq.')).length,1);
});

test('each character of the complete source reference and its connecting spaces remains establishing evidence',()=>{
 const d=make('The agency follows Section 123 et. seq.'),start=d.text.indexOf('Section'),end=d.text.length;
 assert.equal(lcbReferenceChainIssues(d,refs).filter(i=>i.checkId==='lcb-bill-et-seq').length,1);
 for(const field of ['struck','excluded'])for(let at=start;at<end;at++){
  const bad=structuredClone(d);bad[field].push({start:at,end:at+1});assert.equal(lcbReferenceChainIssues(bad,refs).filter(i=>i.checkId==='lcb-bill-et-seq').length,0,field+' '+at);
 }
 const at=d.text.indexOf('do enact');for(const field of ['struck','excluded']){const bad=structuredClone(d);bad[field].push({start:at,end:at+2});assert.equal(lcbReferenceChainIssues(bad,refs).filter(i=>i.checkId==='lcb-bill-et-seq').length,0);}
});

test('tables and unknown ignored rows cannot establish a Bill reference',()=>{
 const table=make('The agency follows Section 123 et. seq.');table.blocks.at(-1).formatting={headerGaps:[{},{},{}]};assert.equal(marked(table).length,0);
 const d=makeDocument(['The people do enact as follows:\nline 1 The agency follows Section 123','AB 192 — 2 —\nline 1 et. seq.'],'Current'),head=d.blocks.find(b=>b.text==='AB 192 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};
 const saved=JSON.stringify(d),found=marked(d);assert.equal(found.length,1);assert.equal(d.text.slice(found[0].start,found[0].end),'et.');assert.equal(JSON.stringify(d),saved);
 head.runningHead=false;head.layoutLabel=false;head.formatting={};assert.equal(marked(d).length,0);
});
