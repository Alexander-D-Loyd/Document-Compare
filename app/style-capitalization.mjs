import {styleContext,styleRangeBlocked} from './style-context.mjs';
import {supremeCourtAgreement} from './style-supreme-court-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord} from './style-evidence.mjs';
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const names=[
 [9,'Conflict of Interest Code'],
 [17,'Legislative Analyst’s Office'],[17,'Office of Homeland Security'],[18,'Cities of Vallejo and Sacramento'],[18,'City of Vallejo'],[18,'Counties of Riverside and Yolo'],[18,'County of Riverside'],[18,'California and United States Constitutions'],
 [17,'Department of the California Highway Patrol'],[18,'Assembly Member'],[18,'Attorney General'],[18,'Cal Grant Program'],[18,'California Community Colleges'],[18,'California Redemption Value'],[18,'California State University'],[18,'Consumer Price Index'],[18,'County Employees Retirement Law of 1937'],[18,'Court of Appeal'],[18,'Courts of Appeal'],[19,'Food Stamp Program'],[19,'General Assistance Program'],[19,'Global Positioning System'],[19,'Governor’s Budget'],[19,'Lieutenant Governor'],[19,'May Revision'],[19,'Medicaid'],[19,'Medi-Cal'],[19,'Medicare'],[19,'Medicare Act'],[19,'Medicare Program'],[19,'Member of the Assembly'],[19,'Member of the Legislature'],[19,'Merchant Marine of the United States'],[19,'Olympic Games'],[19,'President pro Tempore'],[19,'Secretary of State'],[19,'Sergeant at Arms'],[20,'South Fork of the American River'],[20,'State Bar'],[20,'State Capitol Building'],[20,'State Capitol Park'],[20,'State Civil Service Act'],[20,'State Treasury'],[20,'Superintendent of Public Instruction'],[20,'Supreme Court'],[20,'University of California'],[20,'World Wide Web'],[20,'ZIP Code'],
 [18,'Adjutant General'],[18,'Alzheimer’s disease'],[18,'Budget Act'],[18,'Cal-EPA'],[18,'CALFED'],[18,'Cal-OSHA'],[18,'Caltrans'],[18,'CalWORKs program'],[18,'Down syndrome'],[18,'E. coli'],[19,'In-Home Supportive Services program'],[19,'Medicaid program'],[19,'Medi-Cal program'],[19,'Mediterranean fruit fly'],[19,'Nazi swastika'],[19,'Short-Doyle plan'],[20,'Styrofoam'],[20,'Velcro'],
 ...['Vehicle Code','Education Code','Government Code','Civil Code','Penal Code','Insurance Code','Health and Safety Code','Welfare and Institutions Code','Public Resources Code','Code of Civil Procedure','Public Utilities Code','Business and Professions Code','Labor Code','Revenue and Taxation Code','Elections Code','Family Code','Fish and Game Code','Water Code','Harbors and Navigation Code','Military and Veterans Code','Streets and Highways Code'].map(name=>[17,name])
];
const lower=[[18,'appellate court'],[18,'autism spectrum disorder'],[18,'baccalaureate degree'],[18,'congressional'],[18,'direct primary election'],[18,'doctor of chiropractic'],[18,'doctor of osteopathy'],[19,'electoral college'],[19,'general election'],[19,'human immunodeficiency virus'],[19,'internet website'],[19,'master’s degree'],[19,'northern California'],[19,'San Francisco Bay area'],[20,'social security number'],[20,'southern California'],[20,'state government'],[20,'United States government'],[20,'website'],[18,'acquired immunodeficiency syndrome'],[18,'armed services'],[19,'emergency medical technician II'],[19,'executive order'],[19,'in-home supportive services'],[19,'lottery'],[19,'lower American River'],[20,'superior court'],[20,'vitamin C']];
lower.push([18,'class II'],[18,'class B']);
export {names as CAPITALIZATION_NAMES,lower as CAPITALIZATION_DESCRIPTIONS};
export function capitalizationIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[];
 const blockedEvidence=styleEvidenceGuard(doc,ctx);
 const add=(m,preferred,page,rule,message)=>{
  preferred=preferred.replace(/\s+/g,' ');const listedPreferred=preferred;
  if(ctx.at(m.index)==='Heading'||ctx.tableAt(m.index)||ctx.literalAt(m.index,m.index+m[0].length)||m[0]===m[0].toUpperCase())return;
  if(styleRangeBlocked(doc,m.index,m.index+m[0].length))return;
  if(cutsOriginalStyleWord(doc,m.index)||cutsOriginalStyleWord(doc,m.index+m[0].length)||blockedEvidence(m.index,m.index+m[0].length))return;
  const supremeAgreement=listedPreferred==='Supreme Court'?supremeCourtAgreement(doc,m.index,m.index+m[0].length):null;
  if(listedPreferred==='Supreme Court'&&!supremeAgreement)return;
  const sentence=ctx.sentenceAt(m.index),prefix=source.slice(sentence.start,m.index).replace(/^[\s”"’']*(?:\([a-z\d]+\)\s*)*/i,'').trim();
  if(!prefix)preferred=preferred[0].toUpperCase()+preferred.slice(1);
  const current=m[0].replace(/[’']/g,"'").replace(/\s+/g,' '),wanted=preferred.replace(/[’']/g,"'");if(current===wanted)return;
  const after=source.slice(m.index+m[0].length),before=source.slice(Math.max(0,m.index-100),m.index);
  if(/^[a-z]/.test(listedPreferred)&&/^[A-Z]/.test(current)&&/^\s+(?:(?:of|for|the|in|on|and)\s+){0,2}[A-Z][a-z]/.test(after))return;
  if(/person’s office/.test(message)&&(/^\s+of\s+(?:the\s+)?[A-Z]/.test(after)||/\b\d{4}-[\d-]+[^.]*For (?:support|local assistance) of(?:\s+the)?\s*$/i.test(before)))return;
  if(listedPreferred==='Budget Act'&&!/^\s+of\s+\d{4}\b/.test(after))return;
  if(listedPreferred==='in-home supportive services'&&/^\s+(?:\(IHSS\)\s+program\b|I{1,3}\b|IV\b|VI{0,3}\b|IX\b|X\b)/i.test(after))return;
  if(listedPreferred==='executive order'&&/^\s+(?:No\.?\s*)?\d/i.test(after))return;
  // A complete letter-prefixed serial is the same explicit numbered-order
  // role as the existing numeric guard. Unknown or incomplete serials do not
  // establish a title; descriptive executive order remains lowercase.
  if(listedPreferred==='executive order'&&/^\s+(?:No\.?\s*)?[A-Z]\s*-\s*\d{1,3}\s*-\s*\d{2,4}(?![\p{L}\p{N}_-])/u.test(after))return;
  if(listedPreferred==='in-home supportive services'&&/^\s+program\b/i.test(after))return;
  if(preferred==='Attorney General'&&/\bprivate\s*$/i.test(before))return;
  const cites=[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:page,guidePrintedPage:references.lcb.pages[page-1].printedPage,rule,preferred,ruleText:message}];
  if(supremeAgreement){
   const gpoPage=supremeAgreement.guidePage,printed=references.gpo?.pages[gpoPage-1].printedPage||(gpoPage===70?'56':'76');
   message='LCB page 20 and GPO printed page '+printed+' agree on Supreme Court capitalization for this '+supremeAgreement.description+'. Short descriptive state references have a guide disagreement; unresolved jurisdiction and other name forms remain manual.';
   cites[0].ruleText=message;
   if(references.gpo)cites.push({guideId:'gpo',guideName:'GPO Style Manual',guidePage:gpoPage,guidePrintedPage:printed,rule:'Capitalization examples',preferred,ruleText:gpoPage===70?'GPO capitalizes Court as part of a name. Applying that named-court rule to the direct full California name agrees with LCB’s state Supreme Court entry; this is a contextual application, not a literal California example printed in GPO. Descriptive supreme court of Virginia is lowercase and conflicts with LCB. Other official name status and short forms remain manual.':'GPO lists Supreme Court (U.S.) and Ohio Supreme Court with capitals, while the short state reference is lowercase. Page 56 also lowercases supreme court of Virginia. This is selected case agreement, not validation of every court name.'});
  }
  if(listedPreferred==='southern California'&&references.gpo){
   const ruleText='GPO 3.23 explicitly lists southern California as a direction/position expression in lowercase. This agrees with LCB page 20. Definite named regions under GPO 3.22, extended official names and other geographic meanings require separate context; this is not a blanket rule for every regional name.';
   cites.push({guideId:'gpo',guideName:'GPO Style Manual',guidePage:48,guidePrintedPage:references.gpo.pages[47].printedPage,rule:'3.23',preferred,ruleText});message+=' GPO 3.23 gives the same directional example; the guides agree for this selected descriptive use.';
  }
  issues.push({start:m.index,end:m.index+m[0].length,text:doc.text.slice(m.index,m.index+m[0].length),suggestion:preferred,guideId:'lcb',guidePage:page,guidePrintedPage:String(page),rule,category:'Capitalization',context:ctx.at(m.index),checkId:'capitalization',conflict:false,message,references:cites});
 };
 for(const [page,name] of [...names,...lower]){
  const pattern=escape(name).replace(/[’']/g,'[’\']').replaceAll(' ','\\s+');
  for(const m of source.matchAll(new RegExp('\\b'+pattern+'\\b','gi')))add(m,name,page,'Capitalization examples','LCB lists “'+name+'” with this capitalization. Confirm it is the listed entity or descriptive use.');
 }
 for(const m of source.matchAll(/\bin-home\s+supportive\s+services(?=\s+\(IHSS\)\s+program\b)/gi))add(m,'In-Home Supportive Services',19,'Capitalization examples','LCB lists the formal In-Home Supportive Services program with these capitals; the IHSS parenthesis is preserved.');
 for(const m of source.matchAll(/\b(?:Governor|Senator|Member|Commissioner|Director|Treasurer)[’']s\s+Office\b/g))add(m,m[0].replace(/Office$/,'office'),17,'Capitalization, item 6','LCB keeps “office” lowercase when referring to a person’s office.');
 for(const m of source.matchAll(/\b(?:this|the)\s+(?:Act|Article|Chapter|Division|Section)\b/g)){
  if(/^\s+(?:\d|[IVX]+\b|of\s+(?:the\s+)?[A-Z])/.test(source.slice(m.index+m[0].length)))continue;
  add(m,m[0].replace(/\b(Act|Article|Chapter|Division|Section)$/g,s=>s.toLowerCase()),17,'Capitalization, item 5','LCB does not capitalize act, article, chapter, division or section when standing alone. Numbered references remain protected.');
 }
 return issues;
}
