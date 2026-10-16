import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {styleSingleQuoteRanges} from './style-single-quote-ranges.mjs';

const word='[\\p{L}\\p{N}\\p{M}_]',lead=new RegExp('(?<!'+word+')(?:(?:[Tt]he|[Aa])\\s+(?:term|word|phrase)|[Tt]he\\s+(?:text|notice)\\s+(?:reads|states|says))\\s*$','u');
const lexical="[\\p{L}\\p{M}]+(?:[-’'][\\p{L}\\p{M}]+)*",payload=new RegExp('^'+lexical+'(?:\\s+'+lexical+')*$','u');
const material=/^\s*(?:is|means|denotes|represents)\s+(?:a|an|the)\s+(?:literal|string|filename|command|identifier|code|pattern|regular\s+expression|URL)(?![\p{L}\p{N}\p{M}_])/iu;
const overlaps=(a,b)=>a.start<b.end&&a.end>b.start;
export const LCB_SINGLE_QUOTE_PUNCTUATION_SCOPE='LCB6’s comma/period-inside rule is applied to a balanced curly or ASCII single-quotation enclosure with an intact selected prose introducer: the/a term, word or phrase, or the text/notice reads/states/says. Only the adjacent closing quote and outside comma/period are selected. Complete alphabetic lexical payload, introducer, original enclosure and punctuation must be intact; recognized margins/interior heads preserve physical offsets. Apostrophe ambiguity, numeric measurements, technical payloads, material/string definitions, nested or restored enclosing quotations, headings/tables, source strikes/exclusions and unknown body content remain protected. Already inside punctuation, redundant periods, ellipses and other enclosure contexts remain unchanged or manual. The quoted wording itself is not corrected; bill-local term authority remains intact.';

export function lcbSingleQuotePunctuationIssues(doc,references,{existingIssues=[]}={}){
 const page=references?.lcb?.pages?.[5],witness=page&&/Periods\s+and\s+commas\s+are\s+always\s+placed\s+within\s+quotation\s+marks;/u.exec(page.text);if(!witness)return [];
 const ctx=styleContext(doc),source=ctx.source,originalContext=originalBodyStyleContext(doc),original=originalContext?.source||source,originalSingles=styleSingleQuoteRanges(original),blocked=styleEvidenceGuard(doc,{...ctx,literalAt:()=>false}),issues=[];
 for(const enclosure of styleSingleQuoteRanges(source)){
  const start=enclosure.end-1,end=enclosure.end+1,mark=source[enclosure.end],close=source[start];if(!/[.,]/u.test(mark||'')||/^\.{2}/u.test(source.slice(enclosure.end)))continue;
  const content=source.slice(enclosure.start+1,start);if(!payload.test(content))continue;
  const before=source.slice(ctx.sentenceAt(enclosure.start).start,enclosure.start),intro=lead.exec(before);if(!intro)continue;
  const evidenceStart=enclosure.start-before.length+intro.index,evidenceEnd=end,continuation=original.slice(end);
  if(ctx.at(evidenceStart)==='Heading'||blocked(evidenceStart,evidenceEnd)||ctx.literalAt(enclosure.start,enclosure.end)||originalContext?.literalAt(enclosure.start,enclosure.end)||originalSingles.some(r=>overlaps(r,enclosure)&&(r.start!==enclosure.start||r.end!==enclosure.end))||cutsOriginalStyleWord(doc,evidenceStart)||cutsOriginalStyleWord(doc,enclosure.start)||cutsOriginalStyleWord(doc,evidenceEnd)||/[-\u2010-\u2015/:\\#@]/u.test(doc.text[evidenceStart-1]||'')||mark==='.'&&/^[\p{L}\p{N}\p{M}_]/u.test(continuation)||material.test(continuation)||existingIssues.some(i=>i.start<end&&i.end>start))continue;
  const sourceExample={guidePage:6,start:witness.index,end:witness.index+witness[0].length,text:witness[0]},selection={start,end,text:doc.text.slice(start,end)},proseIntro={start:evidenceStart,end:enclosure.start,text:doc.text.slice(evidenceStart,enclosure.start)},originalEnclosure={...enclosure,text:doc.text.slice(enclosure.start,enclosure.end)};
  issues.push({start,end,text:selection.text,suggestion:mark+close,evidenceStart,evidenceEnd,checkId:'lcb-single-quote-punctuation',guideId:'lcb',guidePage:6,guidePrintedPage:String(page.printedPage),rule:'Punctuation: Quotation Marks',category:'Quotation Punctuation',context:ctx.at(start),reviewSuggested:false,conflict:false,singleQuotePunctuationEvidence:{start:evidenceStart,end:evidenceEnd,sourceText:doc.text.slice(evidenceStart,evidenceEnd),selection,proseIntro,enclosure:originalEnclosure,sourceExample},message:'LCB6 places commas and periods inside quotation marks. This balanced single quotation has an intact ordinary-prose introducer and lexical payload; compare its closing boundary with the printed punctuation rule. Only punctuation is suggested, leaving the quoted term unchanged.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:6,guidePrintedPage:String(page.printedPage),rule:'Punctuation: Quotation Marks',preferred:mark+close,ruleText:witness[0],sourcePassage:{start:sourceExample.start,end:sourceExample.end,text:sourceExample.text}}]});
 }return issues;
}

export function restoreSingleQuotePunctuationEvidence(e,map,text){
 const restore=r=>{const start=map(r.start),end=map(r.end,true);return {...r,start,end,text:text.slice(start,end)};},start=map(e.start),end=map(e.end,true);
 return {...e,start,end,sourceText:text.slice(start,end),selection:restore(e.selection),proseIntro:restore(e.proseIntro),enclosure:restore(e.enclosure)};
}
