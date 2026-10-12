import {ones,canonicalWrittenValue}from './style-cardinal-values.mjs';
import {andCardinalParts}from './style-compound-cardinals.mjs';
import {styleContext}from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord}from './style-evidence.mjs';
import {numericExpressionGuard}from './style-numeric-expression-evidence.mjs';
import {writtenQuantityEvidenceGuard,writtenCardinalRuns}from './style-written-quantity-evidence.mjs';
import {numeralIdentifierRanges}from './style-numeral-identifiers.mjs';
import {sourceNameRanges}from './style-source-names.mjs';

export const PARSED_NUMBER_RELATION_RULE='LCB_PARSED_NUMBER_RELATION_REVIEW';
export const PARSED_NUMBER_RELATION_SCOPE='Offline parser-assisted LCB Bill item 3 review of counts separated by clauses or prepositional phrases in one intact sentence. Direct nummod attachments to common lowercase nouns with the same lemma identify potential related quantities, including singular/plural heads and selected complete multiword written counts. Every small written count and peer of 10 or more is independently validated against the complete original numerical expression, count-to-head span and source sentence. Canonical figure peers retain exact source digits beyond the safe-integer boundary; the parser and source mapper use the exact 10-or-more threshold without rounded values. Explicit per-unit rates are distinguished from plain counts and from rates with a different intact simple denominator. Existing precise and contiguous-series checks retain priority. The reader confirms whether the counts are related; no replacement is asserted. Different noun lemmas, sentence openings, digest conflicts, identifiers, mathematical expressions, names, literals, tables, headings, strikes and unknown exclusions remain protected. Parser mistakes, semantic quantity roles without explicit per, qualified/complex denominators, coordination without direct attachments, unresolved chunk edges and unsupported syntax can still miss or misclassify relationships. Grouped and unusually long figures may lack parser noun attachments despite exact threshold support. This supplies a broader checking method, not semantic certainty or measured office recall.';
const intersects=(rows,start,end)=>rows.some(r=>r.start<end&&r.end>start);
const gap=/^\s+(?:[\p{L}\p{M}]+(?:[-’'][\p{L}\p{M}]+)*\s+)*$/u;
const noun=/^\p{Ll}[\p{Ll}\p{M}]*$/u;
const inside=(range,evidence)=>range&&range.start>=evidence.start&&range.end<=evidence.end;
function countDetails(text){
 if(/^(?:0|[1-9][0-9]*|[1-9][0-9]{0,2}(?:,[0-9]{3})+)$/.test(text)){
  const digits=text.replaceAll(',',''),unsafe=digits.length>16||digits.length===16&&digits>'9007199254740991';
  return unsafe?{value:null,atLeastTen:true,exactSourceInteger:digits}:{value:Number(digits)};
 }
 const canonical=canonicalWrittenValue(text),part=canonical===null?andCardinalParts(text).find(p=>p.start===0&&p.end===text.length):null,value=canonical??part?.value;
 return Number.isSafeInteger(value)?{value}:null;
}
function sourceCountMatches(member,text){
 const expected=countDetails(text);return expected!==null&&member.value===expected.value&&member.exactSourceInteger===expected.exactSourceInteger&&member.atLeastTen===expected.atLeastTen;
}
export {countDetails as sourceCountDetails};

export function mapParsedNumberRelation(doc,plan,issue,selected,evidence){
 if(issue.engineRule!==PARSED_NUMBER_RELATION_RULE)return null;
 return mapCountRelationSource(doc,plan,issue,selected,evidence);
}
// Share the original numerical/source guards without inventing matching
// lemmas for coordination. Each caller still validates its own role proof.
export function mapCountRelationSource(doc,plan,issue,selected,evidence,{requireSameLemma=true}={}){
 if(issue.engine!=='spaCy'||issue.reviewSuggested!==true||issue.suggestion!==null)return null;
 const text=plan.text.slice(issue.start,issue.end),value=ones.indexOf(text.toLowerCase());
 if(value<1||value>9||issue.conditionalSuggestion!==String(value))return null;
 const head=plan.range(issue.headStart,issue.headEnd),peer=plan.range(issue.peerStart,issue.peerEnd),peerHead=plan.range(issue.peerHeadStart,issue.peerHeadEnd);
 if(![selected,head,peer,peerHead].every(r=>inside(r,evidence))||selected.end>head.start||peer.end>peerHead.start||intersects([peer],selected.start,selected.end))return null;
 if(!noun.test(issue.head)||!noun.test(issue.peerHead)||!noun.test(issue.headLemma)||!noun.test(issue.peerHeadLemma)||requireSameLemma&&issue.headLemma!==issue.peerHeadLemma||plan.text.slice(issue.headStart,issue.headEnd)!==issue.head||plan.text.slice(issue.peerHeadStart,issue.peerHeadEnd)!==issue.peerHead)return null;
 if(!gap.test(plan.text.slice(issue.end,issue.headStart))||!gap.test(plan.text.slice(issue.peerEnd,issue.peerHeadStart)))return null;
 const perUnit=at=>{const tail=plan.text.slice(at,issue.evidenceEnd);if(!/^\s+per\b/u.test(tail))return '';return /^\s+per\s+(\p{Ll}[\p{Ll}\p{M}]*)(?=\s*(?:[.,;:!?)]|$)|\s+(?:and|or|in|of|for|under|with|shall|must|may|is|are|was|were)\b)/u.exec(tail)?.[1]??null;};
 const unit=perUnit(issue.headEnd),peerUnit=perUnit(issue.peerHeadEnd);if(unit===null||peerUnit===null||unit!==peerUnit)return null;
 const peerText=plan.text.slice(issue.peerStart,issue.peerEnd),peerDetails=countDetails(peerText);if(peerDetails===null||!(peerDetails.atLeastTen||peerDetails.value>=10))return null;
 const ctx=styleContext(doc),blocked=styleEvidenceGuard(doc,ctx),numeric=numericExpressionGuard(doc,ctx),written=writtenQuantityEvidenceGuard(doc,ctx),identifiers=numeralIdentifierRanges(ctx.source),names=sourceNameRanges(ctx.source);
 const cardinalRuns=writtenCardinalRuns(ctx.source),partialWritten=range=>cardinalRuns.some(r=>r.start<range.end&&r.end>range.start&&(r.start!==range.start||r.end!==range.end));
 if(partialWritten(selected)||(!/^\d/.test(peerText)&&partialWritten(peer)))return null;
 if(blocked(evidence.start,evidence.end)||[selected,head,peer,peerHead].some(r=>cutsOriginalStyleWord(doc,r.start)||cutsOriginalStyleWord(doc,r.end)||ctx.at(r.start)!=='Bill'||intersects(identifiers,r.start,r.end)||intersects(names,r.start,r.end)))return null;
 const sentence=ctx.sentenceAt(selected.start);if([head,peer,peerHead].some(r=>ctx.sentenceAt(r.start).start!==sentence.start))return null;
 const signedPrefix=at=>/[+−-]\s*$|\b(?:minus|negative|positive|plus)\s*$/i.test(ctx.source.slice(sentence.start,at));
 const prefix=ctx.source.slice(sentence.start,selected.start).replace(/^[\s“”"’']*(?:\([a-z\d]+\)\s*)*/i,'').trim();if(!prefix||signedPrefix(selected.start)||signedPrefix(peer.start))return null;
 if(written(selected.start,selected.end,head.end)||(/^\d/.test(peerText)?numeric(peer.start,peer.end):written(peer.start,peer.end,peerHead.end)))return null;
 return {...selected,text:doc.text.slice(selected.start,selected.end),matchText:text,suggestion:null,conditionalSuggestion:String(value),engine:'spaCy',engineRule:issue.engineRule,reviewSuggested:true,reviewKind:'parsed-numerical-relationship',evidenceStart:evidence.start,evidenceEnd:evidence.end,relationshipEvidence:{start:evidence.start,end:evidence.end,head:issue.headLemma,sentenceText:plan.text.slice(issue.evidenceStart,issue.evidenceEnd),members:[{...selected,value,headStart:head.start,headEnd:head.end,head:issue.head,lemma:issue.headLemma,sourceText:doc.text.slice(selected.start,selected.end),...(unit?{perUnit:unit}:{})},{...peer,...peerDetails,headStart:peerHead.start,headEnd:peerHead.end,head:issue.peerHead,lemma:issue.peerHeadLemma,sourceText:doc.text.slice(peer.start,peer.end),...(peerUnit?{perUnit:peerUnit}:{})}]}};
}

export function validMappedCountRelation(candidate,doc,{requireSameLemma=true,reviewKind='parsed-numerical-relationship'}={}){
 const e=candidate.relationshipEvidence,m=e?.members;
 if(candidate.engine!=='spaCy'||candidate.reviewKind!==reviewKind||!e||!Array.isArray(m)||m.length!==2||![candidate.start,candidate.end,e.start,e.end].every(Number.isInteger)||e.start<0||e.end>doc.text.length||e.start>candidate.start||e.end<candidate.end||candidate.start>=candidate.end||m[0].start!==candidate.start||m[0].end!==candidate.end||candidate.conditionalSuggestion!==String(m[0].value)||m[0].value<1||m[0].value>9||!(m[1].atLeastTen===true||Number.isSafeInteger(m[1].value)&&m[1].value>=10))return false;
 const ctx=styleContext(doc);if(styleEvidenceGuard(doc,ctx)(e.start,e.end))return false;
 return m.every(member=>member&&[member.start,member.end,member.headStart,member.headEnd].every(Number.isInteger)&&member.start>=e.start&&member.end<=member.headStart&&member.headEnd<=e.end&&member.start<member.end&&member.headStart<member.headEnd&&noun.test(member.head)&&noun.test(member.lemma)&&(!requireSameLemma||member.lemma===e.head)&&ctx.at(member.start)==='Bill'&&sourceCountMatches(member,ctx.source.slice(member.start,member.end))&&ctx.source.slice(member.headStart,member.headEnd).replace(/\s+/g,' ').trim()===member.head);
}

export function parsedNumberRelationReviewIssues(candidates,doc,references,{existingIssues=[]}={}){
 const issues=[];
 for(const candidate of candidates){
  if(candidate.engineRule!==PARSED_NUMBER_RELATION_RULE||candidate.reviewSuggested!==true||candidate.suggestion!==null||!validMappedCountRelation(candidate,doc)||intersects([...existingIssues,...issues],candidate.start,candidate.end))continue;
  issues.push({...candidate,guideId:'lcb',guidePage:21,guidePrintedPage:String(references.lcb.pages[20].printedPage),rule:'Numerals: Bill, item 3',category:'Numerical Relationship Review',context:'Bill',confidence:'Review Suggested',conflict:false,matchesPrimary:false,checkId:'lcb-parsed-number-relation-review',message:'Review Suggested: The offline parser links these counts to “'+candidate.relationshipEvidence.head+'” in the same sentence, and one count is 10 or more. Confirm whether they are the same numerical expression. If related, use “'+candidate.conditionalSuggestion+'” here; different expressions retain their own treatment. No replacement is asserted.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:21,guidePrintedPage:String(references.lcb.pages[20].printedPage),rule:'Numerals: Bill, item 3',preferred:null,ruleText:'When 2 or more numbers appear in a sentence and one of them is 10 or larger, figures are used for each number, unless they are of different numerical expressions.'},{guideId:'gpo',guideName:'GPO Style Manual',guidePage:287,guidePrintedPage:String(references.gpo.pages[286].printedPage),rule:'12.5',preferred:null,ruleText:'Related numbers appearing in the same sentence follow the figure treatment when one of them is 10 or larger; different numerical expressions are treated separately.'}]});
 }
 return issues;
}
