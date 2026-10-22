import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {makeDocument} from '../app/core.mjs';
import {lcbSourceReviewRows,lcbSourceReviewIssues,isUnconditionalLcbSourceForm} from '../app/style-lcb-source-review.mjs';
import {reviewStyleIssues} from '../app/style-review.mjs';
import {lcbSourceItems} from '../app/style-lcb-source-sections.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const references=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(path.join(root,'app/data/'+id+'-reference.json')))]));
const hash=text=>crypto.createHash('sha256').update(text).digest('hex');
const rows=lcbSourceReviewRows(references.lcb),results=[];
const alternatives=form=>/-\s+or\s+/u.test(form)?[form]:form.split(/\s+or\s+/u);
const listedForms=new Set(rows.flatMap(r=>alternatives(r.form)));

for(const row of rows){
 const form=row.form.replace(/^"|"$/gu,''),candidates=[];
 const directlyObservable=isUnconditionalLcbSourceForm(row)||/^(?:Section|Schedule) \(with number\)$/u.test(row.text);
 if(row.prefix){} // An unseen prefix/root is not a complete listed mismatch.
 else if(!directlyObservable){} // This generic carrier supplies no required meaning, office identity or modifier-role evidence.
 else {
  if(/[ -]/u.test(form))candidates.push(form.replace(/[ -]+/gu,form.includes('-')?' ':'-'));
  if(/[A-Z]/u.test(form)&&!row.text.includes('(with number)'))candidates.push(form.toLowerCase());
  if(row.text.includes('(with number)'))candidates.push(form.toLowerCase()+' 12');
  if(row.qualified&&row.page>=18&&!/[A-Z]/u.test(form))candidates.push(form[0].toUpperCase()+form.slice(1));
  if(row.variant)candidates.push(row.variant);
 }
 const probes=[];
 for(const term of [...new Set(candidates)].filter(term=>!listedForms.has(term))){
  const text='The staff study '+term+' carefully.',doc=makeDocument([text],'Current'),start=text.indexOf(term),end=start+term.length;
  let issues=lcbSourceReviewIssues(doc,references);
  const owns=i=>i.start<end&&i.end>start&&i.references?.some(r=>r.guideId==='lcb'&&r.guidePage===row.page&&(r.rule===row.text||r.ruleText===row.text||r.rule.endsWith(': '+row.text)));
  let matched=issues.filter(owns),route='source reader';
  if(!matched.length){issues=reviewStyleIssues(doc,references,{includeReviewSuggestions:true,includeCompleteLcbReview:true});matched=issues.filter(owns);route='integrated exact source';}
  const quoted=makeDocument(['The staff quote “'+term+'” carefully.'],'Current'),at=quoted.text.indexOf(term);
  const quoteOwned=lcbSourceReviewIssues(quoted,references).some(i=>i.start<at+term.length&&i.end>at&&i.sourceEntryIds?.includes(row.id));
  probes.push({term,start,end,detected:matched.length>0,route:matched.length?route:null,checks:matched.map(i=>i.checkId),literalProtected:!quoteOwned});
 }
 // Solid, unqualified words have no licensed arbitrary misspelling generator.
 // They must not be mislabeled as missed variants or as full spelling coverage.
 results.push({id:row.id,page:row.page,source:row.text,sourceSha256:hash(row.text),status:probes.some(p=>p.detected)?'Target source finding verified':probes.length?'Unresolved target probe':'No source-derived variant',...(!directlyObservable&&!row.prefix?{noProbeReason:'The generic carrier does not establish this row’s required grammatical role, meaning or identity; no actionable mismatch is asserted.'}:{}),probes});
}
const provisions=references.lcb.pages.flatMap(p=>lcbSourceItems(p).map(item=>({id:`lcb-${p.page}-${item.section||'general'}-${item.number||'paragraph'}`,page:p.page,section:item.section,number:item.number,text:item.text,sourceSha256:hash(item.text)})));
const receipt={schema:'document-compare.lcb-target-audit.v1',date:new Date().toISOString(),wholeRuleCertification:false,method:'A target must overlap the selected source form and cite its exact source row and page. A finding elsewhere in the sentence does not count. Matching listed alternatives are not required to generate findings; unlisted prefix roots and qualified rows without the required role, meaning or identity in the generic carrier are not actionable mismatch probes. Dedicated contextual tests retain their separate scope. Finite generated probes do not establish arbitrary spelling, semantics or all grammatical contexts.',pages:references.lcb.pages.map(p=>({page:p.page,sha256:hash(p.text)})),counts:{sourceRows:results.length,verifiedTargetRows:results.filter(r=>r.status==='Target source finding verified').length,unresolvedTargetRows:results.filter(r=>r.status==='Unresolved target probe').length,noSourceDerivedVariant:results.filter(r=>r.status==='No source-derived variant').length,numberedProvisions:provisions.length},provisions,results};
const destination=path.resolve(root,process.argv[2]||'qa-output/lcb-full/target-audit.json');fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({destination,counts:receipt.counts,unresolved:results.filter(r=>r.status==='Unresolved target probe').map(r=>({id:r.id,source:r.source,probes:r.probes.map(p=>p.term)})),literalFailures:results.filter(r=>r.probes.some(p=>!p.literalProtected)).map(r=>r.id)},null,2));
