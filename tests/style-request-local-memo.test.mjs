import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import{makeDocument}from '../app/core.mjs';
import{styleContext,withStyleContext,memoizeStyleReview}from '../app/style-context.mjs';
import{originalBodyStyleContext}from '../app/style-evidence.mjs';
import{billQuotedTermProtection}from '../app/style-quoted-terms.mjs';
import{jointStylisticIssues as prototype}from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),doc=text=>makeDocument(['The people do enact as follows:\nline 1 '+text],'Current'),key=Symbol('controlled memo test'),counted=()=>{let count=0;return {build:()=>++count,count:()=>count};},range=(d,text)=>({start:d.text.lastIndexOf(text),end:d.text.lastIndexOf(text)+text.length});

test('same synchronous review shares derived source and completed quote protection, including cached null',()=>{
 const d=doc('The phrase “student only center” is used. The student only center applies.'),at=d.text.indexOf('phrase');d.struck=[{start:at,end:at+6}];
 withStyleContext(d,()=>{assert.equal(originalBodyStyleContext(d),originalBodyStyleContext(d));const a=billQuotedTermProtection(d),b=billQuotedTermProtection(d);assert.equal(a,b);assert.equal(a(range(d,'student only center')),true);let calls=0;const empty=()=>{calls++;return null;};assert.equal(memoizeStyleReview(d,null,key,empty),null);assert.equal(memoizeStyleReview(d,null,key,empty),null);assert.equal(calls,1);});
});
test('same document source strikes and quoted forms are fresh between separate reviews',()=>{
 const d=doc('The phrase “student only center” is used. The student only center applies.'),saved=d.text;let first,firstOriginal;d.struck=[{start:d.text.indexOf('phrase'),end:d.text.indexOf('phrase')+6}];
 withStyleContext(d,()=>{first=billQuotedTermProtection(d);firstOriginal=originalBodyStyleContext(d);assert.equal(first(range(d,'student only center')),true);});
 Object.assign(d,doc('The phrase “student-only center” is used. The student only center applies.'));d.struck=[{start:d.text.indexOf('phrase'),end:d.text.indexOf('phrase')+6}];
 withStyleContext(d,()=>{assert.notEqual(billQuotedTermProtection(d),first);assert.equal(billQuotedTermProtection(d)(range(d,'student only center')),false);assert.notEqual(originalBodyStyleContext(d),firstOriginal);assert.notEqual(originalBodyStyleContext(d).source,saved);});
 d.struck=[];d.excluded=[];withStyleContext(d,()=>assert.equal(originalBodyStyleContext(d),null));
});
test('nested same document reuses active memo and different documents remain isolated',()=>{
 const a=doc('“alpha beta” is used. The alpha beta applies.'),b=doc('“gamma delta” is used. The alpha beta applies.'),counter=counted();withStyleContext(a,()=>{assert.equal(memoizeStyleReview(a,null,key,counter.build),1);const outer=styleContext(a),quoted=billQuotedTermProtection(a);withStyleContext(a,()=>{assert.equal(styleContext(a),outer);assert.equal(memoizeStyleReview(a,null,key,counter.build),1);assert.equal(billQuotedTermProtection(a),quoted);});withStyleContext(b,()=>{assert.notEqual(styleContext(b),outer);assert.equal(memoizeStyleReview(b,null,key,counter.build),2);assert.equal(billQuotedTermProtection(b)(range(b,'alpha beta')),false);assert.equal(billQuotedTermProtection(a),quoted);});assert.equal(memoizeStyleReview(a,null,key,counter.build),1);});assert.equal(memoizeStyleReview(a,null,key,counter.build),3);
});
test('throw cleanup restores nested scopes and removes completed review state',()=>{
 const d=doc('The agency acts.'),counter=counted();assert.throws(()=>withStyleContext(d,()=>{memoizeStyleReview(d,null,key,counter.build);throw Error('controlled abort');}),/controlled abort/);withStyleContext(d,()=>{assert.equal(memoizeStyleReview(d,null,key,counter.build),2);assert.throws(()=>withStyleContext(d,()=>{assert.equal(memoizeStyleReview(d,null,key,counter.build),2);throw Error('nested abort');}),/nested abort/);assert.equal(memoizeStyleReview(d,null,key,counter.build),2);});assert.equal(memoizeStyleReview(d,null,key,counter.build),3);
});
test('direct calls and alternate supplied contexts never retain or borrow review state',()=>{
 const d=doc('“alpha beta” is used. The alpha beta applies.'),at=d.text.indexOf('used');d.struck=[{start:at,end:at+4}];assert.notEqual(originalBodyStyleContext(d),originalBodyStyleContext(d));assert.notEqual(billQuotedTermProtection(d),billQuotedTermProtection(d));const counter=counted();assert.equal(memoizeStyleReview(d,null,key,counter.build),1);assert.equal(memoizeStyleReview(d,null,key,counter.build),2);
 withStyleContext(d,()=>{const regular=billQuotedTermProtection(d),custom={...styleContext(d),source:styleContext(d).source.replace(/[“”]/gu,' ')};assert.equal(regular(range(d,'alpha beta')),true);const a=billQuotedTermProtection(d,custom),b=billQuotedTermProtection(d,custom);assert.notEqual(a,b);assert.equal(a(range(d,'alpha beta')),false);assert.equal(billQuotedTermProtection(d),regular);});
});
test('async continuations and promise factories cannot retain synchronous review memo state',async()=>{
 const d=doc('The agency acts.'),counter=counted();await withStyleContext(d,async()=>{assert.equal(memoizeStyleReview(d,null,key,counter.build),1);assert.equal(memoizeStyleReview(d,null,key,counter.build),1);await Promise.resolve();assert.equal(memoizeStyleReview(d,null,key,counter.build),2);assert.equal(memoizeStyleReview(d,null,key,counter.build),3);});let calls=0;const values=withStyleContext(d,()=>[memoizeStyleReview(d,null,key,()=>{calls++;return Promise.resolve(calls);}),memoizeStyleReview(d,null,key,()=>{calls++;return Promise.resolve(calls);})]);assert.notEqual(values[0],values[1]);assert.deepEqual(await Promise.all(values),[1,2]);
});
test('only null or the exact active context identity can reuse a value',()=>{
 const d=doc('The agency acts.'),counter=counted();withStyleContext(d,()=>{const ctx=styleContext(d);assert.equal(memoizeStyleReview(d,null,key,counter.build),1);assert.equal(memoizeStyleReview(d,ctx,key,counter.build),1);for(const invalid of [false,0,'',NaN,undefined,{...ctx}]){const first=memoizeStyleReview(d,invalid,key,counter.build),second=memoizeStyleReview(d,invalid,key,counter.build);assert.notEqual(first,second);assert.equal(memoizeStyleReview(d,ctx,key,counter.build),1);}});
});
test('whole serialized joint findings match the pre-performance source including date and entity checks',()=>{
 const controls=JSON.parse(fs.readFileSync(new URL('./fixtures/request-local-memo-full-joint.json',import.meta.url)));assert.equal(controls.rows.length,8);for(const row of controls.rows){const d=doc(row.body),before=JSON.stringify(d);assert.deepEqual(JSON.parse(JSON.stringify(prototype(d,refs,{includeReviewSuggestions:true}))),row.expected,row.body);assert.equal(JSON.stringify(d),before);}
});
