import assert from 'node:assert/strict';
import {extractPageLayout} from '../app/pdf-strikes.mjs';
import {makeDocument} from '../app/core.mjs';
const item=(str,x,y,width,height=12)=>({str,transform:[height,0,0,height,x,y],width,height,fontName:'body'});
const layout=items=>extractPageLayout(items,{fnArray:[],argsArray:[]},{},{body:{fontFamily:'serif',bold:true}},612);
const pages=[
  layout([item('This full width body text establishes the printed text column.',48,700,336),item('98',379,173.336,5,8)]),
  layout([item('AB 1546',48,740.837,43.668),item('— 80 —',197.4,740.837,36),item('line 1',30,714.704,30),item('The meaning of Section 6 of the California Constitution.',72,714.704,312),item('line 2',30,701.704,30),item('Constitution.',72,701.704,65),item('O',211.668,207.804,8.664),item('98',379,173.336,5,8)]),
  layout([item('— 3 —',200.15,740,30.5),item('AB 1546',339.132,740,43.668),item('line 1',30,714,30),item('Another full width numbered body line continues here.',72,714,312)])
];
assert.equal(pages[1].lines[1].leading,13,'Sparse pages use body-line spacing rather than header or footer gaps');
assert.ok(Math.abs(pages[1].lines[1].gapBefore-13.133)<.001);
const plain=makeDocument(pages.map(p=>p.text),'plain');
const doc=makeDocument(pages.map(p=>p.text),'layout',[],pages.map(p=>p.lines));
assert.deepEqual(doc.tokens,plain.tokens);
assert.deepEqual(doc.excluded,plain.excluded);
const even=doc.blocks.find(b=>b.page===2).formatting;
assert.equal(even.columnLeft,48);assert.equal(even.columnRight,384);
assert.equal(even.headerParts[0].anchor,'left');assert.equal(even.headerParts[0].position,0);
assert.equal(even.headerParts[1].anchor,'center');assert.ok(Math.abs(even.headerParts[1].position-.5)<.003);
const odd=doc.blocks.find(b=>b.page===3).formatting;
assert.equal(odd.headerParts[0].anchor,'center');assert.equal(odd.headerParts[1].anchor,'right');
assert.ok(odd.headerParts[1].position<.004);
assert.equal(doc.blocks.find(b=>b.page===2&&b.text==='O').formatting.centered,true);
assert.equal(doc.blocks.find(b=>b.page===2&&b.text==='98').formatting.headerParts[0].anchor,'right');
assert.ok(Math.abs(doc.blocks.find(b=>b.page===2&&b.margin).formatting.indent-24/336)<.001);
console.log('PASS: sparse pages retain the document column, centered page numbers, alternating bill labels, footer placement and body spacing without changing comparison tokens');
