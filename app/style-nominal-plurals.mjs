import {createExtendedPluralRoleReader,NOMINAL_ROLE_EXTENSION_SCOPE} from './style-nominal-role-extensions.mjs';
import {NOMINAL_COMPOUNDS} from './style-compounds.mjs';
import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord} from './style-evidence.mjs';
import {createNounQuantityReader} from './style-noun-quantities.mjs';
export const NOMINAL_PLURAL_SCOPE=' Selected regular plurals of the sixteen explicitly listed LCB phrasal noun roots retain the listed solid or hyphenated noun form. A complete determiner/count plus nominal continuation, a clause-opening plural predicate, or a selected direct-object verb plus nominal boundary establishes the role. Reverse lexical discovery has no fixed preceding-character cutoff. Every establishing cue and connecting space retains original Unicode/combining-mark boundaries, source strikes, literals, tables and unknown ignored/excluded content; identified interior page heads preserve full body selections. Open modal verb forms remain unchanged. This finite regular-s derivation does not establish full dictionary authority, unfamiliar plurals, possessives, names, inflected verbs or general syntax/meaning.'+NOMINAL_ROLE_EXTENSION_SCOPE;
const tailStart=(source,end)=>{let at=end;while(at>0&&/\s/.test(source[at-1]))at--;while(at>0&&!/\s/.test(source[at-1]))at--;return at;};
const cue=/^(?:the|these|those|all|any|their|its|our|your)\s+$/i;
const nominalEnd=/^\s*(?:[.;,:!?)]|$)|^\s+(?:of|for|with|without|under|in|during|are|were|have|shall|must|may|will|include|require|receive|remain|apply)(?![\p{L}\p{N}\p{M}_])/iu;
const objectVerb=/^(?:requires?|provides?|reviews?|records?|documents?|includes?|reports?|authorizes?|allows?|permits?)\s+$/i;
const objectEnd=/^\s*(?:[.;,:!?)]|$)|^\s+(?:of|for|with|without|under|in|during)(?![\p{L}\p{N}\p{M}_])/iu;
export function nominalPluralIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,blocked=styleEvidenceGuard(doc,ctx),quantity=createNounQuantityReader(doc,ctx),extendedRole=createExtendedPluralRoleReader(doc,ctx,quantity),issues=[];
 const valid=r=>r&&!cutsOriginalStyleWord(doc,r.start)&&!cutsOriginalStyleWord(doc,r.end)&&!blocked(r.start,r.end)&&!extendedRole.literalAt(r.start,r.end);
 for(const [open,solid,page]of NOMINAL_COMPOUNDS){
  // All listed bases are verb+particle nouns; the selected regular plural
  // adds s at the end, including standby/driveby, rather than changing y.
  const [verb,particle]=open.split(' '),preferred=solid+'s',pattern=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])'+verb+'[\\s-]+'+particle+'s(?![\\p{L}\\p{N}\\p{M}_])','giu');
  for(const m of source.matchAll(pattern)){
   const start=m.index,end=start+m[0].length,after=source.slice(end);
   if(!valid({start,end})||ctx.at(start)==='Heading'||m[0]===m[0].toUpperCase()||/-[ \t]*\n/.test(m[0])||m[0].replace(/\s+/g,' ').toLowerCase()===preferred)continue;
   if(/^[A-Z]/.test(m[0])&&(/\b[A-Z][a-z]+[\s-]+[A-Z][a-z]+/.test(m[0])||/^\s+(?:(?:and|of|for|the|in|on)\s+)?[A-Z][a-z]/.test(after)))continue;
   const leftStart=tailStart(source,start),left=source.slice(leftStart,start),ending=nominalEnd.exec(after),evidence=[];
   if(ending&&cue.test(left))evidence.push({start:leftStart,end:end+ending[0].length});
   const count=ending&&quantity(start);if(count)evidence.push({start:count.start,end:end+ending[0].length});
   const sentence=ctx.sentenceAt(start),prefix=source.slice(sentence.start,start),opening=/(?:^|[;:])\s*(?:\([a-z\d]+\)\s*)*$/i.exec(prefix),predicate=/^\s+(?:are|were|have|shall|must|may|will|include|require|receive|remain|apply)(?![\p{L}\p{N}\p{M}_])/iu.exec(after);
   if(opening&&predicate)evidence.push({start:sentence.start+opening.index,end:end+predicate[0].length});
   const right=objectEnd.exec(after);if(right&&objectVerb.test(left))evidence.push({start:leftStart,end:end+right[0].length});
   const extended=extendedRole(start,end);if(!extended&&!evidence.some(valid))continue;
   const selectedEnd=extended?.end??end;
   let suggestion=preferred+(extended?.apostrophe||'');if(/^[A-Z]/.test(m[0]))suggestion=suggestion[0].toUpperCase()+suggestion.slice(1);
   const message='LCB page '+page+' explicitly lists “'+solid+'” as a noun or unit modifier. This selected regular plural retains that noun form, with complete nominal evidence. The corresponding verb “'+open+'” remains open. Unfamiliar roles and full dictionary authority remain manual.',rule='Hyphenation: Noun and verb forms';
   issues.push({start,end:selectedEnd,text:doc.text.slice(start,selectedEnd),suggestion,guideId:'lcb',guidePage:page,guidePrintedPage:String(page),rule,category:'Compound noun form',context:ctx.at(start),checkId:'nominal-plurals',conflict:false,message,references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:page,guidePrintedPage:references.lcb.pages[page-1].printedPage,rule,preferred:suggestion,ruleText:message}]});
  }
 }
 return issues.sort((a,b)=>a.start-b.start);
}
