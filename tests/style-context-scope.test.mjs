import test from 'node:test';import assert from 'node:assert/strict';
import {makeDocument} from '../app/core.mjs';import {styleSource,styleContext,withStyleContext} from '../app/style-context.mjs';
test('one review shares its context, while later reviews see corrected text and exclusions',()=>{
 const doc=makeDocument(['Review this text.'],'Current');const original=styleContext(doc);
 withStyleContext(doc,()=>{const first=styleContext(doc);assert.equal(styleContext(doc),first);assert.equal(styleSource(doc),first.source);withStyleContext(doc,()=>assert.equal(styleContext(doc),first));});
 assert.notEqual(styleContext(doc),original);doc.struck=[{start:7,end:11}];withStyleContext(doc,()=>assert.equal(styleSource(doc).slice(7,11),'    '));
 doc.struck=[];doc.text='Corrected text.';withStyleContext(doc,()=>assert.equal(styleSource(doc),'Corrected text.'));
});
test('failed reviews and nested document reviews do not retain stale context',()=>{
 const a=makeDocument(['First text.'],'Current'),b=makeDocument(['Second text.'],'Current');
 assert.throws(()=>withStyleContext(a,()=>{withStyleContext(b,()=>assert.equal(styleSource(b),b.text));throw Error('review failed');}),/review failed/);
 a.text='Updated text.';assert.equal(styleSource(a),'Updated text.');assert.equal(styleContext(b).source,'Second text.');
});
