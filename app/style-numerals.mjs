import {styleContext} from './style-context.mjs';
const ones=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const tens=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
const ordinals=['zeroth','first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth','thirteenth','fourteenth','fifteenth','sixteenth','seventeenth','eighteenth','nineteenth'];
const numbers=new Map([...ones.map((w,i)=>[w,i]),...tens.slice(2).map((w,i)=>[w,(i+2)*10])]);
export function spellNumber(n){
 if(n<20)return ones[n];if(n<100)return tens[Math.floor(n/10)]+(n%10?'-'+ones[n%10]:'');
 if(n<1000)return ones[Math.floor(n/100)]+' hundred'+(n%100?' '+spellNumber(n%100):'');
 for(const [scale,name] of [[1e12,'trillion'],[1e9,'billion'],[1e6,'million'],[1000,'thousand']])if(n>=scale)return spellNumber(Math.floor(n/scale))+' '+name+(n%scale?' '+spellNumber(n%scale):'');
 return String(n);
}
function wordValue(words){let total=0,part=0;for(const w of words){if(numbers.has(w))part+=numbers.get(w);else if(w==='hundred')part=(part||1)*100;else{const scale={thousand:1000,million:1e6,billion:1e9,trillion:1e12}[w];if(!scale)return null;total+=(part||1)*scale;part=0;}}return total+part;}
const singular=w=>({people:'person',children:'child',feet:'foot',inches:'inch',copies:'copy'}[w]||w.replace(/s$/,''));
export function numeralIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[],protectedRanges=[];
 const protect=pattern=>{for(const m of source.matchAll(pattern))protectedRanges.push({start:m.index,end:m.index+m[0].length});};
 // Identifiers and dates are not counts. A repeated citation list stays one scope.
 protect(/\b(?:sections?|secs?\.?|chapters?|parts?|divisions?|titles?|articles?|paragraphs?|subparagraphs?|subdivisions?|clauses?|pages?|lines?|tables?|figures?|forms?|bills?|No\.?)\s+(?:\([a-z\d]+\)|\d+(?:\.\d+)*)(?:\s*(?:,\s*(?:(?:and|or)\s+)?|(?:and|or|to|through)\s+|[-–])(?:\([a-z\d]+\)|\d+(?:\.\d+)*))*/gi);
 protect(/\b(?:I\.\s*D\.|ID)\s+\d+(?:\.\d+)*/g);
 protect(/\b\d+\s+(?:U\.?\s*S\.?\s*C\.?|C\.?\s*F\.?\s*R\.?)(?:\s+(?:§\s*)?\d+(?:\.\d+)*)?/gi);
 protect(/\b(?:U\.S\.C\.|C\.F\.R\.)\s+(?:§\s*)?\d+(?:\.\d+)*/gi);
 protect(/\(\s*\d+[a-z]?\s*\)/gi);
 protect(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,\s*\d{4})?/gi);
 protect(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g);
 protect(/\b\d{4}-\d{2}-\d{2}\b/g);
 // Fraction styling needs a whole-expression check, never a correction to
 // an isolated numerator, denominator or integer in a mixed fraction.
 protect(/\b\d+(?:\s+\d+)?\s*[\/⁄]\s*\d+\b/g);
 protect(/\b\d+[¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/g);
 protect(/\b(?:(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+and\s+)?(?:one|two|three|four|five|six|seven|eight|nine)[ -]+(?:half|halves|thirds?|quarters?|fourths?|fifths?|sixths?|sevenths?|eighths?|ninths?|tenths?)\b/gi);
 protect(/\b\d{4}[-–]\d{2,4}\s+(?:Regular Session|fiscal year)/gi);
 protect(/\bgrades?\s+\d+(?:\s*(?:,\s*(?:(?:and|or)\s+)?|and\s+|or\s+|to\s+|through\s+|-)\d+)*/gi);
 for(const block of doc.blocks){const body=source.slice(block.start+block.margin.length,block.end),m=/^\s*(?:SEC\.\s+|SECTION\s+)?\d+(?:\.\d+)*\.(?=\s|$)/i.exec(body);if(m)protectedRanges.push({start:block.start+block.margin.length,end:block.start+block.margin.length+m[0].length});
  if(block.formatting?.headerGaps?.length>=2)protectedRanges.push({start:block.start,end:block.end});
 }
 const excludedContent=[...(doc.struck||[]),...doc.blocks.filter(b=>b.ignored).map(b=>({start:b.start,end:b.end}))];
 const blocked=(start,end)=>protectedRanges.some(r=>r.start<end&&r.end>start)||excludedContent.some(r=>r.start<end&&r.end>start);
 const candidates=[];
 const pattern=new RegExp(`\\b(?:\\d+(?:,\\d{3})*(?:\\.\\d+)?(?:st|nd|rd|th)?|${[...numbers.keys(),'hundred','thousand','million','billion','trillion',...ordinals.slice(1)].join('|')})\\b`,'gi');
 const matches=[...source.matchAll(pattern)];
 for(let i=0;i<matches.length;i++){
  const m=matches[i];let start=m.index,end=start+m[0].length,text=m[0],ordinal=/\d(?:st|nd|rd|th)$/i.test(text)||ordinals.includes(text.toLowerCase()),figure=/^\d/.test(text),value=figure?Number(text.replace(/(?:st|nd|rd|th)$/i,'').replaceAll(',','')):ordinal?ordinals.indexOf(text.toLowerCase()):wordValue([text.toLowerCase()]);
  if(!figure&&!ordinal){
   const words=[text.toLowerCase()];
   while(i+1<matches.length&&/^[\s-]+$/.test(source.slice(end,matches[i+1].index))&& !/^\d/.test(matches[i+1][0])&&!ordinals.includes(matches[i+1][0].toLowerCase())){
    const next=matches[i+1][0].toLowerCase(),prior=words.at(-1);
    // "one two" is not a compound number; only tens, hundreds and scales join.
    if(!['hundred','thousand','million','billion','trillion'].includes(next)&&!(tens.includes(prior)&&ones.slice(1,10).includes(next))&&!['hundred','thousand','million','billion','trillion'].includes(prior))break;
    i++;words.push(next);end=matches[i].index+matches[i][0].length;
   }
   text=source.slice(start,end).replace(/\s+/g,' ').trim();value=wordValue(words);
  }
  if(value===null||!Number.isFinite(value)||blocked(start,end)||ctx.at(start)==='Heading')continue;
  const before=source.slice(Math.max(0,start-120),start).replace(/\s+/g,' '),after=source.slice(end,end+150).replace(/\s+/g,' '),sentence=ctx.sentenceAt(start);
  const prefix=source.slice(sentence.start,start).replace(/^[\s”"’']*(?:\([a-z\d]+\)\s*)*/i,'').trim();
  const sentenceStart=!prefix;
  if(text.toLowerCase()==='second'&&/\b(?:per|each|every)\s*$/i.test(before))continue;
  if(ordinal&&/^[A-Z]/.test(text)&&/^\s+(?:Amendment|Circuit|Congress|Street|Avenue)\b/.test(after))continue;
  if(!figure&&/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+$/i.test(before)&&value<=31){
   candidates.push({start,end,text,value,figure,ordinal,sentenceStart:false,context:ctx.at(start),exception:true,preferred:String(value),rule:'Numerals: Days/Dates',page:22,message:'A calendar day following a month name uses figures.',gpo:'12.9',gpoPage:288});continue;
  }
  if(!figure&&/\b(?:sections?|articles?|chapters?|parts?|divisions?|paragraphs?|subdivisions?)\s+$/i.test(before)){
   candidates.push({start,end,text,value,figure,ordinal,sentenceStart:false,context:ctx.at(start),exception:true,preferred:String(value),rule:'Numerals: Code Sections and Constitution',page:22,message:'This is a numbered reference identifier, not a quantity.',gpo:'12.7',gpoPage:288});continue;
  }
  let unit=after.match(/^\s*(?:-\s*)?(?:(?:business|calendar|court|school|academic|consecutive|working)\s+)?([a-z]+)/i)?.[1]?.toLowerCase()||'';
  // The unit after the final member also applies to a simple numerical spread.
  let rest=after,spreadCount=0;
  // Each step must consume a connector and a complete number. This also
  // bounds runtime for long citation lists instead of backtracking digits.
  for(let step=0;step<32;step++){
   const next=/^(?:\s*,\s*(?:(?:and|or)\s+)?|\s+(?:and|or|to|through)\s+)(\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|(?:twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:[ -](?:one|two|three|four|five|six|seven|eight|nine))?)\b/i.exec(rest);
   if(!next)break;rest=rest.slice(next[0].length);spreadCount++;
  }
  if(spreadCount){const finalUnit=/^\s+([a-z]+)/i.exec(rest);if(finalUnit)unit=finalUnit[1].toLowerCase();}
  const money=/\$\s*$/.test(before)||/^(?:dollars?|cents?|mills?)$/.test(unit);
  const figureRepeat=/^\s*\(?\$/.test(after)||/\b(?:dollars?|cents?|mills?)\s*\(\s*\$\s*$/.test(before);
  const percent=/^(?:percent|percentage)$/.test(unit)||/^\s*%/.test(after);
  const clock=/^\s*(?::\s*\d+|[ap]\.\s*m\.|o[’']clock)/i.test(after)||/:\s*$/.test(before);
  const grade=/\bgrades?\s*$/i.test(before)||unit==='grade';
  const degree=unit==='degree'||unit==='degrees'||/^\s*°/.test(after);
  const inNext=/^\s+in\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/i.exec(after),inPrior=/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+in\s*$/i.exec(before);
  const inOther=inNext?.[1]||inPrior?.[1],inValue=inOther?(numbers.get(inOther.toLowerCase())??Number(inOther)):null;
  const ratio=inOther?Math.max(value,inValue)>=10:/\b(?:ratio|proportion)\s*(?:of\s*)?$/i.test(before)||/^\s*:\s*\d/.test(after)||/:\s*$/.test(before)||/\b\d+\s+to\s*$/i.test(before)&&/^\s*[.,;)]/.test(after)||/^\s+to\s+\d+\s*[.,;)]/.test(after);
  const duration=/^(?:day|week|month|year|hour|minute|second)s?$/.test(unit),measure=/^(?:feet|foot|inch|inches|meter|meters|metre|metres|mile|miles|pound|pounds|megabyte|megabytes|megawatt|megawatts|gallon|gallons|acre|acres)$/.test(unit);
  if(money||figureRepeat||percent||clock||grade||degree||ratio||/\d\.\d/.test(text)){
   // Paired dollar expressions and legal citations need their dedicated rules;
   // never change just one word inside a complete written amount.
   if(!figure&&!figureRepeat&&(percent||clock||grade||degree||ratio)&&!(grade&&text.toLowerCase()==='first')){
    candidates.push({start,end,text,value,figure,ordinal,sentenceStart,context:ctx.at(start),exception:true,preferred:String(value),rule:'Numerals, general item 2',page:21,message:'LCB requires figures for this numerical context.',gpo:'12.9',gpoPage:288});
   }
   continue;
  }
  candidates.push({start,end,text,value,figure,ordinal,sentenceStart,context:ctx.at(start),sentence,unit:singular(unit),duration,measure});
 }
 const cite=(id,rule,page,preferred,text)=>({guideId:id,guideName:id==='lcb'?'LCB Style Manual':'GPO Style Manual',rule,guidePage:page,guidePrintedPage:references[id].pages[page-1].printedPage,preferred,ruleText:text});
 const relatedFigures=new Set();let group=[];
 const finishGroup=()=>{if(group.length>1&&group.some(n=>n.value>=10))for(const n of group)relatedFigures.add(n);};
 for(const n of candidates){
  const prior=group.at(-1),bridge=prior?source.slice(prior.end,n.start).replace(/\s+/g,' ').trim():'';
  if(!prior||n.exception||prior.exception||n.ordinal||prior.ordinal||n.context!==prior.context||n.sentence?.start!==prior.sentence?.start||!n.unit||n.unit!==prior.unit||!/^(?:[a-z]+\s*,?\s*)?(?:and|or|to|through|,)\s*(?:(?:and|or)\s*)?$/i.test(bridge)){
   finishGroup();group=[n];
  }else group.push(n);
 }
 finishGroup();
 for(const n of candidates){
  let preferred,rule,page=21,message,gpoRule,gpoPage,gpoPreferred,conflict=false;
  if(n.exception){({preferred,rule,page,message}=n);gpoRule=n.gpo;gpoPage=n.gpoPage;gpoPreferred=preferred;}
  else if(n.sentenceStart){
   if(!n.figure)continue;preferred=n.ordinal?ordinals[n.value]||`Rephrase the sentence to spell out ordinal ${n.value}`:spellNumber(n.value);preferred=preferred[0].toUpperCase()+preferred.slice(1);rule='Numerals, general item 1';message='Spell out a number at the beginning of a sentence, or rephrase the sentence.';gpoRule='12.16';gpoPage=294;gpoPreferred=preferred;
  }else if(n.ordinal){
   if(n.unit==='party'&&n.value===3){preferred='third';rule='Numerals: Digest, item 3';message='Use “third party” for a person other than the principals.';}
   else{const words=n.context==='Digest'?n.value===1:n.value<10;preferred=words?ordinals[n.value]:n.value+((n.value%100>=11&&n.value%100<=13)?'th':({1:'st',2:'nd',3:'rd'}[n.value%10]||'th'));rule=`Numerals: ${n.context}, item ${n.context==='Digest'?2:4}`;message=`LCB ${n.context.toLowerCase()} rules determine the ordinal form here.`;}
   gpoRule='12.10';gpoPage=292;gpoPreferred=n.value<10?ordinals[n.value]:preferred;conflict=n.context==='Digest'&&n.value>1&&n.value<10&&n.unit!=='party';
  }else{
   const related=relatedFigures.has(n);
   const words=n.context==='Digest'?n.value===1:n.value>0&&n.value<10&&!related;
   preferred=words?spellNumber(n.value):String(n.value);rule=`Numerals: ${n.context}, item ${n.context==='Digest'?1:related?3:words?1:2}`;
   page=21;
   message=related?'Related numbers in the same numerical expression use figures when one is 10 or more.':n.context==='Digest'?'Digest text uses figures except for one.':'Bill text spells out one through nine and uses figures for 10 and above; different numerical expressions are treated separately.';
   gpoRule=n.duration||n.measure?'12.9':n.value<10?'12.23':'12.4';gpoPage=n.duration||n.measure?288:n.value<10?296:287;
   gpoPreferred=n.duration||n.measure?String(n.value):n.value<10?spellNumber(n.value):String(n.value);
   conflict=(n.duration||n.measure)&&words||n.context==='Digest'&&n.value>1&&n.value<10&&!n.duration&&!n.measure;
  }
  const normalized=n.text.toLowerCase().replace(/\s+/g,' '),matchesPrimary=normalized===preferred.toLowerCase();
  if(matchesPrimary&&!conflict)continue;
  const gpoRecord=references.gpo.pages[(gpoPage||296)-1],gpoText=gpoRecord.text.slice(Math.max(0,gpoRecord.text.indexOf((gpoRule||'12.23')+'.'))).replace(/\s+/g,' ').slice(0,850);
  const refs=[cite('lcb',rule,page,preferred,message),cite('gpo',gpoRule||'12.23',gpoPage||296,gpoPreferred||preferred,gpoText)];
  if(n.duration||n.measure)refs.splice(1,0,cite('lcb',n.duration?'Numerals: Days/Dates and Ages':'Numerals: Measures',n.duration?22:23,preferred,n.duration?'LCB examples distinguish “four years (bill)” from “4 years (digest)” and “two years of age (bill)” from “2 years of age (digest).”':'LCB examples distinguish “two feet (bill)” from “2 feet (digest)” and “five megabytes (bill)” from “5 megabytes (digest).”'));
  issues.push({start:n.start,end:n.end,text:n.text,suggestion:preferred,rule,guideId:'lcb',guidePage:page,guidePrintedPage:String(page),category:'Numeral form',context:n.context,confidence:'Rule check',checkId:'numerals',references:refs,conflict,matchesPrimary,message:matchesPrimary?'Current wording follows LCB; no LCB correction is suggested. GPO uses a different form.':message,conflictNote:conflict?'LCB takes priority. LCB and GPO use different numeral forms in this context; the LCB recommendation is shown.':undefined});
 }
 return issues;
}
