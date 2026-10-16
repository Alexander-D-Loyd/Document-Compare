import {legislativeNounIdentity} from './style-noun-heads.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
import {numericExpressionGuard} from './style-numeric-expression-evidence.mjs';

const measurements=new Map([['foot','foot'],['feet','foot'],['inch','inch'],['inches','inch'],...['acre','meter','metre','mile','pound','gallon','megabyte','megawatt','day','week','month','year','hour','minute','second'].flatMap(u=>[[u,u],[u+'s',u]])]);
const qualifier='(?:(?:business|calendar|court|school|academic|consecutive|working|residential|commercial|dwelling|square|cubic)\\s+)?';
const headPattern=new RegExp('^(?<gap>\\s+)(?<head>'+qualifier+'[a-z]+)(?![\\p{L}\\p{N}\\p{M}_])','iu');
export const SENTENCE_UNIT_SCOPE='LCB21 Bill item3: retain existing figures for complete live quantities with the same explicit unit in the same sentence when one is ten or larger. This conservative exception does not create word-to-figure findings without a separately proven shared numerical expression. Unit identity uses known measurement/duration forms or the existing finite legislative noun vocabulary, including its actual plurals. Recognized qualifiers and explicit ages remain separate identities. Intervening prose and other quantities do not require a special conjunction template. Sentence openings retain their separate spelling rule. Quoted terms, citations, uncertain unit/quantity boundaries, tables, headings and separate sentences cannot provide positive evidence.';

export function sentenceUnitGroups(doc,ctx,candidates){
 const blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx),quoted=billQuotedTermProtection(doc,ctx),numeric=numericExpressionGuard(doc,ctx),sentences=new Map();
 for(const n of candidates){
  if(n.exception||n.ordinal||n.context!=='Bill'||!n.sentence||n.value===null||n.value<0||!Number.isFinite(n.value)&&!n.figure)continue;
  const match=headPattern.exec(ctx.source.slice(n.end));if(!match)continue;
  const headStart=n.end+match.groups.gap.length,headEnd=headStart+match.groups.head.length,words=match.groups.head.toLowerCase().split(/\s+/u),last=words.pop(),unit=measurements.get(last)||legislativeNounIdentity(last);if(!unit)continue;
  // LCB treats ages and elapsed terms as different numerical expressions,
  // even though both can be measured in years. Keep that explicit source
  // distinction; the repeated word alone must not join the two roles.
  const age=unit==='year'&&(/^\s+(?:of\s+age|old)\b/iu.test(ctx.source.slice(headEnd))||/\b(?:aged?|age\s+of)\s*$/iu.test(ctx.source.slice(Math.max(0,n.start-40),n.start)));
  const before=ctx.source.slice(Math.max(n.sentence.start,n.start-80),n.start),after=ctx.source.slice(headEnd);
  const lookback=unit==='year'&&/\bwithin\s*$/iu.test(before)&&(/^\s+(?:of|after|before|following|preceding)\s+(?:the\s+)?(?:conviction|offense|violation|judgment)\b/iu.test(after)||/\b(?:conviction|offense|violation|judgment)\s+within\s*$/iu.test(before));
  const identity=[...(age?['age']:lookback?['conviction lookback']:[]),...words,unit].join(' ');
  if(blocked(n.start,headEnd)||literal(n.start,headEnd)||quoted({start:n.start,end:headEnd})||numeric(n.start,n.end)||cutsOriginalStyleWord(doc,headEnd)||/^[-\u2010-\u2015/\\#@]/u.test(doc.text.slice(headEnd))||/^\s+(?:Act|Code|Law|Fund|Account|Authority|Department|Agency|Commission|Board)\b/u.test(ctx.source.slice(headEnd)))continue;
  const key=n.sentence.start+':'+identity,group=sentences.get(key)||{kind:'same-unit-in-sentence',start:n.start,end:headEnd,head:identity,atLeastTen:false,members:[]};
  group.end=headEnd;group.atLeastTen ||= n.figure?/^[1-9]\d+$/u.test(n.text.replaceAll(',','').split('.')[0]):n.value>=10;
  group.members.push({start:n.start,end:n.end,sourceText:doc.text.slice(n.start,n.end),headStart,headEnd});sentences.set(key,group);
 }
 const uncertainBridge=styleEvidenceGuard({...doc,struck:[]},{...ctx,literalAt:()=>false});
 return [...sentences.values()].filter(g=>g.members.length>=2&&g.atLeastTen&&!uncertainBridge(g.start,g.end));
}
