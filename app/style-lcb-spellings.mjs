import {styleContext} from './style-context.mjs';
// Finite close misspellings of explicitly listed LCB words. No edit-distance
// substitution: a neighboring valid word requires its own semantic check.
const baseSpellings=[
 [3,'assignner','assigner'],[5,'revivver','reviver'],
 [4,'papier-mache','papier mache'],[4,'papier-mâché','papier mache'],[4,'papier mâché','papier mache'],
 [3,'busses','buses'],[4,'ombuds person','ombudsperson'],[4,'ombuds-person','ombudsperson'],[4,'fiancé','fiance'],[4,'fiancée','fiance'],[4,'fiancee','fiance'],[4,'germain','germane'],[4,'payor','payer'],
 [3,'acessory','accessory'],[3,'adjustor','adjuster'],[3,'airator','aerator'],[3,'appelate','appellate'],[3,'cemetry','cemetery'],[3,'chair person','chairperson'],[3,'controling','controlling','controlled'],[3,'credentualed','credentialed'],[3,'decedant','decedent'],[3,'eleemosinary','eleemosynary'],[3,'elemosynary','eleemosynary'],[3,'eligble','eligible'],[3,'eligibile','eligible'],[3,'exectutor','executor'],[3,'exhibatory','exhibitory'],
 [4,'forseen','foreseen'],[4,'intra-district','intradistrict'],[4,'irrelavant','irrelevant'],[4,'missspell','misspell'],[4,'mis-state','misstate'],[4,'mitre','miter'],[4,'moveable','movable'],[4,'panaled','paneled'],[4,'pari-mutuel','parimutuel'],[4,'photo-journalism','photojournalism'],[4,'privilige','privilege'],[4,'privledge','privilege'],
 [5,'rateable','ratable'],[5,'recividism','recidivism'],[5,'recylable','recyclable'],[5,'relavent','relevant'],[5,'rescisssion','rescission'],[5,'residium','residuum'],[5,'saleable','salable'],[5,'soleley','solely'],[5,'supboena','subpoena'],[5,'supersceed','supersede'],[5,'treshold','threshold'],[5,'torper','torpor'],[5,'trafficing','trafficking'],[5,'transferrable','transferable'],[5,'under-served','underserved'],[5,'warrenty','warranty'],[5,'wholy','wholly'],[5,'wilfull','willful'],[5,'willfuly','willfully'],

 [3,'accomodate','accommodate'],[3,'acommodate','accommodate'],[3,'accommadate','accommodate'],
 [3,'aerater','aerator'],[3,'appellatte','appellate'],[3,'bifercation','bifurcation'],[3,'bullian','bullion'],
 [3,'calender','calendar'],[3,'cancelation','cancellation'],[3,'cemetary','cemetery'],[3,'cemeterry','cemetery'],
 [3,'collectable','collectible'],[3,'comingle','commingle'],[3,'committment','commitment'],[3,'commited','committed'],
 [3,'confectionary','confectionery'],[3,'controled','controlled'],[3,'credentialled','credentialed'],[3,'counselled','counseled'],[3,'benefitted','benefited'],[3,'accesory','accessory'],
 [3,'decesedent','decedent'],[3,'descendent','descendant'],[3,'divisable','divisible'],[3,'elligible','eligible'],[3,'eligable','eligible'],
 [4,'forfiture','forfeiture'],[4,'includible','includable'],[4,'irrelevent','irrelevant'],[4,'kidnaping','kidnapping'],
 [4,'knowledgable','knowledgeable'],[4,'liquified','liquefied'],[4,'marihuana','marijuana'],[4,'milage','mileage'],[4,'pannelled','paneled'],[4,'panelled','paneled'],
 [4,'mispell','misspell'],[4,'misstateing','misstating'],[4,'occured','occurred'],[4,'occurence','occurrence'],[4,'ocurrance','occurrence'],
 [4,'parimutal','parimutuel'],[4,'preceeding','preceding'],[4,'privelege','privilege'],[4,'priviledge','privilege'],
 [5,'recidivisim','recidivism'],[5,'recycleable','recyclable'],[5,'relevent','relevant'],[5,'recission','rescission'],
 [5,'rescision','rescission'],[5,'screw driver','screwdriver'],[5,'seperate','separate'],[5,'setlor','settlor'],[5,'soley','solely'],
 [5,'subpena','subpoena'],[5,'superscede','supersede'],[5,'tatoo','tattoo'],[5,'threshhold','threshold'],
 [5,'trafficcing','trafficking'],[5,'transferible','transferable'],[5,'transfered','transferred'],[5,'undersurved','underserved'],[5,'tradeable','tradable'],
 [5,'waranty','warranty'],[5,'wholey','wholly'],[5,'wilfully','willfully']
].filter(([,a,b])=>a!==b).map(([page,variant,preferred,sourceForm])=>({page,variant,preferred,sourceForm:sourceForm||(preferred==='misstating'?'misstate':preferred)}));
const pluralNouns=new Set(['accessory','chairperson','aerator','cancellation','cemetery','collectible','commitment','decedent','descendant','forfeiture','occurrence','privilege','rescission','settlor','subpoena','tattoo','threshold','warranty','payer','ombudsperson']);
const inflectedVerbs=new Set(['accommodate','commingle','separate','supersede','misspell']);
const nounPlural=w=>/[^aeiou]y$/.test(w)?w.slice(0,-1)+'ies':w+'s';
const extras=baseSpellings.flatMap(r=>[
 ...(pluralNouns.has(r.sourceForm)?[{...r,variant:nounPlural(r.variant),preferred:nounPlural(r.preferred)}]:[]),
 ...(inflectedVerbs.has(r.sourceForm)?[['s','s'],[r.variant.endsWith('e')?'d':'ed',r.preferred.endsWith('e')?'d':'ed']].map(([a,b])=>({...r,variant:r.variant+a,preferred:r.preferred+b})).concat([{...r,variant:r.variant.replace(/e$/,'')+'ing',preferred:r.preferred.replace(/e$/,'')+'ing'}]):[])
]);
export const LCB_SPELLING_VARIANTS=[...new Map([...baseSpellings,...extras].map(r=>[r.variant,r])).values()];
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const spellingLookup=new Map(LCB_SPELLING_VARIANTS.map(r=>[r.variant.toLowerCase().replace(/\s+/g,' '),r]));
const spellingPattern=new RegExp('(?<![\\p{L}\\p{N}_])(?:'+LCB_SPELLING_VARIANTS.map(r=>r.variant.split(/\s+/).map(escape).join('\\s+')).join('|')+')(?![\\p{L}\\p{N}_])','giu');
export function lcbSpellingIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[],quotes=[...source.matchAll(/“[^”]*”|"[^"\n]*"/g)].map(m=>({start:m.index,end:m.index+m[0].length}));
 for(const m of source.matchAll(spellingPattern)){
  const r=spellingLookup.get(m[0].toLowerCase().replace(/\s+/g,' '));
  const start=m.index,end=start+m[0].length,before=source.slice(Math.max(0,start-45),start),after=source.slice(end);
  if(ctx.at(start)==='Heading'||ctx.tableAt(start)||quotes.some(q=>q.start<end&&q.end>start)||m[0]===m[0].toUpperCase())continue;
  // Preserve quoted forms and apparent names, including sentence-start names.
  if(/^[A-Z]/.test(m[0])&&(/^\s+(?:(?:of|for|the|and|in|on)\s+)?[A-Z][a-z]/.test(after)||/\b(?:Mr|Mrs|Ms|Dr)\.\s*$/.test(before)))continue;
  // "calender" is a real industrial machine. Its meaning must be reviewed.
  if(r.variant==='calender'&&!/^\s+(?:days?|years?|months?|quarters?)\b/i.test(after))continue;
  // "Busses" can also mean kisses. Only an explicit transport cue selects
  // the office's bus plural; unrelated senses remain manual.
  if(r.variant==='busses'&&!/\b(?:school|public|transit|city|electric|motor|passenger)\s+$/i.test(before)&&!/^\s+[^.!?]{0,80}\b(?:public transportation|passengers|bus routes)\b/i.test(after))continue;
  if(r.variant==='confectionary'&&!/\b(?:the|a|an|some|any|of|for|with|without)\s*$/i.test(before))continue;
  // A descendent can be a valid variant/adjective; use explicit family context.
  if(r.sourceForm==='descendant'&&!/^\s+of\s+(?:the\s+)?(?:decedent|deceased|settlor|testator|ancestor)\b/i.test(after))continue;
  let suggestion=r.preferred;if(/^[A-Z]/.test(m[0]))suggestion=suggestion[0].toUpperCase()+suggestion.slice(1);
  const message='LCB page '+r.page+' lists “'+r.sourceForm+'”. This check recognizes an explicit close spelling variant, with names, quotations and known alternate meanings protected. Confirm the source PDF before accepting a correction.';
  issues.push({start,end,text:doc.text.slice(start,end),suggestion,guideId:'lcb',guidePage:r.page,guidePrintedPage:references.lcb.pages[r.page-1].printedPage,rule:'Listed spelling',category:'LCB spelling',context:ctx.at(start),checkId:'lcb-spellings',conflict:false,message,references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:r.page,guidePrintedPage:references.lcb.pages[r.page-1].printedPage,rule:'Spelling examples',preferred:suggestion,ruleText:message}]});
 }
 return issues;
}
