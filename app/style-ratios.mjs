import {styleContext,styleRangeBlocked} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord} from './style-evidence.mjs';
import {ratioEndpoint}from './style-ratio-endpoints.mjs';
const introduced=/(?<![\p{L}\p{N}\p{M}_])(?:ratios?|proportions?|odds)(?:\s+(?:of|is|are))?\s+/giu;
const level='(?:(?:transitional\\s+)?kindergarten|prekindergarten|(?:elementary|middle|secondary|high)\\s+schools?|grades?\\s+\\d+(?:\\s+to\\s+\\d+)?)';
// A repeated ratio inherits the label through a direct series or a selected
// educational qualifier; ordinary duration ranges do not inherit that role.
const qualifier='(?:\\s+for\\s+'+level+'(?:\\s+and\\s+'+level+')?)?';
const next=new RegExp('^('+qualifier+'\\s*(?:,\\s*(?:(?:and|or)\\s+)?|(?:and|or)\\s+))','i');
export const RATIO_SOURCE_EVIDENCE_SCOPE='Explicit ratio, proportion and odds labels establish complete canonical safe-integer written quantities, including multiword and scale-and-remainder forms, or whole integer/grouped/decimal figures. Figures retain their exact lexemes beyond JavaScript numeric limits. Direct series and selected educational qualifiers inherit only intact complete label/prior-expression evidence. Complete original Unicode boundaries, malformed endpoint suffixes, source strikes, wrapped literals, tables and unknown excluded or ignored bridges are protected; recognized interior page heads retain physical ranges. Noncanonical or unsafe written values, ambiguous remainder/coordination, fractions, intended ratio meaning and arbitrary coordination remain manual.';
export function explicitRatioParts(source,doc=null,ctx=doc?styleContext(doc):null){
 const found=new Map(),blocked=doc?styleEvidenceGuard(doc,ctx):()=>false;
 const valid=part=>!/[\p{L}\p{N}\p{M}_]/u.test(source[part.end]||'')&&!/^(?:[.,]\s*\d|[\/⁄_])/u.test(source.slice(part.end))&&(!doc||!cutsOriginalStyleWord(doc,part.evidenceStart)&&!cutsOriginalStyleWord(doc,part.end)&&!blocked(part.evidenceStart,part.end)&&!styleRangeBlocked(doc,part.evidenceStart,part.end));
 const pair=(at,evidenceStart)=>{const first=ratioEndpoint(source,at,{first:true});if(!first)return null;const separator=/^\s*(to(?![\p{L}\p{N}\p{M}_])|:)\s*/iu.exec(source.slice(first.end));if(!separator)return null;const second=ratioEndpoint(source,first.end+separator[0].length);return second?{start:first.start,end:second.end,evidenceStart,evidenceEnd:second.end,first:first.raw,firstFormatted:first.formatted,separator:separator[1].toLowerCase(),second:second.raw,secondFormatted:second.formatted}:null;};
 for(const m of source.matchAll(introduced)){
  let part=pair(m.index+m[0].length,m.index);if(!part||!valid(part))continue;found.set(part.start,part);
  while(true){const n=next.exec(source.slice(part.end));if(!n)break;const another=pair(part.end+n[0].length,part.evidenceStart);if(!another||!valid(another)||!/^\s*(?:[,;.)]|$)|^\s+(?:for|in|among|under|when|if)\b/iu.test(source.slice(another.end)))break;part=another;found.set(part.start,part);}
 }
 return [...found.values()].sort((a,b)=>a.start-b.start);
}
export function ratioIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[];
 for(const part of explicitRatioParts(source,doc,ctx)){
  const {start,end}=part;
  if(ctx.at(start)==='Heading'||ctx.tableAt(start)||ctx.literalAt(start,end))continue;
  const first=part.firstFormatted,second=part.secondFormatted;
  const suggestion=part.separator===':'?first+':'+second:first+' to '+second;
  if(source.slice(start,end).replace(/\s+/g,' ').trim()===suggestion)continue;
  const message='This expression is explicitly introduced as a ratio, proportion or odds. LCB page 23 uses figures for to-ratios; ordinary ranges of years or other quantities use their separate bill/digest rules.';
  issues.push({start,end,evidenceStart:part.evidenceStart,evidenceEnd:part.evidenceEnd,text:doc.text.slice(start,end),suggestion,guideId:'lcb',guidePage:23,guidePrintedPage:'23',rule:'Numerals: Proportions/Ratios',category:'Ratio form',context:ctx.at(start),checkId:'ratios',conflict:false,message,references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:23,guidePrintedPage:references.lcb.pages[22].printedPage,rule:'Numerals: Proportions/Ratios',preferred:suggestion,ruleText:message}]});
 }
 return issues;
}
