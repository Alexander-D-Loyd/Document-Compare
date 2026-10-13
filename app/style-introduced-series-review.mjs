import {styleContext,withStyleContext}from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext}from './style-evidence.mjs';
import {introducedListRanges}from './style-introduced-lists.mjs';
import {PUNCTUATION_LIST_INTRODUCERS,splitListCommas}from './style-list-phrases.mjs';
import {styleWordDivisionView}from './style-word-divisions.mjs';
import {styleSingleQuoteRanges}from './style-single-quote-ranges.mjs';
import {sourceNameRanges}from './style-source-names.mjs';
import {canonicalWrittenValue}from './style-cardinal-values.mjs';

export const INTRODUCED_SERIES_REVIEW_SCOPE='Explicitly introduced comma-separated passages with one final and/or/nor, at least three complete candidate items and a missing final serial comma receive conditional reader review without an item-word or source-length cap. Unfamiliar phrases and clauses are possible parallel items, not proven grammatical roles. Complete introducer, item and conjunction source witnesses survive recognized word/page divisions. Existing precise punctuation keeps conjunction ownership; an existing conditional series question can gain the complete introduced context without changing its navigation key. Independent word, numeral and offline noun-modifier findings remain visible. Correct final commas, two-item pairs, multiple/embedded conjunctions, mixed preposition/conditional item starters, recognized finite-predicate continuations, mixed embedded provides/states/requires that-if qualifications, selected participial qualifications and named components across the conjunction, recognized qualifying binary pairs, complete pure scalar/letter groups, known source-record names, quotations including removed enclosing literals, tables, headings, strikes, unknown source exclusions and partial Unicode/compound words remain protected. Unknown names are not authenticated or edited. No comma replacement, parallelism or legal scope is asserted. Nonintroduced long phrases, unsupported punctuation, nested alternatives, mixed starter roles, other incidental qualifications, general clause parsing and all intended roles remain manual; this is not whole serial-comma automation.';
const overlaps=(rows,start,end)=>rows.some(r=>r.start<end&&r.end>start);
const pureScalar=s=>canonicalWrittenValue(s)!==null||/^[A-Za-z]$/.test(s)||/^[+−-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?(?:\s*%|\s*[:/⁄]\s*\d+)?$/.test(s);
const binaryDescriptors=new Set(['public private','private public','oral written','written oral','state federal','federal state','civil criminal','criminal civil','express implied','implied express','temporary permanent','permanent temporary','single multiple','multiple single']);
const dependentStarter=/^(?:as|at|by|during|for|from|in|of|on|to|with|without|before|after|until|since|unless|if|when|while|where|which|that|because|although|except)\b/i;
const finiteContinuation=/^(?:shall|must|may|will|should|is|are|was|were|either|neither|regardless)\b/i;
const embeddedConditional=/(?<![\p{L}\p{N}\p{M}_])(?:provides?|states?|requires?)\s+that\s+if(?![\p{L}\p{N}\p{M}_])/iu;
const pastAtom='(?:[a-z]+ed|[a-z]+en|sold|built|made|given|taken|sent|held|kept|paid|read|set|written|grown|known|shown|sworn)';
const qualification=new RegExp('^'+pastAtom+'\\s+(?:as|at|by|during|for|from|in|of|on|to|with|without)\\b','i'),barePast=new RegExp('^'+pastAtom+'$','i');
function detector(doc,references,{existingIssues=[]}={}){
 const ctx=styleContext(doc),source=ctx.source,blocked=styleEvidenceGuard(doc,ctx),issues=[];let literals=null,names=null;
 for(const range of introducedListRanges(source,PUNCTUATION_LIST_INTRODUCERS)){
  const start=range.listStart,end=range.end-source.slice(start,range.end).match(/\s*$/u)[0].length,text=source.slice(start,end),joins=[...text.matchAll(/(?<![\p{L}\p{N}\p{M}_])(?:and|or|nor)(?![\p{L}\p{N}\p{M}_])/giu)];
  if(joins.length!==1)continue;
  const join=joins[0],left=text.slice(0,join.index).trimEnd(),right=text.slice(join.index+join[0].length).trim(),parts=splitListCommas(left).map(s=>s.trim()).concat(right),at=start+join.index;
  if(left.endsWith(',')||parts.length<3||splitListCommas(right).length!==1||parts.some(s=>!s||!/[A-Za-z\d]/.test(s))||parts.every(pureScalar)||binaryDescriptors.has(parts.slice(-2).join(' ').toLowerCase())||ctx.at(range.start)==='Heading'||cutsOriginalStyleWord(doc,range.start)||cutsOriginalStyleWord(doc,end)||/^[-\u00ad\u2010\u2011’']/u.test(doc.text.slice(end))||/[-\u00ad]\s*$/u.test(text)||blocked(range.start,end))continue;
  // One incidental qualification cannot establish additional list items.
  // Uniform starter wording is still only conditional, never a role proof.
  const starters=parts.map(p=>dependentStarter.exec(p)?.[0].toLowerCase()||null);if(starters.some(Boolean)&&!starters.every(s=>s===starters[0]))continue;
  // An embedded condition has its own comma and may end in a binary
  // alternative such as "the person or entity". Those fragments are not
  // evidence of three parallel series items. Uniform conditional candidate
  // clauses still retain their existing reader review without role inference.
  if(parts.some(p=>embeddedConditional.test(p))&&!parts.every(p=>embeddedConditional.test(p)))continue;
  if(parts.some(p=>finiteContinuation.test(p)))continue;
  if(parts.slice(1).some(p=>qualification.test(p))||parts.slice(1,-1).some(p=>barePast.test(p))&&qualification.test(right))continue;
  // A capitalized component on each side may be one continuous name, as in
  // a lower-case qualification ending with Department of Forestry and Fire
  // Protection. All-name comma groups remain conditional name-neutral leads.
  if(/[A-Z][A-Za-z]*\s*$/u.test(left)&&/^[A-Z]/u.test(right)&&parts.some(p=>!/^[A-Z]/u.test(p)))continue;
  if(existingIssues.some(i=>!i.reviewSuggested&&overlaps([i],at,at+join[0].length)&&(i.checkId==='semicolon-series'||/comma|semicolon/i.test(i.rule||''))))continue;
  if(literals===null){const original=originalBodyStyleContext(doc);literals=[...styleSingleQuoteRanges(source),...(original?[...original.literalRanges,...styleSingleQuoteRanges(original.source)]:[])];names=[...sourceNameRanges(source),...(original?sourceNameRanges(original.source):[])];}
  if(overlaps(literals,range.start,end)||overlaps(names,range.start,end))continue;
  let cursor=0;const leftParts=splitListCommas(text.slice(0,join.index)),items=leftParts.map(p=>{const a=start+cursor+p.match(/^\s*/u)[0].length,b=start+cursor+p.length-p.match(/\s*$/u)[0].length;cursor+=p.length+1;return {start:a,end:b,text:doc.text.slice(a,b)};});
  const rightStart=at+join[0].length+text.slice(join.index+join[0].length).match(/^\s*/u)[0].length;items.push({start:rightStart,end,text:doc.text.slice(rightStart,end)});
  const owner=existingIssues.find(i=>i.checkId==='lcb-series-punctuation-review'&&i.reviewSuggested&&i.suggestion===null&&overlaps([i],at,at+join[0].length));
  issues.push({start,end,text:doc.text.slice(start,end),suggestion:null,guideId:'lcb',guidePage:6,guidePrintedPage:String(references.lcb.pages[5].printedPage),rule:'Punctuation: Introduced Series Review',category:'Series Punctuation Review',context:ctx.at(start),confidence:'Review Suggested',reviewSuggested:true,reviewKind:'introduced-series',checkId:'lcb-introduced-series-review',conflict:false,matchesPrimary:false,evidenceStart:range.start,evidenceEnd:end,message:'Review Suggested: This explicitly introduced passage has '+items.length+' complete comma-separated phrase or clause candidates and no comma before the final “'+join[0]+'”. If these are parallel items at the same level, LCB and GPO call for that comma. The conjunction may instead belong inside a qualified item or clause. Check the complete passage before editing; no grammatical role, parallelism or replacement has been selected.',introducedSeriesEvidence:{evidenceStart:range.start,evidenceEnd:end,text:doc.text.slice(range.start,end),introducer:{start:range.start,end:start,text:doc.text.slice(range.start,start)},items,conjunction:{start:at,end:at+join[0].length,text:doc.text.slice(at,at+join[0].length)},role:'Parallel items and conjunction level unresolved'},...(owner?{ownedByPunctuationReview:{start:owner.start,end:owner.end,checkId:owner.checkId}}:{}),references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:6,guidePrintedPage:String(references.lcb.pages[5].printedPage),rule:'Punctuation: Commas',preferred:null,ruleText:'Use a comma before “and,” “or,” or “nor” when these conjunctions precede the last of a series of three or more words, phrases, letters, or figures.'},{guideId:'gpo',guideName:'GPO Style Manual',guidePage:216,guidePrintedPage:String(references.gpo.pages[215].printedPage),rule:'8.46',preferred:null,ruleText:'After each member within a series of three or more words, phrases, letters, or figures used with and, or, or nor.'}]});
 }return issues;
}
export function restoreIntroducedSeriesEvidence(e,map,text){
 const restore=r=>{const start=map(r.start),end=map(r.end,true);return {...r,start,end,text:text.slice(start,end)};},evidenceStart=map(e.evidenceStart),evidenceEnd=map(e.evidenceEnd,true);
 return {...e,evidenceStart,evidenceEnd,text:text.slice(evidenceStart,evidenceEnd),introducer:restore(e.introducer),items:e.items.map(restore),conjunction:restore(e.conjunction)};
}
export function introducedSeriesReviewIssues(doc,references,options={}){
 if(!references?.lcb?.pages?.[5]||!references?.gpo?.pages?.[215])return [];
 const view=styleWordDivisionView(doc,{preserveRemainingWords:true}),reviewDoc=view?.doc||doc,existing=options.existingIssues||[],found=withStyleContext(reviewDoc,()=>detector(reviewDoc,references,{...options,existingIssues:view?existing.map(i=>({...i,start:view.toView(i.start),end:view.toView(i.end)})):existing}));if(!view)return found;
 return view.restore(found).map(i=>{const e=restoreIntroducedSeriesEvidence(i.introducedSeriesEvidence,view.toSource,doc.text),owner=i.ownedByPunctuationReview;return {...i,evidenceStart:e.evidenceStart,evidenceEnd:e.evidenceEnd,introducedSeriesEvidence:e,...(owner?{ownedByPunctuationReview:{...owner,start:view.toSource(owner.start),end:view.toSource(owner.end,true)}}:{})};});
}
