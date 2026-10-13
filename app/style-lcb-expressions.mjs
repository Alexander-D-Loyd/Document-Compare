import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord} from './style-evidence.mjs';
// Discrete source expressions. These are tested variants, not guessed edits
// or a license to join arbitrary neighboring words.
export const LCB_EXPRESSION_FORMS=[
 ...['mid fiscal year','mid-fiscal-year','midfiscal year'].map(variant=>({page:12,variant,preferred:'mid-fiscal year',role:'listed phrase'})),
 ...[[3,'advance-directive','advance directive'],[3,'advisory-council','advisory council'],[9,'common-sense','common sense'],[9,'co op','co-op'],[9,'co-operation','cooperation'],[10,'cost effectiveness','cost-effectiveness'],[10,'costeffectiveness','cost-effectiveness'],[10,'cost-of-living','cost of living'],[10,'cross action','cross-action'],[10,'crossaction','cross-action'],[10,'cross complaint','cross-complaint'],[10,'crosscomplaint','cross-complaint'],[10,'fruit-fly','fruit fly'],[10,'fruitfly','fruit fly'],[10,'guide-dog','guide dog'],[10,'guidedog','guide dog'],[10,'half-brother','half brother'],[10,'half-sister','half sister'],[11,'high-water-mark','high water mark'],[11,'low-water-mark','low water mark'],[13,'right of way','right-of-way'],[13,'rights of way','rights-of-way'],[13,'skid-row','skid row'],[13,'sport-fishing','sport fishing'],[14,'wellbeing','well-being'],[14,'well being','well-being']].map(([page,variant,preferred])=>({page,variant,preferred,role:'noun',sourceForm:preferred==='half sister'?'half brother':preferred})),
 ...[[9,'attorney in fact','attorney-in-fact'],[10,'employer employee relationship','employer-employee relationship'],[10,'first come first served basis','first-come-first-served basis'],[10,'first-come first-served basis','first-come-first-served basis'],[10,'floor safe door','floor-safe door'],[10,'good time release date','good-time release date'],[11,'lease purchase agreement','lease-purchase agreement'],[12,'no fault insurance','no-fault insurance'],[12,'non revenue producing','non-revenue-producing'],[12,'non self liquidating','non-self-liquidating'],[13,'post traumatic stress disorder','post-traumatic stress disorder'],[13,'posttraumatic stress disorder','post-traumatic stress disorder'],[13,'re cross examination','re-cross-examination'],[13,'recross-examination','re-cross-examination'],[14,'vehicle in lieu tax','vehicle in-lieu tax']].map(([page,variant,preferred])=>({page,variant,preferred,role:'listed phrase',sourceForm:preferred})),
 {page:10,variant:'cost effectively',preferred:'cost-effectively',role:'adverb'},
 {page:10,variant:'costeffectively',preferred:'cost-effectively',role:'adverb'},
 {page:10,variant:'cross examine',preferred:'cross-examine',role:'verb'},
 {page:10,variant:'crossexamine',preferred:'cross-examine',role:'verb'},
 {page:11,variant:'loan shark',preferred:'loan-shark',role:'verb'},
 {page:11,variant:'loanshark',preferred:'loan-shark',role:'verb'},
 {page:13,variant:'re elect',preferred:'reelect',role:'verb'},
 {page:13,variant:'re-elect',preferred:'reelect',role:'verb'},
 {page:9,variant:'co locate',preferred:'colocate',role:'verb'},
 {page:9,variant:'co-locate',preferred:'colocate',role:'verb'},
];
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const inflectedForms=[
 ...[['cross examine','cross-examine',10],['crossexamine','cross-examine',10],['re-elect','reelect',13],['co-locate','colocate',9],['loan shark','loan-shark',11],['loanshark','loan-shark',11]].flatMap(([variant,preferred,page])=>[
  {variant:variant+'s',preferred:preferred+'s',role:'finite verb'},
  {variant:variant+(/e$/.test(variant)?'d':'ed'),preferred:preferred+(/e$/.test(preferred)?'d':'ed'),role:'past verb'},
  {variant:variant.replace(/e$/,'')+'ing',preferred:preferred.replace(/e$/,'')+'ing',role:'gerund'},
 ].map(r=>({...r,page,sourceForm:preferred}))),
 ...[['guide-dogs','guide dogs',10,'guide dog'],['fruit-flies','fruit flies',10,'fruit fly'],['half-brothers','half brothers',10,'half brother'],['half-sisters','half sisters',10,'half brother'],['advance-directives','advance directives',3,'advance directive'],['advisory-councils','advisory councils',3,'advisory council']].map(([variant,preferred,page,sourceForm])=>({variant,preferred,page,sourceForm,role:'plural noun'})),
];
const allForms=[...LCB_EXPRESSION_FORMS,...inflectedForms];
const roleAdverbs=new Set('not never already recently previously duly still also'.split(' '));
// Retain the entire finite left cue without scanning a whole bill prefix for
// every candidate. Layout whitespace is unbounded; only the existing role
// adverbs may intervene before the establishing subject/auxiliary word.
const leftCueStart=(source,end)=>{let start=end;for(;;){while(start>0&&/\s/.test(source[start-1]))start--;const finish=start;while(start>0&&!/\s/.test(source[start-1]))start--;if(!roleAdverbs.has(source.slice(start,finish).toLowerCase())||start===0)return start;}};
const lookup=new Map(allForms.map(r=>[r.variant.replace(/[\s-]+/g,'').toLowerCase(),r]));
const expressionPattern=new RegExp('\\b(?:'+[...new Set(allForms.map(r=>r.variant.split(/[ -]+/).map(escape).join('[\\s-]+')))].sort((a,b)=>b.length-a.length).join('|')+')\\b','gi');
export function lcbExpressionIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[],quotes=[...source.matchAll(/“[^”]*”|"[^"\n]*"/g)].map(m=>({start:m.index,end:m.index+m[0].length}));
 const blocked=styleEvidenceGuard(doc,ctx);
 for(const m of source.matchAll(expressionPattern)){
  const r=lookup.get(m[0].replace(/[\s-]+/g,'').toLowerCase()),start=m.index,end=start+m[0].length;
  if(!r||m[0].replace(/\s+/g,' ').toLowerCase()===r.preferred||cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,end)||blocked(start,end)||ctx.at(start)==='Heading'||ctx.tableAt(start)||quotes.some(q=>q.start<end&&q.end>start)||/-[ \t]*\n/.test(m[0])||m[0]===m[0].toUpperCase())continue;
  // These are anchored finite role grammars. Identified layout whitespace can
  // intervene without the former 60-character truncation of the left cue.
  const beforeStart=leftCueStart(source,start),before=source.slice(beforeStart,start),after=source.slice(end);
  const left=pattern=>{const cue=pattern.exec(before),anchor=cue&&beforeStart+cue.index;return !!cue&&!cutsOriginalStyleWord(doc,anchor)&&!blocked(anchor,end);};
  const right=pattern=>{const cue=pattern.exec(after),finish=cue&&end+cue[0].length;return !!cue&&!cutsOriginalStyleWord(doc,finish)&&!blocked(start,finish);};
  if(/\b[A-Z][a-z]+\s+[A-Z][a-z]+/.test(m[0])||/^[A-Z]/.test(m[0])&&/^\s+(?:(?:of|for|the|and|in|on)\s+)?[A-Z][a-z]/.test(after))continue;
  const finiteSubject=left(/\b(?:agency|board|court|department|committee|commission|council|official|person|employer|provider|member|manager|director|he|she|it)\s+(?:(?:not|never|already|recently|previously|duly|still|also)\s+)*$/i);
  const pluralSubject=left(/\b(?:agencies|boards|courts|departments|committees|commissions|councils|officials|persons|employers|providers|members|managers|directors|they|we|you)\s+(?:(?:not|never|already|recently|previously|duly|still|also)\s+)*$/i);
  const completeObject=()=>right(/^\s+(?:a|an|the|this|that|these|those|its|their)\s+[a-z]+(?:[-'’][a-z]+)*\b/i);
  if(r.role==='verb'&&!left(/\b(?:shall|must|may|should|could|will|would|to)\s+$/i)&&!(pluralSubject&&completeObject()))continue;
  const auxiliary=left(/\b(?:is|are|was|were|be|been|being|has|have|had)\s+(?:(?:not|never|already|recently|previously|duly|still|also)\s+)*$/i);
  if(r.role==='finite verb'&&(!finiteSubject||!completeObject()))continue;
  if(r.role==='past verb'&&!auxiliary&&!finiteSubject&&!pluralSubject)continue;
  if(r.role==='gerund'&&!auxiliary&&!left(/\b(?:by|after|before|when|while|without)\s+$/i))continue;
  if(r.role==='plural noun'&&(!left(/\b(?:the|these|those|its|their|our|your|of|for|with|without)\s+$/i)||!right(/^\s*(?:[.;,:!?)]|$|(?:of|are|were|shall|must|may|will|have|apply|require|mean)\b)/i)))continue;
  if(r.role==='noun'&&(!left(/\b(?:a|an|the|this|that|each|every|its|their|our|your|of|for|with|without)\s+$/i)||!right(/^\s*(?:[.;,:!?)]|$|(?:of|is|are|was|were|shall|must|may|will|apply|applies|requires?|means?)\b)/i)))continue;
  if(r.role==='adverb'&&!left(/\b(?:shall|must|may|should|will|would|to|is|are|was|were|be|operates?|functions?|works?|performed|delivered|provided)\s+$/i)&&!right(/^\s+(?:operate|perform|deliver|provide|manage|administer|implement|process)\b/i))continue;
  const suggestion=/^[A-Z]/.test(m[0])?r.preferred[0].toUpperCase()+r.preferred.slice(1):r.preferred;
  const message='LCB page '+r.page+' lists “'+(r.sourceForm||r.preferred)+'”. This '+r.role+' has the listed components'+(r.role==='noun'?' and an explicit noun-position cue':r.role==='verb'?' after a modal or infinitive, or an explicit plural subject with a complete object':r.role==='adverb'?' in a recognized adverb position':inflectedForms.includes(r)?' with a recognized inflection and explicit grammatical cue':'')+'. Literal names, quoted language and ambiguous uses remain protected.';
  issues.push({start,end,text:doc.text.slice(start,end),suggestion,guideId:'lcb',guidePage:r.page,guidePrintedPage:references.lcb.pages[r.page-1].printedPage,rule:'Listed expression: '+(r.sourceForm||r.preferred),category:'Listed expression form',context:ctx.at(start),checkId:'lcb-expressions',conflict:false,message,references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:r.page,guidePrintedPage:references.lcb.pages[r.page-1].printedPage,rule:'Listed office expression',preferred:suggestion,ruleText:message}]});
 }
 return issues;
}
