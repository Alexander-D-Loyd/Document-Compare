import test from 'node:test';
import assert from 'node:assert/strict';
import {makeDocument,spellingCandidates} from '../app/core.mjs';
import {workerSpell} from './helpers/spelling-worker.mjs';

test('numeric ordinal suffixes are not reported as separate spelling errors',async()=>{
 const doc=makeDocument(['The 4th revision and 7th cycle follow the 1st, 2nd, 3rd, 11th, 12th, 13th, 21st, 22nd, 23rd, and 24th revisions.'],'Current');
 assert.ok(!spellingCandidates(doc).some(w=>/^(st|nd|rd|th)$/.test(w.word)));
 assert.deepEqual(await workerSpell(spellingCandidates(doc)),[]);
 assert.ok(doc.tokens.some(t=>t.value==='7th'),'Comparison keeps the whole ordinal');
});

test('standalone suffix fragments and malformed or embedded ordinal text remain checkable',async()=>{
 const doc=makeDocument(['The term th and malformed 3th appear beside AB4th.'],'Current');
 const candidates=spellingCandidates(doc);
 assert.equal(candidates.filter(w=>w.word==='th').length,3);
 assert.equal((await workerSpell(candidates)).filter(w=>w.word==='th').length,3);
});
