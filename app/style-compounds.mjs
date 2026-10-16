import {styleContext,styleRangeBlocked} from './style-context.mjs';
import {styleEvidenceGuard,originalBodyStyleContext} from './style-evidence.mjs';
import {compoundSourceBoundaryBlocked} from './style-compound-source-boundaries.mjs';
import {additionalNominalCompoundEvidence} from './style-nominal-compound-heads.mjs';
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
const pluralCompounds=new Set(['bondholder','credentialholder','leaseholder','licenseholder','lienholder','permitholder','policyholder','caseload','peakload','truckload','workload','decisionmaker','diemaker','policymaker','toolmaker','homesite','schoolsite','townsite','website','worksite','watermaster','timberland','wildland']);
const fixedHyphens=[['air condition','air-condition',9],['aircondition','air-condition',9],['air conditioned','air-conditioned',9],['airconditioned','air-conditioned',9],['air conditioning','air-conditioning',9],['airconditioning','air-conditioning',9],['attorney in fact','attorney-in-fact',9],['cross action','cross-action',10],['cross complaint','cross-complaint',10],['cross examine','cross-examine',10],['right of way','right-of-way',13],['rights of way','rights-of-way',13],['wellbeing','well-being',14]];
export const NOMINAL_COMPOUNDS=[['back up','backup',9],['build up','buildup',9],['catch up','catchup',9],['clean up','cleanup',9],['follow up','followup',10],['hook up','hookup',11],['lay off','layoff',11],['mock up','mockup',12],['pass through','passthrough',12],['phase out','phaseout',12],['set off','setoff',13],['stand by','standby',13],['start up','startup',13],['drive by','driveby',10],['phase in','phase-in',12],['run off','runoff',13]];
const heads='agreement|application|assistance|costs?|crews?|equipment|fees?|funding|inspection|notice|operations?|payments?|plans?|procedures?|programs?|projects?|requirements?|services?|systems?|work';
export function compoundIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[],literal=[...source.matchAll(/“[^”]*”|"[^"\n]*"/g)].map(m=>({start:m.index,end:m.index+m[0].length}));
 const blockedEvidence=styleEvidenceGuard(doc,ctx),original=originalBodyStyleContext(doc)?.source||source;
 let stateParkParents=null;
 const inStateParkParent=(start,end)=>{
  if(!stateParkParents){
   // Restore original uncertain/struck letters only to protect a listed parent
   // exception. Mask identified heads and margin prefixes in this private view;
   // unknown content stays present and cannot establish a new continuity.
   const ranges=doc.blocks.flatMap(b=>b.ignored&&b.formatting?.headerParts?.length?[{start:b.start,end:b.end}]:b.margin?[{start:b.start,end:b.start+b.margin.length}]:[]),pieces=[];let at=0;
   for(const r of ranges){pieces.push(doc.text.slice(at,r.start),doc.text.slice(r.start,r.end).replace(/[^\n]/g,' '));at=r.end;}
   pieces.push(doc.text.slice(at));const originalLayout=pieces.join('').replace(/[\u2010-\u2015]/g,'-'),pattern=/(?<![\p{L}\p{N}\p{M}_])state[\s-]+park[\s-]*lands?(?![\p{L}\p{N}\p{M}_])/giu;
   stateParkParents=[...source.matchAll(pattern),...originalLayout.matchAll(pattern)].map(m=>({start:m.index,end:m.index+m[0].length}));
  }
  return stateParkParents.some(r=>r.start<start&&r.end>=end);
 };
 const cutsSourceWord=index=>/[\p{L}\p{N}\p{M}_]$/u.test(doc.text.slice(Math.max(0,index-2),index))&&/^[\p{L}\p{N}\p{M}_]/u.test(doc.text.slice(index,index+2));
 const add=(m,item,rule,message,evidence=null)=>{
  const evidenceStart=evidence?.start??m.index,evidenceEnd=evidence?.end??m.index+m[0].length;
  if(cutsSourceWord(m.index)||cutsSourceWord(m.index+m[0].length)||blockedEvidence(evidenceStart,evidenceEnd)||styleRangeBlocked(doc,evidenceStart,evidenceEnd)||compoundSourceBoundaryBlocked(doc.text,source,original,m.index,m.index+m[0].length)||compoundSourceBoundaryBlocked(doc.text,source,original,evidenceStart,evidenceEnd))return;
  if(m[0].replace(/\s+/g,' ').toLowerCase()===item.preferred.toLowerCase())return;
  if(literal.some(r=>r.start<m.index+m[0].length&&r.end>m.index)||ctx.at(m.index)==='Heading'||ctx.tableAt(m.index)||[...(doc.struck||[]),...(evidence?[]:doc.blocks.filter(b=>b.ignored).map(b=>({start:b.start,end:b.end})))].some(r=>r.start<m.index+m[0].length&&r.end>m.index))return;
  // Holder compounds can instead be a transitive verb followed by people:
  // 'shall permit holders to sell', 'may license holders of permits'.
  if(/^(?:permit|license|bond)[\s-]+holders?$/i.test(m[0])){
   const before=source.slice(Math.max(0,m.index-55),m.index),after=source.slice(m.index+m[0].length);
   if(/\b(?:shall|must|may|can|could|will|would|should)\s*$/i.test(before)||/\bto\s*$/i.test(before)&&/^\s+to\s+[a-z]/i.test(after))return;
  }
  // Do not infer a spelling correction inside an all-capital heading or an
  // apparent title continued by another capitalized word.
  const text=doc.text.slice(m.index,m.index+m[0].length),after=source.slice(m.index+m[0].length);
  if([...text.matchAll(/[\u2012-\u2015]/gu)].some(d=>source[m.index+d.index]==='-'))return; // Body punctuation is not a compound-word hyphen; masked heads are separate.
  if(m[0]===m[0].toUpperCase()||/^[A-Z]/.test(m[0])&&(/\b[A-Z][a-z]+\s+[A-Z][a-z]+/.test(m[0])||/^\s+(?:(?:and|of|for|the|in|on)\s+)?[A-Z][a-z]/.test(after)))return;
  if(!item.preferred.includes(' ')&&/-[ \t]*\n/.test(m[0]))return; // PDF end-of-line division of a valid solid compound.
  let suggestion=item.preferred;if(/^[A-Z]/.test(m[0]))suggestion=suggestion[0].toUpperCase()+suggestion.slice(1);
  issues.push({start:m.index,end:m.index+m[0].length,text,suggestion,guideId:'lcb',guidePage:item.page,guidePrintedPage:String(item.page),rule,category:'Compound form',context:ctx.at(m.index),checkId:item.id||'lcb-nominal-compound',conflict:false,message,references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:item.page,guidePrintedPage:references.lcb.pages[item.page-1].printedPage,rule,preferred:suggestion,ruleText:message}]});
 };
 const expanded=[...END_WORD_RULES,...OPEN_END_RULES,...END_WORD_RULES.filter(r=>pluralCompounds.has(r.preferred)).map(r=>({...r,variant:r.variant+'s',preferred:r.preferred+'s'})),...OPEN_END_RULES.map(r=>({...r,variant:r.variant+'s',preferred:r.preferred+'s'})),...fixedHyphens.map(([variant,preferred,page])=>({variant,preferred,page,id:'lcb-fixed-compound'}))];
 for(const item of expanded){
  // Listed open exceptions require complete handling of closed, hyphenated
  // and regular plural spellings, not just one closed-word variant. Preferred
  // open forms pass through add unchanged; no new semantic root is inferred.
  const variants=[...new Set([item.variant,...(item.preferred.includes(' ')?[item.preferred]:[])])];
  for(const variant of variants){
   const pattern=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])'+variant.split(' ').map(escape).join('[\\s-]+')+'(?![\\p{L}\\p{N}\\p{M}_])','giu');
   for(const m of source.matchAll(pattern)){
    // A removed/uncertain part of the listed state park land exception cannot
    // turn its remaining suffix into a contradictory parklands correction.
    if(item.preferred==='parklands'&&inStateParkParent(m.index,m.index+m[0].length))continue;
    add(m,item,item.id==='lcb-fixed-compound'?'Hyphenation examples':'Hyphenation: End words','LCB page '+item.page+' lists the compound form underlying “'+item.preferred+'”. Compare this listed form, including the stated open-word exceptions.',{start:m.index,end:m.index+m[0].length});
   }
  }
 }
 for(const [variant,preferred,page] of NOMINAL_COMPOUNDS){
  for(const m of source.matchAll(new RegExp('\\b'+variant.split(' ').join('[\\s-]+')+'\\b','gi'))){
   if(cutsSourceWord(m.index)||cutsSourceWord(m.index+m[0].length))continue;
   const before=source.slice(Math.max(0,m.index-35),m.index),after=source.slice(m.index+m[0].length);
   // An immediately following known noun makes this an attributive compound;
   // an article followed by a clause boundary or "of" makes it nominal.
   if(/\b(?:must|shall|may|can|could|will|would|should|to)\s+$/i.test(before))continue;
   const head=new RegExp('^\\s+(?:'+heads+')(?![\\p{L}\\p{N}_])','iu').exec(after),determiner=/\b(?:a|an|the|each|every|this|that)\s+$/i.exec(before),ending=/^\s*(?:(?:of|is|are|was|were|shall|must)(?![\p{L}\p{N}_])|[.;,:!?]|$)/iu.exec(after);
   const legacyEvidence=head?{start:m.index,end:m.index+m[0].length+head[0].length}:determiner&&ending?{start:Math.max(0,m.index-35)+determiner.index,end:m.index+m[0].length+ending[0].length}:null;
   const nominalContext=legacyEvidence&&!cutsSourceWord(legacyEvidence.start)&&!cutsSourceWord(legacyEvidence.end)&&!blockedEvidence(legacyEvidence.start,legacyEvidence.end);
   const additional=!nominalContext&&additionalNominalCompoundEvidence(doc,source,m.index,m.index+m[0].length,preferred,blockedEvidence);
   if(nominalContext||additional)add(m,{preferred,page},'Hyphenation: Noun and verb forms','LCB lists “'+preferred+'” as a noun or unit modifier and “'+variant+'” as a verb. This occurrence has a recognized noun or attributive context.'+(additional?' The complete following noun and independent nominal cue protect source strikes, literals, tables, unknown excluded content and Unicode token boundaries; unfamiliar noun roles remain manual.':''),nominalContext?legacyEvidence:additional);
  }
 }
 return issues.sort((a,b)=>a.start-b.start);
}
