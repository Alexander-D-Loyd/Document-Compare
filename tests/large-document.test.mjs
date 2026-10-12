import test from 'node:test';
import assert from 'node:assert/strict';
import {makeDocument} from '../app/core.mjs';

test('large bills load every body token without losing margin or strikeout exclusions',()=>{
 const pages=Array.from({length:200},(_,i)=>`line 1 Original ${'text '.repeat(900)}end${i}`);
 const first=pages[0].indexOf('Original');
 const doc=makeDocument(pages,'Large bill',[[{start:first,end:first+8}]]);
 assert.equal(doc.pages,200);
 assert.equal(doc.tokens.length,200*902);
 assert.equal(doc.tokens[0].value,'Original');
 assert.equal(doc.tokens.at(-1).value,'end199');
 assert.equal(doc.tokens.at(-1).end,doc.text.length);
 assert.equal(doc.effectiveTokens.length,doc.tokens.length-1);
 assert.ok(!doc.tokens.some(t=>t.value==='line'));
});

test('a divided word near the start does not truncate the long remaining bill',()=>{
 const pages=['line 1 trans-\nline 2 form '+ 'text '.repeat(180000)+'ending'];
 const doc=makeDocument(pages,'Long tail',[],[],new Set(['transform']));
 assert.equal(doc.tokens.length,180002);
 assert.equal(doc.tokens[0].value,'transform');
 assert.equal(doc.tokens[0].start,doc.text.indexOf('trans-'));
 assert.equal(doc.tokens[0].end,doc.text.indexOf('form')+4);
 assert.equal(doc.tokens.at(-1).value,'ending');
 assert.equal(doc.tokens.at(-1).end,doc.text.length);
});
