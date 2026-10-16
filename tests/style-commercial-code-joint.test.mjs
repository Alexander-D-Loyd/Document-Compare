import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';import{jointStylisticIssues}from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),find=doc=>jointStylisticIssues(doc,refs,{includeReviewSuggestions:true}).filter(i=>/indorsements?-commercial-code/u.test(i.rule));

test('final production path requires actual operative Commercial Code target rather than another code cross-reference',()=>{
 const good=makeDocument(['SEC. 1. Section 3104 of the Commercial Code is amended to read:\n3104. The endorsement applies.'],'Current');assert.equal(find(good).length,1);
 for(const code of ['Civil','Insurance','Government'])assert.equal(find(makeDocument(['SEC. 1. Section 100 of the '+code+' Code is amended to read:\n100. A Commercial Code reference does not alter the endorsement.'],'Current')).length,0,code);
});

test('physical code heading and divided selected word preserve independent exact source highlight/context coordinates',()=>{
 const doc=makeDocument(['An unrelated require-\nment applies.\nThe people do enact as follows:\nline 1 SEC. 1. Section 3104 of the Commer-','AB 224 — 2 —\nline 1 cial Code is amended to read:\nline 2 3104. The endorse-\nline 3 ment applies.'],'Current',[],[],new Set(['requirement','commercial','endorsement'])),head=doc.blocks.find(b=>b.text==='AB 224 — 2 —');head.formatting={headerParts:[{text:head.text}]};const before=structuredClone(doc),issues=find(doc);assert.equal(issues.length,1);const [issue]=issues;
 assert.equal(issue.text,doc.text.slice(issue.start,issue.end));assert.equal(issue.text,'endorse-\nline 3 ment');assert.equal(issue.suggestion,'indorsement');assert.equal(issue.sectionContext.start,doc.text.indexOf('SEC. 1.'));assert.equal(issue.sectionContext.end,doc.text.indexOf('read:')+5);assert.equal(issue.sectionContext.code,'Commercial Code');assert.equal(doc.text.slice(issue.sectionContext.start,issue.sectionContext.end).includes('Commer-'),true);assert.deepEqual(doc,before);
});

test('bill-local quoted terms reset per bill and the operative target does not bypass literal protections',()=>{
 const quoted=makeDocument(['The term “endorsement” means the record.\nSEC. 1. Section 3104 of the Commercial Code is amended to read:\n3104. The endorsement applies.'],'Current'),plain=makeDocument(['SEC. 1. Section 3104 of the Commercial Code is amended to read:\n3104. The endorsement applies.'],'Current');assert.equal(find(quoted).length,0);assert.equal(find(plain).length,1);assert.equal(find(quoted).length,0);
 for(const [open,close]of [['“','”'],['"','"'],['‘','’'],["'","'"]]){const doc=makeDocument(['SEC. 1. Section 3104 of the Commercial Code is amended to read:\n3104. The '+open+'endorsement'+close+' applies.'],'Current');assert.equal(find(doc).length,0);}
});
