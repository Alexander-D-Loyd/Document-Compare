import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {commercialCodeSectionWitnesses} from '../app/style-commercial-code-context.mjs';
import {wordChoiceIssues} from '../app/style-word-choice.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const find=doc=>wordChoiceIssues(typeof doc==='string'?makeDocument([doc],'Current'):doc,refs).filter(i=>/indorsements?-commercial-code/u.test(i.rule));

test('existing complete operative Commercial Code targets retain exact singular/plural source choices',()=>{
 for(const heading of [
  'SEC. 1. Section 3104 of the Commercial Code is amended to read:',
  'SECTION 1. Sections 3104 and 3105 of the Commercial Code are amended to read:',
  'SEC. 1. Section 3104 is added to the Commercial Code, to read:',
  'SEC. 1. Article 2 (commencing with Section 3104) is added to Chapter 1 of Division 3 of the Commercial Code, to read:',
  'SEC. 1. Section 3104 is added to the Commercial Code, immediately following Section 3103, to read:',
 ]){
  const text=heading+'\n3104. The endorsement and endorsements apply.',doc=makeDocument([text],'Current'),before=structuredClone(doc),issues=find(doc);
  assert.deepEqual(issues.map(i=>i.suggestion),['indorsement','indorsements'],heading);
  for(const issue of issues){assert.equal(issue.text,doc.text.slice(issue.start,issue.end));assert.equal(issue.sectionContext.code,'Commercial Code');assert.equal(doc.text.slice(issue.sectionContext.start,issue.sectionContext.end),heading);}
  assert.deepEqual(doc,before);
 }
});

test('a Civil or Insurance Code section cannot inherit Commercial Code identity from a body cross-reference',()=>{
 for(const code of ['Civil','Insurance','Government'])for(const body of ['A reference to the Commercial Code does not change the endorsement requirement.','The Commercial Code is referenced. The insurance endorsements apply.']){
  assert.equal(find('SEC. 1. Section 100 of the '+code+' Code is amended to read:\n100. '+body).length,0,code+body);
 }
 for(const text of ['The Commercial Code endorsement applies.','SEC. 1. The Legislature finds and declares that the Commercial Code endorsement applies.','SEC. 1. The section concerns the Commercial Code. The endorsement applies.'])assert.equal(find(text).length,0,text);
});

test('new section boundaries reset the domain and original removed closers cannot leak prior code identity',()=>{
 const text='SEC. 1. Section 3104 of the Commercial Code is amended to read:\n3104. The endorsement applies.\nSEC. 2. Section 100 of the Insurance Code is amended to read:\n100. The insurance endorsement applies.',doc=makeDocument([text],'Current');
 assert.equal(find(doc).length,1);
 const from=doc.text.indexOf('SEC. 2.'),to=doc.text.indexOf('100. The insurance');
 for(const mode of ['struck','excluded']){const masked=structuredClone(doc);masked[mode]=[{start:from,end:to}];assert.equal(find(masked).length,1,'Original closer preserved '+mode);}
 const other=makeDocument(['SEC. 1. Section 100 of the Civil Code is amended to read:\n100. The Commercial Code endorsement applies.'],'Current');assert.equal(find(other).length,0);assert.equal(find(doc).length,1);
});

test('every operative target character including labels and colon remains required original evidence',()=>{
 const heading='SEC. 1. Section 3104 of the Commercial Code is amended to read:',doc=makeDocument([heading+'\n3104. The endorsement applies.'],'Current');assert.equal(find(doc).length,1);
 for(const mode of ['struck','excluded'])for(let start=0;start<heading.length;start++){
  const masked=structuredClone(doc);masked[mode]=[{start,end:start+1}];assert.equal(find(masked).length,0,mode+' @ '+start);
 }
});

test('quotation and code-name fragments cannot manufacture governing code evidence',()=>{
 for(const [open,close]of [['“','”'],['"','"'],['‘','’'],["'","'"]]){
  const text=open+'SEC. 1. Section 3104 of the Commercial Code is amended to read:'+close+'\n3104. The endorsement applies.',doc=makeDocument([text],'Current');assert.equal(find(doc).length,0,text);
  for(const mode of ['struck','excluded'])for(const side of ['open','close','both']){const changed=structuredClone(doc),first=changed.text.indexOf(open),last=changed.text.lastIndexOf(close);changed[mode]=[...(side!=='close'?[{start:first,end:first+1}]:[]),...(side!=='open'?[{start:last,end:last+1}]:[])];assert.equal(find(changed).length,0,text+mode+side);}
 }
 for(const [text,hidden]of [
  ['pre-SEC. 1. Section 3104 of the Commercial Code is amended to read:\n3104. The endorsement applies.','pre-'],
  ['SEC. 1. Section 3104 of the pre-Commercial Code is amended to read:\n3104. The endorsement applies.','pre-'],
  ['SEC. 1. Section 3104 of the Commercial Codeα is amended to read:\n3104. The endorsement applies.','α'],
  ['SEC. 1. Section 3104 of the Commercial Code/key is amended to read:\n3104. The endorsement applies.','/key'],
 ])for(const mode of ['struck','excluded']){assert.equal(find(text).length,0,text);const doc=makeDocument([text],'Current'),start=doc.text.indexOf(hidden);doc[mode]=[{start,end:start+hidden.length}];assert.equal(find(doc).length,0,text+mode);}
});

test('unrelated body removals do not discard an intact governing heading and selected word',()=>{
 const text='SEC. 1. Section 3104 of the Commercial Code is amended to read:\n3104. An unrelated provision applies. The endorsement applies.';
 for(const mode of ['struck','excluded']){const doc=makeDocument([text],'Current'),start=doc.text.indexOf('unrelated');doc[mode]=[{start,end:start+9}];assert.equal(find(doc).length,1,mode);}
});

test('recognized physical page heads and margins retain intro and selection positions',()=>{
 const doc=makeDocument(['The people do enact as follows:\nline 1 SEC. 1. Section 3104 of the Commercial','AB 224 — 2 —\nline 1 Code is amended to read:\nline 2 3104. The endorsement applies.'],'Current'),head=doc.blocks.find(b=>b.text==='AB 224 — 2 —');head.formatting={headerParts:[{text:head.text}]};const before=structuredClone(doc),issues=find(doc);assert.equal(issues.length,1);const [issue]=issues;assert.equal(doc.text.slice(issue.start,issue.end),'endorsement');assert.equal(issue.sectionContext.start,doc.text.indexOf('SEC. 1.'));assert.equal(issue.sectionContext.end,doc.text.indexOf('read:')+5);assert.deepEqual(doc,before);
 head.formatting={};head.runningHead=false;head.layoutLabel=false;assert.equal(find(doc).length,0,'Unknown bridge cannot establish target identity');
});

test('table evidence and printed conditional meaning remain source-backed and bounded',()=>{
 const doc=makeDocument(['SEC. 1. Section 3104 of the Commercial Code is amended to read:\n3104. The endorsement applies.'],'Current');doc.blocks[0].formatting={headerGaps:[{},{},{}]};assert.equal(find(doc).length,0);
 const entry=refs.lcb.pages[3].text;assert.match(entry,/indorsement \(used in Commercial\s+Code\)/u);
 assert.equal(commercialCodeSectionWitnesses(makeDocument(['SEC. 1. Section 100 of the Civil Code is amended to read:\n100. The Commercial Code endorsement applies.'],'Current')).length,0);
});
