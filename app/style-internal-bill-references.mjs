import {styleContext}from './style-context.mjs';
import {styleEvidenceGuard}from './style-evidence.mjs';
export const INTERNAL_BILL_REFERENCE_SCOPE='Reader-assisted document-local section identity. A complete enacted bill with an active SECTION 1/SEC. 1 heading establishes its own section catalogue. Explicit numeric “Section(s) … of this bill” references are compared against that catalogue, preserving physical source offsets. Missing active targets are flagged for confirmation, without a replacement or a claim that the guide determines substantive validity. Statutory/code references, quoted copy, removed text, unidentified excerpts and malformed chains remain protected. This does not resolve external bill references or validate the law.';
export function internalBillReferenceIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,blocked=styleEvidenceGuard(doc,ctx);
 const enact=/\bdo\s+enact\s+as\s+follows\s*:/iu.exec(source);if(!enact)return [];
 const labels=[...source.matchAll(/(?:^|\n|\.\s+)[ \t]*(?<heading>(?:SECTION|SEC\.)\s*(?<number>\d+(?:\.\d+)*)\.(?!\d))/gu)].filter(m=>m.index>=enact.index&&!blocked(m.index+m[0].lastIndexOf(m.groups.heading),m.index+m[0].length));
 const targets=new Set(labels.map(m=>m.groups.number));if(!targets.has('1'))return [];
 const findings=[];
 for(const m of source.matchAll(/(?<![\p{L}\p{N}_])Sections?\s+(?<chain>\d+(?:\.\d+)*(?:\s*\([A-Za-z0-9]+\))*(?:\s*(?:,\s*(?:(?:and|or)\s+)?|(?:and|or|to|through)\s+)\d+(?:\.\d+)*(?:\s*\([A-Za-z0-9]+\))*)*)\s+of\s+this\s+bill(?![\p{L}\p{N}_])/giu)){
  const start=m.index,end=start+m[0].length;if(ctx.at(start)!=='Bill'||blocked(start,end))continue;
  const clean=m.groups.chain.replace(/\([A-Za-z0-9]+\)/gu,''),members=[...clean.matchAll(/\d+(?:\.\d+)*/gu)].map(n=>n[0]),missing=members.filter(n=>!targets.has(n));
  const range=/^(\d+)\s+(?:to|through)\s+(\d+)$/iu.exec(clean.trim());
  if(range){const a=Number(range[1]),b=Number(range[2]);if(b<a||b-a>1500)continue;for(let n=a;n<=b;n++)if(!targets.has(String(n)))missing.push(String(n));}
  const unique=[...new Set(missing)];if(!unique.length)continue;
  findings.push({start,end,text:doc.text.slice(start,end),matchText:m[0].replace(/\s+/gu,' ').trim(),suggestion:null,checkId:'lcb-internal-bill-reference-review',reviewSuggested:true,reviewKind:'internal-bill-reference',category:'Reference Consistency Review',guideId:'lcb',guidePage:22,guidePrintedPage:'22',rule:'Code Sections and Constitution · document-local review',context:'Bill',conflict:false,missingTargets:unique,sectionCatalogue:[...targets],message:'Review Suggested: '+unique.map(n=>'Section '+n).join(', ')+' is referenced but has no active bill-section heading in the uploaded Current Version. Confirm the intended target and PDF reading; no replacement is asserted.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:22,guidePrintedPage:'22',rule:'Code Sections and Constitution',preferred:null,ruleText:'LCB gives section-reference notation examples. Missing-target review is an additional document-local consistency check; substantive reference validity requires reader judgment.'}]});
 }
 return findings;
}
