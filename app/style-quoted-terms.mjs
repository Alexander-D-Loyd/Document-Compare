import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord} from './style-evidence.mjs';
import {styleWordDivisionView} from './style-word-divisions.mjs';

const word=/[\p{L}\p{N}\p{M}_]/u;
const normalize=text=>text.replace(/\s+/gu,' ').trim();
const escape=text=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const termText=text=>normalize(text).replace(/,$/u,'').replace(/\.$/u,match=>/(?:\b\p{L}\.){2,}$|\b\p{L}\.$|\.\.$/u.test(normalize(text))?match:'');
// A quoted form is authority for this Current Version only. No dictionary,
// shared registry or persistent ignore list is changed. Build anew each review.
export function billQuotedTermRanges(doc,ctx=styleContext(doc)){
 // An explicit quoted form needs no prose grammatical role. Active table,
 // digest and heading quotes in this bill can also establish its exact form.
 const blocked=styleEvidenceGuard(doc,{...ctx,literalAt:()=>false,tableAt:()=>false});
 const source=ctx.source.replace(/-/g,(_,at)=>doc.text[at]),quotes=[];
 for(const [open,close] of [['“','”'],['"','"'],['‘','’'],["'","'"]]){
  const marks=[];for(let at=0;at<source.length;at++)if((source[at]===open||source[at]===close)&&!(word.test(source[at-1]||'')&&word.test(source[at+1]||'')))marks.push(at);
  for(let n=0;n+1<marks.length;n++){
   const start=marks[n],last=marks[n+1],end=last+1;
   if(source[start]!==open||source[last]!==close||(open===close&&start&&word.test(source[start-1]))||word.test(source[end]||''))continue;
   if(end-start>4096||blocked(start,end))continue;
   const text=source.slice(start+1,last);if(!/[\p{L}\p{N}]/u.test(text)||!text.trim())continue;
   quotes.push({start:start+1,end:last,text});n++;
  }
 }
 const ranges=[],terms=new Set();
 for(const quote of quotes){
  // Retain punctuation and interior case. The user permits initial-letter
  // capitalization differences; recognized PDF row whitespace can also vary.
  const term=termText(quote.text);if(!term||terms.has(term))continue;terms.add(term);
  const initial=[...term][0],variants=[...new Set([initial,initial.toLowerCase(),initial.toUpperCase()])].filter(s=>[...s].length===1);
  const tail=term.slice(initial.length).split(' ').map(escape).join('\\s+'),pattern='(?:'+variants.map(escape).join('|')+')'+tail;
  for(const m of source.matchAll(new RegExp(pattern,'gu'))){
   const start=m.index,end=start+m[0].length;
   const attached=/[\p{L}\p{N}][-‐‑–—]$/u.test(doc.text.slice(Math.max(0,start-2),start))||/^[-‐‑–—][\p{L}\p{N}]/u.test(doc.text.slice(end,end+2));
   const decimal=/\d\.$/.test(doc.text.slice(Math.max(0,start-2),start))||/^\.\d/.test(doc.text.slice(end,end+2));
   if(cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,end)||attached||decimal||blocked(start,end))continue;
   ranges.push({start,end,term,quoteStart:quote.start,quoteEnd:quote.end});
  }
 }
 return ranges.sort((a,b)=>a.start-b.start||a.end-b.end);
}
export function billQuotedTermProtection(doc,ctx=styleContext(doc)){
 // Quoted line-end divisions were deliberately preserved in the main style
 // view. Join only reader-recognized complete words in this authority view,
 // then map the protection back to exact physical source positions.
 const view=styleWordDivisionView(doc,{includeLiterals:true,includeTables:true,preserveRemainingWords:true});
 const ranges=view?billQuotedTermRanges(view.doc).map(r=>({...r,start:view.toSource(r.start),end:view.toSource(r.end,true)})):billQuotedTermRanges(doc,ctx);
 return issue=>ranges.some(r=>r.start<=issue.start&&r.end>=issue.end);
}
