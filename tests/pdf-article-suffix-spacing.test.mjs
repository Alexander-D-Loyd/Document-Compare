import test from 'node:test';import assert from 'node:assert/strict';
import{extractPageLayout}from'../app/pdf-strikes.mjs';
import{makeDocument}from'../app/core.mjs';
const ops={fnArray:[],argsArray:[]};
const item=(str,x,width=60,y=376.704)=>({str,fontName:'body',height:12,width,transform:[12,0,0,12,x,y],hasEOL:false});
const pair=(left='Article XIII',right='B of the California Constitution because',gap=1.2)=>[item(left,132.282,56.958),item(right,132.282+56.958+gap,193.566)];
const read=items=>extractPageLayout(items,ops,{},{});

test('AB224 exact small source gap preserves Article XIII B without rewriting item strings',()=>{
 const input=pair(),saved=JSON.stringify(input),layout=read(input);assert.equal(layout.text,'Article XIII B of the California Constitution because');assert.equal(JSON.stringify(input),saved);assert.equal(layout.lines[0].runs[0].end,'Article XIII'.length);assert.equal(layout.lines[0].runs[1].start,'Article XIII '.length);assert.equal(layout.lines[0].runs[1].x,190.44);
});

test('Roman article suffix boundary requires a positive source gap and exact Constitution context',()=>{
 for(const [left,right]of [['Article I','A of the California Constitution applies'],['Article IV','B of the California Constitution applies'],['Article XIII','C of the California Constitution applies']])assert.equal(read(pair(left,right)).text,left+' '+right);
 for(const [left,right]of [['identifier XIII','B of the California Constitution applies'],['Article XIIIB','of the California Constitution applies'],['Article XIII','Board is created'],['Article XIII','B of the Federal Constitution applies'],['Article XIII','B of the California Constitutions apply'],['αArticle XIII','B of the California Constitution applies'],['Article IIII','B of the California Constitution applies'],['Article I','V of the California Constitution applies'],['Article X','I of the California Constitution applies']])assert.equal(read(pair(left,right)).text,left+right,left+' / '+right);
 for(const gap of [0,-.2,.1,.49])assert.equal(read(pair(undefined,undefined,gap)).text,'Article XIIIB of the California Constitution because',String(gap));
 const unbroken=[item('Article XIIIB of the California Constitution because',72,250)];assert.equal(read(unbroken).text,unbroken[0].str);
});

test('unknown font geometry tracking and unsupported baselines cannot authorize a new boundary',()=>{
 const changes=[i=>i.fontName='different',i=>i.fontName=undefined,i=>i.height=10,i=>i.transform[5]+=.5,i=>i.transform[1]=.2,i=>i.transform[0]=13,i=>i.sourceCharSpacing=1];
 for(const change of changes){const input=pair();change(input[1]);const layout=read(input);assert.equal(layout.text.replace('\n',''),'Article XIIIB of the California Constitution because');}
 const input=pair();input[0].sourceCharSpacing=1;assert.equal(read(input).text,'Article XIIIB of the California Constitution because');
});

test('explicit source spaces and ordinary larger gaps remain exactly one separator',()=>{
 for(const input of [[item('Article XIII ',132.282,56.958),item('B of the California Constitution because',190.44,193.566)],[item('Article XIII',132.282,56.958),item(' ',189.24,1.2),item('B of the California Constitution because',190.44,193.566)],pair(undefined,undefined,3)])assert.equal(read(input).text,'Article XIII B of the California Constitution because');
});

test('printed margin labels remain separate and strikes/font runs select original glyph spans',()=>{
 const input=[item('line 27',21,39),...pair()];input[1].ocrStruck=true;input[2].ocrStruck=true;
 const saved=JSON.stringify(input),layout=read(input),doc=makeDocument([layout.text],'Current',[layout.strikes],[layout.lines]);assert.equal(layout.text,'line 27 Article XIII B of the California Constitution because');assert.equal(doc.blocks[0].margin,'line 27 ');assert.deepEqual(layout.strikes.map(r=>layout.text.slice(r.start,r.end)),['Article XIII','B of the California Constitution because']);assert.deepEqual(doc.struck.map(r=>doc.text.slice(r.start,r.end)),['Article XIII','B of the California Constitution because']);assert.equal(layout.lines[0].runs[1].start,8);assert.equal(layout.lines[0].runs[2].start,21);assert.equal(JSON.stringify(input),saved);
});
