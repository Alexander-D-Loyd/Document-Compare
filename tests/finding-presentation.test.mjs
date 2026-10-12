import test from 'node:test';import assert from 'node:assert/strict';import {makeDocument}from '../app/core.mjs';import {grammarIssues}from '../app/grammar.mjs';import {findingText,consolidateStyleFindings}from '../app/finding-presentation.mjs';import {createReviewIgnores}from '../app/review-ignores.mjs';
test('article/repeated-word errors crossing real margin rows retain whole physical ranges and clean labels',()=>{
 const doc=makeDocument(['line 1 The office requires an\nline 2 local agency and reviews the\nline 3 the report.'],'Current'),saved=JSON.stringify(doc),issues=grammarIssues(doc);
 assert.deepEqual(issues.map(i=>i.matchText),['an local','the the']);assert.deepEqual(issues.map(i=>i.suggestion),['a local','the']);assert.equal(doc.text.slice(issues[0].start,issues[0].end),'an\nline 2 local');assert.equal(findingText(doc,issues[0]),'an local');assert.equal(JSON.stringify(doc),saved);
});
test('recognized word divisions supply whole pronunciation evidence across pages',()=>{
 const doc=makeDocument(['line 1 The office requires a infor-','line 1 mation report.'],'Current',[],[],new Set(['information'])),issues=grammarIssues(doc);
 assert.equal(issues.length,1);assert.equal(issues[0].suggestion,'an information');assert.equal(issues[0].matchText,'a information');assert.equal(doc.text.slice(issues[0].start,issues[0].end),'a infor-\nline 1 mation');assert.equal(issues[0].sourceWordDivisions.length,1);
});
test('unknown exclusions and source strikes cannot manufacture cross-line grammar evidence',()=>{
 const text='The office requires an\nremoved local report.',doc=makeDocument([text],'Current'),at=text.indexOf('removed');doc.excluded=[{start:at,end:at+8}];assert.equal(grammarIssues(doc).length,0);
 const other=makeDocument(['line 1 an\nline 2 local agency.'],'Current');other.struck=[{start:other.text.indexOf('local'),end:other.text.indexOf('local')+2}];assert.equal(grammarIssues(other).length,0);
});
test('Ignore All recognizes the same grammar issue across different printed margin numbers and Undo restores it',()=>{
 const doc=makeDocument(['line 1 an\nline 2 local report.\nline 8 an\nline 9 local agency.'],'Current'),issues=grammarIssues(doc),ignore=createReviewIgnores();assert.equal(issues.length,2);assert.equal(ignore.matchingCount('grammar',issues[0],issues,doc.text),2);ignore.ignore('grammar',issues[0],doc.text,true);assert.ok(issues.every(i=>ignore.has('grammar',i,doc.text)));ignore.undo();assert.ok(issues.every(i=>!ignore.has('grammar',i,doc.text)));
});
test('identical generic questions consolidate while nested phrases and distinct grammatical roles survive',()=>{
 const base={checkId:'lcb-general-unit-modifier-review',reviewSuggested:true,suggestion:null,head:'program',evidenceStart:0,evidenceEnd:80,references:[],reviewVariant:'noun-sequence'},a={...base,start:10,end:40},duplicate={...a},b={...base,start:20,end:40,reviewVariant:'qualified-noun-prefix'},different={...base,start:20,end:40,head:'agreement'},correction={...base,start:20,end:40,reviewSuggested:false,suggestion:'a-b'},input=[a,duplicate,b,different,correction],saved=JSON.stringify(input),out=consolidateStyleFindings(input);assert.equal(out.length,4);assert.deepEqual(out[0].coveredReviewVariants,['noun-sequence']);assert.equal(JSON.stringify(input),saved);assert.equal(out[0].start,10);assert.equal(out[0].end,40);assert.ok(out.some(i=>i.reviewVariant==='qualified-noun-prefix'));
});
test('a month followed by the modal may is not a repeated-word correction',()=>{
 const doc=makeDocument(['line 43 Estimates provided in January and May\nline 44 may constitute notification.'],'Current');assert.equal(grammarIssues(doc).length,0);assert.equal(grammarIssues(makeDocument(['The office may\nline 2 may approve.'],'Current')).length,1);
});
