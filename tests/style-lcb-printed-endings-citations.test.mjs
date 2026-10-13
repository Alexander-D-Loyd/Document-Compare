import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from'../app/core.mjs';import {jointStylisticIssues}from'../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(x=>[x,JSON.parse(fs.readFileSync(new URL('../app/data/'+x+'-reference.json',import.meta.url)))]));
const check=text=>jointStylisticIssues(makeDocument([text],'Current'),refs);
const examples=['state-adopted','board-approved','state-approved','community-based','school-based','child-related','work-related'];
test('every printed page16 example retains the explicit ending provision beside any duplicate lexical entry',()=>{
 for(const form of examples){assert.ok(refs.lcb.pages[15].text.split('\n').some(x=>x.trim()===form),form);const variant=form.replaceAll('-',' '),text='The agency requires a '+variant+' program.';const i=check(text).find(x=>x.suggestion===form);assert.ok(i,text);assert.equal(text.slice(i.start,i.end),variant);assert.ok(i.references.some(x=>x.guideId==='lcb'&&x.guidePage===16),form);assert.ok(i.references.every(x=>x.sourcePassage?.text),form);assert.ok(!check(text.replace(variant,form)).some(x=>x.start<i.end&&x.end>i.start),form);}
});
test('whole multiword related modifiers citeLCB16 without losing their source-listed base or ranges',()=>{
 for(const [variant,preferred,basePage]of[['mental health related','mental-health-related',null],['family planning related','family-planning-related',null],['child care related','childcare-related',9]]){const text='The agency requires a '+variant+' program.',i=check(text).find(x=>x.suggestion===preferred);assert.ok(i,text);assert.equal(text.slice(i.start,i.end),variant);assert.ok(i.references.some(r=>r.guideId==='lcb'&&r.guidePage===16),variant);if(basePage)assert.ok(i.references.some(r=>r.guideId==='lcb'&&r.guidePage===basePage),variant);}
});
test('citation enrichment does not invent a modifier from actor verbs or source-protected wording',()=>{
 for(const text of ['The board approved programs.','The state adopted rules.','The school based its decision on the record.','The court related information to the board.'])assert.ok(!check(text).some(i=>i.references.some(r=>r.guideId==='lcb'&&r.guidePage===16)),text);
 for(const form of examples){const variant=form.replaceAll('-',' '),text='The term “'+variant+'” is defined. The agency requires a '+variant+' program.';assert.ok(!check(text).some(i=>i.suggestion===form),text);const doc=makeDocument(['The agency requires a '+variant+' program.'],'Current'),start=doc.text.indexOf(variant);doc.struck=[{start,end:start+variant.length}];assert.ok(!jointStylisticIssues(doc,refs).some(i=>i.start<start+variant.length&&i.end>start),variant);}
});
