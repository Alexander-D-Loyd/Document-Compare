import {mapCountRelationSource,validMappedCountRelation}from './style-parsed-number-relations.mjs';
import {METRIC_UNITS,LCB_LISTED_UNIT_DEFINITIONS}from './metric-units.mjs';
export const COORDINATED_NUMBER_RELATION_RULE='LCB_COORDINATED_NUMBER_RELATION_REVIEW';
export const COORDINATED_NUMBER_RELATION_SCOPE='Conditional offline LCB Bill item 3 review of small written counts and counts of 10 or more attached to different common-noun lemmas in the same nominal coordination. Both direct count attachments, complete common-noun paths to one anchor and source conjunction/comma witnesses are retained and independently checked without a path-length cap. Complete written quantities and exact large source integers retain the shared numerical-expression guards. Known time, measurement, money, percentage, degree and grade heads are protected, as are unequal explicit per-unit rates, references, names, sentence openings, headings, digest conflicts, tables, quotations, strikes and unknown exclusions. Existing precise, same-lemma and repeated-phrase checks retain ownership. The reader confirms quantity meaning; differing noun categories may represent different numerical expressions and no replacement is asserted. Unsupported or mistaken parser attachments, implicit coordination, non-noun counts, unfamiliar units, complex rates and chunk boundaries remain incomplete. This expands a checking method, not semantic certainty or measured office recall.';
const noun=/^\p{Ll}[\p{Ll}\p{M}]*$/u;
// Published unit spellings and the existing numeral categories are protections,
// not an invented semantic classifier for arbitrary noun categories.
const unitLemmas=new Set(['day','week','month','year','hour','minute','second','millisecond','microsecond','nanosecond','decade','century','foot','feet','inch','mile','metre','pound','gallon','acre','hectare','ounce','ton','tonne','yard','dollar','cent','mill','percent','percentage','degree','grade',...METRIC_UNITS.map(r=>r.name),...LCB_LISTED_UNIT_DEFINITIONS.map(r=>r.name)]);
export const protectedCountUnit=lemma=>unitLemmas.has(lemma);
const keys=['start','end','text','pos','tag','dep','lemma','headStart','headEnd','headText'];
const same=(a,b)=>a&&b&&keys.every(k=>a[k]===b[k]);
function validProof(proof,text,start,end,members){
 const counts=proof?.counts,paths=proof?.paths,markers=proof?.markers;
 if(!Array.isArray(counts)||counts.length!==2||!Array.isArray(paths)||paths.length!==2||!Array.isArray(markers)||markers.length!==2||!Array.isArray(members)||members.length!==2)return false;
 const valid=r=>r&&[r.start,r.end,r.headStart,r.headEnd].every(Number.isInteger)&&r.start>=start&&r.end<=end&&r.start<r.end&&r.headStart>=start&&r.headEnd<=end&&r.headStart<r.headEnd&&text.slice(r.start,r.end)===r.text&&text.slice(r.headStart,r.headEnd)===r.headText;
 if(!paths.every(p=>Array.isArray(p)&&p.length&&p.every(r=>valid(r)&&r.pos==='NOUN'&&noun.test(r.text)&&noun.test(r.lemma))&&new Set(p.map(r=>r.start)).size===p.length)||!same(paths[0].at(-1),paths[1].at(-1))||paths.every(p=>p.length===1))return false;
 const nodes=new Map();
 for(const path of paths)for(const r of path){if(nodes.has(r.start)&&!same(nodes.get(r.start),r))return false;nodes.set(r.start,r);}
 for(let k=0;k<2;k++){
  const c=counts[k],p=paths[k],m=members[k],cue=markers[k],head=p[0];
  if(!m||!valid(c)||c.pos!=='NUM'||c.dep!=='nummod'||c.start<m.start||c.end>m.end||c.headStart!==head.start||c.headEnd!==head.end||c.headText!==head.text||head.start!==m.headStart||head.end!==m.headEnd||head.text!==m.head||head.lemma!==m.lemma||!Array.isArray(cue)||cue.length!==p.length-1)return false;
  for(let n=0;n<p.length-1;n++){
   const child=p[n],parent=p[n+1],r=cue[n];
   if(child.dep!=='conj'||child.headStart!==parent.start||child.headEnd!==parent.end||child.headText!==parent.text||parent.end>child.start||!valid(r)||r.start<parent.end||r.end>child.start||r.headStart!==parent.start||r.headEnd!==parent.end||r.headText!==parent.text||!(r.pos==='CCONJ'&&r.dep==='cc'&&/^(?:and|or|nor)$/u.test(r.text)||r.pos==='PUNCT'&&r.dep==='punct'&&r.text===','))return false;
  }
 }
 return members[0].lemma!==members[1].lemma&&!members.some(m=>unitLemmas.has(m.lemma));
}
export function mapCoordinatedNumberRelation(doc,plan,issue,selected,evidence){
 if(issue.engineRule!==COORDINATED_NUMBER_RELATION_RULE)return null;
 const members=[{start:issue.start,end:issue.end,headStart:issue.headStart,headEnd:issue.headEnd,head:issue.head,lemma:issue.headLemma},{start:issue.peerStart,end:issue.peerEnd,headStart:issue.peerHeadStart,headEnd:issue.peerHeadEnd,head:issue.peerHead,lemma:issue.peerHeadLemma}];
 if(!validProof(issue.coordinationEvidence,plan.text,issue.evidenceStart,issue.evidenceEnd,members))return null;
 const candidate=mapCountRelationSource(doc,plan,issue,selected,evidence,{requireSameLemma:false});if(!candidate)return null;
 const map=r=>{const range=plan.range(r.start,r.end),head=plan.range(r.headStart,r.headEnd);return range&&head?{...r,...range,text:doc.text.slice(range.start,range.end),parsedText:r.text,headStart:head.start,headEnd:head.end,headText:doc.text.slice(head.start,head.end),parsedHead:r.headText}:null;};
 const p=issue.coordinationEvidence,proof={counts:p.counts.map(map),paths:p.paths.map(rows=>rows.map(map)),markers:p.markers.map(rows=>rows.map(map))};
 if([...proof.counts,...proof.paths.flat(),...proof.markers.flat()].some(r=>!r))return null;
 return {...candidate,reviewKind:'coordinated-numerical-relationship',coordinationEvidence:proof};
}
export function restoreCountCoordinationEvidence(proof,map,text){
 if(!proof||!Array.isArray(proof.counts)||!Array.isArray(proof.paths)||!Array.isArray(proof.markers)||![...proof.paths,...proof.markers].every(Array.isArray)||![...proof.counts,...proof.paths.flat(),...proof.markers.flat()].every(r=>r&&[r.start,r.end,r.headStart,r.headEnd].every(Number.isInteger)))return null;
 const restore=r=>{const start=map(r.start),end=map(r.end,true),headStart=map(r.headStart),headEnd=map(r.headEnd,true);return {...r,start,end,text:text.slice(start,end),headStart,headEnd,headText:text.slice(headStart,headEnd)};};
 return {...proof,counts:proof.counts.map(restore),paths:proof.paths.map(rows=>rows.map(restore)),markers:proof.markers.map(rows=>rows.map(restore))};
}
export function coordinatedNumberRelationReviewIssues(candidates,doc,references,{existingIssues=[]}={}){
 const out=[];
 for(const i of candidates){
  if(i.engineRule!==COORDINATED_NUMBER_RELATION_RULE||i.reviewSuggested!==true||i.suggestion!==null||!validMappedCountRelation(i,doc,{requireSameLemma:false,reviewKind:'coordinated-numerical-relationship'})||!validProof(i.coordinationEvidence,doc.text,i.evidenceStart,i.evidenceEnd,i.relationshipEvidence.members)||[...existingIssues,...out].some(r=>r.start<i.end&&r.end>i.start))continue;
  const heads=i.relationshipEvidence.members.map(m=>m.head);
  out.push({...i,guideId:'lcb',guidePage:21,guidePrintedPage:String(references.lcb.pages[20].printedPage),rule:'Numerals: Bill, item 3',category:'Numerical Relationship Review',context:'Bill',confidence:'Review Suggested',conflict:false,matchesPrimary:false,checkId:'lcb-coordinated-number-relation-review',message:'Review Suggested: The offline parser coordinates counts of “'+heads.join('” and “')+'” in this sentence, and one count is 10 or more. Confirm whether they form the same numerical expression. If related, use “'+i.conditionalSuggestion+'” here; different quantity classes retain their own treatment. Coordination does not prove meaning and no replacement is asserted.',references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:21,guidePrintedPage:String(references.lcb.pages[20].printedPage),rule:'Numerals: Bill, item 3',preferred:null,ruleText:'LCB uses figures for related numbers in a sentence when one is 10 or larger; different numerical expressions retain separate treatment.'},{guideId:'gpo',guideName:'GPO Style Manual',guidePage:287,guidePrintedPage:String(references.gpo.pages[286].printedPage),rule:'12.5 / 12.6',preferred:null,ruleText:'GPO applies figure treatment to related counts in the same sentence. Measurement, time and money do not force figure treatment of other numerical expressions.'}]});
 }
 return out;
}
