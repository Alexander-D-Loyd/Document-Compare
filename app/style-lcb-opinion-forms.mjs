import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
import {canonicalWrittenValue,ones,tens} from './style-cardinal-values.mjs';
import {writtenQuantityEvidenceGuard,writtenCardinalRuns} from './style-written-quantity-evidence.mjs';
import {numericExpressionGuard} from './style-numeric-expression-evidence.mjs';
import {isOpinionStyleDocument,styleDocumentTypeLabel} from './style-document-type.mjs';

const word='[\\p{L}\\p{N}\\p{M}_]',cardinal='(?:'+[...ones,...tens.slice(2),'hundred','thousand','million','billion','trillion'].join('|')+')',number='(?:'+cardinal+'(?:[\\s-]+(?:and|'+cardinal+'))*|\\d+(?:,\\d{3})*)';
const money=new RegExp('(?<!'+word+')(?<whole>'+number+')[\\s-]+(?:(?<unit>dollars?)(?:\\s+and\\s+(?<cents>'+number+')[\\s-]+cents?(?!'+word+'))?|(?<smallUnit>cents?|mills?))(?!'+word+')(?:\\s*\\(\\s*\\$\\s*(?<figure>\\d+(?:,\\d{3})*(?:\\.\\d{1,3})?)\\s*\\))?','dgiu');
const section=new RegExp('(?<!'+word+')Sections?\\s+\\d+(?:\\.\\d+)*(?:\\([a-z\\d]+\\))*\\s+(?<tail>et\\.?\\s+seq\\.)(?!'+word+')','giu');
const constitutions=/(?<![\p{L}\p{N}\p{M}_])state\s+and\s+federal\s+constitutions(?![\p{L}\p{N}\p{M}_])/giu;
const canonicalMoneyWhole=raw=>{const parts=raw.toLowerCase().replace(/[\s-]+/gu,' ').split(' ');if(!parts.every((w,i)=>w!=='and'||/^(?:hundred|thousand|million|billion|trillion)$/u.test(parts[i-1]||'')&&parts[i+1]&&parts[i+1]!=='and'&&!/^(?:hundred|thousand|million|billion|trillion)$/u.test(parts[i+1])))return null;return canonicalWrittenValue(parts.filter(w=>w!=='and').join(' '));};
const value=raw=>/^\d/u.test(raw)?/^(?:0|[1-9]\d*|[1-9]\d{0,2}(?:,\d{3})+)$/u.test(raw)?BigInt(raw.replaceAll(',','')):null:(()=>{const n=canonicalMoneyWhole(raw);return n===null?null:BigInt(n);})();
const formatMills=n=>{const whole=n/1000n,remainder=n%1000n;return '$'+whole.toString().replace(/\B(?=(\d{3})+(?!\d))/gu,',')+(remainder?'.'+remainder.toString().padStart(3,'0').replace(/0$/u,''): '');};
const openingFigure=/\$\s*(?<number>\d+(?:,\d{3})*(?:\.\d{1,3})?)(?:\s+(?:thousand|million|billion|trillion))?(?![\p{L}\p{N}\p{M}_])/dgu;
const figureMills=s=>{const [whole,fraction='']=s.replaceAll(',','').split('.');return BigInt(whole)*1000n+BigInt(fraction.padEnd(3,'0'));};
export const LCB_OPINION_FORMS_SCOPE='Explicit Opinion/Cover letter selection applies LCB21 Bill numeral rules, with LCB23 figure-only money (integer mills retain mills), LCB22 and following after a complete numeric Section reference, and LCB20 state and federal Constitutions in Opinion mode. Plain written monetary sentence openings retain LCB21 treatment; digit or repeated-pair openings receive whole-amount review with no figure-start replacement. No document-type guessing, legal-identity inference or California Style Manual citation certification is performed. Canonical complete amounts, exact original source evidence, quotes/bill-local terms, names, tables, technical boundaries, strikes and uncertain source remain protected; disagreement in words/figures requests judgment without asserting an intended value.';

export function lcbOpinionFormIssues(doc,references){
 if(!isOpinionStyleDocument(doc))return [];
 const ctx=styleContext(doc),source=ctx.source,original=originalBodyStyleContext(doc)?.source||source,blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx),quoted=billQuotedTermProtection(doc,ctx),quantity=writtenQuantityEvidenceGuard(doc,ctx),numeric=numericExpressionGuard(doc,ctx),issues=[],label=styleDocumentTypeLabel(doc),originalRuns=writtenCardinalRuns(original);
 const safe=(start,end)=>ctx.at(start)!=='Heading'&&!blocked(start,end)&&!literal(start,end)&&!quoted({start,end})&&!cutsOriginalStyleWord(doc,start)&&!cutsOriginalStyleWord(doc,end)&&!/[\p{L}\p{N}\p{M}_./\\#@+−\u2010-\u2015-]$/u.test(doc.text.slice(0,start))&&!/^(?:[-\u2010-\u2015/\\#@]|\.\d|[’'][\p{L}\p{N}\p{M}_])|^\s+(?:Act|Code|Law|Fund|Account|Authority|Department|Agency|Commission|Board|Institute|Association)\b/u.test(original.slice(end))&&!/\b(?:CAD|USD|AUD|NZD|US|CA|AU|NZ|HK|SG)\s*$/u.test(original.slice(0,start));
 const atOpening=start=>!source.slice(ctx.sentenceAt(start).start,start).replace(/^[\s”"’']*(?:\([a-z\d]+\)\s*)*/iu,'').trim();
 const add=(start,end,suggestion,page,rule,sourcePattern,evidence,extra={})=>{
  const record=references?.lcb?.pages?.[page-1],example=record&&sourcePattern.exec(record.text);if(!example)return;
  const issue={start,end,text:doc.text.slice(start,end),suggestion,checkId:'lcb-opinion-forms',guideId:'lcb',guidePage:page,guidePrintedPage:String(record.printedPage),rule,category:'Document-type form',context:label,conflict:false,evidenceStart:evidence.start,evidenceEnd:evidence.end,documentTypeEvidence:{...evidence,sourceText:doc.text.slice(evidence.start,evidence.end),documentType:doc.styleDocumentType,sourceExample:{start:example.index,end:example.index+example[0].length,text:example[0],guidePage:page}},message:'LCB explicitly provides this form for '+label.toLowerCase()+' text. Review it against the selected document type.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:page,guidePrintedPage:String(record.printedPage),rule,preferred:suggestion,ruleText:example[0],sourcePassage:{start:example.index,end:example.index+example[0].length,text:example[0]}}],...extra};
  if(extra.monetarySentenceOpening){const page21=references.lcb.pages[20],general=/Spell\s+out\s+all\s+numbers\s+when\s+starting\s+sentences\./u.exec(page21.text);if(!general)return;issue.references.push({guideId:'lcb',guideName:'LCB Style Manual',guidePage:21,guidePrintedPage:String(page21.printedPage),rule:'Numerals, general item 1',preferred:null,ruleText:general[0],sourcePassage:{start:general.index,end:general.index+general[0].length,text:general[0]}});}
  issues.push(issue);
 };
 for(const m of source.matchAll(money)){
  const start=m.index,end=start+m[0].length,numberEnd=start+m.groups.whole.length,unit=m.groups.unit||m.groups.smallUnit,whole=value(m.groups.whole),cents=m.groups.cents?value(m.groups.cents):0n;
  const unitStart=numberEnd+/^[\s-]+/u.exec(source.slice(numberEnd))[0].length,unitEnd=unitStart+unit.length,components=[{start,end:unitEnd},{start,end:numberEnd},{start:unitStart,end:unitEnd}];
  if(m.groups.cents){const [centsStart,centsEnd]=m.indices.groups.cents;components.push({start:centsStart,end:centsEnd},{start:centsStart,end:centsEnd+/^[\s-]+cents?/iu.exec(source.slice(centsEnd))[0].length});}
  const numberRanges=[m.indices.groups.whole,...(m.groups.cents?[m.indices.groups.cents]:[])];
  if(components.some(quoted)||numberRanges.some(([a,b])=>originalRuns.some(r=>r.start<a&&r.end>=b)||/^\d/u.test(source.slice(a,b))&&numeric(a,b))||/\d[:,]\s*$/u.test(original.slice(0,start)))continue;
  if(whole===null||cents===null||cents>=100n||!safe(start,end)||quantity(start,numberEnd)||/\b(?:minus|negative|plus|positive)\s*$/iu.test(original.slice(0,start))||/[+−\u2010-\u2015/⁄^*=$€£¥₹¢-]\s*$/u.test(original.slice(0,start))||/^\s*\(\s*\$/u.test(original.slice(end))||/^dollar/iu.test(unit)&&!m.groups.cents&&/^\s+and\s+[\p{L}\p{N}\s,-]+cents?\b/iu.test(original.slice(end))||/^\s+(?:coins?|bills?|notes?|denominations?)\b/iu.test(original.slice(end)))continue;
  if([...doc.text.slice(start,end).matchAll(/[\u2010-\u2015]/gu)].some(d=>source[start+d.index]==='-'))continue;
  const isMills=/^mill/iu.test(unit);if(isMills&&m.groups.cents)continue;
  const amount=whole*(isMills?1n:/^cent/iu.test(unit)?10n:1000n)+cents*10n,suggestion=isMills?whole+' '+(whole===1n?'mill':'mills'):formatMills(amount),mismatch=m.groups.figure&&figureMills(m.groups.figure)!==amount;
  if(atOpening(start)){
   // Written sentence openings already satisfy LCB21. Repeated money pairs
   // and digit openings need human rephrasing, never a new figure opener.
   if(!/^\d/u.test(m.groups.whole)&&!m.groups.figure)continue;
   add(start,end,null,23,'Numerals: Monetary sentence opening',isMills?/2\s+mills\s+\(digest,\s+opinion,\s+and\s+cover\s+letter\)/u:/\$10\s+\(digest,\s+opinion,\s+and\s+cover\s+letter\)/u,{start,end},{monetarySentenceOpening:true,reviewSuggested:true,matchesPrimary:false,message:'LCB21 spells out numbers at sentence openings; LCB23 uses figure monetary forms in '+label.toLowerCase()+' text. Review the complete amount and rephrase the opening if using a dollar figure.'+(mismatch?' The written and parenthetical values also disagree; confirm the intended value.':'')+' No replacement or intended value is asserted.'});continue;
  }
  if(!mismatch&&m[0]===suggestion)continue;
  add(start,end,mismatch?null:suggestion,23,/^mill/iu.test(unit)?'Numerals: Opinion and cover letter mills':'Numerals: Opinion and cover letter money',isMills?/2\s+mills\s+\(digest,\s+opinion,\s+and\s+cover\s+letter\)/u:/\$10\s+\(digest,\s+opinion,\s+and\s+cover\s+letter\)/u,{start,end},mismatch?{reviewSuggested:true,conditionalSuggestion:suggestion,message:'The written and parenthetical monetary values disagree. Confirm the intended amount; LCB uses the figure-only form in '+label.toLowerCase()+' text. No value is asserted as correct.'}:{});
 }
 for(const m of source.matchAll(openingFigure)){
  const start=m.index,end=start+m[0].length,[numberStart,numberEnd]=m.indices.groups.number;
  if(!atOpening(start)||!safe(start,end)||numeric(numberStart,numberEnd)||quoted({start,end:numberEnd})||issues.some(i=>i.start<end&&i.end>start))continue;
  add(start,end,null,23,'Numerals: Monetary sentence opening',/\$10\s+\(digest,\s+opinion,\s+and\s+cover\s+letter\)/u,{start,end},{monetarySentenceOpening:true,reviewSuggested:true,matchesPrimary:false,message:'LCB21 requires words at sentence openings. Rephrase this complete monetary figure or spell out the opening amount while following the applicable LCB23 money convention. No replacement or value conversion is asserted.'});
 }
 for(const m of source.matchAll(section)){
  const start=m.index,end=start+m[0].length;if(!safe(start,end))continue;
  const tailStart=end-m.groups.tail.length;if(quoted({start:tailStart,end})||quoted({start:tailStart,end:end-1}))continue;add(tailStart,end,'and following',22,'Numerals: Opinion and cover letter references',/Section\s+123\s+and\s+following\s+\(opinion\s+and\s+cover\s+letter\)/u,{start,end});
 }
 if(doc.styleDocumentType==='opinion')for(const m of source.matchAll(constitutions)){
  const start=m.index,end=start+m[0].length;if(!safe(start,end)||/^\s+(?:of|for)\b/iu.test(original.slice(end)))continue;
  const atOpening=!source.slice(ctx.sentenceAt(start).start,start).trim(),suggestion=(atOpening?'State':'state')+' and federal Constitutions';if(m[0]===suggestion)continue;
  add(start,end,suggestion,20,'Capitalization: Opinion Constitutions',/state\s+and\s+federal\s+Constitutions\s+\(opinions\)/u,{start,end});
 }
 return issues;
}
export function restoreDocumentTypeEvidence(e,map,text){const start=map(e.start),end=map(e.end,true);return {...e,start,end,sourceText:text.slice(start,end)};}
