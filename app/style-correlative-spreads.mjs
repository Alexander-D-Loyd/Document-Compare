import {styleEvidenceGuard,cutsOriginalStyleWord}from './style-evidence.mjs';
import {numericExpressionGuard}from './style-numeric-expression-evidence.mjs';
import {writtenQuantityEvidenceGuard}from './style-written-quantity-evidence.mjs';
import {exactIntegerParts}from './style-exact-integer-digits.mjs';
import {numeralIdentifierRanges}from './style-numeral-identifiers.mjs';
export const CORRELATIVE_SPREAD_SCOPE='Complete source-validated shared-head cardinal spreads have no member-count or 150-character tail limit. Canonical ordinary and scale-and-remainder counts, exact large integer peers and complete unsigned decimals with canonical integer parts remain whole. Decimal magnitude is established from exact source digits, without floating-point rounding or a replacement of the decimal itself. Comma/and/or/to/through links, the final head and any recognized day-unit qualifier must remain intact across every member. Original strikes, quotations, tables, unknown exclusions and partial numerical expressions suppress relationship inference; known printed margins and running heads retain source offsets. LCB22 correlatives/spreads and LCB21 Bill item3 are applied only through the existing recognized noun/unit grammar; time/measurement and sentence-opening guide disagreements remain excluded. Implicit relationships, unfamiliar noun roles, fractions, leading-point/signed/exponent or malformed decimal expressions, complex modifiers and semantic meanings remain partial.';
const link=/^(?:\s*,\s*(?:(?:and|or)\s+)?|\s+(?:and|or|to|through)\s+)$/i;
const head=/^\s*(?:-\s*)?(?:(?:business|calendar|court|school|academic|consecutive|working)\s+)?([a-z]+)\b/i;
const decimal=/^(0|[1-9]\d{0,2}(?:,\d{3})+|[1-9]\d*)\.\d+$/u;
// A decimal peer may establish the related-number threshold but is never
// converted into wording or rounded. 9.999999999999999999 is still below 10.
const figureDigits=text=>text==='0'?'0':exactIntegerParts(text)?.digits||decimal.exec(text)?.[1].replaceAll(',','')||null;
export function correlativeSpreads(doc,ctx,atoms,scaleParts=[]){
 const source=ctx.source,blocked=styleEvidenceGuard(doc,ctx),numeric=numericExpressionGuard(doc,ctx),written=writtenQuantityEvidenceGuard(doc,ctx),groups=[],byStart=new Map(),uncertainRanges=[];
 // Whole scale-and-remainder counts own their lexical component atoms. An
 // invalid whole run interrupts a list rather than supplying a fake peer.
 const whole=scaleParts.filter(p=>p.value!==null).map(p=>({...p,text:source.slice(p.start,p.end),ordinal:false,figure:false})),sortedParts=[...scaleParts].sort((a,b)=>a.start-b.start);let at=0;
 const plain=atoms.filter(a=>{while(at<sortedParts.length&&sortedParts[at].end<=a.start)at++;return !sortedParts[at]||sortedParts[at].start>=a.end;});
 const identifiers=numeralIdentifierRanges(source),members=[...plain,...whole].sort((a,b)=>a.start-b.start),usable=a=>!a.ordinal&&!identifiers.some(r=>r.start<a.end&&r.end>a.start)&&(a.figure?figureDigits(a.text)!==null:Number.isSafeInteger(a.value)&&a.value>=0);
 let group=[];
 const finish=()=>{
  if(group.length<2)return;
  const first=group[0],last=group.at(-1),noun=head.exec(source.slice(last.end));if(!noun)return;
  const end=last.end+noun[0].length,headEnd=end,headStart=end-noun[1].length;
  // Sentence and source boundaries apply to the entire expression, including
  // a peer not otherwise emitted by the ordinary numeral checker.
  const safe=ctx.at(first.start)!=='Heading'&&ctx.at(first.start)===ctx.at(last.start)&&ctx.sentenceAt(first.start).start===ctx.sentenceAt(last.start).start&&!blocked(first.start,end)&&![first.start,end,headStart].some(n=>cutsOriginalStyleWord(doc,n))&&group.every(m=>!cutsOriginalStyleWord(doc,m.start)&&!cutsOriginalStyleWord(doc,m.end)&&!(m.figure?numeric(m.start,m.end):written(m.start,m.end,end)));
  const proof={start:first.start,end,headStart,headEnd,head:noun[1].toLowerCase(),members:group.map(m=>({...m,sourceText:doc.text.slice(m.start,m.end)})),atLeastTen:group.some(m=>m.figure?(figureDigits(m.text)||'0').length>1:m.value>=10)};
  if(!safe){uncertainRanges.push({start:first.start,end:last.end});return;}
  groups.push(proof);for(const member of group)byStart.set(member.start,proof);
 };
 for(const atom of members){const previous=group.at(-1),valid=usable(atom);if(!valid||previous&&(!link.test(source.slice(previous.end,atom.start))||ctx.at(previous.start)!==ctx.at(atom.start)||ctx.sentenceAt(previous.start).start!==ctx.sentenceAt(atom.start).start)){finish();group=[];}if(valid)group.push(atom);}
 finish();return {groups,byStart,uncertainRanges};
}
