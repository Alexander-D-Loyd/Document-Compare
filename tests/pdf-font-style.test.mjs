import test from 'node:test';import assert from 'node:assert/strict';
import {pdfFontStyle,knownPdfRunItalic} from '../app/pdf-font-style.mjs';
import {extractPageLayout} from '../app/pdf-strikes.mjs';
test('source face suffix retains italic/bold formatting when embedded font flags are absent',()=>{
  for(const [name,bold,italic] of [['Times-Italic',false,true],['Times-Bold',true,false],['ABCDEF+TimesNewRomanPS-BoldItalicMT',true,true],['Helvetica-Oblique',false,true],['ArialNarrow,BoldItalic',true,true],['Times-Roman',false,false]]){
    const style=pdfFontStyle({fontFamily:'serif'},{name});assert.equal(style.bold,bold,name);assert.equal(style.italic,italic,name);assert.equal(style.name,name);
  }
});
test('explicit flags remain authoritative and unrelated/generated names cannot invent styles',()=>{
  const conflict=pdfFontStyle({}, {name:'Times-BoldItalic',bold:false,italic:false});assert.deepEqual([conflict.name,conflict.bold,conflict.italic],['Times-BoldItalic',false,false]);assert.equal(conflict.italicKnown,false);assert.equal(conflict.fontStyleConflict,true);
  for(const name of ['g_d0_f5','BoldenRegular','ItalicizedDisplay-Regular','TimesNewRomanPSMT','ABCDEF+Symbol'])assert.deepEqual([pdfFontStyle({}, {name}).bold,pdfFontStyle({}, {name}).italic],[false,false],name);
  const unknown=pdfFontStyle({fontFamily:'serif'},{});assert.deepEqual([unknown.fontFamily,unknown.name,unknown.bold,unknown.italic],['serif','',false,false]);assert.equal(unknown.italicKnown,false);assert.equal(knownPdfRunItalic(unknown),null);
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
    const omitFamily=value=>{const result=structuredClone(value);for(const line of result.lines){delete line.font;for(const run of line.runs){delete run.font;delete run.italicKnown;delete run.fontStyleConflict;delete run.fontStyleProvenance;}}return result;};
    assert.deepEqual(omitFamily(corrected),omitFamily(original),'Only family selection changes; source offsets, small caps, coordinates and line metrics stay identical');
  }
});

test('only the twelve exact Latin standard source faces establish finite italic or roman evidence',()=>{
  const families={Times:[['Roman',false],['Bold',false],['Italic',true],['BoldItalic',true]],Helvetica:[['',false],['Bold',false],['Oblique',true],['BoldOblique',true]],Courier:[['',false],['Bold',false],['Oblique',true],['BoldOblique',true]]};
  for(const [base,variants]of Object.entries(families))for(const [variant,expected]of variants)for(const prefix of ['','ABCDEF+']){const face=base+(variant?'-'+variant:''),style=pdfFontStyle({fontFamily:'serif'},{name:prefix+face});assert.equal(style.italicKnown,true,prefix+face);assert.equal(style.fontStyleConflict,false);assert.equal(knownPdfRunItalic(style),expected);assert.equal(style.fontStyleProvenance.sourceFace,face);assert.equal(style.fontStyleProvenance.faceItalic,expected);assert.equal(style.fontStyleProvenance.italicFlag,null);assert.ok(Object.isFrozen(style.fontStyleProvenance));}
});

test('raw flags cannot turn unknown generated OCR or fallback fonts into known typography',()=>{
  for(const name of ['g_d0_f5','g_d0_f5-Italic','GlyphLessFont','ABCDEF+GlyphLessFont','Unknown-Italic','TimesNewRomanPSMT','Arial-ItalicMT','ABC+Times-Italic','abcdef+Times-Italic','times-italic','TimesLDC','MinionPC','Symbol','ZapfDingbats'])for(const italic of [undefined,false,true]){const font={name,...(italic===undefined?{}:{italic})},style=pdfFontStyle({fontFamily:'serif'},font);assert.equal(style.italicKnown,false,name);assert.equal(knownPdfRunItalic(style),null,name);assert.equal(style.fontStyleProvenance.sourceFace,null,name);}
  for(const flag of ['missingFile','isType3Font','isInvalidPDFjsFont'])for(const name of ['Times-Roman','Times-Italic']){const style=pdfFontStyle({}, {name,[flag]:true});assert.equal(style.italicKnown,false,flag);assert.equal(knownPdfRunItalic(style),null,flag);assert.equal(style.fontStyleProvenance[flag],true);}
  assert.equal(knownPdfRunItalic(pdfFontStyle({name:'Times-Italic',italic:true},{})),null,'Incoming display-style name supplies no original font-object evidence');
});

test('named-face flag conflicts stay unknown without altering rendering and proof is validated afresh',()=>{
  for(const [name,italic]of [['Times-Italic',false],['Times-Roman',true]]){const style=pdfFontStyle({}, {name,italic});assert.equal(style.italic,italic);assert.equal(style.fontStyleConflict,true);assert.equal(style.italicKnown,false);assert.equal(knownPdfRunItalic(style),null);}
  const style=pdfFontStyle({}, {name:'Times-Italic',italic:true,missingFile:false,isType3Font:false,isInvalidPDFjsFont:false});assert.equal(knownPdfRunItalic(structuredClone(style)),true,'Structured-clone transport retains finite proof');
  for(const change of [{italic:false},{italicKnown:false},{fontStyleConflict:true},{italicKnown:true,fontStyleProvenance:null}])assert.equal(knownPdfRunItalic({...style,...change}),null);
  for(const change of [{version:2},{sourceFace:'g_d0_f1'},{sourceFace:'Times-Roman'},{faceItalic:false},{italicFlag:false},{italicFlag:'true'},{missingFile:true},{isType3Font:true},{isInvalidPDFjsFont:true},{missingFile:undefined}])assert.equal(knownPdfRunItalic({...style,fontStyleProvenance:{...style.fontStyleProvenance,...change}}),null,JSON.stringify(change));
  assert.equal(knownPdfRunItalic({italic:true,italicKnown:true,fontStyleConflict:false}),null);
});

test('layout propagates source evidence additively while bare style booleans remain unknown',()=>{
  const item={str:'mail42@example.com',fontName:'sourceFont',height:12,width:100,transform:[12,0,0,12,72,600]},ops={fnArray:[],argsArray:[]};
  for(const font of [{name:'Times-Italic'},{name:'Times-Roman'},{name:'Times-Italic',italic:false},{name:'GlyphLessFont',italic:true}]){const style=pdfFontStyle({},font),layout=extractPageLayout([item],ops,{}, {sourceFont:style}),run=layout.lines[0].runs[0];assert.equal(run.italic,style.italic);assert.equal(run.italicKnown,style.italicKnown);assert.equal(run.fontStyleConflict,style.fontStyleConflict);assert.deepEqual(run.fontStyleProvenance,style.fontStyleProvenance);assert.equal(knownPdfRunItalic(run),knownPdfRunItalic(style));assert.equal(run.start,0);assert.equal(run.end,item.str.length);assert.equal(layout.text,item.str);assert.deepEqual(layout.strikes,[]);}
  const run=extractPageLayout([item],ops,{}, {sourceFont:{italic:true}}).lines[0].runs[0];assert.equal(run.italic,true);assert.equal(run.italicKnown,false);assert.equal(knownPdfRunItalic(run),null);
});
