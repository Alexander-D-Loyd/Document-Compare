import {possessiveTechnicalBoundaryBlocked} from './style-possessive-technical-boundaries.mjs';
import {styleContext,withStyleContext}from './style-context.mjs';
import {createNounQuantityReader}from './style-noun-quantities.mjs';
import {canonicalWrittenValue}from './style-cardinal-values.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext}from './style-evidence.mjs';
import {styleSingleQuoteRanges}from './style-single-quote-ranges.mjs';
import {styleWordDivisionView}from './style-word-divisions.mjs';
import {sourceNameRanges}from './style-source-names.mjs';

export const TIME_POSSESSIVE_REVIEW_SCOPE='Intact complete quantity/time-unit expressions including business/calendar/court/school/academic/consecutive/working day-unit qualifiers and source-listed schoolday(s), before a possible lower-case nominal head receive conditional review under LCB6 and GPO8.14 when no existing precise check owns that phrase. Selected intervening adjectives, including written and advance, retain the complete phrase without a modifier-count cap. Complete integer/grouped, decimal and canonical written counts, selected hundred/scale-and-remainder counts and several/many/multiple/both/few cues are supported. Every count, unit, modifier and candidate head remains required original evidence. Recognized word/page divisions preserve original selections. The following word is a possible head, not a proven grammatical role: no apostrophe or hyphen replacement is asserted. Four-digit calendar-year labels, existing possessives, common function/verb/temporal continuations, marked names, literal quotations, tables, headings, strikes, unknown exclusions, signed/fraction/range/currency notation and partial source words are protected. Original larger masked counts cannot establish a new suffix quantity. Broader nominal semantics, unfamiliar predicates, equivalent objective phrases, all temporal meanings and apostrophe-versus-unit-modifier choice remain reader judgments. This is selected contextual checking, not full possessive automation.';
const atom='[A-Za-z]+(?:[-’\'][A-Za-z]+)*';
const pattern=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])(?<qualifier>(?:(?:business|calendar|court|school|academic|consecutive|working)\\s+)?)(?<unit>schooldays?|days?|weeks?|months?|years?|hours?|minutes?)\\s+(?<first>'+atom+')(?![\\p{L}\\p{N}\\p{M}_])','giu');
const adjectives=new Set('written advance prior additional further annual paid unpaid actual full professional military medical reasonable formal express personal consecutive continuous'.split(' '));
const continuation=new Set('old ago later earlier more less long longer short shorter after before previously following remaining consecutive continuous plus minus per and or nor to from of in on at by for with without during under within through until since is are was were be being been have has had do does did can could may might must shall should will would a an the this that these those which who whom whose if unless when while as than prior thereafter immediately involving provided pending beginning follow each any except upon term period interval cycle extension anniversary elapsed expire expires expired elapse elapses continue continues pass passes passed end ends ended begin begins start starts remain remains occur occurs'.split(' '));
const scalar=s=>/^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$/.test(s)||/^(?:several|many|multiple|both|few)$/i.test(s)||canonicalWrittenValue(s)!==null||/\b(?:hundred|thousand|million|billion|trillion) and\b/i.test(s)&&canonicalWrittenValue(s.replace(/\band\s+/gi,''))!==null;
const overlaps=(rows,start,end)=>rows.some(r=>r.start<end&&r.end>start);
const currencyPrefix=(source,start)=>{while(start>0&&/\s/u.test(source[start-1]))start--;return /[$€£¥₹¢]/u.test(source[start-1]||'');};
function detector(doc,references,{existingIssues=[]}={}){
 const ctx=styleContext(doc),source=ctx.source,readQuantity=createNounQuantityReader(doc,ctx),blocked=styleEvidenceGuard(doc,ctx),issues=[];let names=null,literals=null,original=null,technicalOriginal=null;
 for(const m of source.matchAll(pattern)){
  const phraseStart=m.index,unitStart=phraseStart+m.groups.qualifier.length,unitEnd=unitStart+m.groups.unit.length,q=readQuantity(phraseStart);if(!q||ctx.at(unitStart)==='Heading')continue;
  const count=source.slice(q.start,q.end).replace(/\s+/g,' ').trim();if(!scalar(count))continue;
  // A four-digit calendar-year label is a date identifier, not evidence
  // of thousands of years of notice or another time possessive.
  if(/^calendar\s+$/i.test(m.groups.qualifier)&&/^years?$/i.test(m.groups.unit)&&/^[1-9]\d{3}$/u.test(count))continue;
  let headStart=m.index+m[0].length-m.groups.first.length,head=m.groups.first,end=headStart+head.length;
  // Preserve whole selected adjective chains. Do not silently classify every
  // intervening word as an adjective or claim the final word is a noun.
  while(adjectives.has(head.toLowerCase())){const next=new RegExp('^\\s+('+atom+')(?![\\p{L}\\p{N}\\p{M}_])','u').exec(source.slice(end));if(!next){head='';break;}headStart=end+next[0].length-next[1].length;head=next[1];end=headStart+head.length;}
  technicalOriginal??=originalBodyStyleContext(doc)?.source||source;
  if(possessiveTechnicalBoundaryBlocked(technicalOriginal,q.start,end))continue;
  if(!head||/^(?:based\s+on|increased\s+by|reduced\s+by)\b/i.test(source.slice(headStart))||!/^[a-z]/.test(head)||continuation.has(head.toLowerCase())||cutsOriginalStyleWord(doc,q.start)||cutsOriginalStyleWord(doc,end)||/^[-\u00ad\u2010\u2011’']/u.test(doc.text.slice(end))||blocked(q.start,end)||overlaps(existingIssues.filter(i=>!i.reviewSuggested),phraseStart,end)||overlaps(issues,phraseStart,end))continue;
  if(names===null)names=sourceNameRanges(source);if(overlaps(names,q.start,end))continue;
  if(literals===null){original=originalBodyStyleContext(doc);literals=[...styleSingleQuoteRanges(source),...(original?[...original.literalRanges,...styleSingleQuoteRanges(original.source)]:[])];}if(overlaps(literals,q.start,end)||currencyPrefix(source,q.start)||original&&currencyPrefix(original.source,q.start))continue;
  const message='Review Suggested: This complete time expression precedes wording that may serve as a nominal head. LCB and GPO often use a time possessive instead of an objective phrase. Confirm the grammatical relationship and whether an apostrophe, an equivalent phrase, a unit modifier, or the existing wording is appropriate. No noun role or punctuation change has been selected.';
  issues.push({start:phraseStart,end,text:doc.text.slice(phraseStart,end),suggestion:null,guideId:'lcb',guidePage:6,guidePrintedPage:String(references.lcb.pages[5].printedPage),rule:'Punctuation: Time Possessive Review',category:'Time Expression Review',context:ctx.at(unitStart),confidence:'Review Suggested',reviewSuggested:true,reviewKind:'time-possessive',checkId:'lcb-time-possessive-review',conflict:false,matchesPrimary:false,message,evidenceStart:q.start,evidenceEnd:end,timePossessiveEvidence:{count:{start:q.start,end:phraseStart,text:doc.text.slice(q.start,phraseStart)},unit:{start:unitStart,end:unitEnd,text:doc.text.slice(unitStart,unitEnd)},...(m.groups.qualifier?{qualifier:{start:phraseStart,end:unitStart,text:doc.text.slice(phraseStart,unitStart)}}:{}),head:{start:headStart,end,text:doc.text.slice(headStart,end)},evidenceStart:q.start,evidenceEnd:end,text:doc.text.slice(q.start,end),role:'Possible nominal qualifier; relationship unresolved'},references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:6,guidePrintedPage:String(references.lcb.pages[5].printedPage),rule:'Punctuation: Apostrophes',preferred:null,ruleText:'For periods of time, the possessive case is often used in lieu of an objective phrase even though ownership is not involved.'},{guideId:'gpo',guideName:'GPO Style Manual',guidePage:210,guidePrintedPage:String(references.gpo.pages[209].printedPage),rule:'8.14',preferred:null,ruleText:'The possessive case is often used in lieu of an objective phrase even though ownership is not involved.'}]});
 }return issues;
}
export function restoreTimePossessiveEvidence(e,map,text){
 const restore=r=>{const start=map(r.start),end=map(r.end,true);return {...r,start,end,text:text.slice(start,end)};},evidenceStart=map(e.evidenceStart),evidenceEnd=map(e.evidenceEnd,true);
 return {...e,count:restore(e.count),unit:restore(e.unit),...(e.qualifier?{qualifier:restore(e.qualifier)}:{}),head:restore(e.head),evidenceStart,evidenceEnd,text:text.slice(evidenceStart,evidenceEnd)};
}
export function timePossessiveReviewIssues(doc,references,options={}){
 if(!references?.lcb?.pages?.[5]||!references?.gpo?.pages?.[209])return [];
 const view=styleWordDivisionView(doc,{preserveRemainingWords:true}),reviewDoc=view?.doc||doc,existing=options.existingIssues||[],found=withStyleContext(reviewDoc,()=>detector(reviewDoc,references,{...options,existingIssues:view?existing.map(i=>({...i,start:view.toView(i.start),end:view.toView(i.end)})):existing}));if(!view)return found;
 return view.restore(found).map(i=>{const e=restoreTimePossessiveEvidence(i.timePossessiveEvidence,view.toSource,doc.text);return {...i,evidenceStart:e.evidenceStart,evidenceEnd:e.evidenceEnd,timePossessiveEvidence:e};});
}
