import test from 'node:test';
import assert from 'node:assert/strict';
import {sequenceDiff} from '../app/sequence-diff.mjs';
const reconstruct=(a,b)=>{
 const diff=sequenceDiff(a,b);
 assert.deepEqual(diff.filter(p=>!p.added).flatMap(p=>p.value),a);
 assert.deepEqual(diff.filter(p=>!p.removed).flatMap(p=>p.value),b);
 for(const p of diff)assert.equal(p.count,p.value.length);
 return diff;
};
test('large bills align stable text passages and retain every inserted and removed token',()=>{
 const sections=Array.from({length:200},(_,i)=>['SEC','.',String(i),'.',...Array(50).fill('repeated'),`section-${i}`, 'unchanged','end']);
 const previous=sections.flat(),current=sections.flatMap((s,i)=>i===80?[...s.slice(0,30),'new','word',...s.slice(30)]:i===160?s.filter((_,j)=>j!==30):s);
 const diff=reconstruct(previous,current);
 assert.deepEqual(diff.filter(p=>p.added).flatMap(p=>p.value),['new','word']);
 assert.deepEqual(diff.filter(p=>p.removed).flatMap(p=>p.value),['repeated']);
});
test('major replacements beyond old edit limits and moved passages still preserve full text',()=>{
 reconstruct(['before',...Array(16000).fill('old'),'after'],['before',...Array(16000).fill('new'),'after']);
 reconstruct(['start',...Array.from({length:10000},(_,i)=>String(i)),'end'],['start',...Array.from({length:10000},(_,i)=>String((i+5000)%10000)),'end']);
 reconstruct([],['new']);reconstruct(['old'],[]);reconstruct(['unchanged'],['unchanged']);
});
