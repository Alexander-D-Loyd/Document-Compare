import {styleContext} from './style-context.mjs';
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const names=[
 [17,'Department of the California Highway Patrol'],[18,'Assembly Member'],[18,'Attorney General'],[18,'Cal Grant Program'],[18,'California Community Colleges'],[18,'California Redemption Value'],[18,'California State University'],[18,'Consumer Price Index'],[18,'County Employees Retirement Law of 1937'],[18,'Court of Appeal'],[18,'Courts of Appeal'],[19,'Food Stamp Program'],[19,'General Assistance Program'],[19,'Global Positioning System'],[19,'Governor’s Budget'],[19,'Lieutenant Governor'],[19,'May Revision'],[19,'Medicaid'],[19,'Medi-Cal'],[19,'Medicare'],[19,'Medicare Act'],[19,'Medicare Program'],[19,'Member of the Assembly'],[19,'Member of the Legislature'],[19,'Merchant Marine of the United States'],[19,'Olympic Games'],[19,'President pro Tempore'],[19,'Secretary of State'],[19,'Sergeant at Arms'],[20,'South Fork of the American River'],[20,'State Bar'],[20,'State Capitol Building'],[20,'State Capitol Park'],[20,'State Civil Service Act'],[20,'State Treasury'],[20,'Superintendent of Public Instruction'],[20,'Supreme Court'],[20,'University of California'],[20,'World Wide Web'],[20,'ZIP Code'],
 ...['Vehicle Code','Education Code','Government Code','Civil Code','Penal Code','Insurance Code','Health and Safety Code','Welfare and Institutions Code','Public Resources Code','Code of Civil Procedure','Public Utilities Code','Business and Professions Code','Labor Code','Revenue and Taxation Code','Elections Code','Family Code','Fish and Game Code','Water Code','Harbors and Navigation Code','Military and Veterans Code','Streets and Highways Code'].map(name=>[17,name])
];
const lower=[[18,'appellate court'],[18,'autism spectrum disorder'],[18,'baccalaureate degree'],[18,'congressional'],[18,'direct primary election'],[18,'doctor of chiropractic'],[18,'doctor of osteopathy'],[19,'electoral college'],[19,'general election'],[19,'human immunodeficiency virus'],[19,'internet website'],[19,'master’s degree'],[19,'northern California'],[19,'San Francisco Bay area'],[20,'social security number'],[20,'southern California'],[20,'state government'],[20,'United States government'],[20,'website']];
export {names as CAPITALIZATION_NAMES,lower as CAPITALIZATION_DESCRIPTIONS};
export function capitalizationIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[];
 const add=(m,preferred,page,rule,message)=>{
  preferred=preferred.replace(/\s+/g,' ');
  if(ctx.at(m.index)==='Heading'||ctx.tableAt(m.index)||m[0]===m[0].toUpperCase())return;
  if([...(doc.struck||[]),...doc.blocks.filter(b=>b.ignored).map(b=>({start:b.start,end:b.end}))].some(r=>r.start<m.index+m[0].length&&r.end>m.index))return;
  const sentence=ctx.sentenceAt(m.index),prefix=source.slice(sentence.start,m.index).replace(/^[\s”"’']*(?:\([a-z\d]+\)\s*)*/i,'').trim();
  if(!prefix)preferred=preferred[0].toUpperCase()+preferred.slice(1);
  const current=m[0].replace(/[’']/g,"'").replace(/\s+/g,' '),wanted=preferred.replace(/[’']/g,"'");if(current===wanted)return;
  const after=source.slice(m.index+m[0].length),before=source.slice(Math.max(0,m.index-100),m.index);
  if(/^[a-z]/.test(preferred)&&/^[A-Z]/.test(current)&&/^\s+[A-Z][a-z]/.test(after))return;
  if(/person’s office/.test(message)&&(/^\s+of\s+(?:the\s+)?[A-Z]/.test(after)||/\b\d{4}-[\d-]+[^.]*For (?:support|local assistance) of(?:\s+the)?\s*$/i.test(before)))return;
  if(preferred==='Attorney General'&&/\bprivate\s*$/i.test(before))return;
  issues.push({start:m.index,end:m.index+m[0].length,text:doc.text.slice(m.index,m.index+m[0].length),suggestion:preferred,guideId:'lcb',guidePage:page,guidePrintedPage:String(page),rule,category:'Capitalization',context:ctx.at(m.index),checkId:'capitalization',conflict:false,message,references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:page,guidePrintedPage:references.lcb.pages[page-1].printedPage,rule,preferred,ruleText:message}]});
 };
 for(const [page,name] of [...names,...lower]){
  const pattern=escape(name).replace(/[’']/g,'[’\']').replaceAll(' ','\\s+');
  for(const m of source.matchAll(new RegExp('\\b'+pattern+'\\b','gi')))add(m,name,page,'Capitalization examples','LCB lists “'+name+'” with this capitalization. Confirm it is the listed entity or descriptive use.');
 }
 for(const m of source.matchAll(/\b(?:Governor|Senator|Member|Commissioner|Director|Treasurer)[’']s\s+Office\b/g))add(m,m[0].replace(/Office$/,'office'),17,'Capitalization, item 6','LCB keeps “office” lowercase when referring to a person’s office.');
 for(const m of source.matchAll(/\b(?:this|the)\s+(?:Act|Article|Chapter|Division|Section)\b/g)){
  if(/^\s+(?:\d|[IVX]+\b|of\s+(?:the\s+)?[A-Z])/.test(source.slice(m.index+m[0].length)))continue;
  add(m,m[0].replace(/\b(Act|Article|Chapter|Division|Section)$/g,s=>s.toLowerCase()),17,'Capitalization, item 5','LCB does not capitalize act, article, chapter, division or section when standing alone. Numbered references remain protected.');
 }
 return issues;
}
