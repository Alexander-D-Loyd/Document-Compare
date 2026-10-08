import {styleContext} from './style-context.mjs';
const values={zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20};
export function ratioIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[];
 const number='(?:\\d+(?:\\.\\d+)?|'+Object.keys(values).join('|')+')';
 const pattern=new RegExp('\\b(?:ratios?|proportions?|odds)(?:\\s+(?:of|is|are))?\\s+('+number+')\\s*(to|:)\\s*('+number+')\\b','gi');
 for(const m of source.matchAll(pattern)){
  const start=m.index+m[0].indexOf(m[1]),end=m.index+m[0].length;
  if(ctx.at(start)==='Heading'||ctx.tableAt(start)||[...(doc.struck||[]),...doc.blocks.filter(b=>b.ignored).map(b=>({start:b.start,end:b.end}))].some(r=>r.start<end&&r.end>start))continue;
  const first=values[m[1].toLowerCase()]??Number(m[1]),second=values[m[3].toLowerCase()]??Number(m[3]);
  const suggestion=m[2]===':'?first+':'+second:first+' to '+second;
  if(source.slice(start,end).replace(/\s+/g,' ').trim()===suggestion)continue;
  const message='This expression is explicitly introduced as a ratio, proportion or odds. LCB page 23 uses figures for to-ratios; ordinary ranges of years or other quantities use their separate bill/digest rules.';
  issues.push({start,end,text:doc.text.slice(start,end),suggestion,guideId:'lcb',guidePage:23,guidePrintedPage:'23',rule:'Numerals: Proportions/Ratios',category:'Ratio form',context:ctx.at(start),checkId:'ratios',conflict:false,message,references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:23,guidePrintedPage:references.lcb.pages[22].printedPage,rule:'Numerals: Proportions/Ratios',preferred:suggestion,ruleText:message}]});
 }
 return issues;
}
