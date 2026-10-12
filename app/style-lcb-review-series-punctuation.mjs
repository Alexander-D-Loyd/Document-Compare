import {styleContext,withStyleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord} from './style-evidence.mjs';
import {styleWordDivisionView} from './style-word-divisions.mjs';
import {sourceNameRanges} from './style-source-names.mjs';
import {canonicalWrittenValue} from './style-cardinal-values.mjs';
import {PUNCTUATION_LIST_INTRODUCERS,simplePunctuationWordSeries} from './style-list-phrases.mjs';

export const LCB_UNFAMILIAR_SERIES_REVIEW_SCOPE='Unfamiliar lower-case comma-separated word series and bounded phrases after explicit list introducers receive reader-review triggers when a final and/or/nor lacks its serial comma. No grammatical-role or comma correction is asserted. Whole list selections retain every source word, connector and recognized word division; existing precise checks retain precedence. Already punctuated series, two-item pairs, nested LCB alternatives, known qualifying binary descriptor pairs, canonical numerical/letter groups, source names, literals, tables, headings, source strikes and unknown excluded evidence remain protected. Complex embedded lists, arbitrary clauses, legal scope and all grammatical roles still require reader judgment.';
const atom='[a-z]+(?:-[a-z]+)*';
const word=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])(?<list>'+atom+'(?:,\\s*'+atom+')+\\s+(?<join>and|or|nor)\\s+'+atom+')(?![\\p{L}\\p{N}\\p{M}_])','gu');
const phraseAtom='(?!(?:and|or|nor|that|which|shall|must|may|will|should|is|are|was|were|remain|remains|apply|applies|require|requires|provide|provides|include|includes|including|contains|receives|retains|submits)\\b)'+atom;
const phrase=phraseAtom+'(?:\\s+'+phraseAtom+'){0,7}';
const reviewIntroducers='(?:'+PUNCTUATION_LIST_INTRODUCERS+'|(?:receives?|receiving|provides|providing|requests|requesting|retains|retaining|submits|submitting|collects|collecting|requires|requiring))';
const introduced=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])'+reviewIntroducers+'\\s+(?<list>'+phrase+'(?:,\\s*'+phrase+')+\\s+(?<join>and|or|nor)\\s+'+phrase+')(?=\\s*(?:[.;:!?)]|$)|\\s+(?:that|which|shall|must|may|will|should|is|are|was|were|remain|remains|apply|applies|require|requires|provide|provides)\\b)','giu');
const binaryDescriptors=new Set(['public private','private public','oral written','written oral','state federal','federal state','civil criminal','criminal civil','express implied','implied express','temporary permanent','permanent temporary','single multiple','multiple single']);
const functionWords=new Set('and or nor not in on of at by to for as with without before after until since unless although because if when while whether upon than then both either neither'.split(' '));
const overlap=(rows,start,end)=>rows.some(r=>r.start<end&&r.end>start);
function detector(doc,references,existing){
 const ctx=styleContext(doc),source=ctx.source,blocked=styleEvidenceGuard(doc,ctx),names=sourceNameRanges(source),singleQuotes=[...source.matchAll(/‘[^’]*’|(?<![\p{L}\p{N}\p{M}_])'[^'\n]*'/gu)].map(m=>({start:m.index,end:m.index+m[0].length})),candidates=[],issues=[];
 for(const pattern of [introduced,word])for(const m of source.matchAll(pattern)){
  const start=m.index+m[0].indexOf(m.groups.list),join=/\s+(and|or|nor)\s+([^,]+)$/.exec(m.groups.list);let end=start+m.groups.list.length;if(!join)continue;
  const items=m.groups.list.slice(0,join.index).split(',').map(p=>p.trim()).concat(join[2].trim());
  if(pattern===word&&items.some(i=>functionWords.has(i)))continue;
  if(items.every(i=>canonicalWrittenValue(i)!==null)){
   const head=/^\s+(?<head>[a-z]+)(?=\s*(?:[.;:!?)]|$))/.exec(source.slice(end));
   if(!head||/^(?:apply|applies|remain|remains|is|are|was|were|and|or|nor)$/.test(head.groups.head))continue;
   end+=head[0].length;
  }
  if(pattern===word){
   const qualifier=/^\s+(?:by|in|for|with|from|of|on|at|during|after|before|each|every|per)\b(?:\s+[\p{L}\p{M}'’\u2010-\u2015-]+){1,12}(?=\s*(?:[.;:!?)]|$))/iu.exec(source.slice(end));
   if(qualifier)end+=qualifier[0].length;
  }
  if(items.length<3||items.some(i=>!i)||ctx.at(start)==='Heading'||cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,end)||blocked(start,end)||overlap(names,start,end)||overlap(singleQuotes,start,end)||overlap(existing,start,end))continue;
  if(pattern===word&&!/^\s*(?:[.;:!?)]|$)|^\s+(?:that|which|shall|must|may|will|should|is|are|was|were|remain|remains|apply|applies|require|requires|provide|provides)\b/i.test(source.slice(end)))continue;
  if(/^[-\u00ad]\s*\n/.test(source.slice(end))||/[-\u00ad]\s*\n\s*$/.test(source.slice(Math.max(0,start-180),start)))continue;
  // A following outer conjunction makes the inner alternative part of an
  // already punctuated list, as in LCB's 'one, two, three or four, and five'.
  if(/^\s*,\s*(?:and|or|nor)\b/i.test(source.slice(end)))continue;
  // Do not let a removed first item manufacture an independently full list.
  if(/,\s*$/.test(source.slice(Math.max(0,start-120),start)))continue;
  if(items.every(i=>/^[a-z]$/.test(i)))continue;
  if(items.length===3&&binaryDescriptors.has(items.slice(1).join(' ')))continue;
  if(candidates.some(c=>c.start<=start&&c.end>=end))continue;
  candidates.push({start,end,join:m.groups.join,items,phrase:pattern===introduced});
 }
 for(const c of candidates){
  const {start,end,join,items}=c,known=simplePunctuationWordSeries(items);
  // The finite precise checker may not have an introducer in this occurrence;
  // retaining the unresolved candidate still avoids claiming lexical meaning.
  issues.push({start,end,text:doc.text.slice(start,end),suggestion:null,guideId:'lcb',guidePage:6,guidePrintedPage:String(references.lcb.pages[5].printedPage),rule:'Punctuation: Commas',category:'Series Punctuation Review',context:ctx.at(start),checkId:'lcb-series-punctuation-review',confidence:'Review Suggested',reviewSuggested:true,reviewKind:'series-structure',conflict:false,matchesPrimary:false,message:'Review Suggested: This passage has '+items.length+' comma-separated word or phrase candidates and no comma before the final “'+join+'”. If these are three or more parallel items, LCB and GPO call for that comma. They may instead be a qualified item, clause, or nested alternative; verify the full passage before editing. No replacement has been selected.',seriesEvidence:{itemTexts:items,knownLexicalClass:known,explicitIntroducer:c.phrase},references:[{guideId:'lcb',guideName:'LCB Style Manual',rule:'Punctuation: Commas',guidePage:6,guidePrintedPage:String(references.lcb.pages[5].printedPage),preferred:null,ruleText:'Use a comma before “and,” “or,” or “nor” when these conjunctions precede the last of a series of three or more words, phrases, letters, or figures.'},{guideId:'gpo',guideName:'GPO Style Manual',rule:'8.46',guidePage:216,guidePrintedPage:String(references.gpo.pages[215].printedPage),preferred:null,ruleText:'After each member within a series of three or more words, phrases, letters, or figures used with and, or, or nor.'}]});
 }
 return issues.sort((a,b)=>a.start-b.start||a.end-b.end);
}
export function lcbUnfamiliarSeriesReviewIssues(doc,references,{existingIssues=[]}={}){
 if(!references?.lcb?.pages||!references?.gpo?.pages)return [];
 const view=styleWordDivisionView(doc),reviewDoc=view?.doc||doc,prior=view?existingIssues.map(i=>({...i,start:view.toView(i.start),end:view.toView(i.end)})):existingIssues;
 const found=withStyleContext(reviewDoc,()=>detector(reviewDoc,references,prior));return view?view.restore(found):found;
}
