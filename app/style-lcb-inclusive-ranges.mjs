import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
const boundary='[\\p{L}\\p{N}\\p{M}_]',number='\\d+(?:\\.\\d+)*';
const pattern=new RegExp('(?<!'+boundary+')(?<label>Sections|grades)\\s+(?<first>'+number+')\\s+to\\s+(?<last>'+number+')(?!'+boundary+')(?<before>,?)\\s+(?<inclusive>inclusive)(?!'+boundary+')(?<after>,?)','giu');
const normalize=s=>s.replace(/\s+/gu,' ').trim();
export const LCB_INCLUSIVE_RANGE_SCOPE='LCB22 prints Sections 123 to 130, inclusive, and grades 1 to 6, inclusive,. Selected checks supply the printed commas only for complete numeric Sections/grades ranges already explicitly qualified by inclusive. No inclusive intent is added to an unqualified range; no cited section identity, range validity, written-number conversion or arbitrary labelled range is inferred. The following intact prose word establishes a required closing comma; terminal punctuation needs no new closing comma. Original values, quoted bill-local forms, technical identifiers, titles, headings/tables and damaged or uncertain source remain protected.';
export function lcbInclusiveRangeIssues(doc,references){
 const ctx=styleContext(doc),blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx),quoted=billQuotedTermProtection(doc,ctx),original=originalBodyStyleContext(doc)?.source||ctx.source,issues=[];
 for(const m of ctx.source.matchAll(pattern)){
  const start=m.index,end=start+m[0].length,tail=ctx.source.slice(end),next=/^\s+(?<word>[\p{L}\p{M}]+)(?![\p{L}\p{N}\p{M}_])/u.exec(tail),evidenceEnd=next?end+next[0].length:end;
  if(ctx.at(start)==='Heading'||blocked(start,evidenceEnd)||literal(start,evidenceEnd)||cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,end)||cutsOriginalStyleWord(doc,evidenceEnd)||m[0]===m[0].toUpperCase()||quoted({start,end}))continue;
  if(/[-\u2010-\u2015]/u.test(doc.text[start-1]||'')||/^(?:[-\u2010-\u2015/⁄:@#\\]|\.\d)/u.test(original.slice(end))||/^\s*(?:Act|Code|Law|Fund|Account|Authority|Department|Agency|Commission|Board)\b/u.test(original.slice(end)))continue;
  // Original following body text is negative evidence: an uncertain word
  // cannot expose a later prose continuation as a comma witness.
  if(next&&normalize(original.slice(end,evidenceEnd))!==normalize(tail.slice(0,next[0].length)))continue;
  const closing=!!next||m.groups.after===',',suggestion=m.groups.label+' '+m.groups.first+' to '+m.groups.last+', '+m.groups.inclusive+(closing?',':'');
  if(m.groups.before===','&&(!next||m.groups.after===','))continue;
  const page=22,rule=/^sections$/iu.test(m.groups.label)?'Numerals: Code Sections and Constitution':'Numerals: Grades',printed=/^sections$/iu.test(m.groups.label)?'Sections 123 to 130, inclusive,':'grades 1 to 6, inclusive,';
  issues.push({start,end,text:doc.text.slice(start,end),suggestion,evidenceStart:start,evidenceEnd,guideId:'lcb',guidePage:page,guidePrintedPage:references.lcb.pages[21].printedPage,rule,category:'Printed Inclusive Range',context:ctx.at(start),checkId:'lcb-inclusive-range',conflict:false,reviewSuggested:false,referenceRangeEvidence:{start,end,sourceText:doc.text.slice(start,end),first:m.groups.first,last:m.groups.last,explicitInclusive:true,...(next?{continuation:{start:end+next.index,end:evidenceEnd,text:doc.text.slice(end,evidenceEnd)}}:{})},message:'LCB22 prints “'+printed+'”. Compare only the commas around the already stated inclusive qualifier. The original identifiers and explicit range intent are retained; this does not verify the cited sections or infer whether another range is inclusive.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:page,guidePrintedPage:references.lcb.pages[21].printedPage,rule,preferred:printed,ruleText:printed}]});
 }
 return issues;
}
export function restoreInclusiveRangeEvidence(e,map,text){
 const start=map(e.start),end=map(e.end,true),c=e.continuation;
 return {...e,start,end,sourceText:text.slice(start,end),...(c?{continuation:{start:map(c.start),end:map(c.end,true),text:text.slice(map(c.start),map(c.end,true))}}:{})};
}
