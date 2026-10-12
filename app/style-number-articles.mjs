import {styleContext} from './style-context.mjs';
import {spellNumber} from './style-numerals.mjs';
// GPO 5.19 bases the article on the first spoken syllable, not the digit.
// Restrict recognition to integer counts and explicit numerical modifiers.
const pattern=/\b(a|an)\s+(\d+(?:,\d{3})*)(?=-(?:year|month|day|hour|minute|foot|inch|member|person|page|percent|mile|dollar)\b|\s+(?:years?|months?|days?|hours?|minutes?|members?|persons?|pages?|percent|miles?|dollars?)\b)/gi;
export function numberArticleIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[],quoted=[...source.matchAll(/“[^”]*”|"[^"\n]*"/g)].map(m=>({start:m.index,end:m.index+m[0].length}));
 for(const m of source.matchAll(pattern)){
  const start=m.index,end=start+m[1].length;
  if(ctx.at(start)==='Heading'||ctx.tableAt(start)||quoted.some(r=>r.start<start+m[0].length&&r.end>start)||/[\d,.]/.test(source[start+m[0].length]||''))continue;
  const value=Number(m[2].replaceAll(',',''));if(!Number.isSafeInteger(value)||value>1e12||/^0\d/.test(m[2]))continue;
  const spoken=spellNumber(value),article=/^(?:eight|eleven)/.test(spoken)?'an':'a';if(m[1].toLowerCase()===article)continue;
  const suggestion=/^[A-Z]/.test(m[1])?article[0].toUpperCase()+article.slice(1):article;
  const message='GPO 5.19 uses the initial spoken syllable of a numerical expression. This integer begins “'+spoken.split(/[ -]/)[0]+'”. Identifier readings, decimals, Roman numerals and unfamiliar numerical roles require manual review.';
  issues.push({start,end,text:doc.text.slice(start,end),suggestion,guideId:'gpo',guidePage:108,guidePrintedPage:references.gpo.pages[107].printedPage,rule:'5.19',category:'Article before a number',context:ctx.at(start),checkId:'number-articles',conflict:false,message,references:[{guideId:'gpo',guideName:'GPO Style Manual',guidePage:108,guidePrintedPage:references.gpo.pages[107].printedPage,rule:'5.19',preferred:suggestion,ruleText:'The article before a numerical expression follows the consonant or vowel sound of its beginning syllable.'}]});
 }
 return issues;
}
