import {legislativeContext} from './legislative-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';

const word='[\\p{L}\\p{N}\\p{M}_]',gap='(?:\\s*-\\s*|\\s+)';
const pattern=new RegExp('(?<!'+word+')(?<modifier>two'+gap+'hundred'+gap+'dollar)\\s+(?<amount>\\(\\s*\\$200\\s*\\))\\s+(?<head>minimum)(?!'+word+')','giu');
const printed='two-hundred-dollar ($200) minimum';
const titleTail=/^\s+(?:(?:of|for|the|and|in|on)\s+){0,2}[A-Z][\p{L}\p{M}’'-]*|^\s+(?:Act|Code|Law|Fund|Account|Authority|Department|Agency|Commission|Board)\b/u;
const identifierLead=/(?<![\p{L}\p{N}\p{M}_])(?:Section|Article|Item|Form|Schedule|No\.?|Model|Type|Class|Version|Figure|Table|Appendix|Exhibit|Paragraph|Subdivision|Code|ID)\s*$/iu;
const numberLead=/(?<![\p{L}\p{N}\p{M}_])(?:[\d.,/⁄¼½¾]+|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|trillion)\s*(?:and\s+)?$/iu;
const clean=value=>value.replace(/\s+/gu,' ').replace(/\s*-\s*/gu,'-').trim();
export const LCB_DOLLAR_MINIMUM_SCOPE='Only LCB23’s complete printed two-hundred-dollar ($200) minimum construction establishes this Bill modifier. The intact matching figure and exact minimum head are required. Only the word-modifier hyphens change; the amount and head stay outside the selection. No arbitrary value-to-word conversion, amount consistency inference or alternate minimum is claimed. Digest, resolutions, known uncodified findings, unknown document types, other values/heads, malformed figures, technical identifiers, quotes/bill-local forms, titles/tables, source strikes/exclusions, original Unicode boundaries and visible body dashes stay protected.';

export function lcbDollarMinimumIssues(doc,references){
 const ctx=legislativeContext(doc),blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx),quoted=billQuotedTermProtection(doc,ctx),original=originalBodyStyleContext(doc)?.source||ctx.source;
 const enact=/\bdo\s+enact\s+as\s+follows\s*:/iu.exec(ctx.source);
 if(!enact||blocked(enact.index,enact.index+enact[0].length))return [];
 const contextWitness={start:enact.index,end:enact.index+enact[0].length,text:doc.text.slice(enact.index,enact.index+enact[0].length)},issues=[];
 for(const m of ctx.source.matchAll(pattern)){
  const start=m.index,end=start+m[0].length,modifierEnd=start+m.groups.modifier.length;
  if(ctx.at(start)!=='Bill'||['Digest','Resolution','UncodifiedFindings'].includes(ctx.moneyAt(start))||blocked(start,end)||literal(start,end)||cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,end)||/[A-Z]/u.test(m[0]))continue;
  const before=original.slice(0,start),after=original.slice(end);
  if(numberLead.test(before)||identifierLead.test(before)||/[+−–—/⁄^*=$€£¥₹¢-]\s*$/u.test(before)||/^[-\u2010-\u2015]/u.test(after)||titleTail.test(after))continue;
  if([...doc.text.slice(start,end).matchAll(/[\u2012-\u2015]/gu)].some(d=>/\S/u.test(ctx.source[start+d.index]||'')))continue;
  const amountStart=modifierEnd+ctx.source.slice(modifierEnd,end).indexOf(m.groups.amount),headStart=end-m.groups.head.length,modifier={start,end:modifierEnd,text:doc.text.slice(start,modifierEnd)},amount={start:amountStart,end:amountStart+m.groups.amount.length,text:doc.text.slice(amountStart,amountStart+m.groups.amount.length)},head={start:headStart,end,text:doc.text.slice(headStart,end)};
  if(quoted(modifier)||quoted({start,end}))continue;
  if(clean(m.groups.modifier)==='two-hundred-dollar')continue;
  issues.push({start,end:modifierEnd,text:modifier.text,suggestion:'two-hundred-dollar',evidenceStart:start,evidenceEnd:end,guideId:'lcb',guidePage:23,guidePrintedPage:references.lcb.pages[22].printedPage,rule:'Numerals: Money',category:'Printed Monetary Modifier',context:'Bill',checkId:'lcb-dollar-minimum',reviewSuggested:false,conflict:false,supersedesCheckIds:['numerals','money-forms','money-pairs'],dollarMinimumEvidence:{kind:'printed-lcb23-dollar-minimum',sourceValue:'200',start,end,sourceText:doc.text.slice(start,end),modifier,amount,head,contextWitness},message:'LCB23 prints “'+printed+'” for Bill text. The complete matching $200 amount and minimum head establish this exact word modifier; only its hyphens are compared, without changing the amount or interpreting another value.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:23,guidePrintedPage:references.lcb.pages[22].printedPage,rule:'Numerals: Money',preferred:'two-hundred-dollar',ruleText:printed+' (bill); $200 minimum (digest).'}]});
 }
 return issues;
}

export function restoreDollarMinimumEvidence(e,map,text){
 const range=r=>{const start=map(r.start),end=map(r.end,true);return {...r,start,end,text:text.slice(start,end)};},start=map(e.start),end=map(e.end,true);
 return {...e,start,end,sourceText:text.slice(start,end),modifier:range(e.modifier),amount:range(e.amount),head:range(e.head),contextWitness:range(e.contextWitness)};
}
