import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';import {workerWords}from './helpers/spelling-worker.mjs';import {prepareOfflineLanguage,mapOfflineIssues}from '../app/offline-language.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';import {GENERAL_MODIFIER_REVIEW_RULE}from '../app/offline-rules.mjs';import {listedOpenNounModifier,QUALIFIED_NOUN_PREFIX_SCOPE}from '../app/offline-noun-sequences.mjs';
const words=await workerWords(),refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),make=pages=>makeDocument(Array.isArray(pages)?pages:[pages],'Current',[],[],words);
function candidate(plan,term='heavy vehicle',head='registrations',predicate='reviews'){
 const start=plan.text.indexOf(term),end=start+term.length,headStart=plan.text.indexOf(head,end),headEnd=headStart+head.length,p=plan.text.indexOf(predicate),parts=[...term.matchAll(/\S+/gu)].map((m,n)=>({start:start+m.index,end:start+m.index+m[0].length,text:m[0],pos:n?'NOUN':'ADJ',dep:n?'compound':'amod'}));
 return {start,end,headStart,headEnd,head,evidenceStart:0,evidenceEnd:plan.text.length,suggestion:null,engineRule:GENERAL_MODIFIER_REVIEW_RULE,reviewSuggested:true,reviewVariant:'qualified-noun-prefix',nounRoleEvidence:{components:parts.map((r,n)=>{const target=parts[n+1]||{start:headStart,end:headEnd,text:head};return {...r,headStart:target.start,headEnd:target.end,headText:target.text};}),predicate:{start:p,end:p+predicate.length,text:predicate,pos:'VERB',tag:'VBZ',finiteAuxiliaries:[]}}};
}
function review(pages,term='heavy vehicle',head='registrations'){
 const d=make(pages),plan=prepareOfflineLanguage(d),raw=candidate(plan,term,head),mapped=mapOfflineIssues(d,plan,[raw],'style'),all=jointStylisticIssues(d,refs,{engineIssues:mapped,includeReviewSuggestions:true});return {d,plan,raw,mapped,all,found:all.filter(i=>i.reviewVariant==='qualified-noun-prefix')};
}
test('an adjective-to-interior-noun question retains the full phrase and both guide exceptions without a replacement',()=>{
 for(const term of ['heavy vehicle','electric vehicle']){const r=review('The office reviews '+term+' registrations.',term),[i]=r.found;assert.equal(r.found.length,1);assert.equal(i.text,term);assert.equal(i.suggestion,null);assert.match(i.message,/interior noun/);assert.deepEqual(i.references.map(x=>x.rule),['Hyphenation, item 1','6.15','6.16']);assert.ok(i.references.every(x=>x.preferred===null));assert.equal(i.nounRoleEvidence.components[0].pos,'ADJ');assert.equal(i.nounRoleEvidence.components[0].headText,'vehicle');}
});
test('direct final-head adjectives do not establish the claimed interior qualification',()=>{
 const r=review('The office reviews heavy vehicle registrations.'),bad=structuredClone(r.raw),a=bad.nounRoleEvidence.components[0];a.headStart=bad.headStart;a.headEnd=bad.headEnd;a.headText=bad.head;assert.equal(mapOfflineIssues(r.d,r.plan,[bad],'style').length,0);
});
test('missing partial cyclic reordered and incorrect adjective-role graphs cannot establish a question',()=>{
 const r=review('The office reviews heavy vehicle registrations.'),variants=[],copy=()=>structuredClone(r.raw);let v=copy();v.nounRoleEvidence.components[0]=null;variants.push(v);v=copy();v.nounRoleEvidence.components.pop();variants.push(v);v=copy();v.nounRoleEvidence.components.reverse();variants.push(v);for(const change of [{pos:'ADV'},{dep:'advmod'},{headEnd:r.raw.end-1},{headText:'vehicles'}]){v=copy();Object.assign(v.nounRoleEvidence.components[0],change);variants.push(v);}v=copy();const [a,b]=v.nounRoleEvidence.components;Object.assign(b,{headStart:a.start,headEnd:a.end,headText:a.text});variants.push(v);for(const bad of variants)assert.equal(mapOfflineIssues(r.d,r.plan,[bad],'style').length,0);
});
test('noun-only old evidence cannot be relabelled as a qualified phrase',()=>{
 const r=review('The office reviews heavy vehicle registrations.'),v=structuredClone(r.raw);v.nounRoleEvidence.components[0].pos='NOUN';v.nounRoleEvidence.components[0].dep='compound';assert.equal(mapOfflineIssues(r.d,r.plan,[v],'style').length,0);
});
test('nonfinite predicate or missing auxiliary evidence does not establish a finite clause',()=>{
 const r=review('The office reviews heavy vehicle registrations.');for(const changes of [{pos:'NOUN'},{tag:'VBG'},{text:'review'},{start:1}]){const v=structuredClone(r.raw);Object.assign(v.nounRoleEvidence.predicate,changes);assert.equal(mapOfflineIssues(r.d,r.plan,[v],'style').length,0);}
});
test('every establishing source character is protected against strikes and unknown exclusions',()=>{
 const text='The office reviews heavy vehicle registrations.';for(const property of ['struck','excluded'])for(let at=0;at<text.length;at++){const d=make(text),plan=prepareOfflineLanguage(d),raw=candidate(plan);d[property].push({start:at,end:at+1});assert.equal(mapOfflineIssues(d,plan,[raw],'style').length,0,property+' '+at);}
});
test('quotes names lexical hyphens and partial Unicode words remain protected',()=>{
 for(const text of ['The office reviews “heavy vehicle registrations”.','The office reviews Heavy Vehicle registrations.','The office reviews super-heavy vehicle registrations.','The office reviews αheavy vehicle registrations.','The office reviews heavy vehicleα registrations.']){const term=text.includes('Heavy')?'Heavy Vehicle':'heavy vehicle';assert.equal(review(text,term).found.length,0,text);}
});
test('known complete GPO open examples and embedded LCB open entries retain their exceptions',()=>{
 for(const [term,head]of [['high school','student'],['heavy land use','policies']]){const r=review('The office reviews '+term+' '+head+'.',term,head);assert.equal(r.mapped.length,1);assert.ok(listedOpenNounModifier(r.mapped[0],refs));assert.equal(r.found.length,0);}assert.equal(review('The office reviews high school registries.','high school','registries').found.length,1,'do not extend an exact complete GPO example to an unseen head');
});
test('known guide conflicts and precise local corrections keep precedence',()=>{
 assert.equal(review('The office reviews heavy health care policies.','heavy health care','policies').found.length,0);
 const r=review('The office reviews heavy data sharing agreements.','heavy data sharing','agreements');assert.equal(r.found.length,0);assert.ok(r.all.some(i=>i.suggestion==='data-sharing'));
});
test('source page divisions preserve the complete prefix and all nested graph coordinates',()=>{
 const r=review(['The office reviews heavy vehi-','cle registrations.']),before=JSON.stringify(r.d),[i]=r.found;assert.ok(i);assert.equal(i.matchText,'heavy vehicle');assert.equal(i.text,r.d.text.slice(i.start,i.end));assert.ok(i.text.includes('vehi-'));for(const c of i.nounRoleEvidence.components){assert.equal(c.text,r.d.text.slice(c.start,c.end));assert.equal(c.headText,r.d.text.slice(c.headStart,c.headEnd));}assert.equal(JSON.stringify(r.d),before);
});
test('complete qualified graph has no component-count cap',()=>{
 const term='heavy '+Array(100).fill('vehicle').join(' '),r=review('The office reviews '+term+' registrations.',term);assert.equal(r.found.length,1);assert.equal(r.found[0].nounRoleEvidence.components.length,101);assert.equal(r.found[0].matchText,term);
});
test('reader opt-in and independent baseline flag preserve the source and mapped evidence',()=>{
 const r=review('The office reviews heavy vehicle registrations.'),before=JSON.stringify(r.mapped);assert.equal(jointStylisticIssues(r.d,refs,{engineIssues:r.mapped}).filter(i=>i.reviewVariant==='qualified-noun-prefix').length,0);assert.equal(jointStylisticIssues(r.d,refs,{engineIssues:r.mapped,includeReviewSuggestions:true,includeQualifiedNounPrefixReview:false}).filter(i=>i.reviewVariant==='qualified-noun-prefix').length,0);assert.equal(jointStylisticIssues(r.d,refs,{engineIssues:r.mapped,includeReviewSuggestions:true,includeNounSequenceReview:false}).filter(i=>i.reviewVariant==='qualified-noun-prefix').length,1);assert.equal(JSON.stringify(r.mapped),before);assert.match(QUALIFIED_NOUN_PREFIX_SCOPE,/remain incomplete/);
});
test('distinct established noun role questions survive the new interior-adjective role question',()=>{
 const r=review('The office reviews heavy vehicle inspection registrations.','heavy vehicle inspection'),old=structuredClone(r.raw);old.reviewVariant='noun-sequence';old.nounRoleEvidence.components.shift();old.start=old.nounRoleEvidence.components[0].start;const mapped=mapOfflineIssues(r.d,r.plan,[r.raw,old],'style'),all=jointStylisticIssues(r.d,refs,{engineIssues:mapped,includeReviewSuggestions:true});assert.ok(all.some(i=>i.reviewVariant==='noun-sequence'&&i.text==='vehicle inspection'));assert.ok(all.some(i=>i.reviewVariant==='qualified-noun-prefix'&&i.text==='heavy vehicle inspection'));
});
test('independent source connectors reject reproduced mistaken nominal heads without blacklisting their words',()=>{
 for(const head of ['pursuant','according','owing','due','subject']){const r=review('The office reviews ministerial approval '+head+' to specified law.','ministerial approval',head);assert.equal(r.mapped.length,0,head);}
 for(const tail of ['pursuant total policies','subject','due']){const head=tail.split(' ')[0],r=review('The office reviews heavy vehicle '+tail+'.','heavy vehicle',head);assert.equal(r.mapped.length,1,'a bare word or total is not a complete to connector: '+tail);}
});
