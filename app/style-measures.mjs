import {gpoRemainingMeasurementIssues} from './style-gpo-measurement-remaining.mjs';
import {wholeClockTimeIssues,GPO_WHOLE_CLOCK_TIME_SCOPE} from './style-whole-clock-times.mjs';
import {bareMeasurementEvidenceGuard,GPO_MEASURE_NUMBER} from './style-measurement-source-evidence.mjs';
import {nonzeroMinuteTimeIssues,GPO_NONZERO_MINUTE_TIME_SCOPE} from './style-time-abbreviations-next.mjs';
import {measurementDefinitionIssues} from './style-measurement-definitions.mjs';
import {styleContext} from './style-context.mjs';
import {englishUnitAbbreviationIssues} from './style-english-abbreviations.mjs';
export {GPO_ENGLISH_ABBREVIATION_SCOPE} from './style-english-abbreviations.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
export const GPO_TIME_ABBREVIATION_SCOPE=GPO_WHOLE_CLOCK_TIME_SCOPE+' '+GPO_NONZERO_MINUTE_TIME_SCOPE;
export function measurementIssues(doc,references){
 const ctx=styleContext(doc),issues=[],source=ctx.source;
 const identifier=before=>/\b(?:Section|Article|Item|Form|Schedule|No\.?|Model|Type|Class|Version|Figure|Table|Appendix|Exhibit|Paragraph|Subdivision)\s*$/i.test(before);
 const measurementBlocked=bareMeasurementEvidenceGuard(doc,ctx);
 const add=(m,suggestion,rule,page,message)=>{
  if(measurementBlocked(m,rule==='9.53'))return;
  issues.push({start:m.index,end:m.index+m[0].length,text:doc.text.slice(m.index,m.index+m[0].length),suggestion,guideId:'gpo',guidePage:page,guidePrintedPage:references.gpo.pages[page-1].printedPage,rule,category:'Measurement notation',context:ctx.at(m.index),checkId:'gpo-measures',conflict:false,message,references:[{guideId:'gpo',guideName:'GPO Style Manual',guidePage:page,guidePrintedPage:references.gpo.pages[page-1].printedPage,rule,preferred:suggestion,ruleText:message}]});
 };
 for(const m of source.matchAll(new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])('+GPO_MEASURE_NUMBER+')(kg|mg|μg|km|cm|mm|mL|kL|kW|MW|Pa|Hz)(?![\\p{L}\\p{N}\\p{M}_])','gu')))add(m,m[1]+' '+m[2],'9.56',250,'GPO 9.56 uses a space between a figure and a metric unit symbol. Identifiers and angle notation are excluded.');
 for(const m of source.matchAll(new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])('+GPO_MEASURE_NUMBER+')\\s*(kgs|mgs|kms|cms|mms|mLs|kLs|kWs|MWs|Pas|Hzs)(?![\\p{L}\\p{N}\\p{M}_])','gu'))){
  const unit=m[2].slice(0,-1);
  add(m,m[1]+' '+unit,'9.56',250,'GPO uses the same unit symbol or abbreviation for singular and plural; do not append an s.');
 }
 issues.push(...englishUnitAbbreviationIssues(doc,references));
 for(const m of source.matchAll(new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])('+GPO_MEASURE_NUMBER+')\\s*°\\s*([CFR])(?![\\p{L}\\p{N}\\p{M}_])','gu'))){
  const suggestion=m[1]+' °'+m[2];if(m[0]!==suggestion)add(m,suggestion,'9.53',249,'GPO places a space before a temperature degree mark and closes the mark against C, F or R. Plane-angle degrees retain their separate convention.');
 }
 if(references.lcb){
  const blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx),quoted=billQuotedTermProtection(doc,ctx),original=originalBodyStyleContext(doc)?.source||source;
  const extendedTitle=/^\s+(?:Act|Code|Law|Fund|Account|Authority|Department|Agency|Commission|Board|Association|Foundation|Institute|Program)(?![\p{L}\p{N}\p{M}_])/u;
  for(const m of source.matchAll(/(?<![\p{L}\p{N}\p{M}_])degrees?\s+(celsius|fahrenheit|centigrade)(?![\p{L}\p{N}\p{M}_])/giu)){
   // LCB's capitalization list explicitly retains centigrade, while GPO's
   // footnote prefers Celsius. LCB takes priority for this printed choice;
   // the guide-priority check handles centigrade capitalization separately.
   if(/centigrade/i.test(m[1]))continue;
   const start=m.index+m[0].lastIndexOf(m[1]),end=start+m[1].length,preferred=/fahrenheit/i.test(m[1])?'Fahrenheit':'Celsius',page=preferred==='Fahrenheit'?4:3;
   if(m[1]===preferred||ctx.at(start)==='Heading'||blocked(m.index,end)||literal(m.index,end)||cutsOriginalStyleWord(doc,m.index)||cutsOriginalStyleWord(doc,end)||extendedTitle.test(original.slice(end))||/[-\u2010-\u2015/:\\#@]/u.test(doc.text[m.index-1]||'')||/^[-\u2010-\u2015/:\\#@]|^\.\d|^[’'][\p{L}\p{N}\p{M}_]/u.test(original.slice(end))||identifier(original.slice(Math.max(0,m.index-40),m.index))||quoted({start,end})||quoted({start:m.index,end:start}))continue;
   const message='LCB lists '+preferred+' with an initial capital. This check requires an explicit degrees context. LCB also permits centigrade; a different GPO preference does not flag that accepted form.';
   const cites=[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:page,guidePrintedPage:String(page),rule:'Spelling examples: '+preferred,preferred,ruleText:message}];
   issues.push({start,end,evidenceStart:m.index,evidenceEnd:end,text:doc.text.slice(start,end),suggestion:preferred,guideId:'lcb',guidePage:page,guidePrintedPage:String(page),rule:cites[0].rule,category:'Temperature scale name',context:ctx.at(start),checkId:'temperature-name',conflict:false,message,references:cites});
  }
 }
 issues.push(...measurementDefinitionIssues(doc,references),...nonzeroMinuteTimeIssues(doc,references),...wholeClockTimeIssues(doc,references),...gpoRemainingMeasurementIssues(doc,references));
 return issues;
}
