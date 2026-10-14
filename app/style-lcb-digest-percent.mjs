import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';

const word='[\\p{L}\\p{N}\\p{M}_]',half='(?:one(?:\\s*-\\s*|\\s+)half|1\\s*[/⁄]\\s*2|½)',unit='(?:\\s*%|\\s+percent(?!'+word+'))';
const patterns=[
 {kind:'half-of-one',pattern:new RegExp('(?<!'+word+')(?<fraction>'+half+')\\s+(?<of>of)\\s+(?<amount>1|one)(?<unit>'+unit+')(?!'+word+')','giu')},
 {kind:'mixed-one-half',pattern:new RegExp('(?<!'+word+')(?<fraction>1½|1\\s+1\\s*[/⁄]\\s*2|one\\s+and\\s+one(?:\\s*-\\s*|\\s+)half)(?<unit>'+unit+')(?!'+word+')','giu')},
];
const sourceRule='one-half of 1 percent or 0.5 percent (bill); 1⁄2 of 1% or 0.5% (digest); 1½ percent or 1.5 percent (bill); 1½% or 1.5% (digest).';
const numberWord='(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|hundred|thousand|million|billion|trillion|half|quarters?|thirds?)';
const uncertainLead=new RegExp('(?:[\\d.,/⁄¼½¾⅓⅔⅛⅜⅝⅞]|'+numberWord+')\\s*$|'+numberWord+'\\s+and\\s*$|(?:[\\d.,/⁄¼½¾]|'+numberWord+')(?:\\s*(?:%|percent))?\\s+(?:to|through)\\s*$','iu');
const identifierLead=/(?<![\p{L}\p{N}\p{M}_])(?:Section|Article|Item|Form|Schedule|No\.?|Model|Type|Class|Version|Figure|Table|Appendix|Exhibit|Paragraph|Subdivision|Code|ID)\s*$/iu;
const titleTail=/^\s+(?:(?:of|for|the|and|in|on)\s+){0,2}[A-Z][\p{L}\p{M}’'-]*|^\s+(?:Act|Code|Law|Fund|Account|Authority|Department|Agency|Commission|Board)\b/u;
const whitespace=value=>value.replace(/\s+/gu,' ').trim();

export const LCB_DIGEST_PERCENT_SCOPE='LCB23 explicitly distinguishes one-half of 1 percent / 1⁄2 of 1% and 1½ percent / 1½%. Only these two complete percentage values and exact written equivalents are selected in source-confirmed Digest prose. Equivalent existing fraction glyphs and ASCII/fraction-slash figure notation are preserved; no decimal conversion, fraction-value guess or rounding is performed. One whole expression owns its contained fraction/percent corrections. Bill examples, sentence-opening words, unknown document types, other fractions/mixed values, large magnitudes, malformed values, technical identifiers, ranges, currency/signs, source strikes/exclusions, quotes and bill-local quoted forms, tables, titles and genuine body dashes remain protected. This is selected printed-example coverage, not full percentage or sentence automation.';

function eligibleExpressions(doc,ctx){
 const blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx),quoted=billQuotedTermProtection(doc,ctx),original=originalBodyStyleContext(doc)?.source||ctx.source;
 const digest=/\blegislative\s+counsel[’']s\s+digest\b/iu.exec(ctx.source);
 if(!digest||blocked(digest.index,digest.index+digest[0].length))return [];
 const contextWitness={start:digest.index,end:digest.index+digest[0].length,text:doc.text.slice(digest.index,digest.index+digest[0].length)},out=[];
 for(const {kind,pattern} of patterns)for(const match of ctx.source.matchAll(pattern)){
  const start=match.index,end=start+match[0].length;
  if(ctx.at(start)!=='Digest'||blocked(start,end)||literal(start,end)||cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,end)||/[A-Z]/u.test(match[0]))continue;
  // Complete original surrounding tokens are negative evidence only. Removed
  // digits, signs or identifier labels must not expose a valid suffix.
  const before=original.slice(0,start),after=original.slice(end);
  if(uncertainLead.test(before)||identifierLead.test(before)||/[+−–—/⁄^*=$€£¥₹¢-]\s*$/u.test(before)||/^[\p{L}\p{N}\p{M}_%/⁄-]/u.test(after)||/^\s*(?:[-−–—]|to\b|through\b)\s*(?:\d|one\b|two\b|three\b)/iu.test(after)||titleTail.test(after))continue;
  if([...doc.text.slice(start,end).matchAll(/[\u2012-\u2015]/gu)].some(d=>/\S/u.test(ctx.source[start+d.index]||'')))continue;
  // Never turn a written number at a possible sentence/paragraph opening
  // into figures. The general opening rule retains its own precise owner.
  const sentence=ctx.sentenceAt(start),prefix=ctx.source.slice(Math.max(contextWitness.end,sentence.start),start).replace(/^[\s”"’']*(?:\([a-z\d]+\)\s*)*/iu,'').trim();
  if(/^one/iu.test(match.groups.fraction)&&(!prefix||/[:;]\s*$/u.test(prefix)))continue;
  const components=[],component=(role,text,index)=>{const r={role,start:index,end:index+text.length,text:doc.text.slice(index,index+text.length)};components.push(r);return r;};
  const fraction=component('fraction',match.groups.fraction,start),fractionEnd=fraction.end;
  if(kind==='half-of-one'){
   const ofAt=fractionEnd+ctx.source.slice(fractionEnd,end).indexOf(match.groups.of),of=component('partitive',match.groups.of,ofAt);
   const amountAt=of.end+ctx.source.slice(of.end,end).indexOf(match.groups.amount);component('percent-value',match.groups.amount,amountAt);
  }
  const unitText=match.groups.unit.trim(),unitAt=end-unitText.length;component('percent-unit',unitText,unitAt);
  if(quoted({start,end})||components.some(quoted))continue;
  const written=/^one/iu.test(match.groups.fraction),figure=written?(kind==='half-of-one'?'1⁄2':'1½'):whitespace(match.groups.fraction);
  const suggestion=kind==='half-of-one'?figure+' of 1%':figure+'%';
  // The printed source uses figures. It does not prohibit a fraction glyph
  // or an ASCII slash, so equivalent existing figure choices stay intact.
  const compliant=!written&&(kind!=='half-of-one'||match.groups.amount==='1')&&match.groups.unit==='%';
  out.push({start,end,kind,components,contextWitness,suggestion,compliant});
 }
 return out;
}

export function lcbDigestPercentIssues(doc,references){
 const ctx=styleContext(doc),issues=[];
 for(const e of eligibleExpressions(doc,ctx)){
  if(e.compliant)continue;
  const {start,end,kind,components,contextWitness,suggestion}=e;
  issues.push({start,end,text:doc.text.slice(start,end),suggestion,evidenceStart:start,evidenceEnd:end,guideId:'lcb',guidePage:23,guidePrintedPage:references.lcb.pages[22].printedPage,rule:'Numerals: Percent',category:'Printed Fractional Percentage',context:'Digest',checkId:'lcb-digest-percent',reviewSuggested:false,conflict:false,supersedesCheckIds:['fractions','numerals','punctuation'],supersedesRules:['Numerals: Percent'],digestPercentEvidence:{kind:'printed-lcb23-fractional-percent',construction:kind,percentNumerator:kind==='half-of-one'?'1':'3',percentDenominator:'2',start,end,sourceText:doc.text.slice(start,end),components,contextWitness},message:'LCB23 prints '+(kind==='half-of-one'?'“1⁄2 of 1%”':'“1½%”')+' for Digest text. This complete printed percentage expression owns only its fraction and percent notation; its exact value is preserved without conversion or rounding.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:23,guidePrintedPage:references.lcb.pages[22].printedPage,rule:'Numerals: Percent',preferred:suggestion,ruleText:sourceRule}]});
 }
 return issues;
}

export function restoreDigestPercentEvidence(e,map,text){
 const range=r=>{const start=map(r.start),end=map(r.end,true);return {...r,start,end,text:text.slice(start,end)};},start=map(e.start),end=map(e.end,true);
 return {...e,start,end,sourceText:text.slice(start,end),components:e.components.map(range),contextWitness:range(e.contextWitness)};
}
