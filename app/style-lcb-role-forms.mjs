import {nounPhraseEvidenceRanges} from './style-noun-heads.mjs';
import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord} from './style-evidence.mjs';
import {createNounQuantityReader} from './style-noun-quantities.mjs';
// LCB explicitly marks these forms as unit modifiers or as noun exceptions.
export const LCB_ROLE_FORMS=[
 ...['in service','in-service'].map(variant=>({page:11,variant,preferred:'inservice',role:'modifier',heads:'training|education|instruction|courses?|workshops?|sessions?|programs?|teacher\\s+training'})),
 {page:9,variant:'collective-bargaining',preferred:'collective bargaining',role:'noun'},
 ...['higher','lower'].map(word=>({page:11,variant:word+'-income',preferred:word+' income',role:'modifier',heads:'households|families|residents|individuals|persons|people|workers|groups|brackets|communities|taxpayers|neighborhoods|areas'})),
 ...['man made','manmade'].map(variant=>({page:11,variant,preferred:'man-made',role:'modifier',heads:'lake|lakes|structure|structures|material|materials|object|objects|fiber|fibers|feature|features|reservoir|reservoirs|island|islands',requiresEvidence:true})),
 ...[[9,'above ground','aboveground'],[9,'above-ground','aboveground'],[9,'acute-care','acute care'],[9,'bold-face','boldface'],[10,'green house','greenhouse'],[11,'health-maintenance','health maintenance'],[11,'home-health','home health'],[11,'medical-care','medical care'],[11,'medical-record','medical record'],[12,'mobile home','mobilehome']].map(([page,variant,preferred])=>({page,variant,preferred,role:'modifier',heads:({'boldface':'type|types','greenhouse':'gas|gases','health maintenance':'organizations|organization','home health':'agencies|agency','medical care':'institutions|institution','medical record':'information','mobilehome':'parks|park'})[preferred],sourceForm:preferred==='boldface'?'boldface type':preferred==='greenhouse'?'greenhouse gases':preferred==='health maintenance'?'health maintenance organizations':preferred==='home health'?'home health agencies':preferred==='medical care'?'medical care institution':preferred==='medical record'?'medical record information':preferred==='mobilehome'?'mobilehome park':preferred})),
 ...[[9,'audio video','audiovideo'],[9,'audio visual','audiovisual'],[10,'cross bones','crossbones'],[10,'guide lines','guidelines'],[10,'floodplain','flood plain'],[10,'flood-plain','flood plain'],[13,'time share','time-share'],[13,'timeshare','time-share'],[14,'wastestream','waste stream'],[14,'waste-stream','waste stream'],[14,'transfat','trans fat']].map(([page,variant,preferred])=>({page,variant,preferred,role:'noun or modifier'})),
 ...[[10,'councilmember','council member'],[10,'council-member','council member'],[12,'offramp','off ramp'],[12,'off-ramp','off ramp'],[12,'onramp','on ramp'],[12,'on-ramp','on ramp'],[13,'sisterstate','sister state'],[14,'vicechairperson','vice chairperson']].map(([page,variant,preferred])=>({page,variant,preferred,role:'noun'})),
 ...[[3,'ad-valorem','ad valorem'],[3,'advalorem','ad valorem'],[3,'de-minimis','de minimis'],[3,'deminimis','de minimis'],[3,'ex-officio','ex officio'],[3,'exofficio','ex officio'],[4,'inter-vivos','inter vivos'],[4,'intervivos','inter vivos'],[4,'pro-rata','pro rata'],[4,'prorata','pro rata'],[9,'bona-fide','bona fide'],[9,'bonafide','bona fide'],[12,'per-capita','per capita'],[12,'percapita','per capita'],[13,'post-mortem','post mortem'],[13,'postmortem','post mortem']].map(([page,variant,preferred])=>({page,variant,preferred,role:'noun or modifier'})),
 ...[[9,'case-law','case law'],[9,'conflict-of-interest','conflict of interest'],[9,'certificate-of-need','certificate of need'],[9,'billroom','bill room'],[10,'cross-section','cross section'],[10,'data-processing','data processing'],[10,'data-processor','data processor'],[10,'day-labor','day labor'],[10,'day-use','day use'],[10,'first-aid','first aid'],[10,'first-degree','first degree'],[10,'flat-rate','flat rate'],[10,'floorplan','floor plan'],[10,'full-time','full time'],[11,'half-time','half time'],[12,'part-time','part time'],[12,'parking-lot','parking lot'],[13,'power-of-attorney','power of attorney'],[13,'problem-solving','problem solving'],[13,'safety-belt','safety belt'],[13,'sea-level','sea level'],[13,'taskforce','task force'],[14,'trans-fat','trans fat'],[14,'vice-chairperson','vice chairperson']].map(([page,variant,preferred])=>({page,variant,preferred,role:'noun'})),
 {page:14,variant:'x ray',preferred:'x-ray',role:'noun or modifier'},
 {page:14,variant:'xray',preferred:'x-ray',role:'noun or modifier'},
 {page:9,variant:'common-law',preferred:'common law',role:'modifier'},
 {page:11,variant:'land-use',preferred:'land use',role:'modifier'},
 {page:13,variant:'public-health',preferred:'public health',role:'modifier'},
 {page:12,variant:'per-diem',preferred:'per diem',role:'modifier'},
 {page:9,variant:'common sense',preferred:'commonsense',role:'modifier'},
 {page:13,variant:'post graduate',preferred:'postgraduate',role:'modifier'},
 {page:14,variant:'week long',preferred:'weeklong',role:'modifier'},
 {page:12,variant:'on line',preferred:'online',role:'modifier'},
 {page:10,variant:'end-use',preferred:'end use',role:'noun'},
 {page:11,variant:'life-cycle',preferred:'life cycle',role:'noun'},
 {page:11,variant:'loan-shark',preferred:'loan shark',role:'noun'},
 {page:11,variant:'loanshark',preferred:'loan shark',role:'noun'},
 ...[[10,'councilmember','council member'],[10,'council-member','council member'],[11,'loan-shark','loan shark'],[11,'loanshark','loan shark'],[12,'offramp','off ramp'],[12,'off-ramp','off ramp'],[12,'onramp','on ramp'],[12,'on-ramp','on ramp'],[13,'taskforce','task force'],[14,'vicechairperson','vice chairperson'],[14,'vice-chairperson','vice chairperson']].map(([page,variant,preferred])=>({page,variant:variant+'s',preferred:preferred+'s',sourceForm:preferred,role:'noun',selectedPlural:true})),
];
const heads=/^\s+(?:agreements?|applications?|assistance|benefits?|business|centers?|costs?|coverage|development|employees?|equipment|fees?|funding|funds?|information|loans?|management|members?|operations?|payments?|plans?|policies|policy|programs?|projects?|providers?|records?|requirements?|services?|standards?|systems?|training|workers?|rules?|procedures?|rights?|claims?|courses?|classes?|events?|machines?|images?|imaging|examinations?|scans?|tests?|photographs?|tax|taxes|transfers?|orders?|transactions?|evidence|percentages?|bases|basis|exceptions?|estates?|trusts?|arrangements?|reports?|findings?|facilities|facility|structures?|buildings?|systems?|organizations?|agencies|agency|institutions?|parks?|types?|gases|communications?)\b/i;
const determiner=/\b(?:a|an|the|this|that|each|every|its|their|our|your)\s+$/i;
const pluralDeterminer=/\b(?:the|these|those|its|their|our|your)\s+$/i;
const nounEnd=/^\s*(?:[;.!?)]|$)|^\s+(?:of|under|for|with|without|in|by|from)\b|^\s*,\s*(?:and|or|but)\s+(?:it|they|the\s+(?:record|agency|department|court|board))\s+(?:is|are|was|were|shall|must|may|will|remains?)\b/i;
const objectVerbs='accept|authorize|consider|describe|exclude|include|maintain|offer|permit|preserve|provide|reject|require|retain|review|support|use';
const objectStart=new RegExp('\\b(?:shall|must|may|will|can|could|should|would)\\s+(?:not\\s+)?(?:'+objectVerbs+')\\s+(?:(?:a|an|the|this|that|each|every|its|their|our|your)\\s+)?$','i');
const imperativeStart=new RegExp('(?:^|[.!?]\\s+|do\\s+enact\\s+as\\s+follows\\s*:\\s*)(?:'+objectVerbs+')\\s+(?:(?:a|an|the|this|that|each|every|its|their|our|your)\\s+)?$','i');
export function lcbRoleFormIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[],blocked=styleEvidenceGuard(doc,ctx);
 const quantityBefore=createNounQuantityReader(doc,ctx);
 const cutsWord=index=>cutsOriginalStyleWord(doc,index);
 for(const r of LCB_ROLE_FORMS){
  const pattern=r.variant.replace(/[ -]/g,'[\\s-]+');
  for(const m of source.matchAll(new RegExp('\\b'+pattern+'\\b','gi'))){
   const start=m.index,end=start+m[0].length,before=source.slice(Math.max(0,start-100),start),after=source.slice(end);
   if(m[0].replace(/\s+/g,' ').toLowerCase()===r.preferred||ctx.at(start)==='Heading'||cutsWord(start)||cutsWord(end)||blocked(start,end)||m[0]===m[0].toUpperCase()||/^[A-Z]/.test(m[0])||/-[ \t]*\n/.test(m[0]))continue;
   const head=(r.heads?new RegExp('^\\s+(?:'+r.heads+')\\b','i'):heads).exec(after),modifierEvidence=[];
   if(head){
    const needsCue=r.requiresEvidence||r.preferred==='commonsense'&&/^\s+(?:rules|plans|works|acts|reports|grants)\b/i.test(after);
    if(needsCue){const afterHead=after.replace(/^\s+[A-Za-z]+/,''),cut=after.length-afterHead.length;for(const cue of nounPhraseEvidenceRanges(before,afterHead))modifierEvidence.push({start:cue.side==='before'?start-before.length+cue.start:start,end:cue.side==='after'?end+cut+cue.end:end+head[0].length,description:'following noun head and intact grammatical cue'});}
    else modifierEvidence.push({start,end:end+head[0].length,description:'following noun head'});
   }
   // The beginning of a clipped context window is not a sentence boundary.
   const det=(r.selectedPlural?pluralDeterminer:determiner).exec(before),continuation=/^\s+(?:of|is|are|was|were|shall|must)\b/i.exec(after),ending=nounEnd.exec(after),nominalEvidence=[];
   if(det)for(const tail of [continuation,ending].filter(Boolean))nominalEvidence.push({start:start-before.length+det.index,end:end+tail[0].length,description:'determiner and nominal continuation'});
   const quantity=r.selectedPlural&&quantityBefore(start);
   if(quantity)for(const tail of [continuation,ending].filter(Boolean))nominalEvidence.push({start:quantity.start,end:end+tail[0].length,description:'complete quantity and nominal continuation'});
   const object=objectStart.exec(before),prefix=start>100?'\uFFFD':'',imperative=imperativeStart.exec(prefix+before);
   if(ending)for(const [cue,shift]of [[object,0],[imperative,prefix.length]])if(cue)nominalEvidence.push({start:start-before.length+cue.index-shift,end:end+ending[0].length,description:'transitive object and nominal ending'});
   // A window beginning inside a source word must not invent its suffix as
   // a determiner, modal or transitive verb. Check the original boundary.
   const evidence=(r.role==='modifier'?modifierEvidence:r.role==='noun'?nominalEvidence:[...modifierEvidence,...nominalEvidence]).find(e=>!cutsWord(e.start)&&!cutsWord(e.end)&&!blocked(e.start,e.end));
   if(!evidence)continue;
   if(issues.some(i=>i.start===start&&i.end===end&&i.suggestion===r.preferred))continue;
   const message='LCB page '+r.page+' explicitly lists “'+(r.sourceForm||r.preferred)+'” in '+r.role+' use.'+(r.selectedPlural?' This is its selected regular plural.':'')+' This occurrence has a recognized '+evidence.description+'. The complete establishing evidence is protected against source strikes, literals, tables and unknown ignored or excluded content. Other grammatical or literal-name uses remain protected.';
   issues.push({start,end,text:doc.text.slice(start,end),suggestion:r.preferred,guideId:'lcb',guidePage:r.page,guidePrintedPage:references.lcb.pages[r.page-1].printedPage,rule:'Hyphenation examples: '+r.preferred,category:'Contextual compound form',context:ctx.at(start),checkId:'lcb-role-forms',conflict:false,message,references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:r.page,guidePrintedPage:references.lcb.pages[r.page-1].printedPage,rule:'Hyphenation examples',preferred:r.preferred,ruleText:message}]});
  }
 }
 return issues;
}
