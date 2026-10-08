import {styleContext} from './style-context.mjs';
export function measurementIssues(doc,references){
 const ctx=styleContext(doc),issues=[],source=ctx.source;
 const identifier=before=>/\b(?:Section|Article|Item|Form|Schedule|No\.?|Model|Type|Class|Version|Figure|Table|Appendix|Exhibit|Paragraph|Subdivision)\s*$/i.test(before);
 const add=(m,suggestion,rule,page,message)=>{
  if(ctx.at(m.index)==='Heading'||ctx.tableAt(m.index)||identifier(source.slice(Math.max(0,m.index-40),m.index))||[...(doc.struck||[]),...doc.blocks.filter(b=>b.ignored).map(b=>({start:b.start,end:b.end}))].some(r=>r.start<m.index+m[0].length&&r.end>m.index))return;
  issues.push({start:m.index,end:m.index+m[0].length,text:doc.text.slice(m.index,m.index+m[0].length),suggestion,guideId:'gpo',guidePage:page,guidePrintedPage:references.gpo.pages[page-1].printedPage,rule,category:'Measurement notation',context:ctx.at(m.index),checkId:'gpo-measures',conflict:false,message,references:[{guideId:'gpo',guideName:'GPO Style Manual',guidePage:page,guidePrintedPage:references.gpo.pages[page-1].printedPage,rule,preferred:suggestion,ruleText:message}]});
 };
 for(const m of source.matchAll(/\b(\d+(?:\.\d+)?)(kg|mg|μg|km|cm|mm|mL|kL|kW|MW|Pa|Hz)\b/g))add(m,m[1]+' '+m[2],'9.56',250,'GPO 9.56 uses a space between a figure and a metric unit symbol. Identifiers and angle notation are excluded.');
 for(const m of source.matchAll(/\b(\d+(?:\.\d+)?)\s*(kgs|mgs|kms|cms|mms|mLs|kLs|kWs|MWs|Pas|Hzs|lbs|mins|yrs|ozs|fts|yds)\b/g)){
  const unit=m[2].slice(0,-1),metric=!['lb','min','yr','oz','ft','yd'].includes(unit);
  add(m,m[1]+' '+unit,metric?'9.56':'9.58',metric?250:251,'GPO uses the same unit symbol or abbreviation for singular and plural; do not append an s.');
 }
 for(const m of source.matchAll(/\b(\d+(?:\.\d+)?)\s*°\s*([CFR])\b/g)){
  const suggestion=m[1]+' °'+m[2];if(m[0]!==suggestion)add(m,suggestion,'9.53',249,'GPO places a space before a temperature degree mark and closes the mark against C, F or R. Plane-angle degrees retain their separate convention.');
 }
 for(const m of source.matchAll(/\b(\d{1,2}):00\s+([ap]\.\s*m\.)/g)){
  if(Number(m[1])>=1&&Number(m[1])<=12)add(m,m[1]+' '+m[2].replace(/\s/g,''),'9.54',250,'GPO 9.54 omits :00 for an exact hour followed by a.m. or p.m.');
 }
 for(const m of source.matchAll(/\b(\d{1,2})\s+o[’']clock\s+([ap]\.\s*m\.)/gi)){
  if(Number(m[1])>=1&&Number(m[1])<=12)add(m,m[1]+' '+m[2].toLowerCase().replace(/\s/g,''),'9.55',250,'GPO 9.55 does not use o’clock with an abbreviation of time.');
 }
 if(references.lcb){
  const quoted=[...source.matchAll(/“[^”]*”|"[^"\n]*"/g)].map(m=>({start:m.index,end:m.index+m[0].length}));
  for(const m of source.matchAll(/\bdegrees?\s+(celsius|fahrenheit|centigrade)\b/gi)){
   const start=m.index+m[0].lastIndexOf(m[1]),end=start+m[1].length,preferred=/fahrenheit/i.test(m[1])?'Fahrenheit':'Celsius',page=preferred==='Fahrenheit'?4:3;
   if(m[1]===preferred||ctx.at(start)==='Heading'||ctx.tableAt(start)||quoted.some(r=>r.start<end&&r.end>start))continue;
   const message='LCB lists '+preferred+' with an initial capital. GPO’s measurement examples use Celsius and Fahrenheit; Celsius is the preferred term superseding Centigrade.';
   const cites=[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:page,guidePrintedPage:String(page),rule:'Spelling examples: '+preferred,preferred,ruleText:message}];
   if(/centigrade/i.test(m[1]))cites.push({guideId:'gpo',guideName:'GPO Style Manual',guidePage:250,guidePrintedPage:references.gpo.pages[249].printedPage,rule:'9.56, temperature footnote',preferred,ruleText:'Celsius is preferred, superseding Centigrade.'});
   issues.push({start,end,text:doc.text.slice(start,end),suggestion:preferred,guideId:'lcb',guidePage:page,guidePrintedPage:String(page),rule:cites[0].rule,category:'Temperature scale name',context:ctx.at(start),checkId:'temperature-name',conflict:false,message,references:cites});
  }
 }
 return issues;
}
