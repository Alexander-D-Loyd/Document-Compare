import test from 'node:test';import assert from 'node:assert/strict';import {sourceTextEvidence} from '../app/pdf-text-evidence.mjs';import {extractPageLayout} from '../app/pdf-strikes.mjs';
const OPS=Object.fromEntries(['setFont','setCharSpacing','setTextMatrix','showText','setWordSpacing','transform','constructPath','stroke'].map((s,i)=>[s,i+1]));
const glyphs=text=>[...text].map(unicode=>({unicode,width:500,isSpace:unicode===' '}));
const op=events=>({fnArray:events.map(e=>OPS[e[0]]),argsArray:events.map(e=>e.slice(1))});
const drawing=(text,extra=[])=>op([['setFont','body',12],['setCharSpacing',8],['setTextMatrix',new Float32Array([1,0,0,1,72,700])],['showText',glyphs(text)],...extra]);
const fragments=text=>[...text].flatMap((str,i)=>[{str,fontName:'body',height:12,width:6,transform:[12,0,0,12,72+i*14,700],hasEOL:i===text.length-1},...(i===text.length-1?[]:[{str:' ',fontName:'body',height:0,width:8,transform:[12,0,0,12,78+i*14,700]}])]);
test('complete source glyph positions join fragmented tracked text with unchanged physical bounds',()=>{
 const input=fragments('schoolday'),out=sourceTextEvidence(input,drawing('schoolday'),OPS);assert.equal(out.length,1);assert.equal(out[0].str,'schoolday');assert.equal(out[0].width,118);assert.equal(out[0].sourceCharSpacing,8);assert.equal(out[0].hasEOL,true);assert.deepEqual(out[0].transform,input[0].transform);assert.equal(input.length,17);const layout=extractPageLayout(input,drawing('schoolday'),OPS);assert.equal(layout.text,'schoolday');assert.equal(layout.lines[0].runs[0].sourceCharSpacing,8);
});
test('native source spaces are never removed between fragmented words',()=>{
 const input=fragments('data sharing'),out=sourceTextEvidence(input,drawing('data sharing'),OPS);assert.equal(out.map(i=>i.str).join(''),'data   sharing');assert.equal(out.filter(i=>i.str===' ').length,3);assert.deepEqual(out.find(i=>i.str===' '&&i.height===12),input.find(i=>i.str===' '&&i.height===12));
});
test('incomplete words, differing glyphs, wrong fragment widths and unknown transforms preserve items',()=>{
 const source=drawing('schoolday'),input=fragments('schoolday');for(const changed of [input.slice(0,-1),input.map((i,n)=>n===6?{...i,str:'x'}:i),input.map((i,n)=>n===6?{...i,width:8}:i),input.map((i,n)=>n===6?{...i,transform:[12,0,0,12,i.transform[4]+1,700]}:i)])assert.deepEqual(sourceTextEvidence(changed,source,OPS),changed);assert.deepEqual(sourceTextEvidence(input,op([['transform',1,0,0,1,20,0],['setFont','body',12],['setCharSpacing',8],['setTextMatrix',[1,0,0,1,72,700]],['showText',glyphs('schoolday')]]),OPS),input);
});
test('literal-height spaces, mixed fonts, font sizes, overlapping content and duplicated source words stay unmerged',()=>{
 const input=fragments('schoolday'),source=drawing('schoolday');for(const changed of [input.map((i,n)=>n===1?{...i,height:12}:i),input.map((i,n)=>n===6?{...i,fontName:'other'}:i),input.map((i,n)=>n===6?{...i,height:14}:i),[...input,input[4]],input.map((i,n)=>n===6?{...i,ocrStruck:true}:i)])assert.deepEqual(sourceTextEvidence(changed,source,OPS),changed);const repeated=drawing('schoolday',[['setTextMatrix',[1,0,0,1,72,700]],['showText',glyphs('schoolday')]]);assert.deepEqual(sourceTextEvidence(input,repeated,OPS),input);
});
test('source word boundaries retain independent neighboring text and precise margin position',()=>{
 const left={str:'line 3 ',fontName:'body',height:12,width:40,transform:[12,0,0,12,18,700]},right={str:' applies',fontName:'body',height:12,width:42,transform:[12,0,0,12,202,700]},out=sourceTextEvidence([left,...fragments('schoolday'),right],drawing('schoolday'),OPS);assert.equal(out.length,3);assert.deepEqual(out[0],left);assert.deepEqual(out[2],right);assert.equal(out[1].str,'schoolday');
});
test('partial source strikeout keeps exact character spans after a tracked word is reconstructed',()=>{
 const input=fragments('schoolday'),source=drawing('schoolday',[['constructPath',OPS.stroke,[[0,72,704,1,92,704]]]]),layout=extractPageLayout(input,source,OPS);assert.equal(layout.text,'schoolday');assert.deepEqual(layout.strikes,[{start:0,end:1},{start:1,end:2}]);
});
