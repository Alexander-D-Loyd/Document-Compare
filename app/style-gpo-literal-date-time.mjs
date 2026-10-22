import {styleContext,withStyleContext} from './style-context.mjs';
import {listedWordingContext} from './style-gpo-listed-wording.mjs';
import {CALENDAR_MONTHS,validCompleteCalendarDate} from './style-calendar-dates.mjs';
import {originalTemporalNameBlocked,technicalClockBoundary} from './style-time-abbreviations-next.mjs';
import {numericExpressionGuard} from './style-numeric-expression-evidence.mjs';
import {quantityOpeningPrefix} from './style-opening-quantity-evidence.mjs';

export const GPO_LITERAL_DATE_TIME_SCOPE='Five selected source-form comparisons from GPO12.9 PDF289/printed275: complete valid full-month ordinal-day/four-digit-year dates lose their correct ordinal suffix; the explicit in the year cue identifies a four-digit comma-grouped year; only the printed 2 p.m. in the afternoon redundancy loses its final daypart; unsigned leading decimals with the printed inch/inches unit names receive a zero; two complete valid dates with identical four-digit years joined by to omit the first repeated year. Original digit strings, exact source passages, whole conditions and physical offsets are retained. The printed caliber exception is preserved. Calendar validity is finite Gregorian validation, not legal/date authenticity. Other date formats, calendars, invalid or reversed ranges, other clock/daypart combinations, other units, signs, scientific/technical expressions, trailing zeros, sentence-opening figures, names, quotations, bill-local forms, headings/tables, removed evidence and unknown exclusions remain outside this check. This is finite source-form coverage, not whole numeral-rule automation.';

const word='[\\p{L}\\p{N}\\p{M}_]',months=CALENDAR_MONTHS.join('|');
const dateOrdinal=new RegExp('(?<!'+word+')(?<month>'+months+')\\s+(?<day>[1-9]|[12]\\d|3[01])(?<suffix>st|nd|rd|th),\\s+(?<year>[1-9]\\d{3})(?!'+word+')','gu');
const dateRange=new RegExp('(?<!'+word+')(?<month1>'+months+')\\s+(?<day1>[1-9]|[12]\\d|3[01]),\\s+(?<year1>[1-9]\\d{3}),\\s+to\\s+(?<month2>'+months+')\\s+(?<day2>[1-9]|[12]\\d|3[01]),\\s+(?<year2>[1-9]\\d{3})(?!'+word+')','gu');
const year=/\b[Ii]n\s+the\s+year\s+(?<year>[1-9],\d{3})(?![\p{L}\p{N}\p{M}_])/gu;
const daypart=/(?<![\p{L}\p{N}\p{M}_])2\s+p\.m\.\s+in\s+the\s+afternoon(?![\p{L}\p{N}\p{M}_])/gu;
const decimal=/(?<![\p{L}\p{N}\p{M}_])(?<number>\.\d+)\s+(?<unit>inch|inches)(?![\p{L}\p{N}\p{M}_])/gu;
const identifier=/(?<![\p{L}\p{N}\p{M}_])(?:Section|Article|Item|Form|Schedule|No\.?|Model|Type|Class|Version|Figure|Table|Appendix|Exhibit|Paragraph|Subdivision|Case|Code|Code\s+section)\s*$/iu;
const ordinalSuffix=day=>day%100>=11&&day%100<=13?'th':({1:'st',2:'nd',3:'rd'}[day%10]||'th');
const sourceRules={
 'date-ordinal-suffix':/June 29, 1985 \(not June 29th, 1985\)/u,
 'explicit-year-grouping':/in the year 2000 \(not 2,000\)/u,
 'clock-redundant-daypart':/10 o’clock or 10 p\.m\. \(not 10 o’clock p\.m\.; 2 p\.m\. in the afternoon; 10:00 p\.m\.\)/u,
 'decimal-leading-zero':/In text a cipher should be supplied before a decimal\s+point if there is no whole unit, and ciphers should be omitted\s+after a decimal point unless they indicate exact measurement\.[\s\S]*?0\.25 inch; 1\.25 inches but \.30 caliber \(meaning 0\.30 inch,[\s\S]*?30 calibers/u,
 'same-year-complete-date-range':/March 6 to April 15, 1990 \(not March 6, 1990, to April 15, 1990\)/u
};
const rules={
 'date-ordinal-suffix':['12.9(c)','Calendar date ordinal','Use figures without an ordinal suffix in this complete valid month-day-year date. The source month spelling, day and four year digits are retained.'],
 'explicit-year-grouping':['12.9(c)','Explicit year punctuation','The complete in the year cue identifies this four-digit year. Omit only the grouping comma; no nearby quantity, year value or range is inferred.'],
 'clock-redundant-daypart':['12.9(b)','Printed clock redundancy','GPO explicitly rejects 2 p.m. in the afternoon. Retain the complete 2 p.m. clock and omit its redundant printed daypart; no other hour/daypart meaning is inferred.'],
 'decimal-leading-zero':['12.9(d)','Measured decimal zero','Supply zero before this leading decimal in the printed inch/inches family. Preserve every decimal digit and any trailing zeros; the printed caliber exception and other technical meanings remain protected.'],
 'same-year-complete-date-range':['12.9(c)','Complete same-year date range','GPO prints one final year for two complete calendar endpoints in the same year joined by to. Omit only the first repeated year and its commas; both month/day values and the original final year digits are retained.']
};
function authority(references,kind){
 const page=references?.gpo?.pages?.find(p=>p.page===289),match=page&&sourceRules[kind].exec(page.text||'');
 return match?{page,passage:{page:289,start:match.index,end:match.index+match[0].length,text:match[0]}}:null;
}
function sourceBlocked(view,start,end){
 const {original,source,ctx}=view;
 return view.guard(start,end)||originalTemporalNameBlocked(original,start,end)||technicalClockBoundary({text:view.doc.text},source,original,start,end)||identifier.test(original.slice(0,start))||/[=<>≤≥≠~≈€£$¥]\s*$/u.test(original.slice(0,start))||/^\s*[<>≤≥≠~≈]/u.test(original.slice(end));
}
function literalIssues(doc,references,{existingIssues=[]}={}){
 const base=listedWordingContext(doc),view={...base,doc},ctx=base.ctx,source=base.source,numeric=numericExpressionGuard(doc,ctx),issues=[];
 const add=(kind,start,end,suggestion,extra={})=>{
  const a=authority(references,kind);if(!a||sourceBlocked(view,start,end)||existingIssues.some(i=>i.guideId==='lcb'&&i.start<end&&i.end>start))return;
  const [rule,category,message]=rules[kind],witness={start,end,text:doc.text.slice(start,end)};
  issues.push({start,end,evidenceStart:start,evidenceEnd:end,text:witness.text,suggestion,guideId:'gpo',guidePage:289,guidePrintedPage:a.page.printedPage,rule,category,checkId:'gpo-literal-date-time',context:ctx.at(start),conflict:false,message,gpoLiteralEvidence:{kind,...witness,...extra},references:[{guideId:'gpo',guideName:'GPO Style Manual',guidePage:289,guidePrintedPage:a.page.printedPage,rule,preferred:suggestion,ruleText:message,sourcePassage:a.passage}]});
 };
 for(const m of source.matchAll(dateOrdinal)){
  const {month,day,suffix,year}=m.groups;if(suffix!==ordinalSuffix(Number(day))||!validCompleteCalendarDate(month,Number(day),Number(year)))continue;
  add('date-ordinal-suffix',m.index,m.index+m[0].length,month+' '+day+', '+year,{month,day,year});
 }
 for(const m of source.matchAll(year)){
  const start=m.index,end=start+m[0].length,figureStart=end-m.groups.year.length;
  if(numeric(figureStart,end))continue;
  add('explicit-year-grouping',start,end,m[0].slice(0,-m.groups.year.length).replace(/\s+/gu,' ')+m.groups.year.replace(',',''),{year:m.groups.year});
 }
 for(const m of source.matchAll(daypart)){
  const start=m.index,end=start+m[0].length;
  if(!quantityOpeningPrefix(ctx,start)||!quantityOpeningPrefix({ ...ctx,source:view.original },start))continue;
  add('clock-redundant-daypart',start,end,'2 p.m.');
 }
 for(const m of source.matchAll(decimal)){
  const start=m.index,end=start+m[0].length,numberEnd=start+m.groups.number.length;
  if(numeric(start,numberEnd)||!quantityOpeningPrefix(ctx,start)||!quantityOpeningPrefix({...ctx,source:view.original},start)||/\p{N}\s+$/u.test(view.original.slice(0,start)))continue;
  if(/^\s*,?\s*(?:as|if\s+so)\s+written\s+in\s+copy(?![\p{L}\p{N}\p{M}_])/iu.test(view.original.slice(end))||/(?<![\p{L}\p{N}\p{M}_])(?:as|if\s+so)\s+written\s+in\s+copy,?\s*$/iu.test(view.original.slice(0,start)))continue;
  add('decimal-leading-zero',start,end,'0'+m.groups.number+' '+m.groups.unit,{number:m.groups.number,unit:m.groups.unit});
 }
 for(const m of source.matchAll(dateRange)){
  const g=m.groups;if(g.year1!==g.year2||!validCompleteCalendarDate(g.month1,Number(g.day1),Number(g.year1))||!validCompleteCalendarDate(g.month2,Number(g.day2),Number(g.year2)))continue;
  const first=CALENDAR_MONTHS.indexOf(g.month1)*32+Number(g.day1),last=CALENDAR_MONTHS.indexOf(g.month2)*32+Number(g.day2);if(first>=last)continue;
  add('same-year-complete-date-range',m.index,m.index+m[0].length,g.month1+' '+g.day1+' to '+g.month2+' '+g.day2+', '+g.year2,{first:{month:g.month1,day:g.day1,year:g.year1},last:{month:g.month2,day:g.day2,year:g.year2}});
 }
 return issues.sort((a,b)=>a.start-b.start||a.end-b.end);
}
export function gpoLiteralDateTimeIssues(doc,references,options){return withStyleContext(doc,()=>literalIssues(doc,references,options));}
export function restoreGpoLiteralEvidence(e,map,text){const start=map(e.start),end=map(e.end,true);return {...e,start,end,text:text.slice(start,end)};}
