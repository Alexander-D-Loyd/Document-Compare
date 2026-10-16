import {styleContext,withStyleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {compoundSourceBoundaryBlocked} from './style-compound-source-boundaries.mjs';
import {styleWordDivisionView} from './style-word-divisions.mjs';
import {numericExpressionGuard} from './style-numeric-expression-evidence.mjs';
import {writtenCardinalRuns,writtenQuantityEvidenceGuard} from './style-written-quantity-evidence.mjs';
import {canonicalWrittenValue} from './style-cardinal-values.mjs';
import {numeralIdentifierRanges} from './style-numeral-identifiers.mjs';
import {andCardinalParts} from './style-compound-cardinals.mjs';
import {exactIntegerParts,exceedsSafeInteger}from './style-exact-integer-digits.mjs';

const intersects=(rows,start,end)=>rows.some(r=>r.start<end&&r.end>start);
const connectors=new Set(['and','or','to','through']);
const nonHeads=new Set(['and','or','to','through','of','in','for','by','at','is','are','was','were','shall','must','may','will','can','would','could','should','than','as','from','that','which','a','an','the']);
const qualifiers=new Set(['eligible','ineligible','new','additional','existing','approved','pending','qualifying','registered','licensed','participating']);
const headTerm='(?:(?:'+[...qualifiers].join('|')+')\\s+)?\\p{Ll}[\\p{L}\\p{M}]*';
const normalizeHead=text=>text?.replace(/\s+/g,' ').trim()||null;
const bridgePattern=new RegExp('^\\s*(?:(?<head>'+headTerm+')\\s*)?(?:,\\s*(?:(?:and|or)\\s+)?|(?:and|or|to|through)\\s+)$','u');
const finalHeadPattern=new RegExp('^\\s+(?<head>'+headTerm+')(?![\\p{L}\\p{N}\\p{M}_-])','u');
const qualifiedContinuations=new Set([...nonHeads,'arrive','arrives','remain','remains','apply','applies','exist','exists','qualify','qualifies','participate','participates','receive','receives']);
export const EXACT_COUNT_THRESHOLD_SCOPE='Canonical figure peers retain exact source digits beyond the JavaScript safe-integer boundary; selected contiguous and direct offline-parser relations use an exact 10-or-more threshold. Unsafe values are not rounded into numeric metadata or rewritten. Canonical zero can remain an intervening member; zero-leading and malformed grouped figures remain protected. Missing parser attachments, unsupported syntax and full numerical meaning remain manual.';
export const LCB_NUMBER_RELATION_REVIEW_SCOPE='Reader-assisted Bill item 3 checks for complete contiguous numeral series with a shared unfamiliar lowercase noun head or an exactly repeated lowercase head. Selected single qualifiers (eligible, ineligible, new, additional, existing, approved, pending, qualifying, registered, licensed, participating) belong to the complete head; repeated heads must have the same qualifier and noun. Qualified final heads require punctuation or a selected function-word/predicate boundary so another unfamiliar word cannot be silently omitted from their evidence. A series containing a count of 10 or more triggers review of smaller written counts when the precise checker has no finding at those selections. Every original count, connector and establishing head is intact evidence; whole numeric/written expressions, recognized word divisions, identifiers, tables, quotations, headings, source strikes and unknown exclusions are protected. Sentence-opening series and digest conflicts remain excluded. A repeated phrase is not proof of numerical meaning; the reader confirms that counts are related rather than distinct expressions. Complex intervening clauses, other or multiple qualifiers, unfamiliar following predicates, different heads, noncanonical counts and unstated relationships remain outside this finite trigger.';

export function lcbNumberRelationReviewIssues(doc,references,{existingIssues=[]}={}){
 if(!references?.lcb?.pages||!references?.gpo?.pages)return [];
 const view=styleWordDivisionView(doc),reviewDoc=view?.doc||doc;
 const prior=view?existingIssues.map(i=>({...i,start:view.toView(i.start),end:view.toView(i.end)})):existingIssues;
 const issues=withStyleContext(reviewDoc,()=>reviewRelations(reviewDoc,references,prior));
 return view?view.restore(issues).map(issue=>({...issue,evidenceStart:view.toSource(issue.evidenceStart),evidenceEnd:view.toSource(issue.evidenceEnd,true),relationshipEvidence:{...issue.relationshipEvidence,start:view.toSource(issue.relationshipEvidence.start),end:view.toSource(issue.relationshipEvidence.end,true),members:issue.relationshipEvidence.members.map(member=>({...member,start:view.toSource(member.start),end:view.toSource(member.end,true)}))}})):issues;
}
function restoreLiveNegativeSource(original,source,struck){
 if(original===source||!struck.length)return original;
 const chars=original.split('');
 for(const r of struck)for(let n=Math.max(0,r.start);n<Math.min(chars.length,r.end);n++)if(chars[n]!=='\n')chars[n]=' ';
 return chars.join('');
}
function reviewRelations(doc,references,existingIssues){
 const ctx=styleContext(doc),source=ctx.source,original=originalBodyStyleContext(doc)?.source||source,originalLive=restoreLiveNegativeSource(original,source,doc.struck||[]),literal=originalStyleLiteralGuard(doc,ctx),blocked=styleEvidenceGuard(doc,ctx),numeric=numericExpressionGuard(doc,ctx),writtenGuard=writtenQuantityEvidenceGuard(doc,ctx),identifiers=numeralIdentifierRanges(source),atoms=[],issues=[];
 for(const m of source.matchAll(/(?<![\p{L}\p{N}\p{M}_])\d+(?:,\d{3})*(?![\p{L}\p{N}\p{M}_])/gu)){
  const start=m.index,end=start+m[0].length,p=m[0]==='0'?{digits:'0'}:exactIntegerParts(m[0]);
  if(p&&!numeric(start,end)){const unsafe=exceedsSafeInteger(p.digits);atoms.push({start,end,value:unsafe?null:Number(p.digits),figure:true,text:m[0],...(unsafe?{atLeastTen:true,exactSourceInteger:p.digits}:{})});}
 }
 const scaled=new Map(andCardinalParts(source).map(part=>[part.start,part]));
 for(const run of writtenCardinalRuns(source)){
  const text=source.slice(run.start,run.end),scale=scaled.get(run.start),value=scale?.value??canonicalWrittenValue(text);
  if(scale&&scale.value===null)continue;
  if(value!==null&&!writtenGuard(run.start,run.end)){atoms.push({...run,value,figure:false,text});continue;}
  if(!scale&&/\band\b/i.test(text))for(const m of text.matchAll(/[^]*?(?=\s+and\s+|$)/gi)){
   const piece=m[0].replace(/^\s*and\s+/i,'').trim();if(!piece)continue;
   const offset=m[0].indexOf(piece),start=run.start+m.index+offset,end=start+piece.length,partValue=canonicalWrittenValue(piece);
   if(partValue!==null&&!writtenGuard(start,end))atoms.push({start,end,value:partValue,figure:false,text:piece});
  }
 }
 atoms.sort((a,b)=>a.start-b.start||a.end-b.end);
 const bridge=(a,b)=>{
  const text=source.slice(a.end,b.start),m=bridgePattern.exec(text),head=normalizeHead(m?.groups.head);
  return m&&!connectors.has(head)&&!qualifiers.has(head)?{head}:null;
 };
 let group=[],heads=[];
 const finish=()=>{
  if(group.length<2||!group.some(n=>n.atLeastTen||n.value>=10)||!group.some(n=>!n.figure&&n.value>0&&n.value<10))return;
  const first=group[0],last=group.at(-1),lastHead=finalHeadPattern.exec(source.slice(last.end)),head=normalizeHead(lastHead?.groups.head);
  if(!lastHead||nonHeads.has(head)||qualifiers.has(head)||qualifiers.has(head.split(' ').at(-1)))return;
  const end=last.end+lastHead[0].length;
  const originalNextWord=/^\s+([\p{L}\p{M}]+)/u.exec(doc.text.slice(end));
  if(head.includes(' ')&&originalNextWord&&blocked(end,end+originalNextWord[0].length))return;
  const nextWord=/^\s+([\p{L}\p{M}]+)/u.exec(source.slice(end));
  if(head.includes(' ')&&nextWord&&(!qualifiedContinuations.has(nextWord[1])||blocked(end,end+nextWord[0].length)||cutsOriginalStyleWord(doc,end+nextWord[0].length)))return;
  const evidenceEnd=head.includes(' ')&&nextWord?end+nextWord[0].length:end;
  if(literal(first.start,evidenceEnd)||blocked(first.start,evidenceEnd)||compoundSourceBoundaryBlocked(doc.text,source,original,first.start,end)||compoundSourceBoundaryBlocked(doc.text,source,original,first.start,evidenceEnd))return;
  if(heads.some(other=>other&&other!==head)||cutsOriginalStyleWord(doc,first.start)||cutsOriginalStyleWord(doc,end)||blocked(first.start,end)||intersects(identifiers,first.start,end)||ctx.at(first.start)!=='Bill'||ctx.at(last.start)!=='Bill'||ctx.sentenceAt(first.start).start!==ctx.sentenceAt(last.start).start)return;
  const sentence=ctx.sentenceAt(first.start),prefix=source.slice(sentence.start,first.start).replace(/^[\s”"’']*(?:\([a-z\d]+\)\s*)*/i,'').trim();
  const identifierPrefix=/\b(?:sections?|articles?|chapters?|parts?|divisions?|paragraphs?|subdivisions?|items?|schedules?|grades?|figures?|tables?|forms?|pages?|lines?)\s*$/i;
  // Restore only uncertain exclusion content for negative role evidence.
  // Deliberately struck words remain absent from the live Current wording.
  if(!prefix||identifierPrefix.test(prefix)||identifierPrefix.test(originalLive.slice(sentence.start,first.start)))return;
  for(const atom of group){
   if(atom.figure||atom.value<1||atom.value>=10||intersects(existingIssues,atom.start,atom.end))continue;
   const suggested=String(atom.value),message='Review Suggested: These counts share “'+head+'” and include a number of 10 or more. LCB uses figures for related numbers in the same numerical expression, but keeps different expressions separate. Confirm their relationship; if they are related, use “'+suggested+'” here.';
   issues.push({start:atom.start,end:atom.end,evidenceStart:first.start,evidenceEnd,text:doc.text.slice(atom.start,atom.end),matchText:atom.text.replace(/\s+/g,' '),suggestion:null,conditionalSuggestion:suggested,rule:'Numerals: Bill, item 3',guideId:'lcb',guidePage:21,guidePrintedPage:'21',category:'Numerical Relationship Review',context:'Bill',confidence:'Review Suggested',reviewSuggested:true,reviewKind:'numerical-relationship',checkId:'lcb-number-relation-review',conflict:false,matchesPrimary:false,message,relationshipEvidence:{start:first.start,end,head,members:group.map(n=>({start:n.start,end:n.end,value:n.value,...(n.exactSourceInteger?{atLeastTen:n.atLeastTen,exactSourceInteger:n.exactSourceInteger}:{})}))},references:[{guideId:'lcb',guideName:'LCB Style Manual',rule:'Numerals: Bill, item 3',guidePage:21,guidePrintedPage:String(references.lcb.pages[20].printedPage),preferred:null,ruleText:'When 2 or more numbers appear in a sentence and one of them is 10 or larger, figures are used for each number, unless they are of different numerical expressions.'},{guideId:'gpo',guideName:'GPO Style Manual',rule:'12.5',guidePage:287,guidePrintedPage:String(references.gpo.pages[286].printedPage),preferred:null,ruleText:'Related numbers appearing in the same sentence follow the figure treatment when one of them is 10 or larger; different numerical expressions are treated separately.'}]});
  }
 };
 for(const atom of atoms){
  const prior=group.at(-1),link=prior&&bridge(prior,atom);
  if(!prior){group=[atom];continue;}
  if(!link){finish();group=[atom];heads=[];continue;}
  heads.push(link.head);group.push(atom);
 }
 finish();return issues;
}
