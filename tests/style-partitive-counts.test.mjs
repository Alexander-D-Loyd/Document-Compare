import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=t=>jointStylisticIssues(makeDocument([t],'Current'),refs).filter(i=>i.checkId==='numerals');
test('explicit partitive subjects share their stated whole without requiring repeated nouns',()=>{
 for(const relation of ['whom','which','them']){
  const t='The board has 11 members, of '+relation+' three are appointed and eight are elected.';
  assert.deepEqual(check(t).map(i=>i.suggestion),['3','8']);
  assert.equal(check(t.replace('three','3').replace('eight','8')).length,0);
 }
 assert.deepEqual(check('The agency has 13 workers, of whom six are licensed, six are registered, and one is certified.').map(i=>i.suggestion),['6','6','1']);
});
test('durations, dates, monetary values and independent clause counts do not force partition figures',()=>{
 assert.equal(check('The board has nine members, of whom three are appointed in 2025 and six are elected.').length,0);
 assert.equal(check('The board has nine members, of whom three are appointed for 10 years and six are elected.').length,0);
 assert.equal(check('The board has nine members, of whom three are paid $10 and six are unpaid.').length,0);
 assert.deepEqual(check('The board has 11 members, of whom three are appointed to two boards and eight are elected.').map(i=>i.suggestion),['3','8']);
});
test('uncertain antecedents, conditions, citations and quotations do not create related counts',()=>{
 for(const t of ['The term “The board has 11 members, of whom three are appointed and eight are elected.” is literal.','Under Section 11, three are appointed and eight are elected.','The board has 11 members, of whom three are appointed if funds are available and eight are elected.','The task takes 11 hours, of which three are paid and eight are unpaid.'])assert.equal(check(t).length,0,t);
});
test('partitive findings retain exact positions across printed line numbers and the Digest one exception',()=>{
 const doc=makeDocument(['line 1 The agency has 13 workers, of whom six are licensed,\nline 2 six are registered, and one is certified.'],'Current'),found=jointStylisticIssues(doc,refs).filter(i=>i.checkId==='numerals');
 assert.deepEqual(found.map(i=>i.suggestion),['6','6','1']);for(const i of found)assert.equal(doc.text.slice(i.start,i.end),i.text);
 assert.deepEqual(check('LEGISLATIVE COUNSEL’S DIGEST\nThe agency has 13 workers, of whom six are licensed, six are registered, and one is certified.').map(i=>i.suggestion),['6','6']);
});
test('complete larger written wholes retain sentence-opening words and related LCB figures',()=>{
 assert.deepEqual(check('The agency has twenty-one members, of whom three are appointed and eighteen are elected.').map(i=>i.suggestion),['21','3','18']);
 assert.deepEqual(check('Thirteen workers, of whom six are licensed, six are registered, and one is certified.').map(i=>i.suggestion),['6','6','1']);
 assert.deepEqual(check('13 workers, of whom six are licensed, six are registered, and one is certified.').map(i=>i.suggestion),['Thirteen','6','6','1']);
});
