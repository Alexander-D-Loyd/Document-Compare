import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {lcbPrefixIssues,LCB_PREFIX_FORMS} from '../app/style-lcb-prefixes.mjs';
import {lcbSpellingIssues,LCB_SPELLING_VARIANTS} from '../app/style-lcb-spellings.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const prefix=doc=>lcbPrefixIssues(typeof doc==='string'?makeDocument([doc],'Current'):doc,refs);
const spelling=doc=>lcbSpellingIssues(typeof doc==='string'?makeDocument([doc],'Current'):doc,refs);
const knownPrefixForms=LCB_PREFIX_FORMS.map(r=>r.prefix+(r.hyphen?' ':'-')+r.root);
const family=doc=>jointStylisticIssues(doc,refs).filter(i=>['lcb-prefixes','lcb-spellings'].includes(i.checkId));

test('finite LCB prefix tokens reject Unicode letters and combining marks at either source edge',()=>{
 for(const form of knownPrefixForms)for(const extra of ['é','\u0301'])for(const body of [extra+form,form+extra])assert.equal(prefix('The '+body+' applies.').length,0,body);
 for(const form of ['non-negotiable','anti individual','antiEnglish','multi-member'])for(const extra of ['é','\u0301'])for(const body of [extra+form,form+extra])assert.equal(prefix('The '+body+' applies.').length,0,body);
});
test('finite close spelling variants reject Unicode suffixes and prefixes without trimming the source word',()=>{
 for(const row of LCB_SPELLING_VARIANTS)for(const extra of ['é','\u0301'])for(const body of [extra+row.variant,row.variant+extra])assert.equal(spelling('The '+body+' is shown.').length,0,body);
});
test('masked source suffixes and prefixes cannot manufacture prefix or spelling tokens',()=>{
 for(const [check,form]of [[prefix,'non-negotiable'],[prefix,'anti individual'],[prefix,'antiEnglish'],[spelling,'cemetary'],[spelling,'payor']])for(const edge of ['left','right'])for(const kind of ['struck','excluded']){
  const value=edge==='left'?'x'+form:form+'x',text='The '+value+' applies.',doc=makeDocument([text],'Current'),start=4+(edge==='left'?0:form.length);
  doc[kind]=[...(doc[kind]||[]),{start,end:start+1}];assert.equal(check(doc).length,0,JSON.stringify({form,edge,kind}));
 }
});
test('masked source characters between prefix and root do not establish an open compound',()=>{
 for(const form of ['non x negotiable','self x control','anti x individual'])for(const kind of ['struck','excluded']){
  const text='The '+form+' applies.',doc=makeDocument([text],'Current'),start=text.indexOf('x');doc[kind]=[...(doc[kind]||[]),{start,end:start+1}];assert.equal(prefix(doc).length,0,form+' '+kind);
 }
});
test('complete spelling sense evidence cannot be supplied by struck or unknown excluded words',()=>{
 for(const text of ['The public x busses are inspected.','Use calender x days.','The descendent of the x decedent is eligible.'])for(const kind of ['struck','excluded']){
  const doc=makeDocument([text],'Current'),start=text.indexOf(' x ')+1;doc[kind]=[...(doc[kind]||[]),{start,end:start+1}];assert.equal(spelling(doc).length,0,text+' '+kind);
 }
});
test('wrapped source quotations protect prefix and close spelling detectors independently',()=>{
 for(const [check,form]of [[prefix,'non-negotiable'],[prefix,'antiEnglish'],[spelling,'cemetary'],[spelling,'wilfully']])assert.equal(check('The term "a clause\n'+form+' applies" is literal.').length,0,form);
});
test('joint LCB review preserves damaged-token protection at complete source offsets',()=>{
 for(const form of ['non-negotiable','antiEnglish','cemetary']){
  const text='The '+form+'x applies.',doc=makeDocument([text],'Current');doc.struck=[{start:4+form.length,end:5+form.length}];assert.equal(family(doc).length,0,form);
 }
});
test('intact noun and prefix source spans remain active across recognized margins and page heads',()=>{
 const doc=makeDocument(['ASSEMBLY BILL No. 577\nline 1 The people of the State of California do enact as follows:\nline 2 The non\n94','AB 577 — 2 —\nline 1 negotiable program applies.\nline 2 The cemetary is shown.'],'Current'),before=JSON.stringify(doc),issues=family(doc);
 assert.ok(issues.some(i=>i.suggestion==='nonnegotiable'));assert.ok(issues.some(i=>i.suggestion==='cemetery'));for(const i of issues)assert.equal(doc.text.slice(i.start,i.end),i.text);assert.equal(JSON.stringify(doc),before);
});
test('LCB explicitly listed willfully has complete adverb variant coverage',()=>{
 assert.ok(refs.lcb.pages[4].text.split('\n').some(line=>line.trim()==='willfully'));
 for(const variant of ['wilfully','willfuly']){
  const text='The officer '+variant+' fails to comply.',doc=makeDocument([text],'Current'),before=JSON.stringify(doc),i=spelling(doc).find(i=>i.suggestion==='willfully');assert.ok(i,variant);assert.equal(doc.text.slice(i.start,i.end),variant);assert.equal(spelling(text.replace(variant,'willfully')).length,0);assert.equal(JSON.stringify(doc),before);
  assert.ok(jointStylisticIssues(doc,refs).some(i=>i.suggestion==='willfully'));
 }
 for(const text of ['The officer wilfullyé fails.','The term “wilfully” is literal.','Wilfully Foundation is named.'])assert.equal(spelling(text).length,0,text);
});
