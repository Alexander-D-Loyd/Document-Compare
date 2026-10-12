import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument}from '../app/core.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';import {internalBillReferenceIssues}from '../app/style-internal-bill-references.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),intro='The people of the State of California do enact as follows:\nSECTION 1. This act applies.\n';
test('explicit missing local targets are contextual review without an invented correction',()=>{
 const doc=makeDocument([intro+'SEC. 2. Section 9 of this bill shall become operative.'],'Current'),saved=JSON.stringify(doc),issues=internalBillReferenceIssues(doc,refs);
 assert.equal(issues.length,1);assert.deepEqual(issues[0].missingTargets,['9']);assert.equal(issues[0].suggestion,null);assert.equal(issues[0].reviewSuggested,true);assert.equal(doc.text.slice(issues[0].start,issues[0].end),'Section 9 of this bill');assert.equal(JSON.stringify(doc),saved);
 assert.equal(jointStylisticIssues(doc,refs).filter(i=>i.checkId==='lcb-internal-bill-reference-review').length,0);
 assert.equal(jointStylisticIssues(doc,refs,{includeReviewSuggestions:true}).filter(i=>i.checkId==='lcb-internal-bill-reference-review').length,1);
});
test('active decimal headings, lists, suffixes and whole-section ranges establish exact targets',()=>{
 const doc=makeDocument([intro+'SEC. 2. Section 7.5(a) of this bill applies.\nSEC. 7.5. Sections 1 and 2 of this bill apply. Sections 1 to 3 of this bill apply.'],'Current');
 assert.deepEqual(internalBillReferenceIssues(doc,refs).map(i=>i.missingTargets),[['3']]);
});
test('statutory references, quoted copy and incomplete excerpts cannot manufacture local target warnings',()=>{
 for(const text of ['Section 9 of this bill applies.',intro+'Section 9 of the Government Code applies.',intro+'The label “Section 9 of this bill” applies.', 'The people do enact as follows:\nSEC. 7.5. Section 9 of this bill applies.'])assert.equal(internalBillReferenceIssues(makeDocument([text],'Current'),refs).length,0,text);
});
test('stricken targets do not establish active membership; removed references stay protected',()=>{
 const text=intro+'SEC. 9. Old text.\nSEC. 2. Section 9 of this bill applies.',doc=makeDocument([text],'Current');const at=text.indexOf('SEC. 9.');doc.struck=[{start:at,end:at+7}];
 assert.deepEqual(internalBillReferenceIssues(doc,refs).map(i=>i.missingTargets),[['9']]);
 const reference=text.indexOf('Section 9');doc.struck.push({start:reference,end:reference+9});assert.equal(internalBillReferenceIssues(doc,refs).length,0);
});
test('margin/page labels preserve physical reference spans and never become targets',()=>{
 const doc=makeDocument([intro+'line 1 SEC. 2. Section 9\nline 2 of this bill applies.'],'Current');const found=internalBillReferenceIssues(doc,refs);assert.equal(found.length,1);assert.equal(found[0].matchText,'Section 9 of this bill');assert.equal(doc.text.slice(found[0].start,found[0].end),'Section 9\nline 2 of this bill');
});
test('stricken former section numbers cannot hide an intact replacement heading',()=>{
 const text=intro+'Prior content.\nline 1 SEC. 30. SEC. 4. New text.\nline 2 SEC. 5. Section 4 of this bill applies.',doc=makeDocument([text],'Current'),at=text.indexOf('SEC. 30.');doc.struck=[{start:at,end:at+8}];
 assert.equal(internalBillReferenceIssues(doc,refs).length,0);
});
