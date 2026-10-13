import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {styleReviewView} from '../app/style-review-view.mjs';
import {createReviewIgnores} from '../app/review-ignores.mjs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const comparison={id:7,start:0,end:15,text:'data processing',suggestion:'data-processing',checkId:'lcb-listed-modifier'};
const review={id:8,start:16,end:22,text:'ensure',suggestion:null,reviewSuggested:true,checkId:'lcb-meaning-review'};
test('every retained source-backed finding is visible whether it needs comparison or judgment',()=>{
 const all=[comparison,review],saved=JSON.stringify(all);assert.deepEqual(styleReviewView(all).issues,all);assert.equal(styleReviewView(all).issues[0],comparison);assert.equal(JSON.stringify(all),saved);
});
test('Ignore, Ignore All and Undo govern complete retained findings without hidden flags',()=>{
 const text='data processing ensure data processing',repeat={...comparison,id:9,start:23,end:38},all=[comparison,review,repeat],ignores=createReviewIgnores(),view=()=>styleReviewView(all,{accept:i=>!ignores.has('style',i,text)}).issues;
 ignores.ignore('style',comparison,text);assert.deepEqual(view(),[review,repeat]);ignores.ignore('style',repeat,text,true);assert.deepEqual(view(),[review]);ignores.undo();assert.deepEqual(view(),[review,repeat]);ignores.undo();assert.deepEqual(view(),all);ignores.clear();assert.deepEqual(view(),all);
});
test('unsupported compounds never enter the view while printed comparisons and meaning review retain evidence',()=>{
 const doc=makeDocument(['The people do enact as follows:\nline 1 The agency uses information security policies and a well known method.\nline 2 The agency shall ensure that it complies.'],'Current'),saved=JSON.stringify(doc),start=doc.text.indexOf('information security');
 const guess={start,end:start+20,text:'information security',matchText:'information security',head:'policies',suggestion:null,reviewSuggested:true,engineRule:'LCB_GENERAL_UNIT_MODIFIER_REVIEW',reviewVariant:'open-modifier'};
 const issues=jointStylisticIssues(doc,refs,{engineIssues:[guess],includeReviewSuggestions:true}),view=styleReviewView(issues).issues;
 assert.ok(!view.some(i=>i.checkId==='lcb-general-unit-modifier-review'));assert.ok(view.some(i=>i.suggestion==='well-known'));assert.ok(view.some(i=>i.reviewSuggested&&i.rule.includes('ensure')));
 for(const i of view){assert.equal(doc.text.slice(i.start,i.end),i.text);assert.ok(i.reviewTask);assert.ok(i.references.every(r=>r.sourcePassage?.text));}assert.equal(JSON.stringify(doc),saved);
});
