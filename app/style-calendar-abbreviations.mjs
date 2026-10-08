import {styleContext} from './style-context.mjs';
const days={Sun:'Sunday',Mon:'Monday',Tues:'Tuesday',Wed:'Wednesday',Thurs:'Thursday',Fri:'Friday',Sat:'Saturday'};
const months={Jan:'January',Feb:'February',Mar:'March',Apr:'April',Aug:'August',Sept:'September',Oct:'October',Nov:'November',Dec:'December'};
export function calendarAbbreviationIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[],literal=[...source.matchAll(/“[^”]*”|"[^"\n]*"|\([^()]*\)|\[[^\]]*\]/g)].map(m=>({start:m.index,end:m.index+m[0].length}));
 for(const [forms,rule] of [[days,'9.46'],[months,'9.44']]){
  const page=references.gpo.pages.find(p=>new RegExp('(?:^|\\n)\\s*'+rule.replace('.','\\.')+'\\.').test(p.flowText||p.text));if(!page)continue;
  for(const m of source.matchAll(new RegExp('\\b(?:on|by|before|after|through|until|every|each)\\s+('+Object.keys(forms).join('|')+')\\.(?=\\s|$)','g'))){
   const start=m.index+m[0].lastIndexOf(m[1]),end=start+m[1].length+1;
   if(ctx.at(start)==='Heading'||ctx.tableAt(start)||literal.some(r=>r.start<end&&r.end>start))continue;
   if(forms===months&&!/^\s+\d{1,2}\b/.test(source.slice(end)))continue;
   const suggestion=forms[m[1]],message=forms===days?'GPO spells out weekday names in ordinary text; narrow-column and list exceptions require separate layout review.':'GPO limits these month abbreviations to references, footnotes, tables and related special contexts. This is an explicit calendar date in ordinary prose.';
   issues.push({start,end,text:doc.text.slice(start,end),suggestion,guideId:'gpo',guidePage:page.page,guidePrintedPage:page.printedPage,rule,category:'Calendar abbreviations',context:ctx.at(start),checkId:'calendar-abbreviations',conflict:false,message,references:[{guideId:'gpo',guideName:'GPO Style Manual',guidePage:page.page,guidePrintedPage:page.printedPage,rule,preferred:suggestion,ruleText:message}]});
  }
 }
 return issues;
}
