import {styleContext,styleRangeBlocked} from './style-context.mjs';
const values={zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20};
const number='(?:\\d+(?:\\.\\d+)?|'+Object.keys(values).join('|')+')';
const introduced=new RegExp('\\b(?:ratios?|proportions?|odds)(?:\\s+(?:of|is|are))?\\s+('+number+')\\s*(to|:)\\s*('+number+')\\b','gi');
const level='(?:(?:transitional\\s+)?kindergarten|prekindergarten|(?:elementary|middle|secondary|high)\\s+schools?|grades?\\s+\\d+(?:\\s+to\\s+\\d+)?)';
// A repeated ratio inherits the label through a direct series or a selected
// educational qualifier; ordinary duration ranges do not inherit that role.
const qualifier='(?:\\s+for\\s+'+level+'(?:\\s+and\\s+'+level+')?)?';
const next=new RegExp('^('+qualifier+'\\s*(?:,\\s*(?:(?:and|or)\\s+)?|(?:and|or)\\s+))('+number+')\\s*(to|:)\\s*('+number+')\\b(?=\\s*(?:[,;.)]|$)|\\s+(?:for|in|among|under|when|if)\\b)','i');
export function explicitRatioParts(source){
 const found=new Map();
 for(const m of source.matchAll(introduced)){
  let part={start:m.index+m[0].indexOf(m[1]),end:m.index+m[0].length,first:m[1],separator:m[2],second:m[3]};found.set(part.start,part);
  while(true){const n=next.exec(source.slice(part.end));if(!n)break;part={start:part.end+n[1].length,end:part.end+n[0].length,first:n[2],separator:n[3],second:n[4]};found.set(part.start,part);}
 }
 return [...found.values()].sort((a,b)=>a.start-b.start);
}
export function ratioIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[];
 for(const part of explicitRatioParts(source)){
  const {start,end}=part;
  if(ctx.at(start)==='Heading'||ctx.tableAt(start)||ctx.literalAt(start,end)||styleRangeBlocked(doc,start,end))continue;
  const first=values[part.first.toLowerCase()]??Number(part.first),second=values[part.second.toLowerCase()]??Number(part.second);
  const suggestion=part.separator===':'?first+':'+second:first+' to '+second;
  if(source.slice(start,end).replace(/\s+/g,' ').trim()===suggestion)continue;
  const message='This expression is explicitly introduced as a ratio, proportion or odds. LCB page 23 uses figures for to-ratios; ordinary ranges of years or other quantities use their separate bill/digest rules.';
  issues.push({start,end,text:doc.text.slice(start,end),suggestion,guideId:'lcb',guidePage:23,guidePrintedPage:'23',rule:'Numerals: Proportions/Ratios',category:'Ratio form',context:ctx.at(start),checkId:'ratios',conflict:false,message,references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:23,guidePrintedPage:references.lcb.pages[22].printedPage,rule:'Numerals: Proportions/Ratios',preferred:suggestion,ruleText:message}]});
 }
 return issues;
}
