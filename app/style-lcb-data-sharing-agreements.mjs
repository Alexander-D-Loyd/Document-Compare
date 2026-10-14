import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
import {styleSingleQuoteRanges} from './style-single-quote-ranges.mjs';
export const LCB_DATA_SHARING_AGREEMENT_SCOPE='LCB8 item1 generally hyphenates a unit modifier immediately preceding its noun, especially one containing a participle. This selected check applies that explicit provision to data sharing immediately before lowercase agreement/agreements. It is a bounded construction requested by the user, not a phrase claimed to be printed in the examples table. Only the modifier changes; ordinary data sharing outside that construction, known names/titles, headings/tables, quoted bill-local wording, uncertain source and genuine body dashes remain protected.';
export function lcbDataSharingAgreementIssues(doc,references){
 const ctx=styleContext(doc),blocked=styleEvidenceGuard(doc,ctx),quoted=billQuotedTermProtection(doc,ctx),originalContext=originalBodyStyleContext(doc),original=originalContext?.source||ctx.source,singleQuotes=styleSingleQuoteRanges(original),issues=[];
 for(const m of ctx.source.matchAll(/(?<![\p{L}\p{N}\p{M}_])(?<modifier>data\s+sharing)\s+(?<head>agreements?)(?![\p{L}\p{N}\p{M}_])/giu)){
  const start=m.index,end=start+m.groups.modifier.length,evidenceEnd=start+m[0].length;
  if(ctx.at(start)==='Heading'||blocked(start,evidenceEnd)||originalContext?.literalAt(start,evidenceEnd)||singleQuotes.some(r=>start<r.end&&evidenceEnd>r.start)||cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,evidenceEnd)||/[A-Z]/u.test(m.groups.modifier.slice(1))||/[A-Z]/u.test(m.groups.head)||quoted({start,end}))continue;
  if(/[-\u2010-\u2015/:\\#@]/u.test(doc.text[start-1]||'')||/^(?:[-\u2010-\u2015/:\\#@]|\.\d)/u.test(original.slice(evidenceEnd))||/^\s+(?:Act|Code|Law|Fund|Account|Authority|Department|Agency|Commission|Board)\b/u.test(original.slice(evidenceEnd)))continue;
  const suggestion=/^[A-Z]/u.test(m.groups.modifier)?'Data-sharing':'data-sharing',page=8,rule='Hyphenation, item 1';
  issues.push({start,end,text:doc.text.slice(start,end),suggestion,evidenceStart:start,evidenceEnd,guideId:'lcb',guidePage:page,guidePrintedPage:references.lcb.pages[7].printedPage,rule,category:'Modifier hyphenation',context:ctx.at(start),checkId:'lcb-data-sharing-agreement',conflict:false,reviewSuggested:false,message:'In this complete construction, “data sharing” immediately modifies “'+m.groups.head+'”. LCB8 item1 supports a hyphenated unit modifier here. The phrase is checked under that provision; it is not presented as a printed table entry.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:page,guidePrintedPage:references.lcb.pages[7].printedPage,rule,preferred:suggestion,ruleText:'Generally, use a hyphen between words combined to form a unit modifier immediately preceding the word modified. This is especially the case when one element of the modifier is a present or past participle.'}]});
 }
 return issues;
}
