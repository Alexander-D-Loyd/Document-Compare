import test from 'node:test';import assert from 'node:assert/strict';import {createReviewIgnores} from '../app/review-ignores.mjs';
test('ignores are scoped to occurrence, category and exact case, and clearing restores every finding',()=>{
 const state=createReviewIgnores(),text='typpo typpo Typpo he are he are',a={start:0,end:5,word:'typpo'},b={start:6,end:11,word:'typpo'},c={start:12,end:17,word:'Typpo'},g={start:18,end:24,message:'Agreement',suggestion:'he is'},h={...g,start:25,end:31};
 state.ignore('spelling',a,text);assert.equal(state.has('spelling',a,text),true);assert.equal(state.has('spelling',b,text),false);
 state.ignore('spelling',a,text,true);assert.equal(state.has('spelling',b,text),true);assert.equal(state.has('spelling',c,text),false);assert.equal(state.has('grammar',g,text),false);
 state.ignore('grammar',g,text,true);assert.equal(state.has('grammar',h,text),true);state.clear();for(const [kind,issue] of [['spelling',a],['spelling',b],['grammar',h]])assert.equal(state.has(kind,issue,text),false);
});
test('style ignores match normalized detected text across source wrapping without hiding another rule',()=>{
 const state=createReviewIgnores(),text='data sharing data\nline 2 sharing',a={start:0,end:12,text:'data sharing',suggestion:'data-sharing',rule:'Modifier'},b={...a,start:13,end:text.length};state.ignore('style',a,text,true);assert.equal(state.has('style',b,text),true);assert.equal(state.has('style',{...b,rule:'Another rule'},text),false);
});
test('matching counts use the same case and rule identity as Ignore All',()=>{
 const state=createReviewIgnores(),text='typpo typpo Typpo',a={start:0,end:5,word:'typpo'},b={start:6,end:11,word:'typpo'},c={start:12,end:17,word:'Typpo'};
 assert.equal(state.matchingCount('spelling',a,[a,b,c],text),2);assert.equal(state.matchingCount('spelling',b,[b,c],text),1);
 const g={start:0,end:5,message:'Repeated word',suggestion:'word'};
 assert.equal(state.matchingCount('grammar',g,[g,{...g,message:'Different rule'}],text),1);
});

test('Undo reverses Ignore and Ignore All in order and file reset clears undo history',()=>{
 const state=createReviewIgnores(),text='typpo typpo',a={start:0,end:5,word:'typpo'},b={...a,start:6,end:11};
 state.ignore('spelling',a,text);state.ignore('spelling',b,text,true);
 assert.deepEqual(state.undo(),{kind:'spelling',all:true});assert.equal(state.has('spelling',a,text),true);assert.equal(state.has('spelling',b,text),false);
 state.ignore('style',{...b,text:'typpo',rule:'Usage'},text);
 assert.deepEqual(state.undo(),{kind:'style',all:false});assert.equal(state.canUndo,true);
 state.undo();assert.equal(state.has('spelling',a,text),false);assert.equal(state.canUndo,false);assert.equal(state.undo(),null);
 state.ignore('spelling',a,text,true);state.clear();assert.equal(state.canUndo,false);assert.equal(state.has('spelling',b,text),false);
});
