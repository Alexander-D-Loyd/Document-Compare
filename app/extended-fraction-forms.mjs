import {spellOrdinal,spellNumber} from './style-numerals.mjs';
let numerators;
let words,wordPattern;
export function extendedFractionParts(source){
 if(!words){
  words=new Map();for(let d=21;d<100;d++)words.set(spellOrdinal(d),d);
  for(const [name,value] of [['hundredth',100],['one-hundredth',100],['thousandth',1000],['one-thousandth',1000]])words.set(name,value);
  numerators=new Map();for(let n=1;n<100;n++)numerators.set(spellNumber(n),n);
  wordPattern=new RegExp('\\b('+[...numerators.keys()].sort((a,b)=>b.length-a.length).map(w=>w.replaceAll('-','[\\s-]+')).join('|')+')([\\s-]+)('+[...words.keys()].sort((a,b)=>b.length-a.length).map(w=>w.replaceAll('-','[\\s-]+')).join('|')+')(s?)\\b(?=\\s+of\\b)','gi');
 }
 const result=[];
 for(const m of source.matchAll(/\b([1-9]\d?)\s*[\/⁄]\s*(\d{2,4})\b(?=\s+of\b)/g)){
  const n=Number(m[1]),d=Number(m[2]);if(d<21||d>99&&![100,1000].includes(d)||n>=d)continue;
  const prior=source.slice(Math.max(0,m.index-60),m.index);
  if(/[\d\/⁄]\s*$/.test(prior)||/\b(?:sections?|articles?|items?|schedules?|No\.?|on|by|before|after|until|one|two|three|four|five|six|seven|eight|nine|ten)\s*$/i.test(prior))continue;
  result.push({start:m.index,end:m.index+m[0].length,text:m[0],n,d,figure:true});
 }
 for(const m of source.matchAll(wordPattern)){
  const n=numerators.get(m[1].toLowerCase().replace(/[\s-]+/g,'-')),key=m[3].toLowerCase().replace(/[\s-]+/g,'-'),d=words.get(key);if(!d||n>=d)continue;
  const prior=source.slice(Math.max(0,m.index-40),m.index);if(/\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|hundred|thousand)\s+and\s*$/i.test(prior))continue;
  result.push({start:m.index,end:m.index+m[0].length,text:m[0],n,d,figure:false});
 }
 return result;
}
export function extendedFractionWords(n,d){
 if([100,1000].includes(d)){const unit='one-'+(d===100?'hundredth':'thousandth');return n===1?unit:spellNumber(n)+' '+unit+'s';}
 const denominator=spellOrdinal(d)+(n>1?'s':'');
 const numerator=spellNumber(n);
 return numerator+(numerator.includes('-')||denominator.includes('-')?' ':'-')+denominator;
}
