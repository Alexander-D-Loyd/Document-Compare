import {NOMINAL_COMPOUNDS} from './style-compounds.mjs';
import {styleContext} from './style-context.mjs';
import {styleEvidenceGuard,cutsOriginalStyleWord} from './style-evidence.mjs';
import {nounHeadPattern} from './style-noun-heads.mjs';
import {createBarePhrasalObjectReader,PHRASAL_BARE_OBJECT_SCOPE} from './style-phrasal-bare-objects.mjs';
export const PHRASAL_INFLECTION_SCOPE=' Selected regular and irregular inflections of sixteen listed phrasal noun roots retain the corresponding open verb components. Explicit recognized finite subjects require a complete determiner/object noun; selected perfect/progressive/passive auxiliaries establish unambiguous participles with a complete object or nominal boundary. Base-identical participles such as run off and set off require an object to protect nominal possession. Complete original matched words, every role cue and all connecting spaces retain Unicode/combining-mark boundaries, strikes, wrapped literals, tables and unknown ignored/excluded content. Identified page heads preserve exact full body selections without a preceding-character cutoff. Inflections are grammatical derivations rather than separately printed guide entries or full first-listed dictionary authority. Unfamiliar subjects, objects, adverbs, possessives, nominal gerunds, ambiguous roles and general meaning remain manual.'+PHRASAL_BARE_OBJECT_SCOPE;
const stems={back:['backs','backed','backed','backing'],build:['builds','built','built','building'],catch:['catches','caught','caught','catching'],clean:['cleans','cleaned','cleaned','cleaning'],follow:['follows','followed','followed','following'],hook:['hooks','hooked','hooked','hooking'],lay:['lays','laid','laid','laying'],mock:['mocks','mocked','mocked','mocking'],pass:['passes','passed','passed','passing'],phase:['phases','phased','phased','phasing'],set:['sets','set','set','setting'],stand:['stands','stood','stood','standing'],start:['starts','started','started','starting'],drive:['drives','drove','driven','driving'],run:['runs','ran','run','running']};
const forms=new Map();for(const [open,solid,page]of NOMINAL_COMPOUNDS){const [base,particle]=open.split(' '),values=[base,...stems[base]],roles=['base','third','past','perfect','progressive'];for(const [i,stem]of values.entries()){const key=stem+particle;let r=forms.get(key);if(!r){r={stem,particle,base,solid,page,preferred:stem+' '+particle,roles:new Set()};forms.set(key,r);}r.roles.add(roles[i]);}}
const pattern=new RegExp('(?<![\\p{L}\\p{N}\\p{M}_])(?:'+[...forms.values()].map(r=>r.stem+'[\\s-]*'+r.particle).sort((a,b)=>b.length-a.length).join('|')+')(?![\\p{L}\\p{N}\\p{M}_])','giu');
const adverbs=new Set('not never also only already directly fully properly generally normally usually regularly previously recently duly still'.split(' '));
const leftStart=(source,end)=>{let at=end;for(;;){while(at>0&&/\s/.test(source[at-1]))at--;const finish=at;while(at>0&&!/\s/.test(source[at-1]))at--;if(!adverbs.has(source.slice(at,finish).toLowerCase())||at===0)return at;}};
const gap='(?:(?:'+[...adverbs].join('|')+')\\s+)*';
const singular=new RegExp('^(?:agency|board|court|department|committee|commission|council|official|person|employer|provider|member|manager|director|owner|contractor|applicant|he|she|it)\\s+'+gap+'$','i');
const plural=new RegExp('^(?:agencies|boards|courts|departments|committees|commissions|councils|officials|persons|people|employers|providers|members|managers|directors|owners|contractors|applicants|staff|personnel|we|they|you|I)\\s+'+gap+'$','i');
const perfect=new RegExp('^(?:has|have|had)\\s+'+gap+'$','i'),progressive=new RegExp('^(?:is|are|was|were|be|been|being)\\s+'+gap+'$','i');
const object=new RegExp('^\\s+(?:a|an|the|this|that|these|those|its|their)\\s+(?:'+nounHeadPattern+')(?![\\p{L}\\p{N}\\p{M}_])','iu');
const boundary=/^\s*(?:[.;,:!?)]|$)|^\s+(?:by|after|before|when|while|without|for|from|of|in|with|under)(?![\p{L}\p{N}\p{M}_])/iu;
export function phrasalInflectionIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,blocked=styleEvidenceGuard(doc,ctx),valid=r=>r&&!cutsOriginalStyleWord(doc,r.start)&&!cutsOriginalStyleWord(doc,r.end)&&!blocked(r.start,r.end),bareObject=createBarePhrasalObjectReader(doc,ctx),issues=[];
 for(const m of source.matchAll(pattern)){
  const start=m.index,end=start+m[0].length,r=forms.get(m[0].replace(/[\s-]+/g,'').toLowerCase()),after=source.slice(end);
  if(!r||!valid({start,end})||ctx.at(start)==='Heading'||m[0]===m[0].toUpperCase()||m[0].replace(/\s+/g,' ').toLowerCase()===r.preferred)continue;
  if(/^[A-Z]/.test(m[0])||/^\s+[A-Z][a-z]/.test(after))continue;
  const cueStart=leftStart(source,start),before=source.slice(cueStart,start),obj=object.exec(after),stop=boundary.exec(after),evidence=[],finite=r.roles.has('third')&&singular.test(before)||(r.roles.has('past')&&(singular.test(before)||plural.test(before)))||(r.roles.has('base')&&plural.test(before));
  if(finite&&obj)evidence.push({start:cueStart,end:end+obj[0].length});
  const perfectRole=r.roles.has('perfect')&&perfect.test(before),progressiveRole=(r.roles.has('progressive')||r.roles.has('perfect'))&&progressive.test(before);
  const bare=bareObject({start,end,cueStart,before,finite,auxiliary:perfectRole||progressiveRole,baseIdentical:r.stem===r.base});if(bare)evidence.push(bare);
  if(perfectRole||progressiveRole){
   if(obj)evidence.push({start:cueStart,end:end+obj[0].length});
   // has/had runoff and setoff can be nominal possession, and those
   // base-identical forms need an intact complete object before warning.
   if(r.stem!==r.base&&stop)evidence.push({start:cueStart,end:end+stop[0].length});
  }
  if(!evidence.some(valid))continue;
  const message='LCB page '+r.page+' lists the noun “'+r.solid+'”. This selected grammatical inflection has explicit complete verb-role evidence and retains the open verb components “'+r.preferred+'”. Derived inflections are not separately printed source entries; unfamiliar roles, nominal meanings and full dictionary authority remain manual.',rule='Hyphenation: Noun and verb forms';
  issues.push({start,end,text:doc.text.slice(start,end),suggestion:r.preferred,guideId:'lcb',guidePage:r.page,guidePrintedPage:references.lcb.pages[r.page-1].printedPage,rule,category:'Compound verb form',context:ctx.at(start),checkId:'phrasal-inflections',conflict:false,message,references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:r.page,guidePrintedPage:references.lcb.pages[r.page-1].printedPage,rule:'Derived phrasal verb inflection',preferred:r.preferred,ruleText:message}]});
 }
 return issues;
}
