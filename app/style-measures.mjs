import {nonzeroMinuteTimeIssues,GPO_NONZERO_MINUTE_TIME_SCOPE} from './style-time-abbreviations-next.mjs';
import {measurementDefinitionIssues} from './style-measurement-definitions.mjs';
import {styleContext} from './style-context.mjs';
import {englishUnitAbbreviationIssues} from './style-english-abbreviations.mjs';
export {GPO_ENGLISH_ABBREVIATION_SCOPE} from './style-english-abbreviations.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
export const GPO_TIME_ABBREVIATION_SCOPE='GPO 9.54/9.55: exact 1–12 hours with :00 and a.m./p.m., including uppercase meridian letters and layout whitespace, and redundant o’clock with numeric hours and time abbreviations. Complete active source evidence, original Unicode/technical endpoints, quotations, bill-local forms, names, tables and identifiers remain protected. Complete finite document-local creation names supply negative protection without establishing legal identity. Reader-identified interior page heads preserve physical offsets. Written hours, military time, noon/midnight interpretation and unrecognized typography remain manual.'+' '+GPO_NONZERO_MINUTE_TIME_SCOPE;
// This is negative name evidence only: the original complete declaration
// prevents a time-format edit inside its title, even if later source masking
// removes a title word or its creation cue. It creates no registry identity.
const timeNameHead='(?:Act|Code|Law|Fund|Account|Authority|Department|Agency|Commission|Board|Association|Foundation|Institute|Program|Company|Corporation|Council|Office|Bureau)';
const timeCreationTail=new RegExp('^\\s+(?:[\\p{Lu}][\\p{L}\\p{M}]*\\s+){0,3}'+timeNameHead+'\\s+is\\s+(?:hereby\\s+)?(?:created|established)(?=\\s*(?:[.;!?]|$))','u');
function sourceCreatedTimeName(original,start,end){
 return /(?<![\p{L}\p{N}\p{M}_./:\\#@’'\-])[Tt]he\s+$/u.test(original.slice(0,start))&&timeCreationTail.test(original.slice(end));
}
export function measurementIssues(doc,references){
 const ctx=styleContext(doc),issues=[],source=ctx.source;
 const identifier=before=>/\b(?:Section|Article|Item|Form|Schedule|No\.?|Model|Type|Class|Version|Figure|Table|Appendix|Exhibit|Paragraph|Subdivision)\s*$/i.test(before);
 let timeGuards=null;
 const timeBlocked=m=>{
  timeGuards??={blocked:styleEvidenceGuard(doc,ctx),literal:originalStyleLiteralGuard(doc,ctx),quoted:billQuotedTermProtection(doc,ctx),original:originalBodyStyleContext(doc)?.source||source};
  const start=m.index,end=start+m[0].length,original=timeGuards.original,before=original.slice(Math.max(0,start-40),start),after=original.slice(end);
  return sourceCreatedTimeName(original,start,end)||timeGuards.blocked(start,end)||timeGuards.literal(start,end)||timeGuards.quoted({start,end})||cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,end)||identifier(before)||/[\p{L}\p{N}\p{M}_./:\\#@’'\-]$/u.test(before)||/^[\p{L}\p{N}\p{M}_/:\\#@’'\-]|^\.[\p{L}\p{N}\p{M}_]/u.test(after)||/^\s+(?:Act|Code|Law|Fund|Account|Authority|Department|Agency|Commission|Board|Association|Foundation|Institute|Program)(?![\p{L}\p{N}\p{M}_])/u.test(after);
 };
 const add=(m,suggestion,rule,page,message,time=false)=>{
  if(time?ctx.at(m.index)==='Heading'||timeBlocked(m):ctx.at(m.index)==='Heading'||ctx.tableAt(m.index)||ctx.literalAt(m.index,m.index+m[0].length)||identifier(source.slice(Math.max(0,m.index-40),m.index))||[...(doc.struck||[]),...doc.blocks.filter(b=>b.ignored).map(b=>({start:b.start,end:b.end}))].some(r=>r.start<m.index+m[0].length&&r.end>m.index))return;
  issues.push({start:m.index,end:m.index+m[0].length,text:doc.text.slice(m.index,m.index+m[0].length),suggestion,guideId:'gpo',guidePage:page,guidePrintedPage:references.gpo.pages[page-1].printedPage,rule,category:'Measurement notation',context:ctx.at(m.index),checkId:'gpo-measures',conflict:false,message,references:[{guideId:'gpo',guideName:'GPO Style Manual',guidePage:page,guidePrintedPage:references.gpo.pages[page-1].printedPage,rule,preferred:suggestion,ruleText:message}]});
 };
 for(const m of source.matchAll(/\b(\d+(?:\.\d+)?)(kg|mg|μg|km|cm|mm|mL|kL|kW|MW|Pa|Hz)\b/g))add(m,m[1]+' '+m[2],'9.56',250,'GPO 9.56 uses a space between a figure and a metric unit symbol. Identifiers and angle notation are excluded.');
 for(const m of source.matchAll(/\b(\d+(?:\.\d+)?)\s*(kgs|mgs|kms|cms|mms|mLs|kLs|kWs|MWs|Pas|Hzs)\b/g)){
  const unit=m[2].slice(0,-1);
  add(m,m[1]+' '+unit,'9.56',250,'GPO uses the same unit symbol or abbreviation for singular and plural; do not append an s.');
 }
 issues.push(...englishUnitAbbreviationIssues(doc,references));
 for(const m of source.matchAll(/\b(\d+(?:\.\d+)?)\s*°\s*([CFR])\b/g)){
  const suggestion=m[1]+' °'+m[2];if(m[0]!==suggestion)add(m,suggestion,'9.53',249,'GPO places a space before a temperature degree mark and closes the mark against C, F or R. Plane-angle degrees retain their separate convention.');
 }
 for(const m of source.matchAll(/\b(\d{1,2}):00\s+([ap]\.\s*m\.)/gi)){
  if(Number(m[1])>=1&&Number(m[1])<=12)add(m,m[1]+' '+m[2].toLowerCase().replace(/\s/g,''),'9.54',250,'GPO 9.54 omits :00 for an exact hour and uses a.m. or p.m. Complete hour and meridian evidence is required; noon/midnight meanings and other notation remain manual.',true);
 }
 for(const m of source.matchAll(/\b(\d{1,2})\s+o[’']clock\s+([ap]\.\s*m\.)/gi)){
  if(Number(m[1])>=1&&Number(m[1])<=12)add(m,m[1]+' '+m[2].toLowerCase().replace(/\s/g,''),'9.55',250,'GPO 9.55 does not use o’clock with an abbreviation of time. This check requires a complete numeric hour and a.m./p.m. expression.',true);
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
 issues.push(...measurementDefinitionIssues(doc,references),...nonzeroMinuteTimeIssues(doc,references));
 return issues;
}
