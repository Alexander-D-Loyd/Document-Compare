import test from 'node:test';import assert from 'node:assert/strict';import {sequenceFind} from '../app/sequence-find.mjs';
test('Exact payload lookup handles overlap, absence, longer patterns and empty patterns',()=>{
 for(const [a,b,expected] of [[['A','B','A','B','C'],['A','B','C'],2],[['A','B'],['A','B','C'],-1],[['A','B'],[],0],[[],['A'],-1],[['A','A','B','A','C'],['A','C'],3]])assert.equal(sequenceFind(a,b),expected);
});
test('Large repeated payloads remain exact with a long common prefix',()=>{
 const a=Array(100000).fill('A'),b=Array(50000).fill('A');b.push('B');assert.equal(sequenceFind(a,b),-1);a.push('B');assert.equal(sequenceFind(a,b),50000);
});
