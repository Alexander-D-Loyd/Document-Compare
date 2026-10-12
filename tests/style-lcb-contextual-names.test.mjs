import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {LCB_DEMOGRAPHIC_NAMES,contextualNameIssues} from '../app/style-lcb-contextual-names.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=t=>contextualNameIssues(makeDocument([t],'Current'),refs);
test('common disease and people nouns need explicit cues rather than guessing names or political senses',()=>{
 for(const [bad,wanted] of [['The type I Diabetes is treated.','diabetes'],['The Diabetes type II is treated.','diabetes'],['The three People are eligible.','people']]){const i=check(bad)[0];assert.equal(i.suggestion,wanted,bad);assert.equal(check(bad.replace(i.text,wanted)).length,0);assert.ok(jointStylisticIssues(makeDocument([bad],'Current'),refs).some(x=>x.suggestion===wanted));}
 for(const t of ['The People of the State of California are named.','The People shall act.','The Type I Diabetes Research Foundation is named.','The term “type I Diabetes” is literal.','The Diabetes Foundation is named.','The diabetes type II is treated.','The three people are eligible.'])assert.equal(check(t).length,0,t);
});
test('LCB demographic capitals require a recognized people head and agree with GPO examples',()=>{
 const rows=styleRuleInventory(refs);
 for(const r of LCB_DEMOGRAPHIC_NAMES){
  assert.ok(refs.lcb.pages[r.page-1].text.includes(r.preferred),r.preferred);assert.ok(refs.gpo.pages[r.gpoPage-1].text.includes(r.preferred),r.preferred);
  for(const head of ['people','persons','residents','students','workers','applicants','voters','children','adults','patients','communities','households','families']){
   const bad='The '+r.preferred.toLowerCase()+' '+head+' are eligible.',i=check(bad)[0];assert.equal(i.suggestion,r.preferred);assert.equal(bad.slice(i.start,i.end),r.preferred.toLowerCase());assert.equal(check(bad.replace(r.preferred.toLowerCase(),r.preferred)).length,0);assert.ok(jointStylisticIssues(makeDocument([bad],'Current'),refs).some(x=>x.suggestion===r.preferred),bad);
  }
  assert.ok(rows.some(x=>x.page===r.page&&x.text.startsWith(r.preferred)&&x.status==='Partially automated'),r.preferred);
 }
});
test('Spanish capital requires an explicit language role rather than a guessed referent',()=>{
 for(const head of ['language','speakers','translation','translations','interpreters']){const bad='Use the spanish '+head+'.';assert.equal(check(bad)[0].suggestion,'Spanish');assert.equal(check(bad.replace('spanish','Spanish')).length,0);}
});
test('complete limited and non-English-speaking variants produce one whole modifier finding',()=>{
 for(const bad of ['limited and non-English-speaking','limited- and non-English speaking','limited and non english speaking','limited- and non-english-speaking','limited and non English-speaking']){
  const text='The '+bad+' applicants are eligible.',doc=makeDocument([text],'Current'),i=check(text)[0];assert.equal(i.suggestion,'limited- and non-English-speaking');assert.equal(text.slice(i.start,i.end),bad);
  const joint=jointStylisticIssues(doc,refs).filter(x=>x.start<i.end&&x.end>i.start);assert.equal(joint.length,1);assert.equal(joint[0].suggestion,i.suggestion);
 }
 assert.equal(check('The limited- and non-English-speaking applicants are eligible.').length,0);
});
test('colors, unrelated senses, names, predicates, quotes, headings and tables remain protected',()=>{
 for(const text of ['Use black ink and white paper.','The white light is measured.','The black box contains records.','The White House is named.','The Black Students Association is named.','The asian market contains supplies.','The spanish material is stored.','The households are limited and non English speaking.','The term “black students” is literal.','The term "spanish language" is literal.','The term “limited and non english speaking applicants” is literal.','BLACK STUDENTS','black students........100','limited and non-English-speaking\nLEGISLATIVE COUNSEL’S DIGEST\nAn act.'])assert.equal(check(text).length,0,text);
 const doc=makeDocument(['The black students are eligible.'],'Current');doc.struck=[{start:4,end:9}];assert.equal(contextualNameIssues(doc,refs).length,0);
});
test('contextual capitals and shared English modifier retain printed-margin offsets',()=>{
 const doc=makeDocument(['line 1 The limited and non English\nline 2 speaking households are eligible.'],'Current'),i=contextualNameIssues(doc,refs)[0];assert.equal(i.suggestion,'limited- and non-English-speaking');assert.equal(doc.text.slice(i.start,i.end),i.text);assert.ok(i.text.includes('line 2'));
 assert.equal(check('The limited- and non-English-\nspeaking households are eligible.').length,0);
});
