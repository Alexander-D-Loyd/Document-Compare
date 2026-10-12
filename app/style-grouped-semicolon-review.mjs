import {styleContext,withStyleContext}from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext}from './style-evidence.mjs';
import {introducedListRanges}from './style-introduced-lists.mjs';
import {PUNCTUATION_LIST_INTRODUCERS,splitListCommas}from './style-list-phrases.mjs';
import {styleWordDivisionView}from './style-word-divisions.mjs';
import {styleSingleQuoteRanges}from './style-single-quote-ranges.mjs';
import {sourceNameRanges}from './style-source-names.mjs';

export const GROUPED_SEMICOLON_REVIEW_SCOPE='Explicitly introduced semicolon-separated passages with comma-containing groups and an unseparated and in the final group receive conditional structural review without a fixed noun vocabulary or phrase-length cap. Unfamiliar words and clauses remain possible group members, not proven parallel items. Complete introducer/group/connector evidence remains intact. Internal thousands commas do not establish separate items. A comma before and is reviewable only when both sides themselves contain comma groups; a correctly punctuated ordinary inner list stays protected. Existing precise conjunction ownership is preserved; a broader context may augment an existing conditional comma question without another navigation stop. Independent number/word findings within the groups remain visible. Known source-record names, quotes including restored enclosing literals, tables, headings, strikes, unknown exclusions, partial original words, empty groups and already separated final and groups are protected. Unknown names are not resolved; punctuation group questions do not establish or change identity. Recognized word/page divisions preserve all nested source coordinates. No comma or semicolon replacement, grammatical role, parallelism or legal scope is asserted. Nonintroduced passages, parentheses/other unsupported lexical-run syntax, arbitrary nested clauses and full group interpretation remain manual. This is contextual checking, not whole punctuation automation.';
const overlaps=(rows,start,end)=>rows.some(r=>r.start<end&&r.end>start);
const parts=text=>splitListCommas(text).map(p=>p.trim());
const intactItems=text=>{const p=parts(text);return p.length>0&&p.every(s=>s&&/[A-Za-z\d]/.test(s));};
function detector(doc,references,{existingIssues=[]}={}){
 const ctx=styleContext(doc),source=ctx.source,blocked=styleEvidenceGuard(doc,ctx),issues=[];let original=null,literals=null,names=null;
 for(const range of introducedListRanges(source,PUNCTUATION_LIST_INTRODUCERS,{semicolons:true})){
  const start=range.listStart,end=range.end-source.slice(range.listStart,range.end).match(/\s*$/u)[0].length,text=source.slice(start,end),rawGroups=text.split(';');
  if(rawGroups.length<2||rawGroups.some(g=>!intactItems(g))||!rawGroups.slice(0,-1).some(g=>parts(g).length>=2)||/^\s*and\b/i.test(rawGroups.at(-1))||ctx.at(range.start)==='Heading'||cutsOriginalStyleWord(doc,range.start)||cutsOriginalStyleWord(doc,end)||/^[-\u00ad\u2010\u2011’']/u.test(doc.text.slice(end))||/[-\u00ad]\s*$/u.test(text)||blocked(range.start,end))continue;
  const last=rawGroups.at(-1),lastStart=end-last.length,candidates=[];
  for(const m of last.matchAll(/(?<![\p{L}\p{N}\p{M}_])and(?![\p{L}\p{N}\p{M}_])/giu)){
   const left=last.slice(0,m.index).trimEnd(),right=last.slice(m.index+m[0].length).trim(),commaBefore=left.endsWith(','),leftItems=commaBefore?left.slice(0,-1).trimEnd():left;
   if(!intactItems(leftItems)||!intactItems(right)||commaBefore&&(parts(leftItems).length<2||parts(right).length<2)||/^(?:and|or|nor)\b/i.test(right))continue;
   const at=lastStart+m.index,precise=existingIssues.some(i=>!i.reviewSuggested&&overlaps([i],at,at+3)&&(i.checkId==='semicolon-series'||/comma|semicolon/i.test(i.rule||'')));if(precise)continue;
   candidates.push({start:at,end:at+3,text:doc.text.slice(at,at+3),separatorBefore:commaBefore?'comma':'none',leftItemCount:parts(leftItems).length,rightItemCount:parts(right).length});
  }
  if(!candidates.length)continue;
  if(literals===null){original=originalBodyStyleContext(doc);literals=[...styleSingleQuoteRanges(source),...(original?[...original.literalRanges,...styleSingleQuoteRanges(original.source)]:[])];names=[...sourceNameRanges(source),...(original?sourceNameRanges(original.source):[])];}
  if(overlaps(literals,range.start,end)||overlaps(names,range.start,end))continue;
  let cursor=start;const groups=rawGroups.map(g=>{const at=cursor+g.match(/^\s*/u)[0].length,to=cursor+g.length-g.match(/\s*$/u)[0].length;cursor+=g.length+1;return {start:at,end:to,text:doc.text.slice(at,to),commaItemCount:parts(g).length};});
  const owner=existingIssues.find(i=>i.checkId==='lcb-series-punctuation-review'&&i.reviewSuggested&&i.suggestion===null&&candidates.some(c=>overlaps([i],c.start,c.end)));
  const message='Review Suggested: This introduced passage already uses semicolons and comma-containing groups. An “and” in the final group may introduce another group at the same level, or may belong inside that group. LCB places the final semicolon before the final “and” in a grouped series; GPO also uses semicolons for comma-containing groups or clauses. Confirm the grouping before choosing a comma, semicolon, or the existing wording. No parallel structure or punctuation replacement has been selected.';
  issues.push({start,end,text:doc.text.slice(start,end),suggestion:null,guideId:'lcb',guidePage:6,guidePrintedPage:String(references.lcb.pages[5].printedPage),rule:'Punctuation: Grouped Semicolon Review',category:'Grouped Series Review',context:ctx.at(start),confidence:'Review Suggested',reviewSuggested:true,reviewKind:'grouped-semicolon',checkId:'lcb-grouped-semicolon-review',conflict:false,matchesPrimary:false,message,evidenceStart:range.start,evidenceEnd:end,groupedSeriesEvidence:{evidenceStart:range.start,evidenceEnd:end,text:doc.text.slice(range.start,end),introducer:{start:range.start,end:start,text:doc.text.slice(range.start,start)},groups,candidateConjunctions:candidates,role:'Group level and parallel structure unresolved'},...(owner?{ownedByPunctuationReview:{start:owner.start,end:owner.end,checkId:owner.checkId}}:{}),references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:6,guidePrintedPage:String(references.lcb.pages[5].printedPage),rule:'Punctuation: Semicolons',preferred:null,ruleText:'Semicolons are often used to separate several series containing commas. The final semicolon should be placed before the final “and” before the last series.'},{guideId:'gpo',guideName:'GPO Style Manual',guidePage:233,guidePrintedPage:String(references.gpo.pages[232].printedPage),rule:'8.148',preferred:null,ruleText:'GPO8.148 uses semicolons to separate clauses containing commas and its grouped example places a semicolon before the final and.'}]});
 }return issues;
}
export function restoreGroupedSeriesEvidence(e,map,text){
 const restore=r=>{const start=map(r.start),end=map(r.end,true);return {...r,start,end,text:text.slice(start,end)};},evidenceStart=map(e.evidenceStart),evidenceEnd=map(e.evidenceEnd,true);
 return {...e,evidenceStart,evidenceEnd,text:text.slice(evidenceStart,evidenceEnd),introducer:restore(e.introducer),groups:e.groups.map(restore),candidateConjunctions:e.candidateConjunctions.map(restore)};
}
export function groupedSemicolonReviewIssues(doc,references,options={}){
 if(!references?.lcb?.pages?.[5]||!references?.gpo?.pages?.[232])return [];
 const view=styleWordDivisionView(doc,{preserveRemainingWords:true}),reviewDoc=view?.doc||doc,existing=options.existingIssues||[],found=withStyleContext(reviewDoc,()=>detector(reviewDoc,references,{...options,existingIssues:view?existing.map(i=>({...i,start:view.toView(i.start),end:view.toView(i.end)})):existing}));if(!view)return found;
 return view.restore(found).map(i=>{const e=restoreGroupedSeriesEvidence(i.groupedSeriesEvidence,view.toSource,doc.text),owner=i.ownedByPunctuationReview;return {...i,evidenceStart:e.evidenceStart,evidenceEnd:e.evidenceEnd,groupedSeriesEvidence:e,...(owner?{ownedByPunctuationReview:{...owner,start:view.toSource(owner.start),end:view.toSource(owner.end,true)}}:{})};});
}
