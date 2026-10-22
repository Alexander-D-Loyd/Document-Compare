import {styleContext,withStyleContext,memoizeStyleReview} from './style-context.mjs';
import {styleEvidenceGuard,originalBodyStyleContext,cutsOriginalStyleWord} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
import {entityNameBoundaryBlocked} from './style-entity-name-boundaries.mjs';
import {originalTemporalNameBlocked,technicalClockBoundary} from './style-time-abbreviations-next.mjs';
import {numericExpressionGuard} from './style-numeric-expression-evidence.mjs';
import {styleSingleQuoteRanges} from './style-single-quote-ranges.mjs';
import {quantityOpeningPrefix} from './style-opening-quantity-evidence.mjs';
import {CALIFORNIA_CODES} from './data/california-codes.mjs';

export const GPO_ERA_REFERENCE_SCOPE='GPO 12.9(c), PDF page 289/printed 275, explicitly places A.D. before a year and B.C., C.E. and B.C.E. after it. Intact complete exact uppercase dotted marker/whole-figure-year pairs receive a finite era identity, including inverted pairs, so an era marker is not treated as an unknown California code and its year is not an isolated prose count. Only an inverted complete pair receives a source-backed position comparison. Standalone or undotted markers, lowercase aliases, ambiguous years on both sides, calendar validity, historical meaning and value conversion remain outside this check. Original source endpoints, numeric expressions, explicit code contexts, removed evidence, names, quotation/bill-local wording, headings, tables and physical offsets remain protected.';

const eraKey=Symbol('complete-original-era-year-pairs');
const markers=/(?<![\p{L}\p{N}\p{M}_])(?:B\.C\.E\.|A\.D\.|B\.C\.|C\.E\.)(?![\p{L}\p{N}\p{M}_])/gu;
const codeBefore=/(?:(?:\b(?:California|Cal\.|Sections?|Secs?\.|Articles?|Codes?)\s*|§\s*)(?:[-(]\s*)?|\bsections?\s+\d[\d.()\s,-]*\s+of\s+(?:the\s+)?)$/iu;
const codeAfter=/^\s*(?:§|[Ss]ections?\b|[Ss]ecs?\.)/u;
const escape=text=>text.replace(/[.*+?^${}()|[\]\\]/gu,'\\$&');
// These complete supplied titles identify an explicit code citation. They
// are original negative evidence only, never guessed from a capitalized noun.
const titledCodeAfter=new RegExp('^\\s+of\\s+(?:the\\s+)?(?:California\\s+)?(?:'+CALIFORNIA_CODES.map(r=>r.name.split(' ').map(escape).join('\\s+')).sort((a,b)=>b.length-a.length).join('|')+')(?![\\p{L}\\p{N}\\p{M}_-])','iu');

// Identity recognition also applies inside literal/table text, where code
// validation has its own scope. It never authorizes a prose correction there.
export function eraReferenceRanges(doc,ctx=styleContext(doc)){
 return memoizeStyleReview(doc,ctx,eraKey,()=>{
  const source=ctx.source,matches=[...source.matchAll(markers)];if(!matches.length)return [];
  const original=originalBodyStyleContext(doc)?.source||source,singles=styleSingleQuoteRanges(source);
  const identityContext={...ctx,literalAt:()=>false,tableAt:()=>false},blocked=styleEvidenceGuard(doc,identityContext),numeric=numericExpressionGuard(doc,identityContext),ranges=[];
  for(const m of matches){
   const markerStart=m.index,markerEnd=markerStart+m[0].length;
   const before=/\d+\s+$/u.exec(source.slice(0,markerStart)),after=/^\s+\d+/u.exec(source.slice(markerEnd));
   // One marker with two adjacent years does not identify which pair is meant.
   if(!!before===!!after)continue;
   const markerFirst=!!after,yearMatch=markerFirst?/\d+/u.exec(after[0]):/\d+/u.exec(before[0]);
   const yearStart=markerFirst?markerEnd+yearMatch.index:markerStart-before[0].length+yearMatch.index,yearEnd=yearStart+yearMatch[0].length;
   const start=markerFirst?markerStart:yearStart,end=markerFirst?yearEnd:markerEnd;
   // Complete actual single-quote enclosures are literal boundaries, not
   // identifier apostrophes. They permit identity only, never an era edit.
   const enclosure=singles.find(q=>q.start<start&&q.end>end);
   let boundaryOriginal=original;
   if(enclosure?.start===start-1)boundaryOriginal=boundaryOriginal.slice(0,start-1)+' '+boundaryOriginal.slice(start);
   if(enclosure?.end===end+1)boundaryOriginal=boundaryOriginal.slice(0,end)+' '+boundaryOriginal.slice(end+1);
   if(blocked(start,end)||cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,end)||numeric(yearStart,yearEnd)||entityNameBoundaryBlocked(doc.text,source,boundaryOriginal,start,end)||technicalClockBoundary(doc,source,original,start,end)||codeBefore.test(original.slice(Math.max(0,start-80),start))||codeAfter.test(original.slice(end,end+40))||titledCodeAfter.test(original.slice(end,end+160))||originalTemporalNameBlocked(original,start,end))continue;
   ranges.push({start,end,markerStart,markerEnd,yearStart,yearEnd,marker:m[0],year:yearMatch[0],markerFirst});
  }
  return ranges.filter(r=>!ranges.some(other=>other!==r&&other.start<r.end&&other.end>r.start));
 });
}

function eraPassage(references){
 const page=references?.gpo?.pages?.find(p=>p.page===289);if(typeof page?.text!=='string')return null;
 const m=/In dates, A\.D\. precedes the year \(A\.D\. 937\); B\.C\.\s+follows the year\s+\(254 B\.C\.\); C\.E\. and B\.C\.E\. follow the year\./u.exec(page.text);
 return m?{page,passage:{page:page.page,start:m.index,end:m.index+m[0].length,text:m[0]}}:null;
}

export function gpoEraReferenceIssues(doc,references){
 return withStyleContext(doc,()=>{
  const authority=eraPassage(references);if(!authority)return [];
  const ctx=styleContext(doc),original=originalBodyStyleContext(doc),literal=originalStyleLiteralGuard(doc,ctx),blocked=styleEvidenceGuard(doc,ctx),quoted=billQuotedTermProtection(doc,ctx),issues=[];
  for(const r of eraReferenceRanges(doc,ctx)){
   if(r.markerFirst===(r.marker==='A.D.')||ctx.at(r.start)==='Heading'||blocked(r.start,r.end)||literal(r.start,r.end)||quoted(r))continue;
   const opening=r.markerFirst&&!quantityOpeningPrefix(ctx,r.start)&&(!original||!quantityOpeningPrefix(original,r.start));
   const openingPage=opening&&references?.gpo?.pages?.find(p=>p.page===294),openingSource=openingPage&&/12\.16\.\s+Spell out numbers at the beginning of a sentence or head\. Rephrase\s+a sentence or head to avoid beginning with figures\./u.exec(openingPage.text||'');
   // Moving an opening B.C./C.E./B.C.E. behind its year would create a new
   // sentence-opening figure. Preserve both explicit rules as one question.
   if(opening&&!openingSource)continue;
   const suggestion=opening?null:r.marker==='A.D.'?r.marker+' '+r.year:r.year+' '+r.marker;
   const message='GPO 12.9(c) explicitly places A.D. before the year and B.C., C.E. and B.C.E. after it. '+(opening?'This inverted pair starts a sentence or head. Moving its year first would create a sentence-opening figure under GPO 12.16; review how to rephrase the complete reference. No replacement is selected. ':'Compare this complete era/year pair with that printed position; preserve the original year digits. ')+'No historical date or value is inferred.';
   const citations=[{guideId:'gpo',guideName:'GPO Style Manual',guidePage:authority.page.page,guidePrintedPage:authority.page.printedPage,rule:'12.9(c)',preferred:suggestion,ruleText:message,sourcePassage:authority.passage}];
   if(opening)citations.push({guideId:'gpo',guideName:'GPO Style Manual',guidePage:294,guidePrintedPage:openingPage.printedPage,rule:'12.16',preferred:null,ruleText:openingSource[0],sourcePassage:{page:294,start:openingSource.index,end:openingSource.index+openingSource[0].length,text:openingSource[0]}});
   issues.push({start:r.start,end:r.end,evidenceStart:r.start,evidenceEnd:r.end,text:doc.text.slice(r.start,r.end),suggestion,guideId:'gpo',guidePage:authority.page.page,guidePrintedPage:authority.page.printedPage,rule:'12.9(c)',category:'Era reference',context:ctx.at(r.start),checkId:'gpo-era-references',conflict:false,...(opening?{reviewSuggested:true,confidence:'Review Suggested',eraOpeningRephrase:true}:{}),message,references:citations});
  }
  return issues;
 });
}
