import test from 'node:test';import assert from 'node:assert/strict';
import {pdfFontStyle} from '../app/pdf-font-style.mjs';
import {extractPageLayout} from '../app/pdf-strikes.mjs';
test('source face suffix retains italic/bold formatting when embedded font flags are absent',()=>{
  for(const [name,bold,italic] of [['Times-Italic',false,true],['Times-Bold',true,false],['ABCDEF+TimesNewRomanPS-BoldItalicMT',true,true],['Helvetica-Oblique',false,true],['ArialNarrow,BoldItalic',true,true],['Times-Roman',false,false]]){
    const style=pdfFontStyle({fontFamily:'serif'},{name});assert.equal(style.bold,bold,name);assert.equal(style.italic,italic,name);assert.equal(style.name,name);
  }
});
test('explicit flags remain authoritative and unrelated/generated names cannot invent styles',()=>{
  assert.deepEqual(pdfFontStyle({}, {name:'Times-BoldItalic',bold:false,italic:false}),{name:'Times-BoldItalic',bold:false,italic:false});
  for(const name of ['g_d0_f5','BoldenRegular','ItalicizedDisplay-Regular','TimesNewRomanPSMT','ABCDEF+Symbol'])assert.deepEqual([pdfFontStyle({}, {name}).bold,pdfFontStyle({}, {name}).italic],[false,false],name);
  assert.deepEqual(pdfFontStyle({fontFamily:'serif'},{}),{fontFamily:'serif',name:'',bold:false,italic:false});
});
test('physical PDF row formatting uses source face evidence without changing text or strike detection',()=>{
  const text='(Principal coauthor: Senator Menjivar)',item={str:text,fontName:'sourceFont',height:12,width:190.98,transform:[12,0,0,12,120.51,582.904]};
  const styles={sourceFont:pdfFontStyle({fontFamily:'serif'}, {name:'Times-Italic'})},layout=extractPageLayout([item],{fnArray:[],argsArray:[]},{},styles,612);
  assert.equal(layout.text,text);assert.equal(layout.lines[0].runs[0].italic,true);assert.equal(layout.lines[0].runs[0].bold,false);assert.deepEqual(layout.strikes,[]);
});
test('verified original LCB face names override only the generic sans-serif metadata fallback',()=>{
  for(const name of ['TimesLDC','MinionPC','GFEDCB+TimesLDC','ABCDEF+MinionPC']){
    const style=pdfFontStyle({fontFamily:'sans-serif',ascent:.693},{name,bold:false,italic:false});
    assert.equal(style.fontFamily,'serif',name);assert.equal(style.ascent,.693);assert.equal(style.bold,false);assert.equal(style.italic,false);
  }
  for(const name of ['SomeTimesFont','TimesLDCExtra','MinionPC-Bold','ABC+TimesLDC','abcdef+TimesLDC','g_d0_f2'])assert.equal(pdfFontStyle({fontFamily:'sans-serif'},{name}).fontFamily,'sans-serif',name);
  for(const fontFamily of ['serif','monospace','cursive','Custom Office Face'])assert.equal(pdfFontStyle({fontFamily},{name:'GFEDCB+TimesLDC'}).fontFamily,fontFamily,fontFamily);
});
test('original LCB body and small-cap rows retain their physical source geometry and strike spans',()=>{
  for(const [name,ascent] of [['GFEDCB+TimesLDC',.693],['GFEDCB+MinionPC',.446]]){
    const text='Existing law funds programs.',item={str:text,fontName:'sourceFont',height:12,width:150,transform:[12,0,0,12,72,600]},OPS={constructPath:1,stroke:2},operators={fnArray:[1],argsArray:[[2,[new Float32Array([0,72,604,1,222,604])]]]};
    const original=extractPageLayout([item],operators,OPS,{sourceFont:{fontFamily:'sans-serif',ascent}},612);
    const corrected=extractPageLayout([item],operators,OPS,{sourceFont:pdfFontStyle({fontFamily:'sans-serif',ascent},{name})},612);
    assert.equal(corrected.lines[0].font,'serif');assert.equal(corrected.lines[0].runs[0].font,'serif');
    assert.equal(corrected.text,original.text);assert.deepEqual(corrected.strikes,original.strikes);assert.equal(corrected.strikes.length,1);
    const omitFamily=value=>{const result=structuredClone(value);for(const line of result.lines){delete line.font;for(const run of line.runs)delete run.font;}return result;};
    assert.deepEqual(omitFamily(corrected),omitFamily(original),'Only family selection changes; source offsets, small caps, coordinates and line metrics stay identical');
  }
});
