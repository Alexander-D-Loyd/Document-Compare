import {canonicalWrittenValue} from './style-cardinal-values.mjs';
import {nounHeadPattern} from './style-noun-heads.mjs';
import {styleContext} from './style-context.mjs';
import {writtenQuantityEvidenceGuard,writtenCardinalRuns} from './style-written-quantity-evidence.mjs';
const scale=/^(?:hundred|thousand|million|billion|trillion)$/;
export const COMPLETE_SCALE_COUNT_SCOPE=' Complete lexical scale-and-remainder runs have no fixed19-token cap. Every internal and must follow a recognized scale; only a complete canonical safe-integer value and recognized intact noun head create a whole correction. Invalid repeated scales, conjunctions and incomplete values protect their fragments from isolated numeral corrections. Unknown mathematical meanings, arbitrary noun roles, numerical ranges, general sentence parsing and whole-rule compliance remain incomplete.';
const duration='(?:(?:business|calendar|court|school|academic|consecutive|working)[\\s-]+)?(?:days?|weeks?|months?|years?|hours?|minutes?|seconds?)';
const head=new RegExp('^\\s+(?:schooldays?|'+duration+'|'+nounHeadPattern+')\\b(?=\\s*(?:[.;,:!?)]|$)|\\s+(?:and|or|of|in|for|with|without|is|are|was|were|shall|must|may|will|remain|remains|apply|applies|qualify|qualifies)\\b)','i');
export function andCardinalParts(source){
 const parts=[];
 for(const run of writtenCardinalRuns(source)){
  const normalized=source.slice(run.start,run.end).toLowerCase().replace(/[\s-]+/g,' '),words=normalized.split(' ');
  if(!words.includes('and')||!words.some(w=>scale.test(w)))continue;
  const conjunctions=words.every((w,i)=>w!=='and'||scale.test(words[i-1]||'')&&words[i+1]&&words[i+1]!=='and');
  const canonical=conjunctions?canonicalWrittenValue(words.filter(w=>w!=='and').join(' ')):null;
  // Invalid complete scale runs protect their fragments from the ordinary
  // numeral check; only a canonical whole value can create a correction.
  parts.push({...run,value:canonical!==null&&canonical>=100?canonical:null});
 }
 return parts;
}
export function compoundCardinalIssues(doc,references){
 const ctx=styleContext(doc),issues=[];
 const blocked=writtenQuantityEvidenceGuard(doc,ctx);
 for(const part of andCardinalParts(ctx.source)){
  if(part.value===null)continue;
  const noun=head.exec(ctx.source.slice(part.end));
  if(ctx.at(part.start)==='Heading'||!noun||blocked(part.start,part.end,part.end+noun[0].length))continue;
  const text=doc.text.slice(part.start,part.end),before=ctx.source.slice(ctx.sentenceAt(part.start).start,part.start).replace(/^[\s“”"’']*(?:\([a-z\d]+\)\s*)*/i,'').trim();
  if(!before||text===text.toUpperCase()||/\b[A-Z][a-z]+[\s-]+[A-Z][a-z]+/.test(text)||/\b(?:Section|Article|Chapter|Part|Division|Paragraph|Subdivision|No\.?)\s*$/i.test(before))continue;
  const suggestion=part.value.toLocaleString('en-US'),message='A complete canonical written count of 10 or above uses figures under both LCB bill/digest rules and GPO 12.4. This check requires a recognized count noun and boundary; unclear bare series and sentence openings remain unchanged.';
  issues.push({...part,text,suggestion,guideId:'lcb',guidePage:21,guidePrintedPage:references.lcb.pages[20].printedPage,rule:'Numerals: Whole written counts',category:'Numeral form',context:ctx.at(part.start),checkId:'compound-cardinals',conflict:false,message,references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:21,guidePrintedPage:references.lcb.pages[20].printedPage,rule:'Numerals: Bill/Digest cardinals',preferred:suggestion,ruleText:message},{guideId:'gpo',guideName:'GPO Style Manual',guidePage:287,guidePrintedPage:references.gpo.pages[286].printedPage,rule:'12.4',preferred:suggestion,ruleText:'Numbers of 10 or more use figures.'}]});
 }
 return issues;
}
