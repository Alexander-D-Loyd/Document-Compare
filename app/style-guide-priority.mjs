import {referenceCaseIssues} from './style-reference-case.mjs';
import {styleContext} from './style-context.mjs';
import {compoundSourceBoundaryBlocked} from './style-compound-source-boundaries.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord,originalBodyStyleContext} from './style-evidence.mjs';

// Finite printed LCB choices whose GPO forms differ. This is precedence,
// not a generator for new compound vocabulary or official name identity.
const followingWitness=(match,source,pattern)=>{
 const end=match.index+match[0].length,found=pattern.exec(source.slice(end));
 return found?{start:match.index,end:end+found[0].length}:null;
};
const precedingWitness=(match,source,pattern,window=source.length)=>{
 const begin=Math.max(0,match.index-window),found=pattern.exec(source.slice(begin,match.index));
 return found?{start:begin+found.index,end:match.index+match[0].length}:null;
};
const choices=[
 {page:18,form:'central valley',pattern:/(?<![\p{L}\p{N}\p{M}_])central\s+valley(?![\p{L}\p{N}\p{M}_])/giu,
  applicable:(m,s)=>followingWitness(m,s,/^\s+of\s+California(?![\p{L}\p{N}\p{M}_])/u)||precedingWitness(m,s,/(?<![\p{L}\p{N}\p{M}_])California(?:’s|'s)\s+$/u)},
 {page:20,form:'Subchapter',pattern:/(?<![\p{L}\p{N}\p{M}_])(?<term>subchapter)\s+(?:\d+(?:\.\d+)*|[IVX]+)(?![\p{L}\p{N}\p{M}_])/giu,
  applicable:(m,s)=>precedingWitness(m,s,/(?<![\p{L}\p{N}\p{M}_])(?:California\s+Code\s+of\s+Regulations|Cal\.\s+Code\s+Regs\.|Code\s+of\s+Federal\s+Regulations|C\.?F\.?R\.?).{0,50}$/iu,120)||followingWitness(m,s,/^\s+of\s+(?:the\s+)?(?:California\s+Code\s+of\s+Regulations|Code\s+of\s+Federal\s+Regulations)(?![\p{L}\p{N}\p{M}_])/iu)},
 {page:19,form:'Regular Session',pattern:/(?<![\p{L}\p{N}\p{M}_])\d{4}\s*-\s*\d{2,4}\s+(?<term>regular\s+session)(?:\s+of\s+the\s+Legislature)?(?![\p{L}\p{N}\p{M}_])/giu},
 {page:20,form:'state government',pattern:/(?<![\p{L}\p{N}\p{M}_])state\s+government(?![\p{L}\p{N}\p{M}_])/giu},
 {page:9,form:'before and after school',lexicalComponentCase:true,pattern:/(?<![\p{L}\p{N}\p{M}_])(?<term>before[\s-]*and[\s-]*after[\s-]*school)\s+(?:programs?|services?|care|activities|instruction)(?![\p{L}\p{N}\p{M}_])/giu},
 {page:19,form:'Secretary of State',pattern:/(?<![\p{L}\p{N}\p{M}_])(?:California|state)\s+(?<term>secretary\s+of\s+state)(?![\p{L}\p{N}\p{M}_])/giu},
 {page:19,form:'Secretary of State',pattern:/(?<![\p{L}\p{N}\p{M}_])(?<term>secretary\s+of\s+state)\s+(?:of\s+(?:the\s+state\s+of\s+)?California|(?:in|of)\s+(?:that|this|each|the)\s+state)(?![\p{L}\p{N}\p{M}_])/giu},
 {page:18,form:'Attorney General',pattern:/(?<![\p{L}\p{N}\p{M}_])(?:California|state)\s+(?<term>attorney\s+general)(?![\p{L}\p{N}\p{M}_])/giu},
 {page:18,form:'Attorney General',pattern:/(?<![\p{L}\p{N}\p{M}_])(?<term>attorney\s+general)\s+(?:of\s+(?:the\s+state\s+of\s+)?California|(?:in|of)\s+(?:that|this|each|the)\s+state)(?![\p{L}\p{N}\p{M}_])/giu},
 {page:11,form:'horse race',lexicalComponentCase:true,pattern:/(?<![\p{L}\p{N}\p{M}_])horse[\s-]*races?(?![\p{L}\p{N}\p{M}_])/giu,plural:true},
 {page:19,form:'federal government',pattern:/(?<![\p{L}\p{N}\p{M}_])federal\s+government(?![\p{L}\p{N}\p{M}_])/giu},
 {page:11,form:'health care',lexicalComponentCase:true,pattern:/(?<![\p{L}\p{N}\p{M}_])(?<health>health)[\s-]*(?<care>care)(?![\p{L}\p{N}\p{M}_])/giu},
 {page:9,form:'African American',pattern:/(?<![\p{L}\p{N}\p{M}_])(?<term>African[\s-]+American)\s+program(?![\p{L}\p{N}\p{M}_])/giu},
 {page:9,form:'collective bargaining',lexicalComponentCase:true,pattern:/(?<![\p{L}\p{N}\p{M}_])(?<term>collective[\s-]*bargaining)\s+(?:talks|agreements?|process|rights|units?)(?![\p{L}\p{N}\p{M}_])/giu},
 {page:15,form:'groundwater',lexicalComponentCase:true,pattern:/(?<![\p{L}\p{N}\p{M}_])ground[\s-]*waters?(?![\p{L}\p{N}\p{M}_])/giu,plural:true},
 {page:15,form:'wildland',lexicalComponentCase:true,pattern:/(?<![\p{L}\p{N}\p{M}_])wild[\s-]*lands?(?![\p{L}\p{N}\p{M}_])/giu,plural:true},
 {page:18,form:'centigrade',pattern:/(?<![\p{L}\p{N}\p{M}_])(?<term>centigrade)(?![\p{L}\p{N}\p{M}_])/giu},
];
const intersects=(a,b)=>a.start<b.end&&a.end>b.start;
const clean=s=>s.replace(/\s+/gu,' ').trim();
// Six explicitly marked lexical choices prescribe joins, not letter case.
// Preserve every source letter only when the complete finite spelling is
// identical under ASCII case folding; no new word or case rule is inferred.
const lexicalCase=(term,preferred)=>{const letters=term.replace(/[\s-]/gu,''),wanted=preferred.replace(/[ -]/gu,'');if(!/^[A-Za-z]+$/u.test(letters)||letters.toLowerCase()!==wanted.toLowerCase())return null;let at=0;return preferred.replace(/[A-Za-z]/gu,()=>letters[at++]);};
const explicitCapitalization=issue=>issue.checkId==='capitalization'||issue.checkId==='california-entities'||titleChecks.has(issue.checkId)||/capitalization|capitalisation|name capitalization/i.test(issue.category||'')||(issue.references||[]).some(r=>/capitalization|capitalisation/i.test(r.rule||''));
const titleChecks=new Set(['lcb-created-title-reference-review','lcb-created-official-title-review','lcb-created-title-identity-review','lcb-designated-title-reference-review','lcb-designated-title-creation-review','lcb-created-public-entity-creation-review','lcb-created-public-entity-reference-review','lcb-official-head-title-review']);
export function applyLcbGuidePriority(doc,references,findings,{names=[]}={}){
 const ctx=styleContext(doc),source=ctx.source,blocked=styleEvidenceGuard(doc,ctx),original=originalBodyStyleContext(doc)?.source||source,result=findings.flatMap(issue=>{
  if(!issue.conflict)return [issue];
  // Existing LCB numeral detectors already establish Bill/Digest and complete
  // numeric roles. A secondary GPO disagreement must not suppress their LCB
  // finding, or create a finding for already compliant LCB wording.
  if(issue.guideId!=='lcb'||![21,22,23].includes(issue.guidePage)||issue.references?.[0]?.guideId!=='lcb'||issue.matchesPrimary===true||typeof issue.suggestion!=='string'||clean(issue.text)===clean(issue.suggestion))return [];
  return [{...issue,conflict:false,guidePriority:'lcb',conflictNote:undefined,message:issue.message?.replace('This conflicting choice is excluded from Stylistic Check.','LCB takes priority under its reference order.')}];
 });
 result.push(...referenceCaseIssues(doc,references,result));
 for(const choice of choices)for(const match of source.matchAll(choice.pattern)){
  const witness=choice.applicable?.(match,source);
  if(choice.applicable&&!witness)continue;
  let evidenceStart=witness?.start??match.index,evidenceEnd=witness?.end??match.index+match[0].length,predicateContextEvidence;
  const term=match.groups?.term||match[0],start=match.index+match[0].indexOf(term),end=start+term.length,range={start,end};
  if(ctx.at(start)==='Heading'||ctx.tableAt(start)||blocked(evidenceStart,evidenceEnd)||cutsOriginalStyleWord(doc,evidenceStart)||cutsOriginalStyleWord(doc,evidenceEnd))continue;
  if(names.some(name=>intersects(name,range)))continue;
  if(choice.lexicalComponentCase&&(compoundSourceBoundaryBlocked(doc.text,source,original,start,end)||compoundSourceBoundaryBlocked(doc.text,source,original,evidenceStart,evidenceEnd))){
   // A complete existing predicate check can establish the printed lexical
   // base of health-care-based, ground-water-related, etc. Keep that LCB base
   // owner; an arbitrary attached identifier cannot supply this exception.
   const parent=result.find(i=>i.checkId==='lcb-contextual'&&i.rule==='Hyphenation, item 2 and End words'&&i.start===start&&i.end>end&&/^-[\s]*(?:based|related|approved|adopted)$/u.test(source.slice(end,i.end))&&i.predicateContextEvidence?.kind==='copula-and-closing-role'&&!blocked(i.predicateContextEvidence.start,i.predicateContextEvidence.end)&&!compoundSourceBoundaryBlocked(doc.text,source,original,i.start,i.end));
   if(!parent)continue;
   predicateContextEvidence=parent.predicateContextEvidence;evidenceStart=predicateContextEvidence.start;evidenceEnd=predicateContextEvidence.end;
  }
  if([...doc.text.slice(start,end).matchAll(/[\u2012-\u2015]/gu)].some(d=>source[start+d.index]==='-'))continue;
  // An explicit continued title remains a name question, not this lexical choice.
  if(/^\s+(?:Act|Code|Law|Fund|Account|Authority|Department|Agency|Commission|Board)\b/u.test(source.slice(match.index+match[0].length)))continue;
  let preferred=choice.form+(choice.plural&&/s$/iu.test(term)?'s':'');
  // These six finite spelling/compounding choices supply word boundaries,
  // not capitalization. Independent capitalization owners remain separate.
  if(choice.lexicalComponentCase){preferred=lexicalCase(term,preferred);if(preferred===null)continue;}
  else if(/^[a-z]/u.test(preferred)&&/^[A-Z]/u.test(term)){
   const sentence=ctx.sentenceAt(start),before=source.slice(sentence.start,start).replace(/^[\s”"’']*(?:\([a-z\d]+\)\s*)*/iu,'').trim();
   if(!before)preferred=preferred[0].toUpperCase()+preferred.slice(1);
  }
  const overridden=[];
  for(let n=result.length-1;n>=0;n--)if(intersects(result[n],range)&&(!choice.lexicalComponentCase||!explicitCapitalization(result[n]))){overridden.push(...(result[n].references||[]).filter(r=>r.guideId==='gpo'));result.splice(n,1);}
  if(clean(term)===preferred)continue;
  const page=references.lcb.pages.find(p=>p.page===choice.page),rule='Printed LCB form: '+choice.form;
  result.push({start,end,evidenceStart,evidenceEnd,...(predicateContextEvidence?{predicateContextEvidence}:{}),text:doc.text.slice(start,end),suggestion:preferred,
   guideId:'lcb',guidePage:choice.page,guidePrintedPage:page.printedPage,rule,category:'LCB form review',context:ctx.at(start),checkId:'lcb-guide-priority',conflict:false,matchesPrimary:false,guidePriority:'lcb',
   message:'LCB lists “'+choice.form+'”. Its form takes priority over a different GPO form; confirm the printed context and bill-local exceptions.',
   references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:choice.page,guidePrintedPage:page.printedPage,rule,preferred:choice.form,ruleText:'Use the printed LCB form in its supported context.'},
    {guideId:'lcb',guideName:'LCB Style Manual',guidePage:1,guidePrintedPage:'1',rule:'Reference Guides Listed in Order to be Used',preferred:null,ruleText:'LCB Style Manual precedes GPO.'},...overridden]});
 }
 return result;
}
