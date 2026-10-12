import {styleContext,withStyleContext}from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord}from './style-evidence.mjs';
import {styleWordDivisionView}from './style-word-divisions.mjs';

const word="[A-Za-z]+(?:[-’'][A-Za-z]+)*",phrase=new RegExp('(?:'+word+'\\s+){0,19}'+word+'\\s*$','u');
const small=new Set('a an the and or of in for on to with at by from'.split(' '));
const fold=s=>s.replace(/\s+/g,' ').trim();
const historical=/\b(?:previous|prior|former|legacy|old|original|existing)\s+(?:statute|definition|wording|law|text|name|phrase)\s+(?:calls?|called|names?|named|defines?|defined|mentions?|mentioned|uses?|used|refers?\s+to)\s+(?:the\s+)?$/iu;
function expansionStart(text,group){
 const words=[...text.matchAll(/[A-Za-z]+(?:[-’'][A-Za-z]+)*/gu)];
 const matches=selected=>{const pieces=selected.flatMap(w=>w[0].split('-')),modes=[selected.map(w=>w[0]),selected.map(w=>w[0]).filter(w=>!small.has(w.toLowerCase())),pieces,pieces.filter(w=>!small.has(w.toLowerCase()))];return modes.some(ws=>ws.length>=2&&ws.map(w=>w[0].toUpperCase()).join('')===group);};
 for(let n=0;n<words.length-1;n++){
  const selected=words.slice(n);if(!matches(selected))continue;
  if(small.has(words[n][0].toLowerCase())&&matches(selected.slice(1)))continue;
  return words[n].index;
 }
 return null;
}
function detector(doc){
 const ctx=styleContext(doc),source=ctx.source,blocked=styleEvidenceGuard(doc,ctx),noLiteral=styleEvidenceGuard(doc,{...ctx,literalAt:()=>false}),out=[];
 const singles=[...source.matchAll(/‘[^’]*’|(?<![\p{L}\p{N}\p{M}_])'[^'\n]*'(?![\p{L}\p{N}\p{M}_])/gu)].map(m=>({start:m.index,end:m.index+m[0].length}));
 for(const m of source.matchAll(/\((?<initials>[A-Z]{2,10})\)/gu)){
  const before=source.slice(Math.max(0,m.index-450),m.index),p=phrase.exec(before);if(!p)continue;
  const at=expansionStart(p[0],m.groups.initials);if(at===null)continue;
  const start=m.index-before.length+p.index+at,end=m.index,endTrim=start+source.slice(start,end).trimEnd().length,evidenceEnd=m.index+m[0].length;
  if(ctx.at(start)==='Heading'||blocked(start,evidenceEnd)||singles.some(r=>r.start<evidenceEnd&&r.end>start)||cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,endTrim)||historical.test(source.slice(Math.max(0,start-180),start)))continue;
  out.push({initials:m.groups.initials,start,end:endTrim,text:doc.text.slice(start,endTrim),expansion:fold(source.slice(start,endTrim)),evidenceStart:start,evidenceEnd,evidenceText:fold(source.slice(start,evidenceEnd)),clauseText:doc.text.slice(start,evidenceEnd),kind:'Parenthetical source expansion'});
 }
 for(const m of source.matchAll(/(?<![\p{L}\p{N}\p{M}_])(?<open>[“"])(?<initials>[A-Z]{2,10})(?<close>[”"])\s+(?:means|shall\s+mean|is\s+defined\s+as)\s+(?<expansion>[A-Za-z]+(?:[-’'][A-Za-z]+)*(?:\s+[A-Za-z]+(?:[-’'][A-Za-z]+)*){1,19})(?=\s*[.;!?]|$)/gu)){
  if(m.groups.open==='“'?m.groups.close!=='”':m.groups.close!=='"')continue;
  const initialsStart=m.index+1,quoteEnd=initialsStart+m.groups.initials.length+1,start=m.index+m[0].lastIndexOf(m.groups.expansion),end=start+m.groups.expansion.length,evidenceEnd=m.index+m[0].length;
  // A directly defined abbreviation is a source witness only when the entire
  // definition expansion agrees, apart from a leading article/connectors.
  const words=m.groups.expansion.match(/[A-Za-z]+(?:[-’'][A-Za-z]+)*/gu),modes=[words,words.filter(w=>!small.has(w.toLowerCase())),words.flatMap(w=>w.split('-')),words.flatMap(w=>w.split('-')).filter(w=>!small.has(w.toLowerCase()))];
  if(!modes.some(ws=>ws.length>=2&&ws.map(w=>w[0].toUpperCase()).join('')===m.groups.initials)||ctx.at(start)==='Heading'||noLiteral(m.index,evidenceEnd)||ctx.literalRanges.some(r=>r.start<quoteEnd&&r.end>m.index&&(r.start<m.index||r.end>quoteEnd))||singles.some(r=>r.start<evidenceEnd&&r.end>m.index)||cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,end))continue;
  const before=source.slice(Math.max(0,m.index-160),m.index);if(/\b(?:states?|said|says|quoted|quotes|read|reads|defines?|defined|insert|strike|delete|replace)\s*[:,]?\s*$/iu.test(before))continue;
  out.push({initials:m.groups.initials,start,end,text:doc.text.slice(start,end),expansion:fold(m.groups.expansion),evidenceStart:m.index,evidenceEnd,evidenceText:fold(source.slice(m.index,evidenceEnd)),clauseText:doc.text.slice(m.index,evidenceEnd),kind:'Direct abbreviation definition'});
 }
 return out.sort((a,b)=>a.evidenceStart-b.evidenceStart);
}
export function localInitialismExpansions(doc){
 const view=styleWordDivisionView(doc,{includeLiterals:true,preserveRemainingWords:true}),reviewDoc=view?.doc||doc,found=withStyleContext(reviewDoc,()=>detector(reviewDoc));
 if(!view)return found;
 return view.restore(found).map(r=>{const evidenceStart=view.toSource(r.evidenceStart),evidenceEnd=view.toSource(r.evidenceEnd,true);return {...r,evidenceStart,evidenceEnd,text:doc.text.slice(r.start,r.end),clauseText:doc.text.slice(evidenceStart,evidenceEnd)};});
}
export const LOCAL_INITIALISM_SCOPE='Undivided unfamiliar uppercase groups can receive conditional article/pronunciation review when an earlier intact parenthetical expansion or direct abbreviation definition supplies matching initial letters. Leading function words and intact hyphenated words support selected expansion spellings. The full source expansion is shown as document-local evidence, not proof of letter-by-letter pronunciation, legal identity or scope. Known word-pronounced acronyms retain their exception; existing precise checks retain priority. Future/unexpanded groups, headings, quoted/historical expansions, tables, source strikes, unknown exclusions, structural/measurement/identifier contexts and malformed boundaries remain protected. This does not establish every official pronunciation, ambiguous alias hierarchy or arbitrary expansion syntax.';
