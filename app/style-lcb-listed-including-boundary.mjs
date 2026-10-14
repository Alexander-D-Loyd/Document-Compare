import {styleContext,withStyleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
import {styleSingleQuoteRanges} from './style-single-quote-ranges.mjs';
import {styleWordDivisionView} from './style-word-divisions.mjs';

export const LCB_LISTED_INCLUDING_BOUNDARY_SCOPE='LCB7 prints the complete phrase “, including, but not limited to,” with an initial comma. This selected check requires an intact finite agency/board/department/commission/committee/court subject with list/include/provide/cover/require/retain verb, or explicit shall/must/may/will plus that base verb, immediately followed by a selected plural list head and the complete including/but/not/limited/to phrase. A selected complete lowercase item noun and intact continuation establish list-role evidence. Only a missing initial comma is eligible; the whole selected head plus existing phrase supplies one correction, including its source-listed internal commas. Already compliant initial boundaries retain their existing internal-comma owner. Arbitrary including phrases, prepositional and sentence-heading uses, unknown clauses/roles, extended title names, tables, literals, bill-local quoted forms, complete original Unicode/source boundaries, source strikes and unknown exclusions remain protected. Recognized margins and interior page heads preserve physical source spans. No general English comma or inclusion intent is inferred.';
const verbs='list|include|provide|cover|require|retain';
const lead='(?:(?:[Tt]he\\s+)?(?:agency|board|department|commission|committee|court)\\s+(?:lists|includes|provides|covers|requires|retains)|(?:shall|must|may|will)\\s+(?:'+verbs+'))';
const heads='items|services|persons|providers|activities|programs|costs|fees|records|documents|benefits|payments|duties|requirements|functions|expenses';
const itemHeads='fees|costs|persons|providers|services|records|documents|benefits|payments|programs|activities|expenses|duties|functions|requirements|permits|licenses|applications|reports|schools|hospitals|clinics';
const pattern=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])(?<lead>'+lead+')\\s+(?<head>'+heads+')(?![\\p{L}\\p{N}\\p{M}_])\\s+(?<phrase>including,?\\s+but\\s+not\\s+limited\\s+to,?)\\s+(?<item>'+itemHeads+')(?![\\p{L}\\p{N}\\p{M}_])','gu');
const continuation=/^\s*(?:[.;:!?)]|$)|^\s*,\s*(?:and|or|nor)\s+[a-z]|^\s+(?:and|or|nor|that|which|for|of|under|with|without|in|by|from|are|were|shall|must|may|will)\b/u;
function detector(doc,references){
 const ctx=styleContext(doc),blocked=styleEvidenceGuard(doc,ctx),quoted=billQuotedTermProtection(doc,ctx),originalContext=originalBodyStyleContext(doc),original=originalContext?.source||ctx.source,singleQuotes=[...styleSingleQuoteRanges(ctx.source),...(originalContext?styleSingleQuoteRanges(original):[])],issues=[];
 for(const m of ctx.source.matchAll(pattern)){
  const evidenceStart=m.index,start=evidenceStart+m[0].indexOf(m.groups.head,m.groups.lead.length),phraseStart=start+m.groups.head.length+ctx.source.slice(start+m.groups.head.length).match(/^\s+/u)[0].length,end=phraseStart+m.groups.phrase.length,itemStart=evidenceStart+m[0].lastIndexOf(m.groups.item),itemEnd=itemStart+m.groups.item.length,cue=continuation.exec(ctx.source.slice(itemEnd));
  if(!cue)continue;const evidenceEnd=itemEnd+cue[0].length;
  if(ctx.at(start)==='Heading'||cutsOriginalStyleWord(doc,evidenceStart)||cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,end)||cutsOriginalStyleWord(doc,itemEnd)||cutsOriginalStyleWord(doc,evidenceEnd)||blocked(evidenceStart,evidenceEnd)||originalContext?.literalAt(evidenceStart,evidenceEnd)||singleQuotes.some(r=>r.start<evidenceEnd&&r.end>evidenceStart))continue;
  // Original adjacent source supplies negative guards only. Deleting a
  // title-like prefix or phrase extension cannot create eligible list prose.
  const before=original.slice(Math.max(0,evidenceStart-180),evidenceStart),after=original.slice(itemEnd);
  const digestBoundary=ctx.at(start)==='Digest'&&/LEGISLATIVE\s+COUNSEL[’']S\s+DIGEST\s*$/iu.test(before);
  if(/[A-Z][\p{L}\p{M}’'-]*\s+$/u.test(before)&&!/[.!?]\s*$/u.test(before)&&!digestBoundary||/^\s+(?:(?:of|for|the|and|in|on)\s+){0,2}[A-Z][\p{L}\p{M}’'-]*/u.test(after)||/[-\u2010-\u2015/:\\#@]/u.test(doc.text[evidenceStart-1]||'')||/^[-\u2010-\u2015/:\\#@]|^\.\d/u.test(doc.text.slice(itemEnd)))continue;
  const headText=doc.text.slice(start,start+m.groups.head.length),issue={start,end,text:doc.text.slice(start,end),suggestion:headText+', including, but not limited to,',evidenceStart,evidenceEnd,guideId:'lcb',guidePage:7,guidePrintedPage:references.lcb.pages[6].printedPage,rule:'Punctuation: Listed including boundary',category:'Punctuation',context:ctx.at(start),checkId:'lcb-listed-including-boundary',reviewSuggested:false,conflict:false,includingBoundaryEvidence:{evidenceStart,evidenceEnd,headStart:start,headEnd:start+m.groups.head.length,phraseStart,phraseEnd:end,itemStart,itemEnd,sourceText:doc.text.slice(evidenceStart,evidenceEnd),printedForm:', including, but not limited to,',sourcePage:7},message:'LCB page7 prints “, including, but not limited to,”. This intact selected list construction lacks the initial comma before including. Compare the complete printed punctuation pattern; unknown inclusion intent and grammatical roles remain manual.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:7,guidePrintedPage:references.lcb.pages[6].printedPage,rule:'Punctuation: Listed including boundary',preferred:headText+', including, but not limited to,',ruleText:', including, but not limited to,'}]};
  if(!quoted(issue))issues.push(issue);
 }
 return issues;
}
export function restoreListedIncludingBoundaryEvidence(issue,toSource,sourceText){
 const e=issue.includingBoundaryEvidence;if(!e)return issue;
 const restored={...e};for(const key of ['evidenceStart','headStart','phraseStart','itemStart'])restored[key]=toSource(e[key]);for(const key of ['evidenceEnd','headEnd','phraseEnd','itemEnd'])restored[key]=toSource(e[key],true);
 if(typeof sourceText==='string')restored.sourceText=sourceText.slice(restored.evidenceStart,restored.evidenceEnd);
 return {...issue,evidenceStart:restored.evidenceStart,evidenceEnd:restored.evidenceEnd,includingBoundaryEvidence:restored};
}
export function lcbListedIncludingBoundaryIssues(doc,references){
 if(!references?.lcb?.pages?.[6])return [];
 const view=styleWordDivisionView(doc),reviewDoc=view?.doc||doc,found=withStyleContext(reviewDoc,()=>detector(reviewDoc,references));
 return view?view.restore(found).map(i=>restoreListedIncludingBoundaryEvidence(i,view.toSource,doc.text)):found;
}
