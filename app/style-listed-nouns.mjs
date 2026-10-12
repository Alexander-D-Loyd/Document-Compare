import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord} from './style-evidence.mjs';
import {createListedNounVerbProtection,NOUN_VERB_PROTECTION_SCOPE} from './style-listed-noun-roles.mjs';
import {createNounQuantityReader,NOUN_QUANTITY_SCOPE} from './style-noun-quantities.mjs';
export const LISTED_NOUN_EVIDENCE_SCOPE=' Complete original matched words and every establishing noun cue protect Unicode/combining-mark boundaries, source strikes including spaces, wrapped literals, tables and unknown ignored/excluded content. Article/preposition, complete modifier head, coupled plural continuation, explicit count, bare plural subject and shared prepositional coordination are independent finite evidence paths. Identified interior headerParts preserve source offsets. Reverse lexical discovery removes the old45-character window for immediate noun/count cues; The coordinated-object window remains200 characters; selected negative verb cues use complete reverse lexical discovery. Whole supported quantity expressions exclude malformed notation and isolated numeric suffixes. Unfamiliar syntax, vocabulary, inflections, semantic roles, names and whole-rule certification remain manual.'+NOUN_VERB_PROTECTION_SCOPE+NOUN_QUANTITY_SCOPE;
export const LISTED_NOUN_RULES=[
 [9,'after market','aftermarket'],[9,'body building','bodybuilding'],[9,'breast feeding','breastfeeding'],[9,'car jacking','carjacking'],[9,'child proofing','childproofing'],[9,'by product','byproduct'],
 [10,'counter terrorism','counterterrorism'],[10,'credit worthiness','creditworthiness'],[10,'fact finders','factfinders'],
 [11,'infra structure','infrastructure'],[11,'in patient','inpatient'],[11,'kiwi fruit','kiwifruit'],[11,'long standing','longstanding'],[11,'long suffering','longsuffering'],
 [12,'non classified','nonclassified'],[12,'non exempt','nonexempt'],[12,'out patient','outpatient'],
 [13,'rate setting','ratesetting'],[13,'safe keeping','safekeeping'],[13,'school age','schoolage'],[13,'school day','schoolday'],[13,'semi automatic','semiautomatic'],[13,'socio economic','socioeconomic'],[13,'step sister','stepsister'],[13,'sub committee','subcommittee'],
 [14,'trawl net','trawlnet'],[14,'video conferencing','videoconferencing'],
 [9,'barber shop','barbershop'],[9,'care giver','caregiver'],[9,'car pool','carpool'],[9,'case worker','caseworker'],[9,'cash flow','cashflow'],[9,'child care','childcare'],[9,'clearing house','clearinghouse'],[9,'co-insurance','coinsurance'],
 [10,'co-owner','coowner'],[10,'co-payment','copayment'],[10,'course work','coursework'],[10,'co-worker','coworker'],[10,'data bank','databank'],[10,'day care','daycare'],[10,'down payment','downpayment'],[10,'e-mail','email'],[10,'fee payer','feepayer'],[10,'fire hose','firehose'],[10,'floor space','floorspace'],[10,'guide book','guidebook'],
 [11,'high rise','highrise'],[11,'home owner','homeowner'],[11,'hot line','hotline'],[11,'junk pile','junkpile'],[11,'kilowatt hour','kilowatthour'],[11,'land fill','landfill'],[11,'land owner','landowner'],[11,'market place','marketplace'],
 [12,'megawatt hour','megawatthour'],[12,'mobile home','mobilehome'],[12,'mud slide','mudslide'],[12,'name plate','nameplate'],[12,'patrol person','patrolperson'],[12,'pipe line','pipeline'],
 [13,'post card','postcard'],[13,'power plant','powerplant'],[13,'race track','racetrack'],[13,'record keeping','recordkeeping'],[13,'rest room','restroom'],[13,'school bus','schoolbus'],[13,'school children','schoolchildren'],[13,'seat belt','seatbelt'],[13,'sewer line','sewerline'],[13,'stream flow','streamflow'],[13,'tax payer','taxpayer'],[13,'text book','textbook'],[13,'time frame','timeframe'],[13,'time line','timeline'],[13,'tort feasor','tortfeasor'],
 [14,'video games','videogames'],[14,'video tape','videotape'],[14,'water courses','watercourses'],[14,'water flow','waterflow'],[14,'web master','webmaster'],[14,'work day','workday'],[14,'work force','workforce'],[14,'work study','workstudy'],
 [11,'homebuyer','home buyer'],[11,'homeownership','home ownership'],[11,'homepage','home page'],[12,'motorhome','motor home'],[13,'quarterhorse','quarter horse'],[13,'schoolyear','school year'],[13,'sickleave','sick leave'],[14,'webpage','web page'],[14,'webaddress','web address']
].map(([page,variant,preferred])=>({page,variant,preferred})).concat([
 [11,'home owners','homeowners','homeowner'],[9,'case workers','caseworkers','caseworker'],[9,'care givers','caregivers','caregiver'],
 [13,'tax payers','taxpayers','taxpayer'],[13,'text books','textbooks','textbook'],[13,'time frames','timeframes','timeframe'],
 [11,'homebuyers','home buyers','home buyer'],[11,'homepages','home pages','home page'],[14,'webpages','web pages','web page'],[14,'webaddresses','web addresses','web address'],
].map(([page,variant,preferred,sourceForm])=>({page,variant,preferred,sourceForm,selectedPlural:true}))).concat([
 {page:13,variant:'school days',preferred:'schooldays',sourceForm:'schoolday',selectedPlural:true,countedTimeUnit:true},
 {page:13,variant:'time lines',preferred:'timelines',sourceForm:'timeline',selectedPlural:true},
]);
const heads=/^\s+(?:agreement|application|assistance|benefits?|business|centers?|costs?|coverage|development|employees?|equipment|fees?|funding|funds?|information|loans?|management|members?|operations?|payments?|plans?|policies|policy|programs?|projects?|providers?|records?|requirements?|services?|standards?|systems?|training|workers?)\b/i;
const nounCue=/\b(?:a|an|the|each|every|any|all|these|those|of|for|with|without|their|its|our|your)\s+$/i;
const pluralEnding=/^\s*(?:[,;:.)!?]|$)|^\s+(?:is|are|was|were|has|have|shall|must|may|will|include|includes|require|requires|receive|receives|remain|remains|apply|applies)\b/i;
function barePluralSubject(ctx,start,end,after){
 // A clause opening plus an explicit plural finite predicate supplies the
 // nominal role without an article. Adjacent unfamiliar words do not.
 const prefix=ctx.source.slice(ctx.sentenceAt(start).start,start);
 const left=/(?:^|[;:])\s*(?:\([a-z\d]+\)\s*)*$/i.exec(prefix),right=/^\s+(?:are|were|have|shall|must|may|will|include|require|receive|remain|apply)\b/i.exec(after);
 return left&&right?{start:ctx.sentenceAt(start).start+left.index,end:end+right[0].length}:null;
}
function coordinatedPluralObject(ctx,start,end,after){
 // A shared preposition establishes the listed first noun and its coordinated
 // plural object. A conjunction alone does not establish a noun role.
 const beforeStart=Math.max(ctx.sentenceAt(start).start,start-200),before=ctx.source.slice(beforeStart,start),left=/\b(?:of|for|with|without)\s+(?:(?:the|these|those|planned|proposed|scheduled|current|future|other)\s+){0,2}(?:activities|plans|reports|records|requirements|services|procedures)\s+(?:and|or)\s+$/i.exec(before),right=/^\s*(?:[.;!?)]|$)|^\s+(?:for|of|with|without|under|in|during)\b/i.exec(after);
 return left&&right?{start:beforeStart+left.index,end:end+right[0].length}:null;
}
const lexicalTailStart=(source,end)=>{let start=end;while(start>0&&/\s/.test(source[start-1]))start--;while(start>0&&!/\s/.test(source[start-1]))start--;return start;};
export function listedNounIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[],quoted=[...source.matchAll(/“[^”]*”|"[^"\n]*"/g)].map(m=>({start:m.index,end:m.index+m[0].length}));
 const protectedVerb=createListedNounVerbProtection(doc,ctx);
 const quantityBefore=createNounQuantityReader(doc,ctx);
 // Keep this family's existing stricter headerParts trust policy without
 // rescanning every page block for every candidate and grammatical cue.
 const unclassifiedHeads=doc.blocks.filter(b=>b.ignored&&!b.formatting?.headerParts?.length),unclassifiedOverlap=(start,end)=>{let lo=0,hi=unclassifiedHeads.length;while(lo<hi){const mid=(lo+hi)>>1;if(unclassifiedHeads[mid].end<=start)lo=mid+1;else hi=mid;}return lo<unclassifiedHeads.length&&unclassifiedHeads[lo].start<end;};
 const blocked=styleEvidenceGuard(doc,ctx),valid=e=>e&&!cutsOriginalStyleWord(doc,e.start)&&!cutsOriginalStyleWord(doc,e.end)&&!unclassifiedOverlap(e.start,e.end)&&!blocked(e.start,e.end);
 for(const r of LISTED_NOUN_RULES){
  const pattern=r.variant.replace(/[ -]/g,'[\\s-]+');
  for(const m of source.matchAll(new RegExp('\\b'+pattern+'\\b','gi'))){
   const start=m.index,end=start+m[0].length,beforeStart=lexicalTailStart(source,start),before=source.slice(beforeStart,start),after=source.slice(end);
   if(!valid({start,end})||ctx.at(start)==='Heading'||quoted.some(q=>q.start<end&&q.end>start)||m[0]===m[0].toUpperCase()||/-[ \t]*\n/.test(m[0]))continue;
   if(/^[A-Z]/.test(m[0])&&(/^\s+(?:(?:and|of|for|the|in|on)\s+)?[A-Z][a-z]/.test(after)||/\b[A-Z][a-z]+\s+[A-Z][a-z]+/.test(m[0])))continue;
   // These are lexical noun forms, not arbitrary adjacent-word joins.
   // Require an article/preposition cue or a recognized attributive head.
   const evidence=[],head=heads.exec(after),cashAnalysis=r.variant==='cash flow'&&/^\s+analys(?:is|es)\b/i.exec(after),cashResources=r.variant==='cash flow'&&/^\s+resources?\b/i.exec(after),assist=cashResources&&/\bassist(?:s|ed|ing)?\s+$/i.exec(before),ownershipHead=r.variant==='homeownership'&&/^\s+opportunit(?:y|ies)\b/i.exec(after);
   for(const cue of [head,cashAnalysis,ownershipHead].filter(Boolean))evidence.push({start,end:end+cue[0].length});
   if(assist)evidence.push({start:beforeStart+assist.index,end:end+cashResources[0].length});
   const article=nounCue.exec(before),count=r.selectedPlural&&quantityBefore(start),ending=pluralEnding.exec(after);
   const countEvidence=r.countedTimeUnit&&count?{start:count.start,end}:null;
   if(r.selectedPlural){
    // A plural ending alone does not establish a noun role: in "The text
    // books appointments" books is a verb. Require a complete nominal
    // boundary/predicate with a determiner or count, or a known noun head.
    if(countEvidence)evidence.push(countEvidence);
    if(ending&&article)evidence.push({start:beforeStart+article.index,end:end+ending[0].length});
    if(ending&&count)evidence.push({start:count.start,end:end+ending[0].length});
    evidence.push(barePluralSubject(ctx,start,end,after),coordinatedPluralObject(ctx,start,end,after));
   }else if(article)evidence.push({start:beforeStart+article.index,end});
   if(!evidence.some(valid))continue;
   if(protectedVerb(start,end,r.variant))continue;
   if(r.preferred==='workday'&&/^\s+and\s+night\b/i.test(after))continue;
   let suggestion=r.preferred;if(/^[A-Z]/.test(m[0]))suggestion=suggestion[0].toUpperCase()+suggestion.slice(1);
   const message='LCB page '+r.page+' lists “'+(r.sourceForm||r.preferred)+'”. '+(valid(countEvidence)?'An explicit quantity establishes this schoolday time-unit noun, including a following coordinated action. The regular plural preserves the source compound spelling; unlisted time expressions remain manual. ':r.selectedPlural?'The selected regular plural keeps that source compound form and requires a determiner/count with complete nominal evidence, an explicit plural finite predicate at a clause opening, a selected shared prepositional noun phrase, or a recognized noun-modifier head. Unlisted inflections and ambiguous roles remain manual. ':'This occurrence has a noun or recognized noun-modifier cue. ')+'Confirm it is ordinary prose rather than a literal source name.';
   const cites=[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:r.page,guidePrintedPage:references.lcb.pages[r.page-1].printedPage,rule:'Hyphenation examples',preferred:suggestion,ruleText:message}];
   if(references.gpo&&['cashflow','home ownership'].includes(r.preferred)){
    const page=r.preferred==='cashflow'?136:159,ruleText=r.preferred==='cashflow'?'GPO’s Compounding Examples explicitly prints cashflow as one word on PDF page 136/printed 122, agreeing with LCB page 9. The recognized noun/head role is a bounded implementation context, not a separately printed resource rule.':'GPO’s home list begins on PDF page 158/printed 144 and continues on PDF page 159/printed 145. The continued #ownership entry specifies a space in home ownership, agreeing with LCB page 11. Literal source names and unknown grammatical roles remain protected.';
    cites.push({guideId:'gpo',guideName:'GPO Style Manual',guidePage:page,guidePrintedPage:references.gpo.pages[page-1].printedPage,rule:'7. Compounding Examples',preferred:suggestion,ruleText});
   }
   issues.push({start,end,text:doc.text.slice(start,end),suggestion,guideId:'lcb',guidePage:r.page,guidePrintedPage:String(r.page),rule:'Listed compound noun',category:'Compound noun form',context:ctx.at(start),checkId:'listed-nouns',conflict:false,message,references:cites});
  }
 }
 return issues;
}
