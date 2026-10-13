import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {LCB_PREFIX_FORMS,lcbPrefixIssues} from '../app/style-lcb-prefixes.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=t=>lcbPrefixIssues(makeDocument([t],'Current'),refs);
test('legacy prefix roots are active only for complete printed forms or an explicit boundary exception',()=>{
 for(const r of LCB_PREFIX_FORMS)for(const bad of r.joinOpen===false?[r.prefix+'-'+r.root]:r.hyphen?[r.prefix+' '+r.root,r.prefix+r.root]:[r.prefix+' '+r.root,r.prefix+'-'+r.root]){
  const literal=r.preferred.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),printed=refs.lcb.pages.filter(p=>p.page>=2&&p.page<=16).some(p=>(p.lexicalEntries||[]).some(entry=>new RegExp('(?<![\\p{L}\\p{N}\\p{M}_-])'+literal+'(?![\\p{L}\\p{N}\\p{M}_-])','iu').test(entry))),exception=['ex','self','quasi'].includes(r.prefix),eligible=printed||exception;
  const text='The '+bad+' program applies.',doc=makeDocument([text],'Current'),before=JSON.stringify(doc),found=lcbPrefixIssues(doc,refs);assert.equal(found.length,eligible?1:0,bad);assert.equal(JSON.stringify(doc),before);assert.equal(check(text.replace(bad,r.preferred)).length,0);
  if(eligible){assert.equal(found[0].suggestion,r.preferred);assert.equal(text.slice(found[0].start,found[0].end),bad);assert.ok(jointStylisticIssues(makeDocument([text],'Current'),refs).some(i=>i.suggestion===r.preferred),bad);}else assert.ok(!jointStylisticIssues(doc,refs).some(i=>i.checkId==='lcb-prefixes'&&i.suggestion===r.preferred),bad);
 }
});
test('prefix exceptions and word boundaries preserve valid and literal wording',()=>{
 for(const text of ['The selfsame rule applies.','Participate in active programs.','Use the funds in eligible districts.','The proposed pre-position applies.','The re-sign instruction applies.','The re-cover instruction applies.','The co-occurrence applies.','The pre-midcourse review applies.','The non-tumor-bearing tissue applies.','The sub-subcommittee applies.','Selfhood is recognized.','An examination is required.','A bipartisan rule applies.','The term “self control” is quoted.','The term "multi-state" is quoted.','The Anti-Fraud Institute is named.','The anti-Semitism policy applies.','The anti inflammatory........100','The non-self-liquidating project applies.','The non-life-threatening injury applies.','The non-revenue-producing activity applies.','The non-public-private structure applies.','The ex officio member applies.','The anti-infective drug applies.'])assert.equal(check(text).length,0,text);
 const doc=makeDocument(['The non-payment is shown.'],'Current');doc.struck=[{start:4,end:15}];assert.equal(lcbPrefixIssues(doc,refs).length,0);
});
test('source line divisions are preserved and open prefix wraps retain original spans',()=>{
 assert.equal(check('The non-\nline 2 payment applies.').length,0);
 const doc=makeDocument(['line 1 The self\nline 2 directed program applies.'],'Current'),i=lcbPrefixIssues(doc,refs)[0];assert.equal(i.suggestion,'self-directed');assert.equal(doc.text.slice(i.start,i.end),'self\nline 2 directed');
});
