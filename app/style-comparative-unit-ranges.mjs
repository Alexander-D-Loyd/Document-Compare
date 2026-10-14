import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
import {numericExpressionGuard} from './style-numeric-expression-evidence.mjs';
import {canonicalWrittenValue} from './style-cardinal-values.mjs';

const word='[\\p{L}\\p{N}\\p{M}_]',digit='(?:0|[1-9]\\d{0,2}(?:,\\d{3})+|[1-9]\\d*)(?:\\.\\d+)?';
const small='(?:zero|one|two|three|four|five|six|seven|eight|nine)',teen='(?:ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen)',tens='(?:twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)';
const quantity='(?:'+digit+'|'+small+'|'+teen+'|'+tens+'(?:[\\s-]+'+small+')?)';
const units=new Map([['acre','acre'],['acres','acre'],['foot','foot'],['feet','foot'],['inch','inch'],['inches','inch'],...['meter','metre','mile','pound','gallon','megabyte','megawatt','day','week','month','year','hour','minute','second'].flatMap(u=>[[u,u],[u+'s',u]])]);
const unit='(?:'+[...units.keys()].sort((a,b)=>b.length-a.length).join('|')+')';
const lower='(?:more\\s+than|greater\\s+than|at\\s+least|not\\s+less\\s+than)',upper='(?:less\\s+than|fewer\\s+than|at\\s+most|not\\s+more\\s+than)';
const patterns=[[lower,upper],[upper,lower]].map(([a,b])=>({kind:'explicit-same-unit-comparative-range',pattern:new RegExp('(?<!'+word+')(?<firstOperator>'+a+')(?<firstGap>\\s+)(?<first>'+quantity+')(?!'+word+')\\s+(?<firstUnit>'+unit+')(?!'+word+')\\s+and\\s+(?<secondOperator>'+b+')\\s+(?<second>'+quantity+')(?!'+word+')\\s+(?<secondUnit>'+unit+')(?!'+word+')','giu')}));
patterns.push({kind:'explicit-part-of-total-unit-range',pattern:new RegExp('(?<!'+word+')(?<firstOperator>a\\s+total\\s+of)(?<firstGap>\\s+)(?<first>'+quantity+')(?!'+word+')\\s+(?<firstUnit>'+unit+')(?!'+word+')\\s+or\\s+fewer\\s+of\\s+the\\s+required\\s+(?<second>'+quantity+')(?!'+word+')\\s+(?<secondUnit>'+unit+')(?!'+word+')','giu')});
const normalize=s=>s.replace(/\s+/gu,' ').trim();
const value=s=>/^\d/u.test(s)?s.replaceAll(',',''):String(canonicalWrittenValue(normalize(s))??'');
const atLeastTen=s=>{const v=value(s);return /^\d+(?:\.\d+)?$/u.test(v)&&v.split('.')[0].length>=2;};
export const COMPARATIVE_UNIT_RANGE_SCOPE='LCB21 Bill item3 applies to complete directly conjoined lower/upper comparative bounds with the same known written measurement or duration unit, and the finite A total of X units or fewer of the required Y units part-of-total construction. Both quantities, unit spellings and every complete comparative operator/connector or part-of-total cue must be intact. An exact unrounded canonical peer of ten or more establishes figures for each related live quantity. Known unit singular/plural forms normalize only their identity; unit grammar, range validity and legal intent are not inferred. A wholly struck canonical old numeral of the same exact value immediately before its live replacement may remain outside active evidence; unknown exclusions and any damaged operator, live quantity, connector or unit cannot establish a relationship. Literal/quoted terms, technical identifiers, titles/tables, genuine body dashes, different units, independent clauses and unfamiliar roles remain protected.';

function replacementGapDoc(doc,ctx,m,firstStart){
 const gapStart=m.index+m.groups.firstOperator.length,gapEnd=firstStart,original=originalBodyStyleContext(doc)?.source||ctx.source,old=normalize(original.slice(gapStart,gapEnd));
 const canonicalOld=old&&(/^\d/u.test(old)?new RegExp('^'+digit+'$','u').test(old):canonicalWrittenValue(old)!==null);
 if(!canonicalOld||!value(old)||value(old)!==value(m.groups.first))return doc;
 // Only a fully struck, whole old number matching this live replacement is
 // ignored. Restored original text is never a new positive role witness.
 const strikes=(doc.struck||[]).filter(r=>r.start<gapEnd&&r.end>gapStart);
 if(!strikes.length||strikes.some(r=>r.start<gapStart||r.end>gapEnd))return doc;
 for(let at=gapStart;at<gapEnd;at++)if(/\S/u.test(original[at])&&!strikes.some(r=>r.start<=at&&r.end>at))return doc;
 return {...doc,struck:doc.struck.filter(r=>!strikes.includes(r))};
}

export function comparativeUnitRanges(doc,ctx){
 const literal=originalStyleLiteralGuard(doc,ctx),quoted=billQuotedTermProtection(doc,ctx),numeric=numericExpressionGuard(doc,ctx),groups=[];
 for(const {pattern,kind} of patterns)for(const m of ctx.source.matchAll(pattern)){
  const start=m.index,end=start+m[0].length,firstStart=start+m.groups.firstOperator.length+m.groups.firstGap.length,firstEnd=firstStart+m.groups.first.length;
  const secondUnitStart=end-m.groups.secondUnit.length,secondStart=start+m[0].lastIndexOf(m.groups.second,secondUnitStart-start),secondEnd=secondStart+m.groups.second.length;
  if(ctx.at(firstStart)!=='Bill'||ctx.at(secondStart)!=='Bill'||!units.has(m.groups.firstUnit)||!units.has(m.groups.secondUnit)||units.get(m.groups.firstUnit)!==units.get(m.groups.secondUnit)||!value(m.groups.first)||!value(m.groups.second)||!atLeastTen(m.groups.first)&&!atLeastTen(m.groups.second))continue;
  const reviewDoc=replacementGapDoc(doc,ctx,m,firstStart),blocked=styleEvidenceGuard(reviewDoc,ctx);
  if(blocked(start,end)||literal(start,end)||quoted({start:firstStart,end:firstEnd})||quoted({start:secondStart,end:secondEnd})||[start,end,firstStart,firstEnd,secondStart,secondEnd].some(at=>cutsOriginalStyleWord(doc,at))||numeric(firstStart,firstEnd)||numeric(secondStart,secondEnd))continue;
  if(/[-\u2010-\u2015/:\\#@]/u.test(doc.text[start-1]||'')||/^(?:[-\u2010-\u2015/:\\#@]|\.\d)/u.test(doc.text.slice(end))||/^\s+(?:Act|Code|Law|Fund|Account|Authority|Department|Agency|Commission|Board)\b/u.test(doc.text.slice(end)))continue;
  if([...doc.text.slice(start,end).matchAll(/[\u2012-\u2015]/gu)].some(d=>/\S/u.test(ctx.source[start+d.index]||'')))continue;
  const firstHeadStart=firstEnd+ctx.source.slice(firstEnd,end).match(/^\s+/u)[0].length;
  groups.push({kind,start,end,head:units.get(m.groups.firstUnit),atLeastTen:true,members:[{start:firstStart,end:firstEnd,sourceText:doc.text.slice(firstStart,firstEnd),exactSourceValue:value(m.groups.first),headStart:firstHeadStart,headEnd:firstHeadStart+m.groups.firstUnit.length},{start:secondStart,end:secondEnd,sourceText:doc.text.slice(secondStart,secondEnd),exactSourceValue:value(m.groups.second),headStart:secondUnitStart,headEnd:end}]});
 }
 return groups;
}
