import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
import {entityNameBoundaryBlocked} from './style-entity-name-boundaries.mjs';

export const GPO_BARE_MEASUREMENT_EVIDENCE_SCOPE='Selected bare metric-symbol spacing/plural and Celsius/Fahrenheit/Rankine mark checks require the complete original unsigned decimal quantity, including canonical comma groups, and its recognized symbol. Original numeric strings are preserved. Scientific, fractional, signed or malformed quantities and technical attachments remain manual. Full original evidence, Unicode boundaries, quotations, bill-local forms, finite name continuations, tables, strikes and unknown exclusions remain protected; trusted interior page heads preserve exact selections. This is a finite text-evidence check, not unit, name or typography certification.';
export const GPO_MEASURE_NUMBER='(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?';
const numeric=/^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$/u;
const nameHead='(?:Act|Code|Law|Fund|Account|Authority|Department|Agency|Commission|Board|Association|Foundation|Institute|Program|Company|Corporation|Council|Office|Bureau|Center)';
const nameTail=new RegExp('^\\s+(?:[\\p{Lu}][\\p{L}\\p{M}]*\\s+){0,3}'+nameHead+'(?![\\p{L}\\p{N}\\p{M}_])','u');
const identifier=/(?<![\p{L}\p{N}\p{M}_])(?:Section|Article|Item|Form|Schedule|No\.?|Model|Type|Class|Version|Figure|Table|Appendix|Exhibit|Paragraph|Subdivision)\s*$/iu;
export function bareMeasurementEvidenceGuard(doc,ctx=styleContext(doc)){
 const source=ctx.source,originalContext=originalBodyStyleContext(doc)||ctx,original=originalContext.source;
 const blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx),quoted=billQuotedTermProtection(doc,ctx);
 return (m,temperature=false)=>{
  const start=m.index,end=start+m[0].length,before=original.slice(0,start),after=original.slice(end);
  if(!numeric.test(m[1])||ctx.at(start)==='Heading'||originalContext.at(start)==='Heading'||blocked(start,end)||literal(start,end)||quoted({start,end})||cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,end)||entityNameBoundaryBlocked(doc.text,source,original,start,end)||identifier.test(before)||nameTail.test(after))return true;
  // An exterior operator or malformed original digit run must not expose an
  // apparently complete suffix quantity when extraction/masking inserts space.
  if(/(?<![\p{L}\p{N}\p{M}_])(?:minus|negative|plus|positive)\s+$/iu.test(before)||/[.,\p{L}\p{N}\p{M}_]$/u.test(before)||/[\p{N}]\s+$/u.test(before)||/(?:[-+−/⁄∕*^×÷±]\s*|\d[\d.,]*\s*[eE]\s*[-+−]?\s*|\d\s*[:.,]\s*)$/u.test(before)||/^\s*[-+−/⁄∕*^×÷±=]/u.test(after))return true;
  if(/(?<![\p{L}\p{N}\p{M}_])[Tt]he\s+$/u.test(before)&&/^\s*(?:,\s*(?:Inc\.|Corp\.|Incorporated|Corporation),?\s*)?\s+is\s+(?:hereby\s+)?(?:created|established|designated)(?![\p{L}\p{N}\p{M}_])/u.test(after))return true;
  if(temperature){const sentence=originalContext.sentenceAt(start);if(/(?<![\p{L}\p{N}\p{M}_])(?:angle|latitude|longitude|coordinates?|azimuth|bearing)(?![\p{L}\p{N}\p{M}_])/iu.test(original.slice(sentence.start,start)))return true;}
  return false;
 };
}
