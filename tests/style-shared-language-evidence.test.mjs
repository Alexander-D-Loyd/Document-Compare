import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {contextualNameIssues} from '../app/style-lcb-contextual-names.mjs';
import {CHECK_COVERAGE} from '../app/style-coverage.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),make=t=>makeDocument(Array.isArray(t)?t:[t],'Current'),target=d=>contextualNameIssues(d,refs).filter(i=>i.rule==='Hyphenation examples: limited- and non-English-speaking');
test('shared language scope records complete original evidence and unclassified meanings',()=>{
 const row=CHECK_COVERAGE.find(r=>r.title==='Complete shared English-language evidence');assert.match(row.text,/adjacent characters are hidden/);assert.match(row.text,/broader language meaning remain manual/);const item=styleRuleInventory(refs).find(r=>r.guide==='lcb'&&r.text==='limited- and non-English-speaking (u.m.)');assert.equal(item.status,'Partially automated');assert.match(item.scope,/masked adjacent characters/);
});
test('shared English-language corrections require complete original expression and people nouns',()=>{
 for(const suffix of ['α','\u0301','2','_'])for(const head of ['persons','households','applicants']){
  const t='The limited and non-English speaking '+head+suffix+' are eligible.';assert.equal(target(make(t)).length,0,t);
 }
 for(const t of ['The αlimited and non-English speaking persons are eligible.','The limited and non-English speaking persons are eligible.']){
  const d=make(t);if(!t.includes('α')){const at=d.text.indexOf(' persons');d.struck=[{start:at,end:at+1}];}assert.equal(target(d).length,0,t);
 }
});
test('unknown hidden content and a supporting noun in later tabular text cannot justify a language correction',()=>{
 const d=make('The limited and non English speaking unknown households are eligible.'),start=d.text.indexOf('unknown');d.excluded.push({start,end:start+7});assert.equal(target(d).length,0);
 for(const t of ['The limited and non English speaking\nhouseholds........100','The title "limited and non English\nspeaking households" is literal.'])assert.equal(target(make(t)).length,0,t);
});
test('masking adjacent letters cannot manufacture original language-expression boundaries',()=>{
 for(const [text,needle]of [['The αlimited and non-English speaking households are eligible.','α'],['The limited and non-English speaking householdsα are eligible.','α'],['The limited and non-English speaking households\u0301 are eligible.','\u0301']]){
  const d=make(text),start=d.text.indexOf(needle);d.excluded.push({start,end:start+needle.length});assert.equal(target(d).length,0,text);
 }
});
test('correct printed compound division does not hide a missing suspended hyphen',()=>{
 for(const text of ['The limited and non-English-\nspeaking households are eligible.','The limited- and non-english-\nspeaking households are eligible.']){
  const d=make(text),before=JSON.stringify(d),r=target(d);assert.equal(r.length,1,text);assert.equal(r[0].suggestion,'limited- and non-English-speaking');assert.equal(r[0].category,'Modifier hyphenation');assert.equal(d.text.slice(r[0].start,r[0].end),r[0].text);assert.equal(jointStylisticIssues(d,refs).filter(i=>i.start<r[0].end&&i.end>r[0].start).length,1);assert.equal(JSON.stringify(d),before);
 }
 assert.equal(target(make('The limited- and non-English-\nspeaking households are eligible.')).length,0);
});
test('complete language expression preserves both page fragments without accepting unknown page bridges',()=>{
 const d=make(['ASSEMBLY BILL No. 9999\nThe people do enact as follows:\nline 1 The limited and non-English-','AB 9999 — 2 —\nline 1 speaking households are eligible.']);d.blocks.find(b=>b.ignored).formatting={headerParts:[{}]};const before=JSON.stringify(d),r=target(d);assert.equal(r.length,1);assert.equal(r[0].suggestion,'limited- and non-English-speaking');assert.equal(r[0].end,d.text.indexOf('speaking households')+8);assert.equal(JSON.stringify(d),before);
 const e=make('The limited and non English\nunknown marker\nspeaking households are eligible.'),b=e.blocks[1];b.ignored=true;e.excluded.push({start:b.start,end:b.end});assert.equal(target(e).length,0);
});
