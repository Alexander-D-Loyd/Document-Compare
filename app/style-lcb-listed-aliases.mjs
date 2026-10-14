import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';

const word='[\\p{L}\\p{N}\\p{M}_]',modalPattern=new RegExp('(?<!'+word+')(?<modal>shall|must|should|will|would|could|can|may)\\s+(?<term>phasein)(?!'+word+')','giu');
const programPattern=new RegExp('(?<!'+word+')(?<term>Medi\\s+Cal)\\s+(?<head>program)(?!'+word+')','giu');
const attachedBefore=/[-\u2010-\u2015/:\\#@]/u,attachedAfter=/^[-\u2010-\u2015/:\\#@]|^\.\d|^[’'][\p{L}\p{N}\p{M}_]/u;
const extendedName=/^\s+(?:(?:of|for|the|and|in|on)\s+){0,2}[A-Z][\p{L}\p{M}’'-]*/u;
const institutionalName=/^\s+(?:code|law|fund|account|authority|department|agency|commission|board|association|foundation|institute|trust)s?(?![\p{L}\p{N}\p{M}_])/iu;
const identifierLead=/(?<![\p{L}\p{N}\p{M}_])(?:Section|Article|Item|Form|Schedule|No\.?|Model|Type|Class|Version|Figure|Table|Appendix|Exhibit|Paragraph|Subdivision|Code|ID)\s*$/iu;
export const LCB_LISTED_ALIAS_SCOPE='Only two source-listed alias trigger gaps are selected: exact solid phasein after one intact finite modal follows LCB12 phase in (v.), and exact spaced Medi Cal before an intact lowercase program head follows LCB11 Medi-Cal and LCB19 Medi-Cal program. Existing phase-in modal and correctly hyphenated program forms retain their prior owners. No new phrasal inflection, object/meaning guess, unlisted initialism, unfamiliar program identity or noun role is inferred. Complete original modal/name/head evidence, Unicode boundaries, body dashes, technical identifiers, titles, tables/headings, strikes/uncertain masks, original quotation enclosures and bill-local quoted wording are protected; recognized PDF margins/heads preserve physical selections.';

export function lcbListedAliasIssues(doc,references){
 const ctx=styleContext(doc),blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx),quoted=billQuotedTermProtection(doc,ctx),original=originalBodyStyleContext(doc)?.source||ctx.source,issues=[];
 const valid=(start,end)=>ctx.at(start)!=='Heading'&&!blocked(start,end)&&!literal(start,end)&&!cutsOriginalStyleWord(doc,start)&&!cutsOriginalStyleWord(doc,end);
 const sourceExample=(page,pattern)=>{const found=pattern.exec(references.lcb.pages[page-1].text);return found?{guideId:'lcb',guidePage:page,start:found.index,end:found.index+found[0].length,text:found[0]}:null;};
 const phaseSource=sourceExample(12,/phase\s+in\s+\(v\.\)/u),programSource=sourceExample(11,/Medi-Cal/u);
 if(phaseSource)for(const m of ctx.source.matchAll(modalPattern)){
  const evidenceStart=m.index,end=m.index+m[0].length,start=end-m.groups.term.length;
  if(!valid(evidenceStart,end)||!valid(start,end)||m.groups.term!=='phasein'||attachedBefore.test(doc.text[evidenceStart-1]||'')||attachedBefore.test(doc.text[start-1]||'')||attachedAfter.test(original.slice(end))||extendedName.test(original.slice(end))||institutionalName.test(original.slice(end))||identifierLead.test(original.slice(0,evidenceStart)))continue;
  const selection={start,end,text:doc.text.slice(start,end)},cue={role:'modal',start:evidenceStart,end:evidenceStart+m.groups.modal.length,text:doc.text.slice(evidenceStart,evidenceStart+m.groups.modal.length)};
  if(quoted(selection)||quoted(cue))continue;
  issues.push({start,end,text:selection.text,suggestion:'phase in',evidenceStart,evidenceEnd:end,guideId:'lcb',guidePage:12,guidePrintedPage:references.lcb.pages[11].printedPage,rule:'Hyphenation: Noun and verb forms',category:'Printed Verb Alias',context:ctx.at(start),checkId:'lcb-phasein-alias',reviewSuggested:false,conflict:false,listedAliasEvidence:{kind:'printed-lcb-alias',construction:'modal-phasein',start:evidenceStart,end,sourceText:doc.text.slice(evidenceStart,end),selection,cue,sourceExample:phaseSource},message:'LCB12 prints “phase in (v.)” separately from “phase-in (n., u.m.)”. This exact solid alias follows an intact finite modal, establishing the selected base verb only. Its open components are compared without inferring another grammatical form or meaning.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:12,guidePrintedPage:references.lcb.pages[11].printedPage,rule:'Hyphenation: Noun and verb forms',preferred:'phase in',ruleText:'phase in (v.); phase-in (n., u.m.).'}]});
 }
 if(programSource)for(const m of ctx.source.matchAll(programPattern)){
  const start=m.index,end=start+m.groups.term.length,evidenceEnd=start+m[0].length,headStart=evidenceEnd-m.groups.head.length,after=original.slice(evidenceEnd),before=original.slice(0,start),originalHead=/^\s+program(?![\p{L}\p{N}\p{M}_])/u.exec(original.slice(end));
  if(!valid(start,evidenceEnd)||!valid(start,end)||!originalHead||end+originalHead[0].length!==evidenceEnd||!/^Medi\s+(?:Cal|cal)$|^medi\s+(?:Cal|cal)$/u.test(m.groups.term)||m.groups.head!=='program'||attachedBefore.test(doc.text[start-1]||'')||attachedAfter.test(original.slice(end))||attachedAfter.test(after)||extendedName.test(after)||institutionalName.test(after)||identifierLead.test(before))continue;
  const prior=/(?<![\p{L}\p{N}\p{M}_])([\p{L}\p{M}][\p{L}\p{M}’'-]*)\s+$/u.exec(before);if(prior&&/^[A-Z]/u.test(prior[1])&&!['The','A','An','California'].includes(prior[1]))continue;
  const selection={start,end,text:doc.text.slice(start,end)},cue={role:'program-head',start:headStart,end:evidenceEnd,text:doc.text.slice(headStart,evidenceEnd)};
  if(quoted(selection)||quoted(cue))continue;
  issues.push({start,end,text:selection.text,suggestion:'Medi-Cal',evidenceStart:start,evidenceEnd,guideId:'lcb',guidePage:11,guidePrintedPage:references.lcb.pages[10].printedPage,rule:'Printed LCB program form: Medi-Cal',category:'Printed Program Alias',context:ctx.at(start),checkId:'lcb-listed-program-alias',reviewSuggested:false,conflict:false,listedAliasEvidence:{kind:'printed-lcb-alias',construction:'medi-cal-program',start,end:evidenceEnd,sourceText:doc.text.slice(start,evidenceEnd),selection,cue,sourceExample:programSource},listedNameEvidence:{start,end:evidenceEnd,sourceText:doc.text.slice(start,evidenceEnd),printedName:'Medi-Cal',sourcePage:11,agencyEnd:end,headStart:end,headEnd:evidenceEnd},message:'LCB11 prints “Medi-Cal”, and LCB19 prints “Medi-Cal program”. This exact spaced alias before its intact lowercase program head is compared with the printed spelling and case. Unfamiliar programs and extended names remain protected; no current legal identity is asserted.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:11,guidePrintedPage:references.lcb.pages[10].printedPage,rule:'Printed LCB program form: Medi-Cal',preferred:'Medi-Cal',ruleText:'Medi-Cal'},{guideId:'lcb',guideName:'LCB Style Manual',guidePage:19,guidePrintedPage:references.lcb.pages[18].printedPage,rule:'Capitalization examples',preferred:'Medi-Cal program',ruleText:'Medi-Cal program'}]});
 }
 return issues;
}

export function restoreListedAliasEvidence(e,map,text){
 const range=r=>{const start=map(r.start),end=map(r.end,true);return {...r,start,end,text:text.slice(start,end)};},start=map(e.start),end=map(e.end,true);
 return {...e,start,end,sourceText:text.slice(start,end),selection:range(e.selection),cue:range(e.cue)};
}
