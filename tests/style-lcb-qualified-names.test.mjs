import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {contextualNameIssues,LCB_QUALIFIED_NAMES} from '../app/style-lcb-contextual-names.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=t=>contextualNameIssues(makeDocument([t],'Current'),refs);
test('explicit national Constitution names distinguish the national document from unresolved state short forms',()=>{
 for(const [t,wanted] of [['The United States constitution applies.','United States Constitution'],['The constitution of the United States applies.','Constitution of the United States'],['The U.S. constitution applies.','Constitution']]){const i=check(t)[0];assert.equal(i.suggestion,wanted,t);assert.equal(check(t.replace(i.text,i.suggestion)).length,0);assert.ok(jointStylisticIssues(makeDocument([t],'Current'),refs).some(i=>i.suggestion===wanted));}
 for(const t of ['The California constitution applies.','The constitution applies.','The state constitution applies.','The term “United States constitution” is literal.','The United States constitution Society is named.','The United States Constitution applies.'])assert.equal(check(t).length,0,t);
});
test('Senator titles require explicit federal or preceding-person context',()=>{
 for(const t of ['The United States senator shall act.','The U.S. senator shall act.','The senator Jane Smith shall act.','The senator Jane A. Smith-Jones shall act.']){const i=check(t)[0];assert.equal(i.suggestion,'Senator',t);assert.equal(check(t.replace(i.text,i.suggestion)).length,0);}
 for(const t of ['The state senator shall act.','The senator shall act.','The Senator Report Program is named.','The term “senator Jane Smith shall act” is literal.','The United States Senator shall act.'])assert.equal(check(t).length,0,t);
});
test('LCB qualified bodies identify the country or state without guessing generic references',()=>{
 for(const [bad,wanted] of [['The United States congress shall act.','United States Congress'],['The united states congress shall act.','United States Congress'],['The California legislature shall act.','California Legislature']]){
  const i=check(bad)[0];assert.equal(i.suggestion,wanted,bad);assert.equal(bad.slice(i.start,i.end),i.text);assert.equal(check(bad.replace(i.text,wanted)).length,0);assert.ok(jointStylisticIssues(makeDocument([bad],'Current'),refs).some(x=>x.suggestion===wanted));
 }
 for(const t of ['The congress shall act.','The legislature shall act.','The California Legislature Foundation is named.','The United States Congress Association is named.','The term “United States congress” is literal.'])assert.equal(check(t).length,0,t);
});
test('LCB Armed Forces check requires a stated United States referent',()=>{
 for(const t of ['The United States armed forces are funded.','The armed forces of the United States are funded.','The U.S. armed forces are funded.'])assert.equal(check(t)[0].suggestion,'Armed Forces',t);
 for(const t of ['The armed forces are funded.','The armed forces of Canada are funded.','The United States Armed Forces are funded.','The term “armed forces of the United States” is literal.'])assert.equal(check(t).length,0,t);
});
test('historical Allies require a stated world-war relation and preserve quoted history',()=>{
 for(const [t,wanted] of [['The allies during World War II supplied records.','Allies'],['The allied force in World War I supplied records.','Allied force']])assert.equal(check(t)[0].suggestion,wanted,t);
 for(const t of ['Our allies during World War II supplied records.','The allies supplied records.','The allies of the current organization supplied records.','The allies supplied the report “during World War II.”','The Allied force during World War II supplied records.'])assert.equal(check(t).length,0,t);
});
test('qualified capitalization mappings describe finite coverage rather than full certification',()=>{
 const rows=styleRuleInventory(refs);for(const r of LCB_QUALIFIED_NAMES){assert.ok(refs.lcb.pages[r.page-1].text.includes(r.preferred));assert.ok(rows.some(x=>x.page===r.page&&x.text.startsWith(r.preferred)&&x.status==='Partially automated'),r.preferred);}
 const bad='The United States congress shall act.',doc=makeDocument([bad],'Current');doc.struck=[{start:4,end:26}];assert.equal(contextualNameIssues(doc,refs).length,0);
});
test('listed Conflict of Interest Code capitalization is distinct from an ordinary conflict',()=>{
 const checkJoint=t=>jointStylisticIssues(makeDocument([t],'Current'),refs);
 assert.ok(checkJoint('The conflict of interest code applies.').some(i=>i.suggestion==='Conflict of Interest Code'));
 assert.equal(checkJoint('The Conflict of Interest Code applies.').length,0);assert.equal(checkJoint('The conflict of interest is disclosed.').length,0);
});
