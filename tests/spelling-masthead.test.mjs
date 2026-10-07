import test from 'node:test';
import assert from 'node:assert/strict';
import {makeDocument,spellingCandidates} from '../app/core.mjs';

const format=smallCaps=>({runs:[{start:0,end:22,smallCaps}]});
test('only small-cap CALIFORNIA in the opening legislature masthead is exempt',()=>{
 const doc=makeDocument(['california legislature\nCalifornia and california remain body words.\ncalifornia legislature'], 'bill',[],[[format(true),format(false),format(false)]]);
 const words=spellingCandidates(doc);
 assert.ok(!words.some(w=>w.start===0));
 assert.equal(words.filter(w=>/^california$/i.test(w.word)).length,3);
 assert.ok(words.some(w=>w.word==='legislature'));
 assert.ok(doc.tokens.some(t=>t.start===0),'Comparison still includes masthead text');
});
test('plain text, numbered body, later pages and other small-cap headings stay checkable',()=>{
 for(const [pages,formatting] of [
  [['california legislature'],[[format(false)]]],
  [['line 1 california legislature'],[[format(true)]]],
  [['Introduction','california legislature'],[[format(false)],[format(true)]]],
  [['california residents'],[[format(true)]]]
 ]){
  assert.ok(spellingCandidates(makeDocument(pages,'bill',[],formatting)).some(w=>w.word==='california'));
 }
});
