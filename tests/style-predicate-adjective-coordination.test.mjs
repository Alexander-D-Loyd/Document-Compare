import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=t=>jointStylisticIssues(makeDocument([t],'Current'),refs).filter(i=>i.rule.startsWith('Hyphenation')&&i.suggestion.includes(' '));

test('selected ordinary adjectives support complete compound predicate coordination in either order',()=>{
 for(const [phrase,forms] of [['efficient and cost-effective',['cost-effective']],['cost-effective and efficient',['cost-effective']],['efficient, cost-effective, and reliable',['cost-effective']],['cost-effective, efficient, and science-based',['cost-effective','science-based']],['science-based and cost-effective and practical',['science-based','cost-effective']],['efficient but not science-based',['science-based']],['cost-effective and fully accessible',['cost-effective']],['ready and science-based for this purpose',['science-based']]]){
  const text='The program shall be '+phrase+'.',found=check(text);assert.deepEqual(found.map(i=>i.text),forms,text);for(const i of found)assert.equal(text.slice(i.start,i.end),i.text);assert.equal(check(text.replaceAll('-',' ')).length,0,text+' compliant');
 }
});

test('already-open source predicates establish coordination without receiving their own findings',()=>{
 for(const [phrase,forms] of [['cost effective and science-based',['science-based']],['science-based and cost effective',['science-based']],['cost effective, age appropriate, and science-based',['science-based']],['well known and board-approved',['board-approved']],['science-based and hands free',['science-based']],['mental-health-related and cost effective',['mental-health-related']]])assert.deepEqual(check('The program is '+phrase+'.').map(i=>i.text),forms,phrase);
});

test('ordinary adjective evidence retains GPO source-example noun ownership',()=>{
 for(const [text,form] of [['The material is durable and fire-tested.','fire-tested'],['The material is fire-tested and durable.','fire-tested'],['The water is clear and crystal-clear.','crystal-clear'],['The water is crystal-clear and safe.','crystal-clear'],['The material is cost effective and fire-tested.','fire-tested']]){const found=check(text);assert.equal(found.length,1,text);assert.equal(found[0].text,form);assert.ok(found[0].references.some(r=>r.guideId==='gpo'&&r.rule==='7.7'));}
 for(const text of ['The program is durable and fire-tested.','The material is clear and crystal-clear.'])assert.equal(check(text).length,0,text);
});

test('noun continuations, unknown adjectives, names, incomplete sequences and literals stay protected',()=>{
 for(const text of ['The program is efficient and cost-effective software.','The program is cost-effective and efficient software.','The program is efficient, cost-effective software.','The program is efficient, cost-effective, flexible software.','The program is efficient and science-based, flexible software.','The program is efficient and science-based, when used, software.','The program is efficient and unknownword-based.','The program is unfamiliarword and cost-effective.','The program is cost-effective and unfamiliarword.','The program is EFFICIENT and cost-effective.','The program is Efficient and cost-effective.','The program is efficient-cost-effective.','The program is cost-effective and efficient-extra.','The program is a clear and cost-effective standard.','The term “the program is efficient and cost-effective.” is literal.','The program is efficient and cost—effective.','The program is efficient, cost-effective.'])assert.equal(check(text).length,0,text);
 const doc=makeDocument(['The program is efficient and cost-effective.'],'Current');doc.struck=[{start:15,end:24}];assert.equal(jointStylisticIssues(doc,refs).filter(i=>i.suggestion==='cost effective').length,0);
});

test('plain-adjective role evidence does not swallow compound fragments or page-label text',()=>{
 const doc=makeDocument(['ASSEMBLY BILL No. 577\nThe people of the State of California do enact as follows:\nline 1 The program is efficient and cost-\n94','AB 577 — 2 —\nline 1 effective.'],'Current'),found=jointStylisticIssues(doc,refs).filter(i=>i.suggestion==='cost effective');assert.equal(found.length,1);assert.equal(found[0].start,doc.text.indexOf('cost-'));assert.equal(found[0].end,doc.text.indexOf('effective.')+9);assert.equal(doc.text.slice(found[0].start,found[0].end),found[0].text);
});
