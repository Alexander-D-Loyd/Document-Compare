import {styleContext} from './style-context.mjs';
export const LISTED_NOUN_RULES=[
 [9,'barber shop','barbershop'],[9,'care giver','caregiver'],[9,'car pool','carpool'],[9,'case worker','caseworker'],[9,'cash flow','cashflow'],[9,'child care','childcare'],[9,'clearing house','clearinghouse'],[9,'co-insurance','coinsurance'],
 [10,'co-owner','coowner'],[10,'co-payment','copayment'],[10,'course work','coursework'],[10,'co-worker','coworker'],[10,'data bank','databank'],[10,'day care','daycare'],[10,'down payment','downpayment'],[10,'e-mail','email'],[10,'fee payer','feepayer'],[10,'fire hose','firehose'],[10,'floor space','floorspace'],[10,'guide book','guidebook'],
 [11,'high rise','highrise'],[11,'home owner','homeowner'],[11,'hot line','hotline'],[11,'junk pile','junkpile'],[11,'kilowatt hour','kilowatthour'],[11,'land fill','landfill'],[11,'land owner','landowner'],[11,'market place','marketplace'],
 [12,'megawatt hour','megawatthour'],[12,'mobile home','mobilehome'],[12,'mud slide','mudslide'],[12,'name plate','nameplate'],[12,'patrol person','patrolperson'],[12,'pipe line','pipeline'],
 [13,'post card','postcard'],[13,'power plant','powerplant'],[13,'race track','racetrack'],[13,'record keeping','recordkeeping'],[13,'rest room','restroom'],[13,'school bus','schoolbus'],[13,'school children','schoolchildren'],[13,'seat belt','seatbelt'],[13,'sewer line','sewerline'],[13,'stream flow','streamflow'],[13,'tax payer','taxpayer'],[13,'text book','textbook'],[13,'time frame','timeframe'],[13,'time line','timeline'],[13,'tort feasor','tortfeasor'],
 [14,'video games','videogames'],[14,'video tape','videotape'],[14,'water courses','watercourses'],[14,'water flow','waterflow'],[14,'web master','webmaster'],[14,'work day','workday'],[14,'work force','workforce'],[14,'work study','workstudy'],
 [11,'homebuyer','home buyer'],[11,'homeownership','home ownership'],[11,'homepage','home page'],[12,'motorhome','motor home'],[13,'quarterhorse','quarter horse'],[13,'schoolyear','school year'],[13,'sickleave','sick leave'],[14,'webpage','web page'],[14,'webaddress','web address']
].map(([page,variant,preferred])=>({page,variant,preferred}));
const heads=/^\s+(?:agreement|application|assistance|benefits?|business|centers?|costs?|coverage|development|employees?|equipment|fees?|funding|funds?|information|loans?|management|members?|operations?|payments?|plans?|policies|policy|programs?|projects?|providers?|records?|requirements?|services?|standards?|systems?|training|workers?)\b/i;
export function listedNounIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[],quoted=[...source.matchAll(/“[^”]*”|"[^"\n]*"/g)].map(m=>({start:m.index,end:m.index+m[0].length}));
 for(const r of LISTED_NOUN_RULES){
  const pattern=r.variant.replace(/[ -]/g,'[\\s-]+');
  for(const m of source.matchAll(new RegExp('\\b'+pattern+'\\b','gi'))){
   const start=m.index,end=start+m[0].length,before=source.slice(Math.max(0,start-45),start),after=source.slice(end);
   if(ctx.at(start)==='Heading'||ctx.tableAt(start)||quoted.some(q=>q.start<end&&q.end>start)||m[0]===m[0].toUpperCase()||/-[ \t]*\n/.test(m[0]))continue;
   if(/^[A-Z]/.test(m[0])&&(/^\s+(?:(?:and|of|for|the|in|on)\s+)?[A-Z][a-z]/.test(after)||/\b[A-Z][a-z]+\s+[A-Z][a-z]+/.test(m[0])))continue;
   // These are lexical noun forms, not arbitrary adjacent-word joins.
   // Require an article/preposition cue or a recognized attributive head.
   if(!/\b(?:a|an|the|each|every|any|all|these|those|of|for|with|without|their|its|our|your)\s+$/i.test(before)&&!heads.test(after))continue;
   if(r.preferred==='workday'&&/^\s+and\s+night\b/i.test(after))continue;
   let suggestion=r.preferred;if(/^[A-Z]/.test(m[0]))suggestion=suggestion[0].toUpperCase()+suggestion.slice(1);
   const message='LCB page '+r.page+' lists “'+r.preferred+'”. This occurrence has a noun or recognized noun-modifier cue. Confirm it is ordinary prose rather than a literal source name.';
   issues.push({start,end,text:doc.text.slice(start,end),suggestion,guideId:'lcb',guidePage:r.page,guidePrintedPage:String(r.page),rule:'Listed compound noun',category:'Compound noun form',context:ctx.at(start),checkId:'listed-nouns',conflict:false,message,references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:r.page,guidePrintedPage:references.lcb.pages[r.page-1].printedPage,rule:'Hyphenation examples',preferred:suggestion,ruleText:message}]});
  }
 }
 return issues;
}
