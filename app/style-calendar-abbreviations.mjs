import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
const days={Sun:'Sunday',Mon:'Monday',Tues:'Tuesday',Wed:'Wednesday',Thurs:'Thursday',Fri:'Friday',Sat:'Saturday'};
const months={Jan:'January',Feb:'February',Mar:'March',Apr:'April',Aug:'August',Sept:'September',Oct:'October',Nov:'November',Dec:'December'};
export const CALENDAR_ABBREVIATION_EVIDENCE_SCOPE='The seven printed weekday and nine printed month abbreviations receive selected ordinary-prose checks after finite calendar leads, including sentence-opening lead capitals. Every cue, separator, abbreviation and required day digit must be intact in the original source. Recognized margins and interior running heads preserve exact abbreviation selections. Original quotation/reference boundaries, explicit list markers, tables, source strikeouts, unknown excluded fragments and attached Unicode/technical endpoints remain protected, including removed enclosure marks. Footnote/bibliography identity, necessity in lists, narrow-column interpretation, unfamiliar dates and every unencoded prose construction remain manual; no whole-rule certification is claimed.';
const lead='(?:[Oo]n|[Bb]y|[Bb]efore|[Aa]fter|[Tt]hrough|[Uu]ntil|[Ee]very|[Ee]ach)';
export function calendarAbbreviationIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[],blocked=styleEvidenceGuard(doc,ctx),original=originalBodyStyleContext(doc)?.source||source,literal=originalStyleLiteralGuard(doc,ctx);
 // Original enclosures supply negative evidence only. An excluded or struck
 // quote/reference/list boundary cannot expose its old payload as prose.
 const referencesAt=[],stack=[];
 for(let n=0;n<original.length;n++){
  const ch=original[n];if(ch==='('||ch==='[')stack.push({ch,start:n});
  else if(ch===')'||ch===']'){
   const opening=ch===')'?'(':'[',at=stack.findLastIndex(r=>r.ch===opening);
   if(at>=0){referencesAt.push({start:stack[at].start,end:n+1});stack.splice(at);}
  }
 }
 const endpointsBlocked=(start,end)=>{
  let before=original.slice(Math.max(0,start-2),start),after=original.slice(end,end+2);
  // An ordinary body dash is punctuation, unlike an attached ASCII path or
  // identifier separator. Its source character must itself remain intact.
  if(/[\u2013-\u2015]/u.test(doc.text[start-1]||'')&&source[start-1]==='-')before=before.slice(0,-1)+' ';
  if(/[\u2013-\u2015]/u.test(doc.text[end]||'')&&source[end]==='-')after=' '+after.slice(1);
  return /[\p{L}\p{N}\p{M}_./:\\#@’'\-]$/u.test(before)||/^[\p{L}\p{N}\p{M}_/:\\#@’'\-]|^\.[\p{L}\p{N}\p{M}_]/u.test(after);
 };
 const listedAt=start=>{
  const block=doc.blocks.find(b=>b.start<=start&&b.end>start);if(!block)return false;
  return /^\s*(?:[-•*]|\([A-Za-z0-9]+\)|[A-Za-z0-9]+[.)])\s+/u.test(original.slice(block.start+(block.margin?.length||0),start));
 };
 for(const [forms,rule] of [[days,'9.46'],[months,'9.44']]){
  const page=references.gpo.pages.find(p=>(p.flowText||p.text).split('\n').some(line=>line.trimStart().startsWith(rule+'. ')));if(!page)continue;
  const day=forms===months?/\s+\d{1,2}(?![\p{L}\p{N}\p{M}_]|\.\d)/u.source:'';
  const pattern=new RegExp(/(?<![\p{L}\p{N}\p{M}_])/u.source+lead+/\s+/u.source+'('+Object.keys(forms).join('|')+')'+/\.(?=\s|$)/u.source+day,'gu');
  for(const m of source.matchAll(pattern)){
   const start=m.index+m[0].indexOf(m[1]),end=start+m[1].length+1,evidenceEnd=m.index+m[0].length;
   if(ctx.at(start)==='Heading'||cutsOriginalStyleWord(doc,m.index)||cutsOriginalStyleWord(doc,evidenceEnd)||blocked(m.index,evidenceEnd)||literal(m.index,evidenceEnd)||endpointsBlocked(m.index,evidenceEnd)||referencesAt.some(r=>r.start<evidenceEnd&&r.end>m.index)||listedAt(m.index))continue;
   const suggestion=forms[m[1]],message=forms===days?'GPO spells out weekdays in ordinary text. Explicit list and table contexts are protected; necessity in lists or narrow columns still requires review.':'GPO spells out month names in ordinary prose. This complete calendar cue and numeric day are intact. Footnotes, tables, leaderwork, sidenotes, bibliographies and parenthetical/bracketed citation contexts remain exceptions requiring separate review.';
   issues.push({start,end,text:doc.text.slice(start,end),suggestion,guideId:'gpo',guidePage:page.page,guidePrintedPage:page.printedPage,rule,category:'Calendar abbreviations',context:ctx.at(start),checkId:'calendar-abbreviations',conflict:false,message,references:[{guideId:'gpo',guideName:'GPO Style Manual',guidePage:page.page,guidePrintedPage:page.printedPage,rule,preferred:suggestion,ruleText:message}]});
  }
 }
 return issues;
}
