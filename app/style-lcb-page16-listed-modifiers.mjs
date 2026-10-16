import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {billQuotedTermProtection} from './style-quoted-terms.mjs';
import {participialModifierEvidenceRanges} from './style-participial-modifier-evidence.mjs';
import {originalRoleBoundaryBlocked} from './style-original-role-boundaries.mjs';
const listed=['state-adopted','board-approved','state-approved','community-based','school-based','child-related','work-related'],word='[\\p{L}\\p{N}\\p{M}_]';
const headPattern=new RegExp('^\\s+(?<head>textbooks?|instructional\\s+materials)(?!'+word+')','u');
const titleAfter=/^\s+(?:(?:of|for|the|and|in|on)\s+){0,2}(?:[A-Z][\p{L}\p{M}’'-]*|Act|Code|Law|Fund|Account|Authority|Agency|Board|Program)(?![\p{L}\p{N}\p{M}_])/u;
const attachedAfter=/^[-\u2010-\u2015/:\\#@]|^\.\d|^[’'][\p{L}\p{N}\p{M}_]/u;
const identifierBefore=/(?<![\p{L}\p{N}\p{M}_])(?:Section|Article|Item|Form|Schedule|No\.?|Model|Type|Class|Version|Figure|Table|Appendix|Exhibit|Paragraph|Subdivision|Code|ID)\s*$/iu;
export const LCB_PAGE16_LISTED_MODIFIER_SCOPE='Only the seven actual printed LCB16 state-adopted, board-approved, state-approved, community-based, school-based, child-related and work-related forms receive added textbook/textbooks or instructional materials noun-head evidence. A complete independent existing nominal cue, not an article alone, must establish unit-modifier position; the state adopted textbooks as a finite clause stays protected. Other heads retain existing owners or remain manual. Complete original modifier/head/role evidence, literal enclosures, bill-local quoted wording, titles, tables, technical identifiers, Unicode and source corruption stay protected; known page heads/margins retain original offsets. No unlisted root or generic participial compound is generated.';

export function lcbPage16ListedModifierIssues(doc,references,{existingIssues=[]}={}){
 const ctx=styleContext(doc),blocked=styleEvidenceGuard(doc,ctx),literal=originalStyleLiteralGuard(doc,ctx),quoted=billQuotedTermProtection(doc,ctx),original=originalBodyStyleContext(doc)?.source||ctx.source,issues=[],page=references.lcb?.pages[15];if(!page)return issues;
 const valid=(start,end)=>!blocked(start,end)&&!literal(start,end)&&!cutsOriginalStyleWord(doc,start)&&!cutsOriginalStyleWord(doc,end)&&!originalRoleBoundaryBlocked(original,start,end);
 for(const form of listed){
  const printed=page.text.indexOf(form);if(printed<0)continue;
  const [base,participle]=form.split('-'),pattern=new RegExp('(?<!'+word+')'+base+'\\s+'+participle+'(?!'+word+')','giu');
  for(const m of ctx.source.matchAll(pattern)){
   const start=m.index,end=start+m[0].length,head=headPattern.exec(ctx.source.slice(end));if(!head||ctx.at(start)==='Heading'||!valid(start,end))continue;
   if(m[0].replace(/\s+/gu,' ')!==base+' '+participle&&m[0].replace(/\s+/gu,' ')!==base[0].toUpperCase()+base.slice(1)+' '+participle)continue;
   const headStart=end+head[0].length-head.groups.head.length,headEnd=end+head[0].length;
   if(!valid(start,headEnd)||attachedAfter.test(original.slice(headEnd))||titleAfter.test(original.slice(headEnd))||/[-\u2010-\u2015/:\\#@]/u.test(doc.text[start-1]||'')||identifierBefore.test(original.slice(0,start))||existingIssues.some(i=>i.start<end&&i.end>start))continue;
   const beforeStart=ctx.sentenceAt(start).start,before=ctx.source.slice(beforeStart,start),after=ctx.source.slice(headEnd),roles=participialModifierEvidenceRanges(before,after);
   const witnesses=roles.map(r=>({start:r.side==='before'?beforeStart+r.start:headEnd+r.start,end:r.side==='before'?beforeStart+r.end:headEnd+r.end,side:r.side})).filter(r=>valid(Math.min(start,r.start),Math.max(headEnd,r.end)));
   const role=witnesses[0];if(!role||quoted({start,end})||quoted({start:headStart,end:headEnd}))continue;
   const evidenceStart=Math.min(start,role.start),evidenceEnd=Math.max(headEnd,role.end),suggestion=(/^[A-Z]/u.test(m[0])?base[0].toUpperCase()+base.slice(1):base)+'-'+participle;
   issues.push({start,end,evidenceStart,evidenceEnd,text:doc.text.slice(start,end),suggestion,guideId:'lcb',guidePage:16,guidePrintedPage:String(page.printedPage),rule:'Hyphenation: End words',category:'Listed modifier hyphenation',context:ctx.at(start),checkId:'lcb-page16-listed-modifier',conflict:false,message:'LCB16 explicitly lists “'+form+'” in unit-modifier position. The complete selected noun phrase and its independent grammatical cue support comparison of that printed modifier only. Confirm the intended meaning; no unlisted compound is inferred.',page16ModifierEvidence:{start:evidenceStart,end:evidenceEnd,sourceText:doc.text.slice(evidenceStart,evidenceEnd),printedForm:form,modifier:{start,end,text:doc.text.slice(start,end)},head:{start:headStart,end:headEnd,text:doc.text.slice(headStart,headEnd)},role:{...role,text:doc.text.slice(role.start,role.end)}},references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:16,guidePrintedPage:String(page.printedPage),rule:'Hyphenation: End words',preferred:form,ruleText:'Use a hyphen when the following words are in the unit modifier position: '+form,sourcePassage:{start:printed,end:printed+form.length,text:form}}]});
  }
 }
 return issues;
}
export function restorePage16ModifierEvidence(e,map,text){const range=r=>{const start=map(r.start),end=map(r.end,true);return{...r,start,end,text:text.slice(start,end)};},start=map(e.start),end=map(e.end,true);return{...e,start,end,sourceText:text.slice(start,end),modifier:range(e.modifier),head:range(e.head),role:range(e.role)};}
