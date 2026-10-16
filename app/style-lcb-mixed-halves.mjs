import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
import {canonicalWrittenValue} from './style-cardinal-values.mjs';
import {writtenCardinalRuns} from './style-written-quantity-evidence.mjs';
import {EXACT_INTEGER_TOKEN_PATTERN,exactIntegerParts,groupIntegerDigits,exceedsSafeInteger} from './style-exact-integer-digits.mjs';
const word='[\\p{L}\\p{N}\\p{M}_]',unit='years?\\s+of\\s+age|hours?|minutes?|days?|weeks?|months?|years?',tail='and\\s+one[\\s-]+half(?<unitGap>\\s+)(?<unit>'+unit+')(?!'+word+')';
const writtenTail=new RegExp('(?<!'+word+')'+tail,'giu'),figurePattern=new RegExp('(?<!'+word+')(?<whole>'+EXACT_INTEGER_TOKEN_PATTERN+')\\s+'+tail,'giu');
const scale=/^(?:hundred|thousand|million|billion|trillion)$/u;
function writtenWhole(text){
 const tokens=text.toLowerCase().replace(/[\s-]+/gu,' ').trim().split(' ');
 if(tokens.some((w,i)=>w==='and'&&(!scale.test(tokens[i-1]||'')||!tokens[i+1]||tokens[i+1]==='and'||scale.test(tokens[i+1]))))return null;
 const value=canonicalWrittenValue(tokens.filter(w=>w!=='and').join(' '));return value!==null&&value>=10?value:null;
}
export function mixedHalfParts(source){
 const runsByEnd=new Map(writtenCardinalRuns(source).map(r=>[r.end,r])),parts=[];
 const add=(m,start,digits,value)=>{const end=m.index+m[0].length,numberEnd=end-m.groups.unit.length-m.groups.unitGap.length;parts.push({start,end,numberEnd,digits,value,unit:m.groups.unit});};
 for(const m of source.matchAll(writtenTail)){
  const oneEnd=m.index+/^and\s+one/iu.exec(m[0])[0].length,run=runsByEnd.get(oneEnd);if(!run||run.start>=m.index)continue;
  const whole=source.slice(run.start,m.index).trim(),value=writtenWhole(whole);if(value!==null)add(m,run.start,String(value),value);
 }
 for(const m of source.matchAll(figurePattern)){const p=exactIntegerParts(m.groups.whole);if(p&&!p.suffix&&p.digits.length>=2)add(m,m.index,p.digits,exceedsSafeInteger(p.digits)?p.digits:Number(p.digits));}
 return parts.sort((a,b)=>a.start-b.start);
}
export const LCB_MIXED_HALF_SCOPE='LCB22 prints 70 1/2 years of age and LCB23 prints 10 1/2 hours; LCB21 uses figures for numbers ten and above. Complete canonical written mixed one-half age/duration quantities of ten or more receive one whole-value figure correction, never an isolated whole-number edit. Written whole values must be canonical safe integers, with internal and only after a scale; canonical unsigned figure strings retain arbitrarily large exact digits. Exact live year/hour/minute/day/week/month units are supported. Fractions below ten keep their existing Bill/Digest rules. Sentence openings, other fractions/units, signed or technical quantities, titles, quotes, bill-local terms, tables, damaged source and unknown exclusions remain protected. This does not infer age, elapsed-time meaning, fractional grammar or whole-rule completeness.';
export function lcbMixedHalfIssues(doc,references){
 const ctx=styleContext(doc),blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx),quoted=billQuotedTermProtection(doc,ctx),original=originalBodyStyleContext(doc)?.source||ctx.source,issues=[];
 for(const part of mixedHalfParts(ctx.source)){
  const {start,end,numberEnd,value,digits,unit}=part,range={start,end:numberEnd},suggestion=groupIntegerDigits(digits)+' 1⁄2';
  if(!value||ctx.at(start)==='Heading'||blocked(start,end)||literal(start,end)||quoted({start,end})||cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,end)||/[\p{L}\p{N}\p{M}_+−\u2010-\u2015/\\#@-]/u.test(original[start-1]||'')||/^[-\u2010-\u2015/\\#@]/u.test(original.slice(end))||/^\s+(?:Act|Code|Law|Program|Fund|Account|Authority|Department|Agency|Commission|Board|Institute)\b/u.test(original.slice(end)))continue;
  if(/^years?$/iu.test(unit)&&/^\s+of\s+age\b/iu.test(original.slice(end)))continue;
  if(/^\.\d/u.test(original.slice(end))||/[+−\u2012-\u2015/⁄^*=$€£¥₹¢-]\s*$/u.test(original.slice(0,start))||/\b(?:minus|negative|plus|positive|point)\s*$/iu.test(original.slice(0,start)))continue;
  if(/\b(?:Form|Section|Article|Chapter|Part|Division|Paragraph|Subdivision|Schedule|Item|No\.?|Model|Type|Class|Version|Figure|Table|Appendix|Exhibit|Code|ID)\s*(?:[:#]\s*)?$/iu.test(original.slice(0,start)))continue;
  if([...doc.text.slice(start,numberEnd).matchAll(/[\u2010-\u2015]/gu)].some(d=>ctx.source[start+d.index]==='-')||/[\p{L}\p{N}\p{M}_]\.\s*$/u.test(doc.text.slice(0,start)))continue;
  // Never correct a suffix of a larger original cardinal. Masking
  // a scale word must not turn the remaining suffix into an eligible value.
  if(/(?<![\p{L}\p{N}\p{M}_])(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundreds?|thousands?|millions?|billions?|trillions?|quadrillions?|quintillions?|\d+)(?:\s+and)?[\s,-]+$/iu.test(original.slice(0,start)))continue;
  const sentence=ctx.sentenceAt(start),prefix=ctx.source.slice(sentence.start,start).replace(/^[\s”"’']*(?:\([a-z\d]+\)\s*)*/iu,'').trim();if(!prefix||/[:;]\s*$/u.test(prefix))continue;
  const age=/of\s+age$/iu.test(unit),page=age?22:23,record=references.lcb.pages[page-1],sourcePattern=age?/701⁄2\s+years\s+of\s+age/u:/101⁄2\s+hours\s+\(bill,\s+digest\)/u,source=sourcePattern.exec(record.text);if(!source)continue;
  issues.push({...range,text:doc.text.slice(start,numberEnd),suggestion,checkId:'lcb-mixed-half-quantity',guideId:'lcb',guidePage:page,guidePrintedPage:String(record.printedPage),rule:'Numerals: '+(age?'Ages':'Mixed time quantities'),category:'Mixed quantity',context:ctx.at(start),conflict:false,evidenceStart:start,evidenceEnd:end,message:'LCB uses figures for this complete mixed quantity of ten or more. Review the whole value; its written fraction must not be left behind after changing only the whole number.',mixedHalfEvidence:{start,end,sourceText:doc.text.slice(start,end),whole:value,wholeDigits:digits,numerator:1,denominator:2,unitStart:end-unit.length,unitEnd:end,unit:doc.text.slice(end-unit.length,end)},references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:page,guidePrintedPage:String(record.printedPage),rule:'Numerals: '+(age?'Ages':'Time'),preferred:suggestion,ruleText:source[0],sourcePassage:{start:source.index,end:source.index+source[0].length,text:source[0]}},{guideId:'lcb',guideName:'LCB Style Manual',guidePage:21,guidePrintedPage:String(references.lcb.pages[20].printedPage),rule:'Numerals: Bill, item 2',preferred:suggestion,ruleText:'Use figures for numbers 10 and above.'}]});
 }
 return issues;
}
