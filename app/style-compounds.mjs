import {styleContext} from './style-context.mjs';
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
// Source examples explicitly listed on LCB p.15. Exceptions are individual
// rules rather than a blanket instruction to join every matching suffix.
export const END_WORD_RULES=[
 ['air borne','airborne'],['blood borne','bloodborne'],['water borne','waterborne'],
 ['bond holder','bondholder'],['credential holder','credentialholder'],['lease holder','leaseholder'],['license holder','licenseholder'],['lien holder','lienholder'],['permit holder','permitholder'],['policy holder','policyholder'],
 ['park lands','parklands'],['tide lands','tidelands'],['timber land','timberland'],['wild land','wildland'],
 ['case load','caseload'],['peak load','peakload'],['truck load','truckload'],['work load','workload'],
 ['decision maker','decisionmaker'],['die maker','diemaker'],['policy maker','policymaker'],['rate making','ratemaking'],['tool maker','toolmaker'],
 ['home site','homesite'],['off site','offsite'],['on site','onsite'],['school site','schoolsite'],['town site','townsite'],['web site','website'],['work site','worksite'],
 ['ground water','groundwater'],['salt water','saltwater'],['storm water','stormwater'],['waste water','wastewater'],['water master','watermaster'],
 ['area wide','areawide'],['community wide','communitywide'],['county wide','countywide'],['district wide','districtwide'],['hospital wide','hospitalwide'],['nation wide','nationwide'],['state wide','statewide']
].map(([variant,preferred])=>({id:'lcb-end-'+preferred,variant,preferred,page:15}));
export const OPEN_END_RULES=[['certificateholder','certificate holder'],['forestland','forest land'],['state parkland','state park land'],['low watermark','low water mark'],['high watermark','high water mark']].map(([variant,preferred])=>({id:'lcb-end-'+preferred.replaceAll(' ','-'),variant,preferred,page:15}));
const pluralCompounds=new Set(['bondholder','credentialholder','leaseholder','licenseholder','lienholder','permitholder','policyholder','caseload','peakload','truckload','workload','decisionmaker','diemaker','policymaker','toolmaker','homesite','schoolsite','townsite','website','worksite','watermaster']);
const fixedHyphens=[['attorney in fact','attorney-in-fact',9],['cross action','cross-action',10],['cross complaint','cross-complaint',10],['cross examine','cross-examine',10],['right of way','right-of-way',13],['rights of way','rights-of-way',13],['wellbeing','well-being',14]];
const nominal=[['back up','backup',9],['build up','buildup',9],['catch up','catchup',9],['clean up','cleanup',9],['follow up','followup',10],['hook up','hookup',11],['lay off','layoff',11],['mock up','mockup',12],['pass through','passthrough',12],['phase out','phaseout',12],['set off','setoff',13],['stand by','standby',13],['start up','startup',13]];
const heads='agreement|application|assistance|costs?|crews?|equipment|fees?|funding|inspection|notice|operations?|payments?|plans?|procedures?|programs?|projects?|requirements?|services?|systems?|work';
export function compoundIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[];
 const add=(m,item,rule,message)=>{
  if(m[0].replace(/\s+/g,' ').toLowerCase()===item.preferred.toLowerCase())return;
  if(ctx.at(m.index)==='Heading'||ctx.tableAt(m.index)||[...(doc.struck||[]),...doc.blocks.filter(b=>b.ignored).map(b=>({start:b.start,end:b.end}))].some(r=>r.start<m.index+m[0].length&&r.end>m.index))return;
  // Do not infer a spelling correction inside an all-capital heading or an
  // apparent title continued by another capitalized word.
  const text=doc.text.slice(m.index,m.index+m[0].length),after=source.slice(m.index+m[0].length);
  if(m[0]===m[0].toUpperCase()||/^[A-Z]/.test(m[0])&&(/\b[A-Z][a-z]+\s+[A-Z][a-z]+/.test(m[0])||/^\s+(?:(?:and|of|for|the|in|on)\s+)?[A-Z][a-z]/.test(after)))return;
  if(!item.preferred.includes(' ')&&/-[ \t]*\n/.test(m[0]))return; // PDF end-of-line division of a valid solid compound.
  let suggestion=item.preferred;if(/^[A-Z]/.test(m[0]))suggestion=suggestion[0].toUpperCase()+suggestion.slice(1);
  issues.push({start:m.index,end:m.index+m[0].length,text,suggestion,guideId:'lcb',guidePage:item.page,guidePrintedPage:String(item.page),rule,category:'Compound form',context:ctx.at(m.index),checkId:item.id||'lcb-nominal-compound',conflict:false,message,references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:item.page,guidePrintedPage:references.lcb.pages[item.page-1].printedPage,rule,preferred:suggestion,ruleText:message}]});
 };
 const expanded=[...END_WORD_RULES,...OPEN_END_RULES,...END_WORD_RULES.filter(r=>pluralCompounds.has(r.preferred)).map(r=>({...r,variant:r.variant+'s',preferred:r.preferred+'s'})),...fixedHyphens.map(([variant,preferred,page])=>({variant,preferred,page,id:'lcb-fixed-compound'}))];
 for(const item of expanded){
  const pieces=item.variant.split(' '),pattern=new RegExp('\\b'+pieces.map(escape).join('[\\s-]+')+'\\b','gi');
  for(const m of source.matchAll(pattern)){if(item.preferred==='parklands'&&/\bstate\s+$/i.test(source.slice(Math.max(0,m.index-20),m.index)))continue;add(m,item,item.id==='lcb-fixed-compound'?'Hyphenation examples':'Hyphenation: End words','LCB page '+item.page+' lists the compound form underlying “'+item.preferred+'”. Compare this listed form, including the stated open-word exceptions.');}
 }
 for(const [variant,preferred,page] of nominal){
  for(const m of source.matchAll(new RegExp('\\b'+variant.split(' ').join('\\s+')+'\\b','gi'))){
   const before=source.slice(Math.max(0,m.index-35),m.index),after=source.slice(m.index+m[0].length);
   // An immediately following known noun makes this an attributive compound;
   // an article followed by a clause boundary or "of" makes it nominal.
   if(/\b(?:must|shall|may|can|could|will|would|should|to)\s+$/i.test(before))continue;
   const nominalContext=new RegExp('^\\s+(?:'+heads+')\\b','i').test(after)||/\b(?:a|an|the|each|every|this|that)\s+$/i.test(before)&&/^\s*(?:of\b|(?:is|are|was|were|shall|must)\b|[.;,:!?]|$)/i.test(after);
   if(nominalContext)add(m,{preferred,page},'Hyphenation: Noun and verb forms','LCB lists “'+preferred+'” as a noun or unit modifier and “'+variant+'” as a verb. This occurrence has a recognized noun or attributive context.');
  }
 }
 return issues.sort((a,b)=>a.start-b.start);
}
