import {styleContext,withStyleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {styleSingleQuoteRanges} from './style-single-quote-ranges.mjs';
import {writtenCardinalRuns,writtenQuantityEvidenceGuard} from './style-written-quantity-evidence.mjs';
import {canonicalWrittenValue} from './style-cardinal-values.mjs';
import {numeralIdentifierRanges} from './style-numeral-identifiers.mjs';
import {numericExpressionGuard} from './style-numeric-expression-evidence.mjs';
import {styleWordDivisionView} from './style-word-divisions.mjs';
import {CALENDAR_MONTHS,validCompleteCalendarDate} from './style-calendar-dates.mjs';
import {nounHeadMatch} from './style-noun-heads.mjs';
import {labelledNumericalRoleRanges} from './style-lcb-labelled-numerical-roles.mjs';
const overlap=(rows,a,b)=>rows.some(r=>r.start<b&&r.end>a);
// The source explicitly makes different numerical expressions an exception.
// Presence of two numbers is observable; whether they are related is not.
export function lcbSentenceReview(doc,references,{existingIssues=[],citationRanges=[],includeSeriesReview=true}={}){
 if(!references?.lcb?.pages)return {issues:[],superseded:[]};
 const view=styleWordDivisionView(doc,{preserveRemainingWords:true}),d=view?.doc||doc,prior=view?existingIssues.map((i,index)=>({...i,index,start:view.toView(i.start),end:view.toView(i.end)})):existingIssues.map((i,index)=>({...i,index}));
 const coordinates=view?citationRanges.map(r=>({...r,start:view.toView(r.start),end:view.toView(r.end)})):citationRanges;
 const result=withStyleContext(d,()=>review(d,references,prior,coordinates,includeSeriesReview));
 return {issues:view?view.restore(result.issues):result.issues,superseded:result.superseded};
}
function review(doc,references,existing,citationRanges,includeSeriesReview){
 const ctx=styleContext(doc),source=ctx.source,blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx),single=styleSingleQuoteRanges(source),identifiers=numeralIdentifierRanges(source),numeric=numericExpressionGuard(doc,ctx),quantity=writtenQuantityEvidenceGuard(doc,ctx),issues=[],superseded=[];
 identifiers.push(...citationRanges,...labelledNumericalRoleRanges(doc,ctx));
 // These are serial targets and layout labels, not ordinary small counts.
 // Their original complete spans still have to survive the sentence guard.
 const target='(?:\\([A-Za-z0-9]+\\)|\\d+(?:\\.\\d+)*(?:\\s*\\([A-Za-z0-9]+\\))*)';
 const serial=new RegExp('\\b(?:sections?|subsections?|secs?\\.?|chapters?|subchapters?|items?|schedules?|parts?|subparts?|divisions?|titles?|articles?|subarticles?|paragraphs?|subparagraphs?|subdivisions?|clauses?|pages?|lines?|tables?|figures?|forms?|bills?|propositions?|No\\.?)\\s+'+target+'(?:\\s*(?:,\\s*(?:(?:and|or)\\s*)?|(?:and|or|to|through)\\s+|[-–])'+target+')*','giu');
 for(const m of source.matchAll(serial))identifiers.push({start:m.index,end:m.index+m[0].length});
 for(const block of doc.blocks){const m=/^\s*(?:\([A-Za-z0-9]+\)\s*)+/u.exec(source.slice(block.start,block.end));if(m)identifiers.push({start:block.start,end:block.start+m[0].length});}
 const dates=new RegExp('\\b('+CALENDAR_MONTHS.join('|')+')\\s+(\\d{1,2}),\\s+(\\d{4})(?![\\p{L}\\p{N}\\p{M}_])','giu'),calendarRanges=[];
 for(const m of source.matchAll(dates))if(validCompleteCalendarDate(m[1],Number(m[2]),Number(m[3]))){const r={start:m.index,end:m.index+m[0].length};identifiers.push(r);calendarRanges.push(r);}
 // A year is not required to establish the printed month/day numeral role.
 // Whole comma-year dates retain the complete-date owner above; neither a
 // token prefix nor a source-masked month/day may supply this exception.
 const monthDay=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_-])(?:'+CALENDAR_MONTHS.join('|')+')\\s+(?:[12]\\d|3[01]|[1-9])(?![\\p{L}\\p{N}\\p{M}_/\\u2010-\\u2015-]|\\.\\d|\\s*,\\s*\\d)','giu');
 const originalCalendar=originalBodyStyleContext(doc)?.source||source,originalMonthDays=new Set([...originalCalendar.matchAll(monthDay)].map(m=>m.index+':'+(m.index+m[0].length)));
 for(const m of source.matchAll(monthDay)){
  const start=m.index,end=start+m[0].length;
  if(!blocked(start,end)&&originalMonthDays.has(start+':'+end)&&originalCalendar.slice(start,end)===m[0]){const r={start,end};identifiers.push(r);calendarRanges.push(r);}
 }
 // A grouping comma inside an intact figure is not a separator between
 // parallel list items. Require the complete printed grouping; malformed
 // numeric strings still need review and cannot establish this exception.
 const groupedFigures=[...source.matchAll(/(?<![\p{L}\p{N}\p{M}_.,])\d{1,3}(?:,\d{3})+(?:\.\d+)?(?![\p{L}\p{N}\p{M}_,]|\.\d)/gu)].map(m=>({start:m.index,end:m.index+m[0].length}));
 const sentences=new Map();
 for(const block of doc.blocks){
  if(block.ignored||ctx.at(block.start)==='Heading')continue;
  for(const m of source.slice(block.start,block.end).matchAll(/\S+/gu)){
   const s=ctx.sentenceAt(block.start+m.index);if(!sentences.has(s.start))sentences.set(s.start,s);
  }
 }
 const eligible=(a,b)=>!blocked(a,b)&&!literal(a,b)&&!overlap(single,a,b)&&!cutsOriginalStyleWord(doc,a)&&!cutsOriginalStyleWord(doc,b)&&ctx.at(a)!=='Heading';
 const numericalRole=(a,b)=>{
  const after=source.slice(b),duration=/^(?:-(second|minute|hour|day|week|month|year)|\s+(seconds?|minutes?|hours?|days?|weeks?|months?|years?))(?![\p{L}\p{N}\p{M}_-])/iu.exec(after);
  if(duration&&!blocked(a,b+duration[0].length))return {kind:'duration',unit:(duration[1]||duration[2]).toLowerCase().replace(/s$/u,'')};
  const proportion=/^(?:\s*%|\s+percent(?:age\s+points?)?)(?![\p{L}\p{N}\p{M}_-])/iu.exec(after);
  if(proportion&&!blocked(a,b+proportion[0].length))return {kind:'proportion',unit:'percent'};
  const head=nounHeadMatch(after);
  return head&&!blocked(a,b+head[0].length)?{kind:'count',unit:null}:{kind:'unknown',unit:null};
 };
 const possiblyRelated=(a,b)=>a.kind==='unknown'||b.kind==='unknown'||a.kind===b.kind&&(a.kind==='count'||a.unit===b.unit);
 const citation=(page,rule,text)=>({guideId:'lcb',guideName:'LCB Style Manual',guidePage:page,guidePrintedPage:String(references.lcb.pages.find(p=>p.page===page).printedPage),rule,preferred:null,ruleText:text});
 for(const sentence of sentences.values()){
  if(blocked(sentence.start,sentence.end))continue;
  let start=sentence.start,end=sentence.end;while(start<end&&/\s/u.test(source[start]))start++;while(end>start&&/\s/u.test(source[end-1]))end--;
  if(!eligible(start,end))continue;
  const text=source.slice(start,end);
  if(includeSeriesReview&&references.lcb.pages.some(p=>p.page===6)&&/,/u.test(text)){
   const joins=[...text.matchAll(/\b(and|or|nor)\b/giu)],last=joins.at(-1);
   const before=last&&text.slice(0,last.index).trimEnd(),after=last&&text.slice(last.index+last[0].length).trim();
   // Existing finite list checks retain their precise selections. A comma
   // and conjunction only establish uncertainty, not three parallel items.
   const listComma=last&&[...text.slice(0,last.index).matchAll(/,/gu)].some(m=>!overlap([...calendarRanges,...citationRanges,...groupedFigures],start+m.index,start+m.index+1));
   if(last&&listComma&&after&&!/[,;:]$/u.test(before)&&!existing.some(i=>overlap([i],start,end)&&i.references?.some(r=>r.guideId==='lcb'&&r.guidePage===6))){
    issues.push({start,end,text:doc.text.slice(start,end),matchText:text.replace(/\s+/gu,' '),suggestion:null,guideId:'lcb',guidePage:6,guidePrintedPage:String(references.lcb.pages.find(p=>p.page===6).printedPage),rule:'Punctuation: unresolved series structure',category:'Series Structure Review',context:ctx.at(start),confidence:'Review Suggested',reviewSuggested:true,reviewKind:'sentence-series-structure',checkId:'lcb-sentence-series-review',conflict:false,message:'Review Suggested: Comma-separated wording precedes the final “'+last[1]+'” without a serial comma or semicolon. Confirm whether it forms a series of three or more parallel items, a nested group, or separate clauses. LCB requires a serial comma for a qualifying series and a final semicolon for comma-grouped series. The structure has not been established; this sentence may be correct. No replacement has been selected.',references:[citation(6,'Punctuation: Commas and Semicolons','Use a comma before and, or, or nor preceding the last of three or more words, phrases, letters, or figures. A comma-grouped series uses a final semicolon.')]});
   }
  }
  if(ctx.at(start)!=='Bill'||!references.lcb.pages.some(p=>p.page===21))continue;
  const counts=[];
  for(const r of writtenCardinalRuns(text)){
   const a=start+r.start,b=start+r.end,value=canonicalWrittenValue(text.slice(r.start,r.end).toLowerCase().replace(/[\s-]+/gu,' '));
   // A complete explicit duration modifier is a different numerical
   // expression from the adjacent ordinary population or object count.
   // Its small number cannot create a sentence-wide relation question.
   if(value===null||!Number.isSafeInteger(value)||quantity(a,b)||overlap(identifiers,a,b)||/^\s+(?:dollars?|cents?|mills?)\b/iu.test(source.slice(b)))continue;
   counts.push({start:a,end:b,value:BigInt(value),written:true,role:numericalRole(a,b)});
  }
  for(const m of text.matchAll(/(?<![\p{L}\p{N}\p{M}_])(?:\d{1,3}(?:,\d{3})+|\d+)(?![\p{L}\p{N}\p{M}_])/gu)){
   const a=start+m.index,b=a+m[0].length;
   if(numeric(a,b)||overlap(identifiers,a,b)||/[$€£¥]\s*$/u.test(source.slice(start,a)))continue;
   counts.push({start:a,end:b,value:BigInt(m[0].replaceAll(',','')),written:false,role:numericalRole(a,b)});
  }
  const small=counts.filter(c=>c.value>0n&&c.value<10n&&c.start>start&&counts.some(other=>other.value>=10n&&possiblyRelated(c.role,other.role)));
  if(counts.length<2||!counts.some(c=>c.value>=10n)||!small.length)continue;
  // An existing specific figure-form owner settles that occurrence. A plain
  // base-rule 3 -> three must not assert that two quantities are unrelated.
  const unresolved=small.filter(c=>!(c.role.kind==='proportion'&&!c.written)&&!existing.some(i=>i.start===c.start&&i.end===c.end&&typeof i.suggestion==='string'&&/^\d+$/u.test(i.suggestion)));
  if(!unresolved.length||existing.some(i=>overlap([i],start,end)&&/number-relation|count-coordination|count-list|repeated-count/iu.test(i.checkId||'')))continue;
  const affected=existing.filter(i=>i.checkId==='numerals'&&unresolved.some(c=>!c.written&&i.start===c.start&&i.end===c.end));
  superseded.push(...affected.map(i=>i.index));
  issues.push({start,end,text:doc.text.slice(start,end),matchText:text.replace(/\s+/gu,' '),suggestion:null,guideId:'lcb',guidePage:21,guidePrintedPage:String(references.lcb.pages.find(p=>p.page===21).printedPage),rule:'Numerals: Bill, item 3',category:'Numerical Expression Review',context:ctx.at(start),confidence:'Review Suggested',reviewSuggested:true,reviewKind:'sentence-numerical-expressions',checkId:'lcb-sentence-number-review',conflict:false,message:'Review Suggested: This sentence contains two or more numbers, including one of 10 or more and a smaller number. LCB uses figures for each unless they belong to different numerical expressions. Confirm that relationship across the complete sentence; distinct quantities and sentence-opening or specialized forms may have their own rules. No replacement has been selected.',references:[citation(21,'Numerals: Bill, item 3','When 2 or more numbers appear in a sentence and one is 10 or larger, figures are used for each, unless they are of different numerical expressions.')],conditionalNumeralComparisons:affected.map(i=>({text:i.text,suggestion:i.suggestion,reason:'Base numeral form depends on whether the numerical expressions are different.'}))});
 }
 return {issues,superseded};
}
