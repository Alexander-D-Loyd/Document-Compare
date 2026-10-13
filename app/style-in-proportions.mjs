import {styleContext} from './style-context.mjs';
import {spellNumber} from './style-numerals.mjs';
const values=new Map(Array.from({length:21},(_,n)=>[spellNumber(n),n]));
const number='(?:\\d+|'+[...values.keys()].join('|')+')';
const pattern=new RegExp('\\b('+number+')\\s+in\\s+('+number+')(?=\\s+(?:people|persons|applicants|students|pupils|residents|employees|workers|patients|children|households|families|cases|applications|chances)\\b)','gi');
export function inProportionIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[],quotes=[...source.matchAll(/“[^”]*”|"[^"\n]*"/g)].map(m=>({start:m.index,end:m.index+m[0].length}));
 for(const m of source.matchAll(pattern)){
  const start=m.index,end=start+m[0].length,kind=ctx.at(start),n=values.get(m[1].toLowerCase())??Number(m[1]),d=values.get(m[2].toLowerCase())??Number(m[2]);
  if(kind==='Heading'||ctx.tableAt(start)||quotes.some(r=>r.start<end&&r.end>start)||!Number.isSafeInteger(n)||!Number.isSafeInteger(d)||n<1||n>=d||d>1e12)continue;
  // LCB explicitly gives one in five and 1 in 10. Both members form one
  // expression; a nearby unrelated quantity must not determine their form.
  const large=d>=10,word=v=>kind==='Digest'&&v!==1?String(v):spellNumber(v);
  if(kind==='Digest'&&!large)continue; // Existing cardinal checks exclude the conflicting small digest form.
  const opening=!source.slice(ctx.sentenceAt(start).start,start).replace(/^[\s”"’']*(?:\([a-z\d]+\)\s*)*/i,'').trim();
  let suggestion=(opening?spellNumber(n):large?String(n):word(n))+' in '+(large?String(d):word(d));
  if(opening)suggestion=suggestion[0].toUpperCase()+suggestion.slice(1);
  if(m[0].replace(/\s+/g,' ')===suggestion)continue;
  const conflict=false;
  const message='LCB page 23 distinguishes “one in five” from “1 in 10”. These two counts belong to the same explicitly recognized population proportion. When one is ten or larger, both use figures; unrelated dates or quantities do not change this choice.';
  issues.push({start,end,text:doc.text.slice(start,end),suggestion,guideId:'lcb',guidePage:23,guidePrintedPage:references.lcb.pages[22].printedPage,rule:'Numerals: Proportions/Ratios',category:'Population proportion',context:kind,checkId:'in-proportions',conflict,message,references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:23,guidePrintedPage:references.lcb.pages[22].printedPage,rule:'Numerals: Proportions/Ratios',preferred:suggestion,ruleText:message}]});
 }
 return issues;
}
