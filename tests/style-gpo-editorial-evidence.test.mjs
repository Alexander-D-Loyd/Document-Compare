import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {editorialNotationIssues} from '../app/style-editorial-notation.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const doc=text=>makeDocument([text],'Current'),check=d=>editorialNotationIssues(typeof d==='string'?doc(d):d,refs);
test('printed editorial annotation and versus rules have exact source passages and narrow selections',()=>{
 assert.match(refs.gpo.pages[282].text,/underscore supplied/u);assert.match(refs.gpo.pages[283].text,/always set in lowercase/u);
 for(const [text,actual,wanted,rule,page]of [['The extract follows [underscore supplied].','underscore supplied','italic supplied','11.4',283],['Case of Smith V. Brown governs.','V.','v.','11.8',284],['Decision in Jones V. Adams governs.','V.','v.','11.8',284],['Holding in Jones V. Adams governs.','V.','v.','11.8',284]]){
  const d=doc(text),before=JSON.stringify(d),[i]=check(d);assert.ok(i,text);assert.equal(i.text,actual);assert.equal(i.suggestion,wanted);assert.equal(i.rule,rule);assert.equal(i.guidePage,page);assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(d.text.slice(i.evidenceStart,i.evidenceEnd),rule==='11.4'?'[underscore supplied]':text.slice(0,-9));assert.equal(JSON.stringify(d),before);
  const integrated=jointStylisticIssues(d,refs).find(x=>x.checkId==='editorial-notation');assert.ok(integrated);assert.ok(integrated.references[0].sourcePassage.text.includes(rule+'.'));
 }
});
test('printed preserved annotations and accepted lowercase connectors stay quiet',()=>{
 for(const text of ['[emphasis in original]','[emphasis supplied]','[emphasis added]','[emphasis ours]','[italic supplied]','underscore supplied','The case of Smith v. Brown governs.','Henry V. Jones signed the form.','[[underscore supplied]]'])assert.deepEqual(check(text),[],text);
});
test('every original annotation bracket and character is required, including invisible removed bridges',()=>{
 const text='The extract follows [underscore supplied].',start=text.indexOf('['),end=text.indexOf(']')+1;
 for(const property of ['struck','excluded'])for(let n=start;n<end;n++){const d=doc(text);d[property].push({start:n,end:n+1});assert.deepEqual(check(d),[],property+' '+n);}
 for(const property of ['struck','excluded']){const d=doc('The extract follows [underscore old supplied].'),at=d.text.indexOf('old');d[property].push({start:at,end:at+3});assert.deepEqual(check(d),[],property+' removed word');}
});
test('legal cue and both complete surnames are necessary evidence for a lowercase versus suggestion',()=>{
 const text='The case of Smith V. Brown governs.',start=text.indexOf('case'),end=text.indexOf('Brown')+5;
 for(const property of ['struck','excluded'])for(let n=start;n<end;n++){const d=doc(text);d[property].push({start:n,end:n+1});assert.deepEqual(check(d),[],property+' '+n);}
 for(const property of ['struck','excluded']){const d=doc('The case old of Smith V. Brown governs.'),at=d.text.indexOf('old');d[property].push({start:at,end:at+3});assert.deepEqual(check(d),[],property+' removed cue word');}
});
test('Unicode and technical attachments never establish a complete case cue or surname',()=>{
 for(const text of ['The écase of Smith V. Brown governs.','The case of Smith V. Browné governs.','The case of Smith V. Brown\u0301 governs.','The case of Smith V. Brown_path governs.','The case of Smith V. Brown-key governs.','The key/case of Smith V. Brown governs.','key/[underscore supplied] applies.'])assert.deepEqual(check(text),[],text);
});
test('wrapped quotations, original removed enclosure marks and evidence-intersecting tables stay protected',()=>{
 for(const text of ['The text says “[underscore supplied]”.','The text says "[underscore\nsupplied]".','The text says ‘[underscore supplied]’.','The text says “case of Smith V. Brown”.'])assert.deepEqual(check(text),[],text);
 for(const property of ['struck','excluded'])for(const char of ['“','”']){const d=doc('The text says “case of Smith V. Brown”.'),at=d.text.indexOf(char);d[property].push({start:at,end:at+1});assert.deepEqual(check(d),[],property+' '+char);}
 const d=doc('The case of Smith\nV. Brown governs.');d.blocks[0].formatting={headerGaps:[{},{}]};assert.deepEqual(check(d),[]);
});
test('recognized physical page heads bridge complete evidence with exact source highlights',()=>{
 const d=makeDocument(['The people do enact as follows:\nline 1 Case of Smith','AB 121 — 2 —\nline 1 V. Brown governs.'],'Current'),head=d.blocks.find(b=>b.text==='AB 121 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};
 const before=JSON.stringify(d),[i]=check(d);assert.ok(i);assert.equal(i.text,'V.');assert.match(d.text.slice(i.evidenceStart,i.evidenceEnd),/AB 121/);assert.equal(JSON.stringify(d),before);head.formatting={};head.runningHead=false;head.layoutLabel=false;assert.deepEqual(check(d),[]);
 const annotation=makeDocument(['line 1 The extract follows [underscore','line 1 supplied].'],'Current'),[a]=check(annotation);assert.ok(a);assert.equal(a.suggestion,'italic supplied');assert.equal(annotation.text.slice(a.start,a.end),a.text);
});
