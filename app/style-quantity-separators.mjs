import {styleContext} from './style-context.mjs';
// An explicit count/quantity noun is required: an arbitrary four-digit
// token can be a year, code section, serial, address or table cell.
const nouns='people|persons|patients|applicants|employees|workers|students|pupils|children|residents|households|members|participants|voters|ballots|requests|applications|records|documents|copies|vehicles|units|items|pounds|feet|inches|miles|acres|gallons';
export function quantitySeparatorIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[];
 const literal=[...source.matchAll(/“[^”]*”|"[^"\n]*"/g)].map(m=>({start:m.index,end:m.index+m[0].length}));
 const pattern=/(?<![\w$.,/\-])\d+(?:,\d+)*(?![\d,]|\.\d)/g;
 for(const m of source.matchAll(pattern)){
  const start=m.index,end=start+m[0].length,before=source.slice(Math.max(0,start-70),start);
  const digits=m[0].replace(/,/g,'');
  if(digits.length<4||digits.length>15||/^0/.test(digits))continue;
  const after=source.slice(end);
  const quantityAfter=new RegExp('^\\s+(?:'+nouns+')\\b','i').test(after);
  const quantityBefore=/\b(?:a\s+population|an?\s+(?:enrollment|headcount)|the\s+(?:population|enrollment|headcount))\s+of\s*$/i.test(before);
  if(!quantityAfter&&!quantityBefore)continue;
  // A suffix on the same numeral can identify a serial, range, fraction or
  // scientific quantity; never regroup only a fragment of such notation.
  if(/^(?:\s*[-/]|[A-Za-z_])/.test(after))continue;
  if(ctx.at(start)==='Heading'||ctx.tableAt(start)||literal.some(r=>r.start<end&&r.end>start))continue;
  if(/\b(?:sections?|articles?|chapters?|items?|schedules?|forms?|figures?|tables?|pages?|paragraphs?|subdivisions?|provisions?|No\.?|ID|Model|Version|Class|Type|Post|Route|Highway|Code|year)\s*$/i.test(before))continue;
  if(/\b(?:U\.S\.C\.|C\.F\.R\.|Stats\.|Chs?\.)\s*$/i.test(before))continue;
  if(/\b(?:in|since|during)\s*$/i.test(before)&&Number(m[0])>=1800&&Number(m[0])<=2099)continue;
  const suggestion=digits.replace(/\B(?=(\d{3})+(?!\d))/g,',');
  if(m[0]===suggestion)continue;
  const message='GPO 12.14 separates groups of thousands with commas. This is an explicit count or quantity; check the digits against the source before accepting the suggested grouping. Recognized identifiers, dates, decimal fractions, quotations and tables are excluded.';
  issues.push({start,end,text:doc.text.slice(start,end),suggestion,guideId:'gpo',guidePage:293,guidePrintedPage:references.gpo.pages[292].printedPage,rule:'12.14',category:'Quantity separators',context:ctx.at(start),checkId:'quantity-separators',conflict:false,message,references:[{guideId:'gpo',guideName:'GPO Style Manual',guidePage:293,guidePrintedPage:references.gpo.pages[292].printedPage,rule:'12.14',preferred:suggestion,ruleText:message}]});
 }
 return issues;
}
