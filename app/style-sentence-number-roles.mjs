import {styleContext} from './style-context.mjs';
import {originalBodyStyleContext,styleEvidenceGuard,cutsOriginalStyleWord} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {entityNameBoundaryBlocked} from './style-entity-name-boundaries.mjs';
import {nounHeadMatch,BARE_LEGISLATIVE_OBJECT_HEADS} from './style-noun-heads.mjs';
import {CALENDAR_MONTHS,validCompleteCalendarDate} from './style-calendar-dates.mjs';

export const SENTENCE_NUMBER_ROLE_SCOPE='Whole original either/lesser-of/excluding-those-that-are and all/both-of-the-following or exact following-actions-shall-be-taken constructions with consecutive parenthesized inline enumerators establish serial markers only. Explicit following-subprograms lists with consecutive closing-parenthesis markers require the whole source introducer and list; neither arbitrary parentheses nor unmatched markers inherit that role. LCB22’s October1993 example supplies complete valid literal full-month-name plus four-digit calendar-year dates, with no missing-year or intended-value inference. Complete lowercase calendar-year labels, literal fully capitalized CHIPS/Budget Act of four-digit-year titles and exact pursuant-to-parenthesized-number-above references protect only their source numerals from ordinary-count questions; their identity/correctness and unlisted titles remain manual. A complete one-or-more quantifier followed directly by an existing finite plural noun head supplies an ordinary count role, distinct from an explicit percentage or duration. No adjective dictionary, arbitrary qualified noun recognition, unlike-noun meaning inference or blanket unknown-role exemption is applied. Every establishing character and original Unicode/technical boundary is guarded against strikes, unknown exclusions, literal/local quotations, headings and tables; identified interior running heads retain their existing source treatment.';
const pluralHeads=new Set(BARE_LEGISLATIVE_OBJECT_HEADS);
const left='(?<![\\p{L}\\p{N}\\p{M}_/\\\\#@-])';
const paired=new RegExp(left+'(?:either|(?:lesser|greater)\\s+of|excluding\\s+those\\s+that\\s+are|following\\s+actions\\s+shall\\s+be\\s+taken\\s*:|(?:all|both)\\s+of\\s+the\\s+following(?:\\s+(?:conditions|requirements))?(?:\\s+(?:occur|apply|hold))?\\s*:)\\s+\\(1\\)\\s+','giu');
const nextPaired=/(?:;\s*(?:(?:and|or)\s+)?|(?:and|or)\s+)\((?<value>[1-9]\d*)\)\s+/giu;
const listed=new RegExp(left+'(?:each\\s+of\\s+the\\s+)?following\\s+subprograms(?:\\s+administered\\s+by\\s+the\\s+Department\\s+of\\s+Financial\\s+Protection\\s+and\\s+Innovation)?\\s*:\\s*1\\)\\s+','giu');
const nextListed=/(?:,\s*(?:(?:and|or)\s+)?)\b(?<value>[1-9]\d*)\)\s+/giu;
function rawWitnesses(source,ctx){
 const out=[];
 for(const [pattern,next,role] of [[paired,nextPaired,'inline-enumerator'],[listed,nextListed,'introduced-subprogram-enumerator']])for(const m of source.matchAll(pattern)){
  const sentence=ctx.sentenceAt(m.index),limit=sentence.end,first=/1\)(?:\s+)$/u.exec(m[0]),firstStart=m.index+first.index,markers=[{start:firstStart,end:firstStart+1}],bodyStart=m.index+m[0].length;
  let expected=2,last=bodyStart;
  for(const n of source.slice(bodyStart,limit).matchAll(next)){
   if(Number(n.groups.value)!==expected)break;
   const begin=bodyStart+n.index,between=source.slice(last,begin);
   if(!/[\p{L}]/u.test(between)&&!/^\s*[$€£¥]\s*(?:0|[1-9]\d{0,2}(?:,\d{3})+|[1-9]\d*)(?:\.\d{2})?\s*$/u.test(between))break;
   const at=begin+n[0].indexOf(n.groups.value);
   markers.push({start:at,end:at+n.groups.value.length});expected++;last=begin+n[0].length;
  }
  if(markers.length<2)continue;
  const evidenceEnd=last-source.slice(0,last).match(/\s*$/u)[0].length;
  for(const range of markers)out.push({...range,role,evidenceStart:m.index,evidenceEnd});
 }
 return out;
}
export function sentenceEnumeratorRanges(doc,ctx=styleContext(doc)){
 const source=ctx.source,original=originalBodyStyleContext(doc)?.source||source,blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx);
 const originals=new Set(rawWitnesses(original,ctx).map(r=>[r.role,r.start,r.end,r.evidenceStart,r.evidenceEnd].join(':')));
 return rawWitnesses(source,ctx).filter(r=>originals.has([r.role,r.start,r.end,r.evidenceStart,r.evidenceEnd].join(':'))&&!blocked(r.evidenceStart,r.evidenceEnd)&&!literal(r.evidenceStart,r.evidenceEnd)&&ctx.at(r.evidenceStart)!=='Heading'&&![r.start,r.end,r.evidenceStart,r.evidenceEnd].some(at=>cutsOriginalStyleWord(doc,at))&&!entityNameBoundaryBlocked(doc.text,source,original,r.evidenceStart,r.evidenceEnd));
}
export function quantifiedSentenceCountRole(doc,ctx,start,end,{blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx)}={}){
 const source=ctx.source,original=originalBodyStyleContext(doc)?.source||source;
 if(!/^(?:one|1)$/iu.test(source.slice(start,end)))return null;
 const bridge=/^\s+or\s+more\s+/u.exec(source.slice(end));if(!bridge)return null;
 const head=nounHeadMatch(' '+source.slice(end+bridge[0].length));if(!head||! /^[a-z]/u.test(head[1])||!pluralHeads.has(head[1]))return null;
 const evidenceEnd=end+bridge[0].length+head[1].length;
 if(source.slice(start,evidenceEnd)!==original.slice(start,evidenceEnd)||blocked(start,evidenceEnd)||literal(start,evidenceEnd)||[start,end,evidenceEnd].some(at=>cutsOriginalStyleWord(doc,at))||entityNameBoundaryBlocked(doc.text,source,original,start,evidenceEnd))return null;
 return {kind:'count',unit:null,evidenceStart:start,evidenceEnd};
}

const monthYear=new RegExp(left+'(?<month>'+CALENDAR_MONTHS.join('|')+')\\s+(?<year>[1-9]\\d{3})(?![\\p{L}\\p{N}\\p{M}_-]|\\.\\d)','giu');
function rawMonthYears(source){
 return [...source.matchAll(monthYear)].filter(m=>validCompleteCalendarDate(m.groups.month,1,Number(m.groups.year))).map(m=>({role:'month-year',start:m.index,end:m.index+m[0].length,evidenceStart:m.index,evidenceEnd:m.index+m[0].length}));
}
// LCB22 prints October 1993 as a complete month/year date. This establishes
// only the literal calendar family, never an intended year or missing digit.
export function sentenceMonthYearRanges(doc,references,ctx=styleContext(doc)){
 const pages=references?.lcb?.pages?.filter(p=>p.page===22)||[];
 if(pages.length!==1||[...pages[0].text.matchAll(/(?:^|\n)[ \t]*October[ \t]+1993[ \t]*(?=\n|$)/gu)].length!==1)return [];
 const source=ctx.source,original=originalBodyStyleContext(doc)?.source||source,blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx),originals=new Set(rawMonthYears(original).map(r=>r.start+':'+r.end));
 return rawMonthYears(source).filter(r=>originals.has(r.start+':'+r.end)&&source.slice(r.start,r.end)===original.slice(r.start,r.end)&&!blocked(r.start,r.end)&&!literal(r.start,r.end)&&ctx.at(r.start)!=='Heading'&&![r.start,r.end].some(at=>cutsOriginalStyleWord(doc,at))&&!entityNameBoundaryBlocked(doc.text,source,original,r.start,r.end));
}

const labelledCalendarYear=new RegExp(left+'(?<value>[1-9]\\d{3})\\s+calendar\\s+year(?![\\p{L}\\p{N}\\p{M}_-])','gu');
const namedActYear=new RegExp(left+'(?:CHIPS|Budget)\\s+Act\\s+of\\s+(?<value>[1-9]\\d{3})(?![\\p{L}\\p{N}\\p{M}_-]|\\.\\d)','gu');
const relativeReference=new RegExp(left+'pursuant\\s+to\\s+\\(\\s*(?<value>[1-9]\\d*)\\s*\\)\\s+above(?![\\p{L}\\p{N}\\p{M}_-])','giu');
const sourceAnchor=(references,page,pattern)=>{const pages=references?.lcb?.pages?.filter(p=>p.page===page)||[];return pages.length===1&&[...pages[0].text.matchAll(pattern)].length===1;};
function rawLabelledReferences(source,enabled){
 const out=[];
 for(const [role,pattern]of enabled)for(const m of source.matchAll(pattern)){
  // A preceding capitalized word can be part of a longer unencoded title.
  // The literal complete CHIPS/Budget title family does not choose a suffix.
  if(role==='named-act-year'&&/(?<![\p{L}\p{N}\p{M}_])(?!(?:The|A|An)\s+$)[A-Z][A-Za-z]*\s+$/u.test(source.slice(0,m.index)))continue;
  const at=m.index+m[0].lastIndexOf(m.groups.value);
  out.push({role,start:at,end:at+m.groups.value.length,evidenceStart:m.index,evidenceEnd:m.index+m[0].length});
 }
 return out;
}
// Negative ordinary-count owners only. The literal name/label does not
// authenticate a statute, choose an intended year, or validate a referent.
export function sentenceLabelledReferenceRanges(doc,references,ctx=styleContext(doc)){
 const enabled=[];
 if(sourceAnchor(references,22,/(?:^|\n)[ \t]*October[ \t]+1993[ \t]*(?=\n|$)/gu))enabled.push(['calendar-year-label',labelledCalendarYear]);
 if(sourceAnchor(references,18,/(?:^|\n)[ \t]*Budget Act of 1979[ \t]*(?=\n|$)/gu))enabled.push(['named-act-year',namedActYear]);
 if(sourceAnchor(references,22,/(?:^|\n)[ \t]*Sections 123 and 124[ \t]*(?=\n|$)/gu))enabled.push(['relative-numbered-reference',relativeReference]);
 if(!enabled.length)return [];
 const source=ctx.source,original=originalBodyStyleContext(doc)?.source||source,blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx),key=r=>[r.role,r.start,r.end,r.evidenceStart,r.evidenceEnd].join(':'),originals=new Set(rawLabelledReferences(original,enabled).map(key));
 return rawLabelledReferences(source,enabled).filter(r=>originals.has(key(r))&&source.slice(r.evidenceStart,r.evidenceEnd)===original.slice(r.evidenceStart,r.evidenceEnd)&&!blocked(r.evidenceStart,r.evidenceEnd)&&!literal(r.evidenceStart,r.evidenceEnd)&&ctx.at(r.start)!=='Heading'&&![r.start,r.end,r.evidenceStart,r.evidenceEnd].some(at=>cutsOriginalStyleWord(doc,at))&&!entityNameBoundaryBlocked(doc.text,source,original,r.evidenceStart,r.evidenceEnd));
}
