import test from 'node:test';import assert from 'node:assert/strict';
import {makeDocument} from '../app/core.mjs';import {hasVisiblePdfContent} from '../app/pdf-strikes.mjs';
const OPS={save:10,clip:29,constructPath:91,endPath:28,restore:11,stroke:20,fill:22,paintImageXObject:85};
test('empty and clipping-only pages are allowed; images and painted paths still require readable text',()=>{
 assert.equal(hasVisiblePdfContent({fnArray:[10,29,91,11],argsArray:[null,null,[28,[],[]],null]},OPS),false);
 assert.equal(hasVisiblePdfContent({fnArray:[91],argsArray:[[22,[],[]]]},OPS),true);
 assert.equal(hasVisiblePdfContent({fnArray:[85],argsArray:[[]]},OPS),true);
});
test('blank page separators retain source offsets and printed footer labels are excluded only in legislative bills',()=>{
 const doc=makeDocument(['ASSEMBLY BILL No. 109\nline 1 First.\n99','','line 1 Last.\nCorrected 6-4-26 98',''],'large');
 assert.equal(doc.pages,4);assert.equal(doc.text,doc.rawPages.join('\n'));
 const last=doc.blocks.find(b=>b.text.includes('Last.'));assert.equal(doc.text.slice(last.start,last.end),last.text);
 assert.ok(!doc.tokens.some(t=>t.value==='99'));assert.equal(doc.blocks.at(-1).ignored,true);
 assert.ok(makeDocument(['First.\n99'],'ordinary').tokens.some(t=>t.value==='99'));
});
