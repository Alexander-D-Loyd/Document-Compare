import {styleContext} from './style-context.mjs';
import {predicateRangeKey} from './style-predicate-evidence.mjs';
import {guardedPredicateCompoundEvidence} from './style-predicate-source-evidence.mjs';
import {styleEvidenceGuard,originalBodyStyleContext} from './style-evidence.mjs';
import {originalStyleLiteralGuard} from './style-original-literal-guard.mjs';
import {compoundSourceBoundaryBlocked} from './style-compound-source-boundaries.mjs';
import {listedPredicateCandidates,predicateBodyDash} from './style-predicate-examples.mjs';
import {productiveEndWordCandidates} from './style-end-word-predicates.mjs';
// Use explicit source examples and noun positions. A bare adjective phrase
// cannot establish which word it modifies or whether it is a literal name.
const forms=[{open:'crystal clear',closed:'crystal-clear',noun:'water'},{open:'fire tested',closed:'fire-tested',noun:'materials?'}];
export function modifierPositionIssues(doc,references){
 const ctx=styleContext(doc),source=ctx.source,issues=[],blocked=styleEvidenceGuard(doc,ctx),originalContext=originalBodyStyleContext(doc)||ctx,original=originalContext.source,literal=originalStyleLiteralGuard(doc,ctx);
 const eligible=(start,end)=>!blocked(start,end)&&!originalContext.literalAt(start,end)&&!literal(start,end)&&!compoundSourceBoundaryBlocked(doc.text,source,original,start,end);
 const listed=listedPredicateCandidates(source,doc.text),matches=guardedPredicateCompoundEvidence(doc,[...listed.map(p=>p.m),...productiveEndWordCandidates(source).filter(m=>!predicateBodyDash(doc.text,source,m))],ctx);
 const add=(m,suggestion,predicate,evidence)=>{
  const start=m.index,end=start+m[0].length,after=source.slice(end);
  if(!eligible(start,end)||!eligible(evidence.start,evidence.end)||ctx.at(start)==='Heading'||m[0]===m[0].toUpperCase())return;
  if(/^[A-Z]/.test(m[0])&&(/^\s+[A-Z][a-z]/.test(after)||/\b[A-Z][a-z]+\s+[A-Z][a-z]+/.test(m[0])))return;
  if(/^[A-Z]/.test(m[0]))suggestion=suggestion[0].toUpperCase()+suggestion.slice(1);
  const message=predicate?'This adjective follows the explicit noun it modifies; LCB item 2 and GPO 7.7 leave the source example open in predicate position.':'This two-word adjective immediately precedes its explicit source noun; LCB item 1 and GPO 7.7 hyphenate the source example in unit-modifier position.';
  const rule='Hyphenation, item '+(predicate?2:1);
  issues.push({start,end,text:doc.text.slice(start,end),suggestion,evidenceStart:evidence.start,evidenceEnd:evidence.end,...(predicate?{predicateContextEvidence:{kind:'copula-and-closing-role',start:evidence.start,end:evidence.end,sourceText:doc.text.slice(evidence.start,evidence.end)}}:{}),guideId:'lcb',guidePage:8,guidePrintedPage:references.lcb.pages[7].printedPage,rule,category:'Modifier position',context:ctx.at(start),checkId:'modifier-positions',conflict:false,message,references:[{guideId:'lcb',guideName:'LCB Style Manual',guidePage:8,guidePrintedPage:references.lcb.pages[7].printedPage,rule,preferred:suggestion,ruleText:message},{guideId:'gpo',guideName:'GPO Style Manual',guidePage:125,guidePrintedPage:references.gpo.pages[124].printedPage,rule:'7.7',preferred:suggestion,ruleText:'GPO 7.7 contrasts crystal-clear water with water is crystal clear, and fire-tested material with material is fire tested.'}]});
 };
 for(const form of forms){
  // Consume the exact source-listed noun, while selecting only the modifier.
  // A lookahead alone cannot establish water inside water-code/watermarked.
  for(const full of source.matchAll(new RegExp('\\b('+form.open.replace(' ','\\s+')+')\\s+'+form.noun+'\\b','gi'))){
   const m=Object.assign([full[1]],{index:full.index});
   add(m,form.closed,false,{start:full.index,end:full.index+full[0].length});
  }
  for(const {m} of listed.filter(p=>p.form===form.closed)){
   const proof=matches.get(predicateRangeKey(m));if(proof===undefined)continue;
   const {anchor}=proof,beforeStart=Math.max(0,anchor-200),before=source.slice(beforeStart,anchor);
   const noun=new RegExp('\\b'+form.noun+'\\s+(?:(?:shall|must|may|will|would|should|could)\\s+)?(?:is|are|was|were|be|remains?|remained|becomes?|became)\\s+(?:(?:not|never|still|already|also|very|highly|more|less|sufficiently|particularly|reasonably|equally|fully)\\s+)*$','i').exec(before);
   if(noun)add(m,form.open,true,{start:beforeStart+noun.index,end:proof.end});
  }
 }
 return issues.sort((a,b)=>a.start-b.start);
}
