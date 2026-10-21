import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
import {entityNameBoundaryBlocked} from './style-entity-name-boundaries.mjs';
import {originalTemporalNameBlocked,technicalClockBoundary} from './style-time-abbreviations-next.mjs';

export const GPO_WHOLE_CLOCK_TIME_SCOPE='GPO 9.54/9.55: complete bare 1–12-hour meridians use the printed lowercase a.m./p.m. form; exact :00 is omitted, and redundant o’clock is removed from complete numeric-hour or one-through-twelve written-hour meridian expressions. Written-hour o’clock forms use figures under the LCB page 23 TIME examples, with both sources disclosed. Every original numeric digit is retained except the explicitly redundant :00; hour words use only the finite one-through-twelve map. Suggestions contain one separating space, while ordinary PDF layout whitespace is accepted without typographic certification. Complete original hour, o’clock, meridian punctuation and bridge evidence, source-created temporal names, quotations and bill-local forms, headings/tables, removed or unknown text, Unicode/technical endpoints and original signed/scientific/fractional/operator continuations remain protected. Recognized interior running heads preserve full physical selections. Nonzero-minute formatting remains a separate check. Leading-zero/military clocks, omitted meridian periods, unqualified written hours, nonzero-minute o’clock expressions, noon/midnight interpretation and unfamiliar typography remain manual.';
const wordHours=new Map(['one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve'].map((word,n)=>[word,String(n+1)]));
// A finite hour cannot be the suffix of an original larger or signed quantity.
// Inspect original text so removing a quantity word or its and/hyphen bridge
// cannot manufacture a supported hour. Completed preceding clocks stay separate.
const quantityPrefix=/(?<![\p{L}\p{N}\p{M}_])(?:\d[\d.,]*|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|trillion|half|quarter|point|decimal|positive|negative|plus|minus)\s+(?:and\s+)?$/iu;
const identifier=/(?<![\p{L}\p{N}\p{M}_])(?:Section|Article|Item|Form|Schedule|No\.?|Model|Type|Class|Version|Figure|Table|Appendix|Exhibit|Paragraph|Subdivision)\s*$/iu;
const pattern=/(?<![\p{L}\p{N}\p{M}_])(?<hour>[1-9]|1[0-2]|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)(?<zero>:00)?(?<clock>\s+o[’']clock)?\s*(?<meridian>[ap])\.\s*m\.(?![\p{L}\p{N}\p{M}_])/giu;
export function wholeClockTimeIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,original=originalBodyStyleContext(doc)?.source||source,blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx),quoted=billQuotedTermProtection(doc,ctx),issues=[];
 for(const m of source.matchAll(pattern)){
  const start=m.index,end=start+m[0].length,written=wordHours.has(m.groups.hour.toLowerCase());
  if((written&&(!m.groups.clock||m.groups.zero||!references.lcb))||quantityPrefix.test(original.slice(0,start)))continue;
  const hour=written?wordHours.get(m.groups.hour.toLowerCase()):m.groups.hour,suggestion=hour+' '+m.groups.meridian.toLowerCase()+'.m.';
  if(m[0].replace(/\s+/gu,' ')===suggestion||ctx.at(start)==='Heading'||blocked(start,end)||literal(start,end)||quoted({start,end})||cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,end)||entityNameBoundaryBlocked(doc.text,source,original,start,end)||technicalClockBoundary(doc,source,original,start,end)||identifier.test(original.slice(Math.max(0,start-50),start))||originalTemporalNameBlocked(original,start,end))continue;
  const rule=m.groups.clock?'9.55':'9.54',message=m.groups.clock?'GPO 9.55 omits o’clock when a complete meridian abbreviation is present. LCB page 23 TIME uses figures for stated clock hours. Compare the complete expression with “'+suggestion+'”; do not infer noon or midnight meaning.':'GPO 9.54 prints lowercase closed a.m./p.m. after a stated hour and omits redundant :00. Compare this complete clock with “'+suggestion+'”; its original hour is unchanged and no noon or midnight meaning is inferred.';
  const cite=number=>({guideId:'gpo',guideName:'GPO Style Manual',guidePage:250,guidePrintedPage:references.gpo.pages[249].printedPage,rule:number,preferred:suggestion,ruleText:message});
  const citations=[cite(rule)];if(m.groups.clock&&m.groups.zero)citations.push(cite('9.54'));
  if(references.lcb)citations.push({guideId:'lcb',guideName:'LCB Style Manual',guidePage:23,guidePrintedPage:references.lcb.pages[22].printedPage,rule:'Numerals: TIME',preferred:suggestion,ruleText:'LCB page 23 TIME prints “3 a.m.” and “10:30 p.m.”. This selected complete clock uses figures and the same meridian notation.'});
  issues.push({start,end,evidenceStart:start,evidenceEnd:end,text:doc.text.slice(start,end),suggestion,guideId:'gpo',guidePage:250,guidePrintedPage:references.gpo.pages[249].printedPage,rule,category:'Time notation',checkId:'gpo-whole-clock',conflict:false,context:ctx.at(start),message,timeEvidence:{sourceHour:m.groups.hour,writtenHour:written,omittedZero:!!m.groups.zero,omittedOclock:!!m.groups.clock},references:citations});
 }
 return issues;
}
