import {styleContext,withStyleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
import {entityNameBoundaryBlocked} from './style-entity-name-boundaries.mjs';
import {originalTemporalNameBlocked} from './style-time-abbreviations-next.mjs';
import {styleWordDivisionView} from './style-word-divisions.mjs';

export const GPO_TIMEZONE_DEFINITION_SCOPE='GPO 9.47 supplies 27 time-zone name/symbol pairs. A complete listed full name immediately followed by a parenthesized recognized listed symbol establishes a finite definition check: preserve the printed symbol case (including ChST), close interletter spaces/dots, and compare recognized wrong pairs with that exact name’s symbol. Every authority row is verified against the original reference page, with an exact source passage. Full names alone, isolated or unknown symbols, zone applicability, geography, offsets, clock conversion, seasonal/daylight choices, abbreviation necessity and full-name capitalization remain outside this check. Original source boundaries, complete name/separator/parenthesis evidence, quotations and bill-local wording, apparent names, headings, tables, strikes, exclusions and recognized PDF word divisions remain protected.';

// The finite forms were checked against original PDF page 248 (printed 234).
// This registry is not authority by itself: each used pair must also match
// one complete entry in the supplied reference's numbered source section.
const pairs=[
 ['AKDT','Alaska daylight time'],['AKST','Alaska standard time'],['AKT','Alaska time'],
 ['AST','Atlantic standard time'],['AT','Atlantic time'],
 ['CDT','central daylight time'],['CST','central standard time'],['CT','central time'],
 ['ChST','Chamorro standard time'],['DST','daylight saving time'],
 ['EDT','eastern daylight time'],['EST','eastern standard time'],['ET','eastern time'],
 ['GCT','Greenwich civil time'],['GMAT','Greenwich mean astronomical time'],['GMT','Greenwich mean time'],
 ['HDT','Hawaii-Aleutian daylight time'],['HST','Hawaii-Aleutian standard time'],['LST','local standard time'],
 ['MDT','mountain daylight time'],['MST','mountain standard time'],['MT','mountain time'],
 ['PDT','Pacific daylight time'],['PST','Pacific standard time'],['PT','Pacific time'],
 ['SST','Samoan standard time'],['UTC','coordinated universal time']
];
const expected=new Map(pairs),knownSymbols=new Set(pairs.map(([symbol])=>symbol.toLowerCase()));
const knownWords=new Set(pairs.flatMap(([,name])=>name.match(/\p{L}+/gu).map(w=>w.toLowerCase())));
const escape=text=>text.replace(/[.*+?^${}()|[\]\\]/gu,'\\$&');
const names=pairs.map(([,name])=>name).sort((a,b)=>b.length-a.length).map(name=>name.split(' ').map(escape).join('\\s+'));
const pattern=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])('+names.join('|')+')\\s*\\(\\s*([A-Za-z](?:[.\\s]*[A-Za-z]){1,3}\\.?)\\s*\\)','giu');
const nameSymbols=new Map(pairs.map(([symbol,name])=>[name.toLowerCase(),symbol]));

function sourcePairs(references){
 const page=references?.gpo?.pages?.find(p=>p.page===248);
 if(typeof page?.text!=='string')return null;
 const start=page.text.indexOf('9.47.'),end=page.text.indexOf('Acronyms and coined words',start);
 if(start<0||end<=start)return null;
 const section=page.text.slice(start,end);
 if(!/^9\.47\.\s+The following forms are to be used when abbreviating names of\s+time zones:/u.test(section))return null;
 const markers=[...section.matchAll(/(?:^|\n)([A-Za-z]{2,4})—/gu)],rows=new Map();
 for(let n=0;n<markers.length;n++){
  const marker=markers[n],a=marker.index+(marker[0].startsWith('\n')?1:0),b=markers[n+1]?.index??section.length;
  const text=section.slice(a,b).trimEnd(),symbol=marker[1],name=text.slice(symbol.length+1).replace(/\([^)]*\)/gu,' ').replace(/\s+/gu,' ').trim();
  if(expected.get(symbol)!==name)continue;
  // Ambiguous duplicate source entries cannot establish one authoritative row.
  const sourceStart=start+a;
  rows.set(symbol,rows.has(symbol)?null:{start:sourceStart,end:sourceStart+text.length,text,page:page.page});
 }
 return {page,rows};
}

function definitionIssues(doc,references){
 const authority=sourcePairs(references);if(!authority)return [];
 const ctx=styleContext(doc),source=ctx.source,original=originalBodyStyleContext(doc)?.source||source;
 const blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx),quoted=billQuotedTermProtection(doc,ctx),issues=[];
 for(const m of source.matchAll(pattern)){
  const wanted=nameSymbols.get(m[1].replace(/\s+/gu,' ').toLowerCase()),actual=m[2],compact=actual.replace(/[.\s]/gu,'');
  const passage=authority.rows.get(wanted),evidenceStart=m.index,evidenceEnd=evidenceStart+m[0].length;
  if(!passage||!knownSymbols.has(compact.toLowerCase())||actual===wanted)continue;
  // styleContext folds narrative dashes to hyphens. Such punctuation cannot
  // manufacture the table's compound name Hawaii-Aleutian.
  if([...m[1].matchAll(/-/gu)].some(h=>! /[-\u2010\u2011]/u.test(doc.text[evidenceStart+h.index]||'')))continue;
  if(ctx.at(evidenceStart)==='Heading'||blocked(evidenceStart,evidenceEnd)||literal(evidenceStart,evidenceEnd)||quoted({start:evidenceStart,end:evidenceEnd})||cutsOriginalStyleWord(doc,evidenceStart)||cutsOriginalStyleWord(doc,evidenceEnd)||entityNameBoundaryBlocked(doc.text,source,original,evidenceStart,evidenceEnd)||originalTemporalNameBlocked(original,evidenceStart,evidenceEnd))continue;
  const start=evidenceStart+m[0].lastIndexOf(actual),end=start+actual.length;
  const message='GPO 9.47 explicitly pairs '+expected.get(wanted)+' with '+wanted+'. This complete written name establishes the symbol; preserve its exact case without dots or interletter spaces. This check does not select a zone from geography, a date, a clock or daylight-saving applicability.';
  const citation={guideId:'gpo',guideName:'GPO Style Manual',guidePage:authority.page.page,guidePrintedPage:authority.page.printedPage,rule:'9.47',preferred:wanted,ruleText:message,sourcePassage:passage};
  issues.push({start,end,evidenceStart,evidenceEnd,text:doc.text.slice(start,end),suggestion:wanted,guideId:'gpo',guidePage:authority.page.page,guidePrintedPage:authority.page.printedPage,rule:'9.47',category:'Time-zone definition',context:ctx.at(start),checkId:'gpo-timezone-definitions',conflict:false,message,references:[citation]});
 }
 return issues;
}

export function gpoTimezoneDefinitionIssues(doc,references){
 const view=styleWordDivisionView(doc,{knownWords,knownWordsOnly:true,preserveRemainingWords:true});
 if(!view)return withStyleContext(doc,()=>definitionIssues(doc,references));
 const issues=withStyleContext(view.doc,()=>definitionIssues(view.doc,references));
 return view.restore(issues).map((issue,n)=>({...issue,evidenceStart:view.toSource(issues[n].evidenceStart),evidenceEnd:view.toSource(issues[n].evidenceEnd,true)}));
}
