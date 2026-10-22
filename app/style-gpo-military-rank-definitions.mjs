import {GPO_MILITARY_RANK_DEFINITIONS as authority} from './data/gpo-military-rank-definitions.mjs';
import {styleContext,withStyleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
import {entityNameBoundaryBlocked} from './style-entity-name-boundaries.mjs';
import {styleWordDivisionView} from './style-word-divisions.mjs';

export {GPO_MILITARY_RANK_DEFINITIONS} from './data/gpo-military-rank-definitions.mjs';
export const GPO_MILITARY_RANK_DEFINITION_SCOPE=authority.scope+' Every original country, service, rank-role, whole-rank and parenthesis character is required evidence. Quotes, local wording, created names, headings, tables, unknown exclusions, strikes and technical endpoints are protected. Source matrix column associations, exact passages and full-page fingerprints are verified; no whole-rule or current personnel authority certification is asserted.';
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/gu,'\\$&');
const fold=s=>s.replace(/[\u2010-\u2015]/gu,'-').replace(/\s+/gu,' ').toLowerCase();
const compact=s=>s.replace(/[.\s]/gu,'').toLowerCase();
const byService=new Map();for(const row of authority.rows){if(!byService.has(row.service))byService.set(row.service,new Map());byService.get(row.service).set(fold(row.name),row);}
const names=[...new Set(authority.rows.map(r=>fold(r.name)))].sort((a,b)=>b.length-a.length).map(s=>s.split(' ').map(escape).join('\\s+'));
const pattern=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])(?:United\\s+States|U\\.S\\.)\\s+(?<service>Army|Navy|Coast\\s+Guard|Marine\\s+Corps|Marines|Air\\s+Force)\\s+rank\\s+(?<name>'+names.join('|')+')(?![\\p{L}\\p{N}\\p{M}_])\\s*\\(\\s*(?<symbol>[A-Za-z0-9.](?:[A-Za-z0-9.\\s]{0,48}[A-Za-z0-9.])?)\\s*\\)','giu');
const serviceNames=new Map([['army','Army'],['navy','Navy'],['coast guard','Coast Guard'],['marine corps','Marine Corps'],['marines','Marine Corps'],['air force','Air Force']]);
const fingerprint=s=>{let n=2166136261;for(let i=0;i<s.length;i++)n=Math.imul(n^s.charCodeAt(i),16777619);return(n>>>0).toString(16);};
const nameTail=/^\s+(?:[\p{Lu}][\p{L}\p{M}]*\s+){0,3}(?:Act|Code|Law|Fund|Account|Authority|Department|Agency|Commission|Board|Association|Foundation|Institute|Program|Company|Corporation|Council|Office|Bureau|Center)(?![\p{L}\p{N}\p{M}_])/u;
const knownWords=new Set(['united','states','army','navy','coast','guard','marine','corps','marines','air','force','rank',...authority.rows.flatMap(r=>r.name.match(/\p{L}+/gu)||[]).map(s=>s.toLowerCase())]);

function rankIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,originalContext=originalBodyStyleContext(doc)||ctx,original=originalContext.source;
 const blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx),quoted=billQuotedTermProtection(doc,ctx),issues=[];
 const pages=new Map(authority.sourcePages.map(meta=>{const candidates=references?.gpo?.pages?.filter(p=>p.page===meta.page)||[],page=candidates.length===1?candidates[0]:null;return[meta.page,page&&typeof page.text==='string'&&page.text.length===meta.length&&fingerprint(page.text)===meta.fingerprint&&page.text.slice(meta.headerPassage.start,meta.headerPassage.end)===meta.headerPassage.text?page:null]}));
 for(const m of source.matchAll(pattern)){
  const service=serviceNames.get(fold(m.groups.service)),row=byService.get(service)?.get(fold(m.groups.name)),actual=m.groups.symbol.trim();if(!row||actual===row.symbol||compact(actual)!==compact(row.symbol))continue;
  const page=pages.get(row.page),witness=row.sourcePassage;if(!page||page.text.slice(witness.start,witness.end)!==witness.text)continue;
  const evidenceStart=m.index,evidenceEnd=evidenceStart+m[0].length,prior=original.slice(0,evidenceStart),after=original.slice(evidenceEnd);
  if(ctx.at(evidenceStart)==='Heading'||originalContext.at(evidenceStart)==='Heading'||blocked(evidenceStart,evidenceEnd)||literal(evidenceStart,evidenceEnd)||quoted({start:evidenceStart,end:evidenceEnd})||[evidenceStart,evidenceEnd].some(i=>cutsOriginalStyleWord(doc,i))||entityNameBoundaryBlocked(doc.text,source,original,evidenceStart,evidenceEnd)||nameTail.test(after)||/^\s*[*^+−±×÷=]/u.test(after)||/[\p{L}\p{N}\p{M}_]$/u.test(prior))continue;
  if(/(?<![\p{L}\p{N}\p{M}_])[Tt]he\s+$/u.test(prior)&&/^\s+is\s+(?:hereby\s+)?(?:created|established|designated)(?![\p{L}\p{N}\p{M}_])/u.test(after))continue;
  if([...m[0].matchAll(/-/gu)].some(h=>! /[-\u2010\u2011\u2013]/u.test(doc.text[evidenceStart+h.index]||'')))continue;
  const start=evidenceStart+m[0].lastIndexOf(actual),end=start+actual.length;
  const message='The fixed GPO military-rank matrix prints “'+row.symbol+'” for the whole rank “'+row.name+'” in its '+row.physicalColumn+' column. The explicit United States service and rank-role cue establish this same-letter/digit definition. Compare case, periods and spacing only; no nationality, office, pay grade, current identity or different abbreviation is inferred.';
  const citation={guideId:'gpo',guideName:'GPO Style Manual',guidePage:row.page,guidePrintedPage:page.printedPage,rule:'9.29 (military rank table)',preferred:row.symbol,ruleText:message,sourcePassage:witness};
  issues.push({start,end,evidenceStart,evidenceEnd,text:doc.text.slice(start,end),suggestion:row.symbol,guideId:'gpo',guidePage:row.page,guidePrintedPage:page.printedPage,rule:citation.rule,category:'Military rank definition',context:ctx.at(start),checkId:'gpo-military-rank-definitions',conflict:false,message,militaryRankDefinitionEvidence:{service,name:row.name,symbol:row.symbol,physicalColumn:row.physicalColumn,evidenceStart,evidenceEnd,sourcePageSHA256:authority.sourcePages.find(p=>p.page===row.page).sha256},references:[citation]});
 }
 return issues;
}
export function gpoMilitaryRankDefinitionIssues(doc,references){
 const view=styleWordDivisionView(doc,{knownWords,knownWordsOnly:true,preserveRemainingWords:true});if(!view)return withStyleContext(doc,()=>rankIssues(doc,references));
 const found=withStyleContext(view.doc,()=>rankIssues(view.doc,references));return view.restore(found).map((issue,n)=>{const evidenceStart=view.toSource(found[n].evidenceStart),evidenceEnd=view.toSource(found[n].evidenceEnd,true);return {...issue,evidenceStart,evidenceEnd,militaryRankDefinitionEvidence:{...issue.militaryRankDefinitionEvidence,evidenceStart,evidenceEnd}}});
}
