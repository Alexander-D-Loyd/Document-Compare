import {styleContext,withStyleContext}from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext}from './style-evidence.mjs';
import {styleWordDivisionView}from './style-word-divisions.mjs';
import {writtenCardinalRuns,writtenQuantityEvidenceGuard}from './style-written-quantity-evidence.mjs';
import {canonicalWrittenValue}from './style-cardinal-values.mjs';
import {andCardinalParts}from './style-compound-cardinals.mjs';
import {numericExpressionGuard}from './style-numeric-expression-evidence.mjs';
import {exactIntegerParts,exceedsSafeInteger}from './style-exact-integer-digits.mjs';
import {numeralIdentifierRanges}from './style-numeral-identifiers.mjs';
import {sourceNameRanges}from './style-source-names.mjs';
import {styleSingleQuoteRanges}from './style-single-quote-ranges.mjs';

export const REPEATED_COUNT_PHRASE_SCOPE='Whole identical lowercase multiword phrases repeated after contiguous canonical counts supply conditional LCB21 Bill item3 / GPO12.5 relationship review. Multiple and unfamiliar qualifiers, long phrases and many repeated members have no fixed qualifier vocabulary, phrase-word or source-length cap. A count of 10 or more supplies a threshold cue; smaller written counts receive one reader question each only when another check does not own them. Canonical large integer figures retain their exact digit strings instead of passing through unsafe floating-point values. Whole counts, repeated phrases, connectors and selected final boundaries are source witnesses, restored through recognized word/page divisions. Repetition is not proof of noun role or the same numerical expression; no replacement is selected. Different phrase/qualifier/explicit per-unit wording, all-small or already figured counts, sentence openings, Digest conflicts, identifiers, names, quotations including removed enclosures, tables, strikes, unknown exclusions, partial original words and numeric fragments stay protected. Existing precise and conditional findings retain ownership. Shared unstated heads, intervening counts/clauses, nested conjunctions, unfamiliar final boundaries, compound meanings and noncontiguous relationships remain for other selected methods or manual review; this is not full numerical or noun-role automation.';
const overlaps=(rows,start,end)=>rows.some(r=>r.start<end&&r.end>start),normalize=s=>s.replace(/\s+/gu,' ').trim();
const word="\\p{Ll}[\\p{Ll}\\p{M}]*(?:[-’']\\p{Ll}[\\p{Ll}\\p{M}]*)*",phrase=word+'(?:\\s+'+word+')+';
const bridgePattern=new RegExp('^\\s+(?<phrase>'+phrase+')(?<connector>\\s*,\\s*(?:(?:and|or)\\s+)?|\\s+(?:and|or|to|through)\\s+)$','u');
const functionStart=/^(?:and|or|nor|to|of|in|for|by|at|per|is|are|was|were|shall|must|may|will|can|would|could|should|that|which|unless|if|when|while)\b/u;
const identifierPrefix=/\b(?:sections?|subsections?|articles?|chapters?|parts?|divisions?|paragraphs?|subparagraphs?|subdivisions?|items?|schedules?|grades?|figures?|tables?|forms?|pages?|lines?)\s*$/iu;
const boundary=/^\s*(?:[.,;:!?)]|$)|^\s+(?:and|or|of|in|for|by|at|from|with|under|as|shall|must|may|will|can|is|are|was|were|remain|remains|apply|applies|arrive|arrives|exist|exists|qualify|qualifies|participate|participates|receive|receives|require|requires)\b/u;
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function countAtoms(doc,ctx,numeric,written){
 const atoms=[],source=ctx.source;
 for(const m of source.matchAll(/(?<![\p{L}\p{N}\p{M}_])\d+(?:,\d{3})*(?![\p{L}\p{N}\p{M}_])/gu)){
  const p=m[0]==='0'?{digits:'0'}:exactIntegerParts(m[0]),start=m.index,end=start+m[0].length;if(!p||numeric(start,end))continue;
  atoms.push({start,end,text:m[0],figure:true,value:exceedsSafeInteger(p.digits)?null:Number(p.digits),atLeastTen:p.digits.length>1,exactSourceInteger:p.digits});
 }
 const scaled=new Map(andCardinalParts(source).map(r=>[r.start,r]));
 for(const r of writtenCardinalRuns(source)){
  const text=source.slice(r.start,r.end),scale=scaled.get(r.start),value=scale?.value??canonicalWrittenValue(text);
  if(scale&&scale.value===null||value===null||written(r.start,r.end))continue;
  atoms.push({...r,text,figure:false,value,atLeastTen:value>=10});
 }return atoms.sort((a,b)=>a.start-b.start||a.end-b.end);
}
function detector(doc,references,{existingIssues=[]}={}){
 const ctx=styleContext(doc),source=ctx.source,blocked=styleEvidenceGuard(doc,ctx),numeric=numericExpressionGuard(doc,ctx),written=writtenQuantityEvidenceGuard(doc,ctx),atoms=countAtoms(doc,ctx,numeric,written),identifiers=numeralIdentifierRanges(source),out=[];let protection=null,group=[],links=[];
 const finish=()=>{
  if(group.length<2||!group.some(a=>a.atLeastTen)||!group.some(a=>!a.figure&&a.value>=1&&a.value<10))return;
  const label=links[0]?.label;if(!label||links.some(l=>l.label!==label)||functionStart.test(label)||/\b(?:and|or|nor)\b/u.test(label))return;
  const first=group[0],last=group.at(-1),matcher=new RegExp('^\\s+(?<phrase>'+label.split(' ').map(escape).join('\\s+')+')(?![\\p{L}\\p{N}\\p{M}_-])','u'),tail=matcher.exec(source.slice(last.end));if(!tail)return;
  const phraseStart=last.end+tail[0].indexOf(tail.groups.phrase),end=last.end+tail[0].length,closing=boundary.exec(source.slice(end));if(!closing||/^[-\u00ad\u2010\u2011’']/u.test(doc.text.slice(end)))return;
  const evidenceEnd=end+closing[0].length,sentence=ctx.sentenceAt(first.start),prefix=source.slice(sentence.start,first.start).replace(/^[\s“”"’']*(?:\([a-z\d]+\)\s*)*/iu,'').trim();
  if(!prefix||identifierPrefix.test(prefix)||/[+−-]\s*$/u.test(prefix)||/\b(?:minus|negative|positive|plus)\s*$/iu.test(prefix)||ctx.at(first.start)!=='Bill'||ctx.at(last.start)!=='Bill'||ctx.sentenceAt(last.start).start!==sentence.start||blocked(first.start,evidenceEnd)||cutsOriginalStyleWord(doc,first.start)||cutsOriginalStyleWord(doc,end)||cutsOriginalStyleWord(doc,evidenceEnd)||overlaps(identifiers,first.start,end))return;
  if(protection===null){const original=originalBodyStyleContext(doc);protection={original,literals:[...styleSingleQuoteRanges(source),...(original?[...original.literalRanges,...styleSingleQuoteRanges(original.source)]:[])],names:[...sourceNameRanges(source),...(original?sourceNameRanges(original.source):[])]};}
  if(overlaps(protection.literals,first.start,evidenceEnd)||overlaps(protection.names,first.start,evidenceEnd)||protection.original&&(!boundary.test(protection.original.source.slice(end))||identifierPrefix.test(protection.original.source.slice(sentence.start,first.start))))return;
  const phrases=[...links.map(l=>l.phrase),{start:phraseStart,end,text:doc.text.slice(phraseStart,end)}],members=group.map((a,n)=>({...a,sourceText:doc.text.slice(a.start,a.end),headStart:phrases[n].start,headEnd:phrases[n].end}));
  for(const atom of group){
   if(atom.figure||atom.value<1||atom.value>=10||overlaps(existingIssues,atom.start,atom.end))continue;
   const e={evidenceStart:first.start,evidenceEnd,text:doc.text.slice(first.start,evidenceEnd),phraseLabel:label,phrases,connectors:links.map(l=>l.connector),finalBoundary:{start:end,end:evidenceEnd,text:doc.text.slice(end,evidenceEnd)},role:'Repeated wording; noun role and numerical relationship unresolved'};
   out.push({start:atom.start,end:atom.end,text:doc.text.slice(atom.start,atom.end),suggestion:null,conditionalSuggestion:String(atom.value),guideId:'lcb',guidePage:21,guidePrintedPage:String(references.lcb.pages[20].printedPage),rule:'Numerals: Bill, item 3',category:'Numerical Relationship Review',context:'Bill',confidence:'Review Suggested',reviewSuggested:true,reviewKind:'repeated-count-phrase',checkId:'lcb-repeated-count-phrase-review',conflict:false,matchesPrimary:false,evidenceStart:first.start,evidenceEnd,repeatedCountEvidence:e,relationshipEvidence:{start:first.start,end:evidenceEnd,head:label,members},message:'Review Suggested: These counts repeat the complete phrase “'+label+'”, and one count is 10 or more. Repeated wording does not prove the same numerical expression or a noun role. If the counts are related, LCB and GPO call for figures, including “'+atom.value+'” here; different expressions keep their own treatment. Preserve the full quantities and verify their relationship before editing. No replacement is selected.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:21,guidePrintedPage:String(references.lcb.pages[20].printedPage),rule:'Numerals: Bill, item 3',preferred:null,ruleText:'When 2 or more numbers appear in a sentence and one of them is 10 or larger, figures are used for each number, unless they are of different numerical expressions.'},{guideId:'gpo',guideName:'GPO Style Manual',guidePage:287,guidePrintedPage:String(references.gpo.pages[286].printedPage),rule:'12.5',preferred:null,ruleText:'Related numbers in the same sentence use figures when one is 10 or more; different numerical expressions retain their own treatment.'}]});
  }
 };
 for(const atom of atoms){const prior=group.at(-1),m=prior&&bridgePattern.exec(source.slice(prior.end,atom.start));let link=null;
  if(m){const start=prior.end+m[0].indexOf(m.groups.phrase),end=start+m.groups.phrase.length;link={label:normalize(m.groups.phrase),phrase:{start,end,text:doc.text.slice(start,end)},connector:{start:end,end:atom.start,text:doc.text.slice(end,atom.start)}};}
  if(!prior){group=[atom];continue;}if(!link||links.length&&link.label!==links[0].label){finish();group=[atom];links=[];continue;}links.push(link);group.push(atom);
 }finish();return out;
}
export function restoreRepeatedCountEvidence(e,map,text){const restore=r=>{const start=map(r.start),end=map(r.end,true);return {...r,start,end,text:text.slice(start,end)};},evidenceStart=map(e.evidenceStart),evidenceEnd=map(e.evidenceEnd,true);return {...e,evidenceStart,evidenceEnd,text:text.slice(evidenceStart,evidenceEnd),phrases:e.phrases.map(restore),connectors:e.connectors.map(restore),finalBoundary:restore(e.finalBoundary)};}
export function repeatedCountPhraseReviewIssues(doc,references,options={}){
 if(!references?.lcb?.pages?.[20]||!references?.gpo?.pages?.[286])return [];const view=styleWordDivisionView(doc,{preserveRemainingWords:true}),reviewDoc=view?.doc||doc,existing=options.existingIssues||[],found=withStyleContext(reviewDoc,()=>detector(reviewDoc,references,{...options,existingIssues:view?existing.map(i=>({...i,start:view.toView(i.start),end:view.toView(i.end)})):existing}));if(!view)return found;
 return view.restore(found).map(i=>{const e=restoreRepeatedCountEvidence(i.repeatedCountEvidence,view.toSource,doc.text),r=i.relationshipEvidence;return {...i,evidenceStart:e.evidenceStart,evidenceEnd:e.evidenceEnd,repeatedCountEvidence:e,relationshipEvidence:{...r,start:view.toSource(r.start),end:view.toSource(r.end,true),members:r.members.map(m=>{const start=view.toSource(m.start),end=view.toSource(m.end,true);return {...m,start,end,sourceText:doc.text.slice(start,end),headStart:view.toSource(m.headStart),headEnd:view.toSource(m.headEnd,true)};})}};});
}
