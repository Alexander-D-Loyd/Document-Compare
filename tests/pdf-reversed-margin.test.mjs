import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {extractPageLayout} from '../app/pdf-strikes.mjs';
import {makeDocument} from '../app/core.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/reversed-margin-glyphs.json',import.meta.url)));
const layout=items=>extractPageLayout(items,{fnArray:[],argsArray:[]},{},{body:{fontFamily:'serif'}});

test('AB 8 page 61 line 30 keeps its printed number out of the body text',()=>{
 const result=layout(fixture.items),doc=makeDocument([result.text],'Current',[],[result.lines]);
 assert.deepEqual(doc.blocks.map(b=>b.margin.trim()),['line 29','line 30','line 31']);
 assert.ok(doc.blocks[1].text.startsWith('line 30 (D) AM-855,'));
 assert.equal(doc.blocks[1].formatting.x,82,'Body retains its source indentation');
 assert.ok(!doc.tokens.some(t=>t.value==='30'||t.value==='line'));
 assert.ok(doc.tokens.some(t=>t.value==='855'),'Actual body numbers remain comparable');
});

test('isolated numeric prose and nonoverlapping line text do not invent margin labels',()=>{
 const target=fixture.items.filter(item=>item.transform[5]===337.704);
 assert.ok(layout(target).text.startsWith('30 line'));
 const ordinary=fixture.items.map(item=>item.str==='line'&&item.transform[5]===337.704?{...item,width:2,transform:[...item.transform.slice(0,4),74,item.transform[5]]}:item);
 assert.ok(layout(ordinary).text.split('\n')[1].startsWith('30 line'));
});

test('AB 8 page 62 line 23 label inside the gutter remains outside the body',()=>{
 const other=JSON.parse(fs.readFileSync(new URL('./fixtures/reversed-margin-glyphs-page62.json',import.meta.url)));
 const result=layout(other.items),doc=makeDocument([result.text],'Current',[],[result.lines]);
 assert.deepEqual(doc.blocks.map(b=>b.margin.trim()),['line 22','line 23','line 24']);
 assert.ok(doc.blocks[1].text.startsWith('line 23 (N) HU-331,'));
 assert.equal(doc.blocks[1].formatting.x,82);
 assert.ok(!doc.tokens.some(t=>t.value==='23'||t.value==='line'));
});
