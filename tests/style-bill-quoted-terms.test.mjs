import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument,spellingCandidates} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {billQuotedTermRanges,billQuotedTermProtection} from '../app/style-quoted-terms.mjs';import {GENERAL_MODIFIER_REVIEW_RULE} from '../app/offline-rules.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const doc=text=>makeDocument(Array.isArray(text)?text:[text],'Current'),check=text=>jointStylisticIssues(doc(text),refs,{includeReviewSuggestions:true});
test('quoted form protects every matching bill occurrence regardless of order or definition syntax',()=>{
 for(const [open,close] of [['“','”'],['"','"'],['‘','’'],["'","'"]]){
  const text='The advisor shall act. The form says '+open+'advisor'+close+'. Another advisor shall act.',d=doc(text),before=JSON.stringify(d),issues=jointStylisticIssues(d,refs);
  assert.equal(issues.filter(i=>i.suggestion==='adviser').length,0,text);assert.equal(billQuotedTermRanges(d).filter(r=>r.term==='advisor').length,3);assert.equal(JSON.stringify(d),before);
 }
});
test('user quoted compound example suppresses parser style review, not different wording or neighboring issues',()=>{
 const text='The term “Student only health center” applies. The Student only health center serves children. The advisor shall act.',d=doc(text),start=text.lastIndexOf('Student only'),issue={start,end:start+'Student only'.length,text:'Student only',matchText:'Student only',head:'center',engineRule:GENERAL_MODIFIER_REVIEW_RULE,reviewSuggested:true,reviewVariant:'noun-sequence',suggestion:null};
 const found=jointStylisticIssues(d,refs,{engineIssues:[issue],includeReviewSuggestions:true});assert.ok(!found.some(i=>i.start===start));assert.ok(found.some(i=>i.suggestion==='adviser'));
 const protect=billQuotedTermProtection(d);assert.ok(protect(issue));assert.ok(!protect({start,end:text.indexOf('serves')+'serves'.length}));
 assert.ok(!billQuotedTermProtection(doc('“Student only health center” is stated. Student-only health center applies.'))({start:40,end:52}));
});
test('LCB and GPO preferred forms cannot override exact quoted word, quantity or compound',()=>{
 const text='“wilful” and “data sharing” and “eleven” are terms. A data sharing agreement involves eleven wilful acts.',found=check(text);
 assert.ok(!found.some(i=>['willful','data-sharing','11'].includes(i.suggestion)));
 assert.ok(check('A data sharing agreement involves eleven wilful acts.').some(i=>i.suggestion==='willful'));
});
test('initial-letter capitalization is accepted while interior case and different forms stay independently checkable',()=>{
 const d=doc('“advisor” and “11” are terms. Advisor advisors advisor-related 11.5 11 apply.'),ranges=billQuotedTermRanges(d);
 assert.equal(ranges.filter(r=>r.term==='advisor').length,2);assert.equal(ranges.filter(r=>r.term==='11').length,2);assert.ok(!jointStylisticIssues(d,refs).some(i=>i.suggestion==='Adviser'));assert.ok(jointStylisticIssues(d,refs).some(i=>i.suggestion==='advisers'));
 const phrase=doc('“Student only health center” is stated. A student only health center applies. Student Only health center differs.'),protectedAt=billQuotedTermProtection(phrase),lower=phrase.text.indexOf('student only'),interior=phrase.text.indexOf('Student Only');assert.ok(protectedAt({start:lower,end:lower+24}));assert.ok(!protectedAt({start:interior,end:interior+24}));
});
test('quotes in the loaded Current Version digest and heading also protect that bill',()=>{
 const text='An act concerning “advisor”.\nLEGISLATIVE COUNSEL’S DIGEST\nThe term “advisor” is discussed.\nThe people of the State of California do enact as follows:\nline 1 The advisor acts.';
 assert.equal(billQuotedTermRanges(doc(text)).length,3);assert.ok(!check(text).some(i=>i.suggestion==='adviser'));
});
test('quoted terms remain document-local and refresh after source changes or quote removal',()=>{
 const d=doc('“advisor” is stated. The advisor acts.');assert.ok(!jointStylisticIssues(d,refs).some(i=>i.suggestion==='adviser'));
 assert.ok(check('The advisor acts.').some(i=>i.suggestion==='adviser'));
 d.struck=[{start:0,end:9}];assert.ok(jointStylisticIssues(d,refs).some(i=>i.suggestion==='adviser'));
 d.struck=[];d.text=d.text.replace('“',' ').replace('”',' ');assert.ok(jointStylisticIssues(d,refs).some(i=>i.suggestion==='adviser'));
});
test('unknown masked source, removed quotes and incomplete quotes cannot manufacture accepted terms',()=>{
 for(const field of ['struck','excluded']){const text='The “adXvisor” term is stated. The advisor acts.',d=doc(text),at=text.indexOf('X');d[field].push({start:at,end:at+1});assert.ok(jointStylisticIssues(d,refs).some(i=>i.suggestion==='adviser'));}
 assert.equal(billQuotedTermRanges(doc('An incomplete “advisor term. The advisor acts.')).length,0);
});
test('matching terms may wrap numbered PDF rows without absorbing margins into term authority',()=>{
 const d=doc(['line 1 The “data\nline 2 sharing” term is stated.\nline 3 A data\nline 4 sharing agreement applies.']),ranges=billQuotedTermRanges(d);
 assert.equal(ranges.length,2);assert.ok(!jointStylisticIssues(d,refs).some(i=>i.suggestion==='data-sharing'));assert.equal(d.text.slice(ranges[1].start,ranges[1].end),'data\nline 4 sharing');
});
test('recognized divided words inside quotes protect solid later occurrences without changing physical source',()=>{
 const d=makeDocument(['line 1 The “advi-\nline 2 sor” term applies.\nline 3 The advisor acts.'],'Current',[],[],new Set(['advisor'])),before=JSON.stringify(d),start=d.text.lastIndexOf('advisor');
 assert.ok(billQuotedTermProtection(d)({start,end:start+7}));assert.ok(!jointStylisticIssues(d,refs).some(i=>i.suggestion==='adviser'));assert.equal(JSON.stringify(d),before);
});
test('quote-boundary punctuation still receives its independent review',()=>{
 assert.ok(check('The term “advisor”. The advisor acts.').some(i=>i.rule==='Punctuation: Quotation Marks'));
});
test('inside-quote clause punctuation does not change term identity while internal punctuation is retained',()=>{
 for(const punctuation of [',','.'])assert.ok(!check('The term “advisor'+punctuation+'” applies. The advisor acts.').some(i=>i.suggestion==='adviser'));
 const d=doc('The form “U.S.” applies. U.S. is retained. US is another form.');assert.deepEqual([...new Set(billQuotedTermRanges(d).map(r=>r.term))],['U.S.']);assert.equal(billQuotedTermRanges(d).length,2);
});
test('explicit quoted table terms establish authority without extending a table or ignoring prose next to them',()=>{
 const d=doc('The “advisor” classification appears .... 5\nThe advisor acts. The wilful conduct applies.');
 assert.ok(!jointStylisticIssues(d,refs).some(i=>i.suggestion==='adviser'));assert.ok(jointStylisticIssues(d,refs).some(i=>i.suggestion==='willful'));
});
test('quoted style authority does not add spellings to the personal or bundled dictionary',async()=>{
 const d=doc('The “qzxvnotaword” term appears. The qzxvnotaword appears again.'),before=spellingCandidates(d);
 jointStylisticIssues(d,refs);assert.deepEqual(spellingCandidates(d),before);
 const {workerSpell}=await import('./helpers/spelling-worker.mjs'),found=await workerSpell(before);
 assert.equal(found.filter(i=>i.word==='qzxvnotaword').length,2);
});
