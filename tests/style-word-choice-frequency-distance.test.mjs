import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';
import{makeDocument}from'../app/core.mjs';import{wordChoiceIssues}from'../app/style-word-choice.mjs';import{jointStylisticIssues}from'../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),frequency=issues=>issues.filter(i=>/(?:biennial|biannual)-frequency/u.test(i.rule)),direct=doc=>frequency(wordChoiceIssues(doc,refs)),joint=doc=>frequency(jointStylisticIssues(doc,refs,{includeReviewSuggestions:true}));

test('intact current-clause frequency negation is not discarded at an arbitrary character distance',()=>{
 for(const [lead,tail]of [['The agency shall not','issue a biannual report every two years.'],['The agency never','prepares a biennial report twice a year.'],['The agency acts without','issuing a biannual report every two years.'],['The agency avoids','preparing a biennial report twice a year.']])for(const gap of [1,140,400,1000]){const doc=makeDocument([lead+' '.repeat(gap)+tail],'Current'),before=structuredClone(doc);assert.equal(direct(doc).length,0,lead+gap);assert.equal(joint(doc).length,0,lead+gap);assert.deepEqual(doc,before);}
});

test('intentional deletion of preceding negation preserves the actual live positive frequency finding',()=>{
 for(const [text,negation,suggestion]of [['The agency shall not issue a biannual report every two years.','not','biennial'],['The agency never prepares a biennial report twice a year.','never','biannual']]){
  const doc=makeDocument([text],'Current'),start=doc.text.indexOf(negation);doc.struck=[{start,end:start+negation.length}];const before=structuredClone(doc);assert.deepEqual(direct(doc).map(i=>i.suggestion),[suggestion]);assert.deepEqual(joint(doc).map(i=>i.suggestion),[suggestion]);assert.deepEqual(doc,before);
 }
});

test('earlier sentence and completed clause negations do not veto the current positive role',()=>{
 for(const text of ['The agency issues a biannual report every two years.','The agency shall not act. The agency issues a biannual report every two years.','The agency shall not act, but the agency issues a biannual report every two years.','The agency shall not act; the agency issues a biennial report twice a year.'])assert.equal(joint(makeDocument([text],'Current')).length,1,text);
});

test('known long physical margin gaps retain negation without rewriting the source',()=>{
 const doc=makeDocument(['line 1 The agency shall not','line 2 '+(' '.repeat(300))+'issue a biannual report every two years.'],'Current'),before=structuredClone(doc);assert.equal(direct(doc).length,0);assert.equal(joint(doc).length,0);assert.deepEqual(doc,before);
 const positive=makeDocument(['line 1 The agency shall','line 2 '+(' '.repeat(300))+'issue a biannual report every two years.'],'Current');const [issue]=joint(positive);assert.ok(issue);assert.equal(issue.text,positive.text.slice(issue.start,issue.end));assert.equal(issue.text,'biannual');assert.equal(issue.suggestion,'biennial');
});

test('bill-local quote protection resets per bill and explicit frequency findings keep their source rule',()=>{
 const quoted=makeDocument(['The term “biannual” means the report. The agency issues a biannual report every two years.'],'Current'),plain=makeDocument(['The agency issues a biannual report every two years.'],'Current');assert.equal(joint(quoted).length,0);const [issue]=joint(plain);assert.ok(issue);assert.equal(issue.guideId,'lcb');assert.equal(issue.guidePage,3);assert.ok(issue.references.every(r=>r.guideId==='lcb'));assert.equal(joint(quoted).length,0);
});
