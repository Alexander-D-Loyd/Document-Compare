import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';

const word='[\\p{L}\\p{N}\\p{M}_]',gap='(?:\\s*-\\s*|\\s+)',separator='(?:\\s*,\\s*|\\s+)';
const pattern=new RegExp('(?<!'+word+')(?<modifier>(?<first>extremely'+gap+'low(?:\\s*-)?)'+separator+'(?<second>very'+gap+'low(?:\\s*-)?)'+separator+'(?<third>low(?:\\s*-)?)\\s*(?:,\\s*)?\\band\\s+(?<last>moderate'+gap+'income))\\s+(?<head>households)(?!'+word+')','giu');
const printed='extremely low, very low, low-, and moderate-income households',preferred='extremely low, very low, low-, and moderate-income';
const titleTail=/^\s+(?:(?:of|for|the|and|in|on)\s+){0,2}[A-Z][\p{L}\p{M}’'-]*|^\s+(?:Act|Code|Law|Fund|Account|Authority|Department|Agency|Commission|Board)\b/u;
const identifierLead=/(?<![\p{L}\p{N}\p{M}_])(?:Section|Article|Item|Form|Schedule|No\.?|Model|Type|Class|Version|Figure|Table|Appendix|Exhibit|Paragraph|Subdivision|Code|ID)\s*$/iu;
const explicitTitleTail=/^\s+(?:Act|Code|Law|Fund|Account|Authority|Department|Agency|Commission|Board)(?![\p{L}\p{N}\p{M}_])/u;
export const LCB_INCOME_SERIES_SCOPE='Only LCB7’s complete four-category extremely low, very low, low-, and moderate-income households sequence is selected. The original source order, exact four categories and households head are required. One whole modifier compares the listed open qualifiers, commas, suspended low- and final moderate-income hyphen; the noun stays outside its selection. No household eligibility, changed conjunction, different order, other category/head or generic serial-list role is inferred. Quoted/bill-local forms, literal names, headings/tables, technical identifiers, Unicode fragments, source strikes/exclusions and genuine body dashes are protected; recognized PDF margins and wholly interior heads retain physical offsets.';

export function lcbIncomeSeriesProtectionRanges(doc){
 const ctx=styleContext(doc),blocked=styleEvidenceGuard(doc,ctx),ranges=[];
 // This is narrow negative ownership. An intact explicit title head after
 // the complete four-category households phrase makes its contained shared
 // low/moderate candidate a name question. No spelling or legal identity is
 // established, and other style findings retain their independent owner.
 for(const m of ctx.source.matchAll(pattern)){
  const start=m.index,end=start+m[0].length,tail=explicitTitleTail.exec(ctx.source.slice(end));if(!tail)continue;
  const evidenceEnd=end+tail[0].length;
  if(ctx.at(start)==='Heading'||blocked(start,evidenceEnd)||cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,evidenceEnd)||identifierLead.test(ctx.source.slice(0,start))||/[-\u2010-\u2015]/u.test(doc.text[start-1]||''))continue;
  if([...doc.text.slice(start,evidenceEnd).matchAll(/[\u2012-\u2015]/gu)].some(d=>/\S/u.test(ctx.source[start+d.index]||'')))continue;
  ranges.push({start,end:start+m.groups.modifier.length,evidenceStart:start,evidenceEnd,construction:'exact-four-category-income-title',supersedesCheckIds:['shared-modifiers']});
 }
 return ranges;
}

export function lcbIncomeSeriesIssues(doc,references){
 const ctx=styleContext(doc),blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx),quoted=billQuotedTermProtection(doc,ctx),original=originalBodyStyleContext(doc)?.source||ctx.source,issues=[];
 const page=references.lcb.pages[6],sourceMatch=/extremely\s+low,\s+very\s+low,\s+low-,\s+and\s+moderate-income\s+households/u.exec(page.text);
 if(!sourceMatch)return issues;
 for(const m of ctx.source.matchAll(pattern)){
  const start=m.index,end=start+m[0].length,modifierEnd=start+m.groups.modifier.length,headStart=end-m.groups.head.length;
  if(ctx.at(start)==='Heading'||blocked(start,end)||literal(start,end)||cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,end))continue;
  if(/[A-Z]/u.test(m[0].slice(1))||identifierLead.test(original.slice(0,start))||/[-\u2010-\u2015]/u.test(original[start-1]||'')||/^[-\u2010-\u2015]/u.test(original.slice(end))||titleTail.test(original.slice(end)))continue;
  if([...doc.text.slice(start,end).matchAll(/[\u2012-\u2015]/gu)].some(d=>/\S/u.test(ctx.source[start+d.index]||'')))continue;
  const components=[];let cursor=start;
  for(const role of ['first','second','third','last']){const value=m.groups[role],at=cursor+ctx.source.slice(cursor,modifierEnd).indexOf(value);components.push({role,start:at,end:at+value.length,text:doc.text.slice(at,at+value.length)});cursor=at+value.length;}
  const modifier={start,end:modifierEnd,text:doc.text.slice(start,modifierEnd)},head={start:headStart,end,text:doc.text.slice(headStart,end)};
  if(quoted(modifier)||components.some(quoted))continue;
  const suggestion=/^[A-Z]/u.test(m.groups.modifier)?preferred[0].toUpperCase()+preferred.slice(1):preferred;
  if(m.groups.modifier.replace(/\s+/gu,' ').replace(/\s*-\s*/gu,'-').trim()===suggestion)continue;
  issues.push({start,end:modifierEnd,text:modifier.text,suggestion,evidenceStart:start,evidenceEnd:end,guideId:'lcb',guidePage:7,guidePrintedPage:page.printedPage,rule:'Punctuation: Printed income series',category:'Printed Income Series',context:ctx.at(start),checkId:'lcb-income-series',reviewSuggested:false,conflict:false,supersedesCheckIds:['shared-modifiers','lcb-contextual','lcb-role-forms','serial-commas','lcb-series-punctuation-review'],incomeSeriesEvidence:{kind:'printed-lcb7-income-series',start,end,sourceText:doc.text.slice(start,end),modifier,components,head,sourceExample:{guideId:'lcb',guidePage:7,start:sourceMatch.index,end:sourceMatch.index+sourceMatch[0].length,text:sourceMatch[0]}},message:'LCB7 prints “'+printed+'”. This intact four-category households sequence preserves its order and uses the printed open qualifiers, serial comma, suspended low- and final moderate-income hyphen. The check does not infer a different list or eligibility meaning.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:7,guidePrintedPage:page.printedPage,rule:'Punctuation: Printed income series',preferred,ruleText:printed},{guideId:'lcb',guideName:'LCB Style Manual',guidePage:6,guidePrintedPage:references.lcb.pages[5].printedPage,rule:'Punctuation: Commas',preferred:null,ruleText:'Use a comma before “and,” “or,” or “nor” when these conjunctions precede the last of a series of three or more words, phrases, letters, or figures.'}]});
 }
 return issues;
}

export function restoreIncomeSeriesEvidence(e,map,text){
 const range=r=>{const start=map(r.start),end=map(r.end,true);return {...r,start,end,text:text.slice(start,end)};},start=map(e.start),end=map(e.end,true);
 return {...e,start,end,sourceText:text.slice(start,end),modifier:range(e.modifier),components:e.components.map(range),head:range(e.head)};
}
