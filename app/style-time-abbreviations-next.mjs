import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
import {entityNameBoundaryBlocked} from './style-entity-name-boundaries.mjs';

export const GPO_NONZERO_MINUTE_TIME_SCOPE='GPO 9.54: complete 1–12-hour clocks with nonzero two-digit minutes 01–59 use the printed a.m./p.m. form, with one separating space in the suggestion and closed lowercase meridian letters. Ordinary PDF layout whitespace remains accepted; this does not certify double-space typography. Every original digit is preserved. LCB page 23 prints the same notation. Whole clock/meridian evidence, original Unicode and technical endpoints, source-created temporal names, quotations and bill-local wording, tables, source strikes, unknown exclusions and physical source offsets remain protected. Existing exact-hour and numeric o’clock checks are separate. Written hours, leading-zero or military clocks, malformed minutes, omitted meridian periods, noon/midnight meaning and unfamiliar typography remain manual.';
const nameHead='(?:Act|Code|Law|Fund|Account|Authority|Department|Agency|Commission|Board|Association|Foundation|Institute|Program|Company|Corporation|Council|Office|Bureau|Center)';
const immediateName=new RegExp('^\\s+'+nameHead+'(?![\\p{L}\\p{N}\\p{M}_])','u');
const creationTail=new RegExp('^\\s+(?:[\\p{Lu}][\\p{L}\\p{M}]*\\s+){0,3}'+nameHead+'\\s+is\\s+(?:hereby\\s+)?(?:created|established|designated)(?![\\p{L}\\p{N}\\p{M}_])','u');
// Original temporal-looking names are negative evidence only. A removed name
// suffix or creation cue must not turn the remaining printed title into prose.
export function originalTemporalNameBlocked(original,start,end){
 const after=original.slice(end);
 if(immediateName.test(after))return true;
 if(!/(?<![\p{L}\p{N}\p{M}_./:\\#@’'\-])[Tt]he\s+$/u.test(original.slice(0,start)))return false;
 return creationTail.test(after)||/^,\s*(?:Inc\.|Corp\.|Incorporated|Corporation),?\s+is\s+(?:hereby\s+)?(?:created|established|designated)(?![\p{L}\p{N}\p{M}_])/u.test(after);
}
function technicalClockBoundary(doc,source,original,start,end){
 const before=original.slice(0,start),after=original.slice(end);
 const prefix=/(?:[-+−/⁄∕*^×÷±]\s*|\d[\d.,]*\s*[eE]\s*[-+−]?\s*|\d\s*[:.,]\s*)$/u.exec(before);
 const suffix=/^\s*([-+−/⁄∕*^×÷±=])/u.exec(after);
 const narrativeDash=at=>/[\u2013-\u2015]/u.test(doc.text[at]||'')&&source[at]==='-';
 if(prefix&&!(/^[-]\s*$/u.test(prefix[0])&&narrativeDash(start-prefix[0].length)))return true;
 if(suffix&&!(suffix[1]==='-'&&narrativeDash(end+suffix[0].length-1)))return true;
 return /^\s*[:.,]\s*\d/u.test(after);
}
export function nonzeroMinuteTimeIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,original=originalBodyStyleContext(doc)?.source||source;
 const blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx),quoted=billQuotedTermProtection(doc,ctx),issues=[];
 const identifier=/(?<![\p{L}\p{N}\p{M}_])(?:Section|Article|Item|Form|Schedule|No\.?|Model|Type|Class|Version|Figure|Table|Appendix|Exhibit|Paragraph|Subdivision)\s*$/iu;
 const clocks=/(?<![\p{L}\p{N}\p{M}_])([1-9]|1[0-2]):([0-5]\d)\s*([ap])\.\s*m\.(?![\p{L}\p{N}\p{M}_])/giu;
 for(const m of source.matchAll(clocks)){
  if(m[2]==='00')continue;
  const start=m.index,end=start+m[0].length,suggestion=m[1]+':'+m[2]+' '+m[3].toLowerCase()+'.m.';
  if(m[0].replace(/\s+/gu,' ')===suggestion||ctx.at(start)==='Heading'||blocked(start,end)||literal(start,end)||quoted({start,end})||cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,end)||entityNameBoundaryBlocked(doc.text,source,original,start,end)||technicalClockBoundary(doc,source,original,start,end)||identifier.test(original.slice(Math.max(0,start-50),start))||originalTemporalNameBlocked(original,start,end))continue;
  const message='GPO 9.54 prints the meridian form as in “2:30 p.m.”. Use closed lowercase a.m. or p.m. after one separating space; preserve the original hour and minute digits. LCB page 23 prints the same time notation.';
  const citations=[{guideId:'gpo',guideName:'GPO Style Manual',guidePage:250,guidePrintedPage:references.gpo.pages[249].printedPage,rule:'9.54',preferred:suggestion,ruleText:message}];
  if(references.lcb)citations.push({guideId:'lcb',guideName:'LCB Style Manual',guidePage:23,guidePrintedPage:references.lcb.pages[22].printedPage,rule:'Numerals: TIME',preferred:suggestion,ruleText:'LCB page 23 prints “3 a.m.” and “10:30 p.m.” under TIME.'});
  issues.push({start,end,evidenceStart:start,evidenceEnd:end,text:doc.text.slice(start,end),suggestion,guideId:'gpo',guidePage:250,guidePrintedPage:references.gpo.pages[249].printedPage,rule:'9.54',category:'Time notation',checkId:'gpo-time-meridian',conflict:false,context:ctx.at(start),message,references:citations});
 }
 return issues;
}
