import {legislativeContext} from './legislative-context.mjs';
import {writtenMoneyNumber} from './style-money.mjs';
import {spellNumber} from './style-numerals.mjs';
const words='zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|trillion';
const number='(?:'+words+')(?:[\\s-]+(?:and[\\s-]+)?(?:'+words+'))*';
function amountWords(value){
 if(value<0||!Number.isSafeInteger(Math.round(value*1000)))return null;
 const whole=Math.floor(value),cents=Math.round((value-whole)*100),mills=Math.round(value*1000);
 if(value>0&&value<.01&&Math.abs(mills/1000-value)<1e-8)return spellNumber(mills)+' '+(mills===1?'mill':'mills');
 if(Math.abs(whole+cents/100-value)>1e-8)return null;
 if(whole===0&&cents)return spellNumber(cents)+' '+(cents===1?'cent':'cents');
 return spellNumber(whole)+' '+(whole===1?'dollar':'dollars')+(cents?' and '+spellNumber(cents)+' '+(cents===1?'cent':'cents'):'');
}
export function moneyFormIssues(doc,references){
 const ctx=legislativeContext(doc),source=ctx.source,issues=[],pairs=[];
 const quoted=[...source.matchAll(/“[^”]*”|"[^"\n]*"/g)].map(m=>({start:m.index,end:m.index+m[0].length}));
 const blocked=(start,end)=>ctx.tableAt(start)||[...(doc.struck||[]),...doc.blocks.filter(b=>b.ignored).map(b=>({start:b.start,end:b.end})),...quoted].some(r=>r.start<end&&r.end>start);
 const add=(m,suggestion,message,kind)=>{
  if(blocked(m.index,m.index+m[0].length))return;
  if(/^[A-Z]/.test(m[0]))suggestion=suggestion[0].toUpperCase()+suggestion.slice(1);
  issues.push({start:m.index,end:m.index+m[0].length,text:doc.text.slice(m.index,m.index+m[0].length),suggestion,guideId:'lcb',guidePage:23,guidePrintedPage:'23',rule:'Numerals: Monetary form',category:'Monetary form',context:kind,checkId:'money-forms',conflict:false,message,references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:23,guidePrintedPage:references.lcb.pages[22].printedPage,rule:'Numerals: Money',preferred:suggestion,ruleText:'LCB page 23 repeats bill monetary amounts in words and figures, including dollar modifiers. Page 21 exempts uncodified findings/declarations and resolutions; digest monetary examples use figures alone.'}]});
 };
 const pattern=new RegExp('\\b('+number+')[\\s-]+(dollars?|cents?|mills?)(?:\\s+and\\s+('+number+')\\s+cents?)?(?:\\s*\\(\\s*\\$\\s*(\\d+(?:,\\d{3})*(?:\\.\\d+)?)\\s*\\))?','gi');
 for(const m of source.matchAll(pattern)){
  const kind=ctx.moneyAt(m.index),main=writtenMoneyNumber(m[1]),cents=m[3]?writtenMoneyNumber(m[3]):0;
  if(main===null||cents===null||cents>=100)continue;
  const value=main*(/^cent/i.test(m[2])?.01:/^mill/i.test(m[2])?.001:1)+cents/100;
  const figure='$'+value.toLocaleString('en-US',{minimumFractionDigits:value%1?(/^mill/i.test(m[2])?3:2):0,maximumFractionDigits:3});
  if(m[4])pairs.push({start:m.index,end:m.index+m[0].length});
  if(/^\s+(?:coins?|bills?|notes?|denominations?)\b/i.test(source.slice(m.index+m[0].length)))continue;
  if(['Digest','UncodifiedFindings','Resolution'].includes(kind)){
   const mismatch=m[4]&&Math.abs(Number(m[4].replaceAll(',',''))-value)>1e-8;
   add(m,figure,'LCB uses figures alone in '+kind.toLowerCase()+'.'+(mismatch?' The written and figure amounts also disagree; confirm the intended amount.':''),kind);
  }else if(kind==='Codified'&&!m[4])add(m,m[0].replace(/\s+/g,' ')+' ('+figure+')','In this recognized codified provision, LCB repeats the written monetary amount with the same figure in parentheses.',kind);
 }
 for(const m of source.matchAll(/\$\s*(\d+(?:,\d{3})*(?:\.\d+)?)(?!\d|[.,]\d)/g)){
  if(ctx.moneyAt(m.index)!=='Codified'||pairs.some(r=>r.start<=m.index&&r.end>=m.index+m[0].length))continue;
  const before=source.slice(Math.max(0,m.index-35),m.index),after=source.slice(m.index+m[0].length);
  if(/[\w$]$/.test(before)||/^\s*(?:million|billion|trillion|thousand|per\s+(?:share|unit)|[-–]\s*\d|\/)/i.test(after)||/\b(?:US|USD|CAD|AU|NZ)\s*$/.test(before)||/^\s+(?:coins?|bills?|notes?|denominations?)\b/i.test(after))continue;
  const value=Number(m[1].replaceAll(',','')),written=amountWords(value);if(!written)continue;
  add(m,written+' ($'+m[1]+')','LCB codified bill text gives this monetary amount in words and repeats the figure in parentheses. The section’s amendment-to-Code heading establishes this context.', 'Codified');
 }
 return issues;
}
