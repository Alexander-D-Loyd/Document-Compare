import {styleContext,withStyleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord} from './style-evidence.mjs';
import {styleWordDivisionView} from './style-word-divisions.mjs';
import {sourceNameRanges} from './style-source-names.mjs';

// These are source meaning witnesses, not a list of mandatory replacements.
// Inflections only identify additional occurrences for reader review. They do
// not assert that LCB independently prints every inflection or intended sense.
const entry=(page,sourceEntry,forms)=>Object.freeze({page,sourceEntry,forms:Object.freeze(forms)});
export const LCB_MEANING_REVIEW_FAMILIES=Object.freeze([
 {id:'advice-advise',entries:[entry(3,'advice (n.)',['advice','advices']),entry(3,'advise (v.)',['advise','advises','advised','advising'])]},
 {id:'any-time',entries:[entry(3,'any time (n.)',['any time']),entry(3,'anytime (adv.)',['anytime'])]},
 {id:'biannual-biennial',entries:[entry(3,'biannual (twice a yr.)',['biannual','biannually']),entry(3,'biennial (every 2 yrs.)',['biennial','biennially'])]},
 {id:'born-borne',entries:[entry(3,'born (birth)',['born']),entry(3,'borne (carried)',['borne'])]},
 {id:'canvas-canvass',entries:[entry(3,'canvas (cloth)',['canvas','canvases','canvased','canvasing']),entry(3,'canvass (solicit)',['canvass','canvasses','canvassed','canvassing'])]},
 {id:'capital-capitol',entries:[entry(3,'capital',['capital','capitals']),entry(3,'capitol (building)',['capitol','capitols'])]},
 {id:'complement-compliment',entries:[entry(3,'complement (complete)',['complement','complements','complemented','complementing']),entry(3,'compliment (praise)',['compliment','compliments','complimented','complimenting'])]},
 {id:'device-devise',entries:[entry(3,'device (contrivance)',['device','devices']),entry(3,'devise (convey)',['devise','devises','devised','devising'])]},
 {id:'discreet-discrete',entries:[entry(3,'discreet (prudent)',['discreet','discreetly']),entry(3,'discrete (distinct)',['discrete','discretely'])]},
 {id:'ensure-insure',entries:[entry(3,'ensure (guarantee)',['ensure','ensures','ensured','ensuring']),entry(4,'insure (relating to insurance)',['insure','insures','insured','insuring'])]},
 {id:'forego-forgo',entries:[entry(4,'forego (precede)',['forego','foregoes','forewent','foregone','foregoing']),entry(4,'forgo (do without)',['forgo','forgoes','forwent','forgone','forgoing'])]},
 {id:'foreword-forward',entries:[entry(4,'foreword (preface)',['foreword','forewords']),entry(4,'forward (ahead)',['forward','forwards','forwarded','forwarding'])]},
 {id:'guarantee-guaranty',entries:[entry(4,'guarantee (v.)',['guarantee','guarantees','guaranteed','guaranteeing']),entry(4,'guaranty (n.)',['guaranty','guaranties'])]},
 {id:'interment-internment',entries:[entry(4,'interment (burial)',['interment','interments']),entry(4,'internment (prison)',['internment','internments'])]},
 {id:'inure-inurn',entries:[entry(4,'inure (accrue)',['inure','inures','inured','inuring']),entry(4,'inurn (entomb)',['inurn','inurns','inurned','inurning'])]},
 {id:'ordinance-ordnance',entries:[entry(4,'ordinance (a law set forth by a governmental authority)',['ordinance','ordinances']),entry(4,'ordnance (military supplies, including weapons)',['ordnance'])]},
 {id:'peremptory-preemptory',entries:[entry(4,'peremptory (decisive)',['peremptory']),entry(4,'preemptory (preference)',['preemptory'])]},
 {id:'perspective-prospective',entries:[entry(4,'perspective (view)',['perspective','perspectives']),entry(5,'prospective (expected)',['prospective','prospectively'])]},
 {id:'principal-principle',entries:[entry(4,'principal (chief)',['principal','principals']),entry(4,'principle (rule)',['principle','principles'])]},
 {id:'stationary-stationery',entries:[entry(5,'stationary (fixed)',['stationary']),entry(5,'stationery (paper)',['stationery'])]},
 {id:'tenant-tenet',entries:[entry(5,'tenant (occupant)',['tenant','tenants']),entry(5,'tenet (doctrine)',['tenet','tenets'])]},
 {id:'therefor-therefore',entries:[entry(5,'therefor (making an appropriation therefor)',['therefor']),entry(5,'therefore (now, therefore, be it)',['therefore'])]},
].map(family=>Object.freeze({...family,entries:Object.freeze(family.entries)})));

export const LCB_MEANING_REVIEW_SCOPE='Reader review for 22 source-listed meaning or grammatical-role distinctions on LCB pages 3–5, including selected regular inflections. Every eligible unresolved occurrence is a review candidate, including correct wording. The detector does not decide intended meaning, assert an error, or offer an automatic replacement. Existing precise findings take precedence. Source quotations, names, headings, tables, struck text, uncertain excluded content, incomplete original words and compound components are protected. Recognized source word divisions retain full original spans. This is a broad reader-assisted checking method, not measured semantic accuracy or a no-misses guarantee.';

const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const records=LCB_MEANING_REVIEW_FAMILIES.flatMap(family=>family.entries.flatMap(witness=>witness.forms.map(form=>({family,witness,form}))));
const byForm=new Map(records.map(row=>[row.form,row]));
const words=new Set(records.map(row=>row.form).filter(form=>!form.includes(' ')));
const pattern=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_-])(?:'+[...byForm.keys()].sort((a,b)=>b.length-a.length).map(form=>form.split(' ').map(escape).join('\\s+')).join('|')+')(?![\\p{L}\\p{N}\\p{M}_-])','giu');
const intersects=(rows,start,end)=>rows.some(row=>row.start<end&&row.end>start);
function isApparentTitle(source,start,end){
 const term=source.slice(start,end);
 if(term===term.toUpperCase())return true;
 if(!/^[A-Z]/.test(term))return false;
 // Preserve an apparent multiword name. A sentence-opening capital alone
 // does not make ordinary body language a proper name.
 const before=source.slice(Math.max(0,start-90),start),after=source.slice(end,end+90);
 return /\p{Lu}[\p{L}\p{M}'’.-]*\s+$/u.test(before)||/^\s+\p{Lu}[\p{L}\p{M}'’.-]*/u.test(after);
}

export function lcbSemanticReviewIssues(doc,references,{existingIssues=[]}={}){
 if(!references?.lcb?.pages)return [];
 const view=styleWordDivisionView(doc,{knownWords:words}),reviewDoc=view?.doc||doc;
 const existing=view?existingIssues.map(issue=>({...issue,start:view.toView(issue.start),end:view.toView(issue.end)})):existingIssues;
 const result=withStyleContext(reviewDoc,()=>reviewMeanings(reviewDoc,references,existing));
 return view?view.restore(result):result;
}
function reviewMeanings(doc,references,existingIssues){
 const ctx=styleContext(doc),source=ctx.source,blocked=styleEvidenceGuard(doc,ctx),issues=[];
 const names=sourceNameRanges(source);
 const singleQuotes=[...source.matchAll(/‘[^’]*’|(?<![\p{L}\p{N}])'[^'\n]*'(?![\p{L}\p{N}])/gu)].map(m=>({start:m.index,end:m.index+m[0].length}));
 const eligible=new Set(LCB_MEANING_REVIEW_FAMILIES.filter(family=>family.entries.every(e=>references.lcb.pages.find(page=>page.page===e.page)?.lexicalEntries?.includes(e.sourceEntry))).map(family=>family.id));
 for(const m of source.matchAll(pattern)){
  const start=m.index,end=start+m[0].length,row=byForm.get(m[0].toLowerCase().replace(/\s+/g,' '));
  if(!row||!eligible.has(row.family.id)||ctx.at(start)==='Heading'||cutsOriginalStyleWord(doc,start)||cutsOriginalStyleWord(doc,end)||blocked(start,end)||intersects(existingIssues,start,end)||intersects(names,start,end)||intersects(singleQuotes,start,end)||isApparentTitle(source,start,end))continue;
  // Masked characters adjacent to a candidate cannot turn an original
  // compound component into a standalone meaning witness.
  if(/[-\u2010-\u2015]/u.test(doc.text[start-1]||'')||/[-\u2010-\u2015]/u.test(doc.text[end]||''))continue;
  const witnesses=row.family.entries.map(e=>({page:e.page,sourceEntry:e.sourceEntry}));
  const meaningText=witnesses.map(e=>'“'+e.sourceEntry+'”').join(' and ');
  const message='Review Suggested: Confirm the intended meaning or grammatical role of “'+m[0].replace(/\s+/g,' ')+'”. LCB lists '+meaningText+'. This occurrence may be correct; no replacement has been selected.';
  const rule='Spelling and usage meanings: '+row.family.id;
  issues.push({start,end,text:doc.text.slice(start,end),matchText:m[0].replace(/\s+/g,' '),suggestion:null,rule,guideId:'lcb',guidePage:row.witness.page,guidePrintedPage:String(row.witness.page),category:'Meaning Review',context:ctx.at(start),confidence:'Review Suggested',reviewSuggested:true,reviewKind:'meaning',checkId:'lcb-semantic-review:'+row.family.id,conflict:false,matchesPrimary:false,message,meaningWitnesses:witnesses,references:witnesses.map(e=>({guideId:'lcb',guideName:'LCB Style Manual',rule:e.sourceEntry,guidePage:e.page,guidePrintedPage:String(e.page),preferred:null,ruleText:e.sourceEntry}))});
 }
 return issues;
}
