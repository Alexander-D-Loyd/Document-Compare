import {selectedEntityAuthority} from './style-selected-entity-authority.mjs';
import {californiaEntityReview} from './style-california-entities.mjs';
import {styleContext,withStyleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord} from './style-evidence.mjs';
import {styleSingleQuoteRanges} from './style-single-quote-ranges.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
import {styleWordDivisionView} from './style-word-divisions.mjs';
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const overlap=(rows,a,b)=>rows.some(r=>r.start<b&&r.end>a);
const pattern=name=>name.split(/\s+/u).map(s=>escape(s).replace(/[’']/gu,"[’']")).join('\\s+');

// Registry eligibility remains immutable. A reader question about an excluded
// name is not permission to capitalize it or reinterpret a source template.
export function lcbEntitySourceReviewIssues(doc,references,{existingIssues=[],entityAuthority=null}={}){
 if(!references?.lcb?.pages?.find(p=>p.page===17))return [];
 const selected=selectedEntityAuthority(entityAuthority),view=styleWordDivisionView(doc,{preserveRemainingWords:true}),d=view?.doc||doc;
 const prior=view?existingIssues.map(i=>({...i,start:view.toView(i.start),end:view.toView(i.end)})):existingIssues;
 const issues=withStyleContext(d,()=>review(d,references,selected,prior,entityAuthority));
 return view?view.restore(issues):issues;
}
function review(doc,references,selected,existingIssues,entityAuthority){
 const ctx=styleContext(doc),source=ctx.source,blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx),quoted=billQuotedTermProtection(doc,ctx),single=styleSingleQuoteRanges(source),registered=californiaEntityReview(doc,references,{entityAuthority}).ranges,issues=[];
 const eligible=(a,b,entry)=>!blocked(a,b)&&!literal(a,b)&&!quoted({start:a,end:b})&&!cutsOriginalStyleWord(doc,a)&&!cutsOriginalStyleWord(doc,b)&&ctx.at(a)!=='Heading'&&!overlap(single,a,b)&&!overlap(existingIssues,a,b)&&!registered.some(r=>r.start<b&&r.end>a&&(!entry||r.start<=a&&r.end>=b))&&!overlap(issues,a,b);
 const add=(start,end,entry,reason,kind)=>{
  if(!eligible(start,end,entry)||source.slice(start,end)===source.slice(start,end).toUpperCase())return;
  const sourceName=entry?.name||null;
  issues.push({start,end,text:doc.text.slice(start,end),matchText:source.slice(start,end).replace(/\s+/gu,' '),suggestion:null,guideId:'lcb',guidePage:17,guidePrintedPage:String(references.lcb.pages.find(p=>p.page===17).printedPage),rule:'Capitalization, item 7: entity source review',category:'Entity Source Review',context:ctx.at(start),confidence:'Review Suggested',reviewSuggested:true,reviewKind:kind,checkId:'lcb-entity-source-review',conflict:false,matchesPrimary:false,entitySource:{file:selected.source.file||selected.source.inputFile,sha256:selected.source.sha256||selected.source.datasetId,sourceName,citation:entry?.citation||'',annotation:entry?.annotation||'',checkEligible:entry?.checkEligible??null},message:'Review Suggested: '+reason+(entry?' The selected California Entities source lists “'+entry.name+'”'+(entry.citation?' ('+entry.citation+')':'')+'.':'')+' Confirm the intended entity and its complete name in context. A snapshot may contain historical entries; an unlisted or different name is not an error. No replacement has been selected.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:17,guidePrintedPage:String(references.lcb.pages.find(p=>p.page===17).printedPage),rule:'Capitalization, items 1 and 7',preferred:null,ruleText:'Capitalize the complete title of an agency and verify entities with the California Entities list on the OLC Intranet.'}]});
 };
 for(const entry of selected.entries.filter(e=>!e.checkEligible)){
  const variants=[{text:entry.name,reason:'This source entry is not eligible for an automatic exact-name correction.'}];
  // These are printed index inversions, not newly invented official names.
  // Recognize their prose order for a question while retaining the original
  // entry and its ineligible status as the authority witness.
  const inverted=/^(.+), (.+\bof the)$/u.exec(entry.name);
  if(inverted)variants.push({text:inverted[2]+' '+inverted[1],reason:'This passage resembles the prose order of an inverted source index entry; identity and capitalization need confirmation.'});
  const abbreviation=/^(.+) \([A-Z]+\)$/u.exec(entry.name);
  if(abbreviation)variants.push({text:abbreviation[1],reason:'The source entry includes a parenthetical abbreviation; the complete name and identity need confirmation.'});
  for(const variant of variants){
   if(/[\[\]]/u.test(variant.text))continue;
   const regex=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_-])'+pattern(variant.text)+'(?![\\p{L}\\p{N}\\p{M}_-])','giu');
   for(const m of source.matchAll(regex))add(m.index,m.index+m[0].length,entry,variant.reason,'ineligible-entity-entry');
  }
  if(entry.name.includes('[name of region]')){
   const prefix=entry.name.slice(0,entry.name.indexOf('[name of region]')).trim();
   const regex=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_-])'+pattern(prefix)+'[ \\t]*(?:\\[name of region\\]|[\\p{L}\\p{M}]+(?:[ \\t]+[\\p{L}\\p{M}]+)*?)(?=[ \\t]+(?:shall|must|may|will|would|should|is|are|was|were|has|have)\\b|[.;:]|$)','giu');
   for(const m of source.matchAll(regex))add(m.index,m.index+m[0].length,entry,'The source contains a region-name template, rather than a complete individually verified name.','entity-template');
  }
 }
 // A complete explicit institutional construction is enough to ask for
 // verification, not enough to establish registry identity. No fuzzy distance,
 // suggested nearest name, or absent-list error is used.
 const clause='shall|must|may|will|would|should|is|are|was|were|has|have|from|when|while|which|whose|who|that|because|before|after|if|unless|pursuant|under|requires|provides|receives|includes|considers';
 const token="[\\p{L}\\p{M}][\\p{L}\\p{M}’'-]*";
 const unlisted=new RegExp('\\b(?:Department|Bureau|Office|Division|Board|Commission|Council|Committee|Agency|Authority|Director|Secretary|Superintendent)\\s+of\\s+(?:the\\s+)?'+token+'(?:\\s+(?!(?:'+clause+')\\b)'+token+'){0,11}?(?=\\s+(?:'+clause+')\\b|[,.;:]|$)','giu');
 for(const m of source.matchAll(unlisted)){
  const start=m.index,end=start+m[0].length;
  // A lower-case demonstrative/quantifier after of identifies a referring
  // complement, not a new complete institutional title (Committee of this
  // action). Retain differently cased potential names for source review.
  if(/^[\p{L}]+\s+of\s+(?:the\s+)?(?:this|that|these|those|each|any|both|such)\b/u.test(m[0]))continue;
  // A recognized longer name must not be asked about again as its suffix.
  add(start,end,null,'This institutional wording has not been established as a complete eligible name in the selected source. Verify whether it is an official title, a description, or a newly created entity.','unresolved-entity-name');
 }
 const suffix=/\b(?!(?:The|A|An|This|That|These|Those|Existing|Under|Pursuant|When|If|Each|Any|All|Some|Both)\b)(?:[Cc]alifornia|[Ss]tate|\p{Lu}[\p{L}\p{M}’'-]+)(?:\s+[\p{L}\p{M}][\p{L}\p{M}’'-]*){0,9}?\s+(?:Agency|Authority|Board|Bureau|Commission|Council|Committee|Conservancy|Department|District|Institute|Office)(?=\s+(?:shall|must|may|will|would|should|is|are|was|were|has|have)\b|[,.;:]|$)/gu;
 for(const m of source.matchAll(suffix))if(!new RegExp('\\b(?:'+clause+')\\b','iu').test(m[0]))add(m.index,m.index+m[0].length,null,'This apparent institutional title has not been established as a complete eligible name in the selected source. Its capitalization alone does not prove official identity.','unresolved-entity-name');
 return issues.sort((a,b)=>a.start-b.start||a.end-b.end);
}
