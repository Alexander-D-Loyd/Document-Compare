import test from 'node:test';import assert from 'node:assert/strict';
import {makeDocument,spellingCandidates} from '../app/core.mjs';
test('three-fragment divided words are reconstructed once across page headers',()=>{
 const pages=['ASSEMBLY BILL No. 109\nBudget Act of 2026.\nline 47 The inter-\n98','AB 109 — 28 —\nItem Amount\nline 1 depart-','AB 109 — 29 —\nItem Amount\nline 1 mental agreement applies.'];
 const formatting=[[],[{},{headerParts:[{},{}]}],[{},{headerParts:[{},{}]}]];
 const doc=makeDocument(pages,'Current',[],formatting,new Set(['interdepartmental']));
 assert.equal(doc.wrappedWords.length,1);assert.equal(doc.wrappedWords[0].word,'interdepartmental');
 assert.deepEqual(doc.wrappedWords[0].spans.map(s=>doc.text.slice(s.start,s.end)),['inter','depart','mental']);
 const words=spellingCandidates(doc);assert.equal(words.filter(w=>w.word==='interdepartmental').length,1);assert.ok(!words.some(w=>['interdepart','departmental','inter','depart','mental','Item','Amount'].includes(w.word)));
 assert.deepEqual(doc.tokens.filter(t=>t.start>=doc.wrappedWords[0].start).map(t=>t.value),['interdepartmental','agreement','applies','.']);
});
test('separate divided words on one continuation line do not overlap',()=>{
 const doc=makeDocument(['line 1 The inter-\nline 2 depart-\nline 3 mental govern-\nline 4 ment applies.'],'Current',[],[],new Set(['interdepartmental','government']));
 assert.deepEqual(doc.wrappedWords.map(w=>w.word),['interdepartmental','government']);assert.ok(doc.wrappedWords[0].end<doc.wrappedWords[1].start);
 assert.deepEqual(spellingCandidates(doc).map(w=>w.word),['The','interdepartmental','government','applies']);
});
test('unknown reconstructed spellings retain fragment spans without intervening labels',()=>{
 const doc=makeDocument(['line 1 A for-\nline 2 mart-\nline 3 ion occurs.'],'Current');
 const candidates=spellingCandidates(doc),word=candidates.find(w=>w.word==='formartion');assert.ok(word);assert.deepEqual(word.parts,['for','mart','ion']);
 assert.deepEqual(word.spans.map(s=>doc.text.slice(s.start,s.end)),['for','mart','ion']);assert.ok(!candidates.some(w=>['for','mart','ion','formation'].includes(w.word)));
 assert.ok(doc.tokens.some(t=>t.value==='mart'),'Unknown words must not silently change comparison spelling');
});
test('recognized ordinary compounds preserve printed hyphens when not dictionary words',()=>{
 const doc=makeDocument(['line 1 A data-\nline 2 sharing agreement.'],'Current',[],[],new Set(['data','sharing']));
 assert.deepEqual(doc.tokens.map(t=>t.value),['A','data','-','sharing','agreement','.']);assert.equal(doc.wrappedWords[0].recognized,false);
});
