import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {OFFLINE_MODIFIERS}from '../app/offline-rules.mjs';import {validateListedModifierWitness}from '../app/offline-style.mjs';import {makeDocument}from '../app/core.mjs';import {prepareOfflineLanguage}from '../app/offline-language.mjs';import {listedModifierWitness}from './helpers/listed-modifier-witness.mjs';
const clone=v=>JSON.parse(JSON.stringify(v));
function candidate(text='The agency requires data processing systems.'){
 const doc=makeDocument([text],'Current'),plan=prepareOfflineLanguage(doc),start=plan.text.indexOf('data processing'),end=start+15,headStart=plan.text.indexOf('systems',end),issue={start,end,headStart,headEnd:headStart+7,head:'systems',evidenceStart:0,evidenceEnd:plan.text.length,engine:'spaCy',engineRule:'LCB_DATA_PROCESSING_MODIFIER',suggestion:'data-processing',reviewSuggested:false,attachmentMethod:'direct'};issue.modifierRoleEvidence=listedModifierWitness(plan,issue);return {doc,plan,issue};
}
test('production modifier catalogue contains exactly75 printed LCB unit-modifier entries',()=>{
 const lcb=JSON.parse(fs.readFileSync(new URL('../app/data/lcb-reference.json',import.meta.url)));assert.equal(OFFLINE_MODIFIERS.length,75);assert.ok(!OFFLINE_MODIFIERS.some(r=>r.engineRule==='LCB_DATA_SHARING_MODIFIER'));
 for(const r of OFFLINE_MODIFIERS)assert.ok(lcb.pages[r.page-1].lexicalEntries.some(entry=>entry.split('(')[0].trim()===r.preferred&&/u\.m\./u.test(entry)),r.preferred);
 const config=JSON.parse(fs.readFileSync(new URL('../engines/language-config.json',import.meta.url)));assert.deepEqual(config.lcbModifiers,OFFLINE_MODIFIERS.map(({engineRule,phrase,preferred})=>({engineRule,phrase,preferred})));
});
test('complete direct listed role evidence is checked without changing the source',()=>{
 const {doc,plan,issue}=candidate(),before=JSON.stringify(doc),proof=validateListedModifierWitness(plan,issue);assert.ok(proof);assert.equal(proof.head.text,'systems');assert.equal(proof.components.map(r=>r.text).join(' '),'data processing');assert.equal(JSON.stringify(doc),before);proof.components[0].text='changed';assert.equal(issue.modifierRoleEvidence.components[0].text,'data');
});
test('unsupported engine families fallback methods and missing proof fail closed',()=>{
 const {plan,issue}=candidate();for(const change of [{engineRule:'LCB_DATA_SHARING_MODIFIER'},{engineRule:'LCB_GENERAL_UNIT_MODIFIER_REVIEW'},{engineRule:'LCB_PARSED_PREDICATE_COMPOUND_REVIEW'},{engineRule:'LCB_POSTNOMINAL_COMPOUND_REVIEW'},{engine:'LanguageTool'},{reviewSuggested:true},{attachmentMethod:'noun-adjacent-review'},{attachmentMethod:'local-quote-review'},{suggestion:'data processing'},{modifierRoleEvidence:null}])assert.equal(validateListedModifierWitness(plan,{...clone(issue),...change}),null,JSON.stringify(change));
});
test('detached cyclic subject verb and partial-head witnesses cannot authorize modifiers',()=>{
 const {plan,issue}=candidate();for(const mutate of [i=>i.modifierRoleEvidence.components[0].text='other',i=>i.modifierRoleEvidence.components[0].headStart++,i=>{const r=i.modifierRoleEvidence.components[0];r.headStart=r.start;r.headEnd=r.end;r.headText=r.text;},i=>i.modifierRoleEvidence.components[0].dep='nsubj',i=>{const r=i.modifierRoleEvidence.components[1];r.pos='VERB';r.tag='VBD';r.dep='ROOT';},i=>i.modifierRoleEvidence.head.dep='compound',i=>i.modifierRoleEvidence.predicate.tag='VBN',i=>i.modifierRoleEvidence.predicate.dep='xcomp',i=>i.modifierRoleEvidence.predicate.end++,i=>i.modifierRoleEvidence.components.pop()]){const raw=clone(issue);mutate(raw);assert.equal(validateListedModifierWitness(plan,raw),null);}
 const altered={...plan,text:plan.text.replace('systems','systemsé')};assert.equal(validateListedModifierWitness(altered,issue),null);
});
test('listed evidence maps over physical lines pages margins and astral source characters',()=>{
 const {doc,plan,issue}=candidate('line 1 The agency requires 😀 data\nline 2 processing\nline 3 systems.'),proof=validateListedModifierWitness(plan,issue);assert.ok(proof);const selected=plan.range(issue.start,issue.end);assert.equal(doc.text.slice(selected.start,selected.end),'data\nline 2 processing');
 const d=makeDocument(['line 1 The agency requires data','line 1 processing systems.'],'Current'),p=prepareOfflineLanguage(d),raw={...issue,start:p.text.indexOf('data processing'),headStart:p.text.indexOf('systems'),evidenceEnd:p.text.length};raw.end=raw.start+15;raw.headEnd=raw.headStart+7;raw.modifierRoleEvidence=listedModifierWitness(p,raw);assert.ok(validateListedModifierWitness(p,raw));const r=p.range(raw.start,raw.end);assert.match(d.text.slice(r.start,r.end),/data\nline 1 processing/u);
});
