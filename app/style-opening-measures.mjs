import {styleContext,styleRangeBlocked} from './style-context.mjs';
import {dimensionMarkParts} from './style-dimension-marks.mjs';
import {METRIC_UNITS,METRIC_SYMBOLS,LCB_LISTED_UNIT_DEFINITIONS} from './metric-units.mjs';
import {spellNumber} from './style-numerals.mjs';
const names=new Map([...METRIC_UNITS,...LCB_LISTED_UNIT_DEFINITIONS].map(r=>[r.symbol,r]));
const pattern=new RegExp('\\b(\\d+(?:,\\d{3})*)\\s*('+METRIC_SYMBOLS.slice().sort((a,b)=>b.length-a.length).join('|')+')\\b','g');
export function openingMeasureIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[],literal=[...source.matchAll(/“[^”]*”|"[^"\n]*"/g)].map(m=>({start:m.index,end:m.index+m[0].length}));
 for(const r of dimensionMarkParts(source)){
  if(r.kind!=='single'||!/^\d+$/.test(r.first)||ctx.at(r.start)==='Heading'||ctx.tableAt(r.start)||ctx.literalAt(r.start,r.evidenceEnd)||styleRangeBlocked(doc,r.start,r.evidenceEnd))continue;
  const sentence=ctx.sentenceAt(r.start),prefix=source.slice(sentence.start,r.start).replace(/^[\s”"’']*(?:\([a-z\d]+\)\s*)*/i,'').trim();if(prefix)continue;
  const value=Number(r.first);if(!Number.isSafeInteger(value)||value>1e12)continue;
  const foot=/^['′]$/.test(r.firstMark),unit=foot?(value===1?'foot':'feet'):(value===1?'inch':'inches'),number=spellNumber(value),suggestion=number[0].toUpperCase()+number.slice(1)+' '+unit;
  const message='LCB and GPO spell out a number at the beginning of a sentence, or recommend rephrasing. This complete integer dimension has an explicit physical continuation; expand its unit mark with the opening number. Decimal, range and mixed-unit openings still require review.';
  issues.push({start:r.start,end:r.end,text:doc.text.slice(r.start,r.end),suggestion,guideId:'lcb',guidePage:21,guidePrintedPage:references.lcb.pages[20].printedPage,rule:'Numerals, general item 1',category:'Sentence-opening measure',context:ctx.at(r.start),checkId:'opening-measures',conflict:false,message,references:[
   {guideId:'lcb',guideName:'LCB Style Manual',guidePage:21,guidePrintedPage:references.lcb.pages[20].printedPage,rule:'Numerals, general item 1',preferred:suggestion,ruleText:'Spell out all numbers when starting sentences.'},
   {guideId:'gpo',guideName:'GPO Style Manual',guidePage:294,guidePrintedPage:references.gpo.pages[293].printedPage,rule:'12.16',preferred:suggestion,ruleText:'Spell out a number at the beginning of a sentence or head, or rephrase it to avoid figures.'},
   {guideId:'gpo',guideName:'GPO Style Manual',guidePage:277,guidePrintedPage:references.gpo.pages[276].printedPage,rule:'10.6',preferred:suggestion,ruleText:'GPO illustrates physical dimension marks with figures. This sentence-opening suggestion expands the complete integer and its unit rather than changing one digit inside the expression.'}
  ]});
 }
 for(const m of source.matchAll(pattern)){
  const start=m.index,end=start+m[0].length;
  if(ctx.at(start)==='Heading'||ctx.tableAt(start)||literal.some(r=>r.start<end&&r.end>start))continue;
  const sentence=ctx.sentenceAt(start),prefix=source.slice(sentence.start,start).replace(/^[\s”"’']*(?:\([a-z\d]+\)\s*)*/i,'').trim();
  if(prefix)continue;
  const value=Number(m[1].replaceAll(',',''));if(!Number.isSafeInteger(value)||value>1e12)continue;
  const unit=names.get(m[2].replace('µ','μ'));if(!unit)continue;
  const number=spellNumber(value),suggestion=number[0].toUpperCase()+number.slice(1)+' '+(value===1?unit.name:unit.plural||unit.name+'s');
  const message='LCB and GPO spell out a number opening a sentence, or recommend rephrasing it. Expand this recognized unit as well: GPO 9.5 pairs a unit symbol with figures in technical matter. Decimal quantities, unknown symbols and semantic exceptions remain manual.';
  issues.push({start,end,text:doc.text.slice(start,end),suggestion,guideId:'lcb',guidePage:21,guidePrintedPage:references.lcb.pages[20].printedPage,rule:'Numerals, general item 1',category:'Sentence-opening measure',context:ctx.at(start),checkId:'opening-measures',conflict:false,message,references:[
   {guideId:'lcb',guideName:'LCB Style Manual',guidePage:21,guidePrintedPage:references.lcb.pages[20].printedPage,rule:'Numerals, general item 1',preferred:suggestion,ruleText:'Spell out numbers at the beginning of a sentence or rephrase the sentence.'},
   {guideId:'gpo',guideName:'GPO Style Manual',guidePage:294,guidePrintedPage:references.gpo.pages[293].printedPage,rule:'12.16',preferred:suggestion,ruleText:'Spell out a number at the beginning of a sentence or head, or rephrase it to avoid figures.'},
   {guideId:'gpo',guideName:'GPO Style Manual',guidePage:235,guidePrintedPage:references.gpo.pages[234].printedPage,rule:'9.5',preferred:suggestion,ruleText:'In technical matter, unit symbols are used only with figures; this suggestion expands the unit with the sentence-opening number.'}
  ]});
 }
 return issues;
}
