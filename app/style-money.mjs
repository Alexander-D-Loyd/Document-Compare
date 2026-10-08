import {styleContext} from './style-context.mjs';
const small=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const tens=['twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
const scales={thousand:1000,million:1e6,billion:1e9,trillion:1e12};
export function writtenMoneyNumber(text){
 const words=text.toLowerCase().replaceAll('-',' ').trim().split(/\s+/);let total=0,part=0,previous='';
 for(const w of words){
  if(w==='and')continue;
  if(small.includes(w)){if(previous&&small.includes(previous))return null;part+=small.indexOf(w);}
  else if(tens.includes(w)){if(tens.includes(previous)||small.includes(previous))return null;part+=(tens.indexOf(w)+2)*10;}
  else if(w==='hundred'){if(!part||part>=10)return null;part*=100;}
  else if(scales[w]){if(!part)return null;total+=part*scales[w];part=0;}
  else return null;previous=w;
 }
 return total+part;
}
export function monetaryPairIssues(doc,references){
 const ctx=styleContext(doc),issues=[],word='(?:'+[...small,...tens,'hundred',...Object.keys(scales)].join('|')+')';
 const amount=word+'(?:[\\s-]+(?:and[\\s-]+)?'+word+')*';
 const pattern=new RegExp('\\b('+amount+')[\\s-]+(dollars?|cents?|mills?)(?:\\s+and\\s+('+amount+')\\s+cents?)?\\s*\\(\\s*\\$\\s*(\\d+(?:,\\d{3})*(?:\\.\\d+)?)\\s*\\)','gi');
 for(const m of ctx.source.matchAll(pattern)){
  if(ctx.at(m.index)==='Heading'||[...(doc.struck||[]),...doc.blocks.filter(b=>b.ignored).map(b=>({start:b.start,end:b.end}))].some(r=>r.start<m.index+m[0].length&&r.end>m.index))continue;
  const main=writtenMoneyNumber(m[1]),cents=m[3]?writtenMoneyNumber(m[3]):0;
  if(main===null||cents===null||cents>=100)continue;
  const factor=/^cent/i.test(m[2])?.01:/^mill/i.test(m[2])?.001:1;
  const value=main*factor+cents/100,figure=Number(m[4].replaceAll(',',''));
  const disagrees=Math.abs(value-figure)>=.000001,digest=ctx.at(m.index)==='Digest';
  if(!disagrees&&!digest)continue;
  const formatted=value.toLocaleString('en-US',{minimumFractionDigits:value%1?(/^mill/i.test(m[2])?3:2):0,maximumFractionDigits:3});
  const suggestion=digest?'$'+formatted:m[0].replace(/\$\s*[\d,.]+/, '$'+formatted).replace(/\s+/g,' ');
  const message=digest?(disagrees?'LCB digest text uses a dollar figure. The written and parenthetical amounts also disagree; confirm which amount is intended.':'LCB page 23 uses figures alone for digest monetary amounts, rather than repeating the amount in words and parentheses.'):'The written amount and parenthetical figure disagree. LCB’s monetary examples pair the same amount in words and figures. The suggested figure follows the words; confirm which amount is intended.';
  issues.push({start:m.index,end:m.index+m[0].length,text:doc.text.slice(m.index,m.index+m[0].length),suggestion,rule:'Numerals: Money pairs',category:'Monetary agreement',guideId:'lcb',guidePage:23,guidePrintedPage:'23',context:ctx.at(m.index),checkId:'money-pairs',conflict:false,message,references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:23,guidePrintedPage:references.lcb.pages[22].printedPage,rule:'Numerals: Money',preferred:suggestion,ruleText:message}]});
 }
 return issues;
}
