import test from 'node:test';
import assert from 'node:assert/strict';
import {makeDocument,spellingCandidates} from '../app/core.mjs';
import {workerSpell} from './helpers/spelling-worker.mjs';

test('source-leading alphabetic clause markers are not separate spelling errors',async()=>{
 const doc=makeDocument(['line 1 (aa) The office accepts records.\nline 2 (ab) The office keeps records.\nline 3 (1) (ac) The office accepts forms.\nline 4 (bg) The office accepts applications.'],'Current');
 assert.ok(!spellingCandidates(doc).some(w=>['aa','ab','ac','bg'].includes(w.word)));
 assert.deepEqual(await workerSpell(spellingCandidates(doc)),[]);
 for(const value of ['aa','ab','ac','bg'])assert.ok(doc.tokens.some(t=>t.value===value),'Comparison must retain label '+value);
});

test('explicit clause-label references protect identifiers without exempting prose',async()=>{
 const doc=makeDocument(['The office follows subdivisions (aa), (ab), and (ac) and paragraph (bg).\nline 2 The invalid word aa appears in prose and (zz) is parenthetical.\nline 3 The office accepts recrods.'],'Current');
 const words=spellingCandidates(doc);
 assert.equal(words.filter(w=>w.word==='aa').length,1);
 assert.ok(!words.some(w=>['ab','ac','bg'].includes(w.word)));
 assert.ok(words.some(w=>w.word==='zz'));
 const issues=await workerSpell(words);
 for(const word of ['aa','zz','recrods'])assert.ok(issues.some(w=>w.word===word),word);
});

test('page and line wraps preserve original misspelling spans beside clause markers',async()=>{
 const doc=makeDocument(['line 1 (az) The office accepts recrods.','line 1 (ba) The office follows subdivisions\nline 2 (bb) and (bc).'],'Current');
 const issues=await workerSpell(spellingCandidates(doc));
 assert.deepEqual(issues.map(i=>i.word),['recrods']);
 assert.equal(doc.text.slice(issues[0].start,issues[0].end),'recrods');
});
