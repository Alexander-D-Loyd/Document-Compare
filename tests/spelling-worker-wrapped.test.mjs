import test from 'node:test';import assert from 'node:assert/strict';
import {makeDocument,spellingCandidates} from '../app/core.mjs';
import {workerSpell,workerWords} from './helpers/spelling-worker.mjs';
test('actual local dictionary accepts a correctly spelled word divided into three fragments',async()=>{
 const words=await workerWords(),doc=makeDocument(['line 1 The for-\nline 2 mat-\nline 3 ion applies.'],'Current',[],[],words);
 const issues=await workerSpell(spellingCandidates(doc));assert.equal(issues.length,0);assert.equal(doc.wrappedWords[0].word,'formation');assert.equal(doc.wrappedWords[0].recognized,true);
});
test('real dictionary does not hide a three-fragment misspelling just because each fragment is a word',async()=>{
 const doc=makeDocument(['line 1 The for-\nline 2 mart-\nline 3 ion applies.'],'Current');
 const issues=await workerSpell(spellingCandidates(doc));assert.deepEqual(issues.map(i=>i.word),['formartion']);assert.equal(issues[0].spans.length,3);
});
test('ordinary valid two-part line-divided compounds retain prior spelling behavior',async()=>{
 const doc=makeDocument(['line 1 A data-\nline 2 sharing agreement.'],'Current');
 assert.deepEqual(await workerSpell(spellingCandidates(doc)),[]);
});
