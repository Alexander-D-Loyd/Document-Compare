import {styleContext} from './style-context.mjs';
export function contextualPunctuationIssues(doc,references){
 const ctx=styleContext(doc),issues=[];
 const add=(m,suggestion,rule,page,message)=>{
  if(ctx.at(m.index)==='Heading'||[...(doc.struck||[]),...(doc.excluded||[])].some(r=>r.start<m.index+m[0].length&&r.end>m.index))return;
  issues.push({start:m.index,end:m.index+m[0].length,text:m[0],suggestion,guideId:'lcb',guidePage:page,guidePrintedPage:String(page),rule,category:'Punctuation',context:ctx.at(m.index),checkId:'punctuation',conflict:false,message,references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:page,guidePrintedPage:references.lcb.pages[page-1].printedPage,rule,preferred:suggestion,ruleText:message}]});
 };
 for(const m of ctx.source.matchAll(/\b(?:18|19|20)\d0[’']s\b/g)){
  // A following noun can make this a possessive decade; do not infer that.
  if(!/^\s*(?:[.,;:!?)]|$|(?:and|or|to|through|were|are|was|is)\b)/i.test(ctx.source.slice(m.index+m[0].length)))continue;
  add(m,m[0].replace(/[’']/g,''),'Punctuation: Apostrophes',6,'LCB does not use an apostrophe to form plural numbers; its example is “1990s.”');
 }
 for(const m of ctx.source.matchAll(/\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|thirty|sixty|ninety)\s+(?:days?|weeks?|months?|years?)\s+notice\b/gi)){
  const suggestion=m[0].replace(/\b(day|week|month|year)(s?)\s+(notice)$/i,(_,unit,plural,notice)=>unit+plural+(plural?'’':'’s')+' '+notice);
  add(m,suggestion,'Punctuation: Time possessives',7,'LCB examples use “90 days’ notice” and “one week’s notice.” This time expression immediately modifies “notice.”');
 }
 for(const m of ctx.source.matchAll(/\b\d+(?:\.\d+)?(?:\s*%|\s+percent\b)/gi)){
  if(/[\/⁄]\s*$/.test(ctx.source.slice(Math.max(0,m.index-5),m.index)))continue;
  const kind=ctx.at(m.index),symbol=/%$/.test(m[0]);if(kind==='Bill'&&symbol)add(m,m[0].replace(/\s*%$/,' percent'),'Numerals: Percent',23,'LCB bill text uses figures followed by “percent”; the digest uses the % symbol.');
  if(kind==='Digest'&&!symbol)add(m,m[0].replace(/\s+percent$/i,'%'),'Numerals: Percent',23,'LCB digest text uses the % symbol; bill text uses “percent.”');
 }
 return issues;
}
