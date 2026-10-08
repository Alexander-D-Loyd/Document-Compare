import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument} from '../app/core.mjs';import {COMPOUND_PLURAL_RULES,compoundPluralIssues} from '../app/style-compound-plurals.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>compoundPluralIssues(makeDocument([text],'Current'),refs);
test('listed compound plurals inflect the significant noun while accepting every source form',()=>{
 for(const r of COMPOUND_PLURAL_RULES){
  const bad='The '+r.variant+' are eligible.',good='The '+r.preferred+' are eligible.';
  const found=check(bad);assert.equal(found.length,1,r.variant);assert.equal(found[0].suggestion,r.preferred);assert.equal(found[0].rule,r.rule);assert.equal(bad.slice(found[0].start,found[0].end),found[0].text);
  assert.equal(check(good).length,0,r.preferred);
 }
 assert.equal(check('The brigadier generals, major generals, general counsels, higher-ups and go-betweens are eligible.').length,0);
 assert.equal(check('A reduction in forces is proposed. The chief of staffs of the offices is appointed.').length,0);
 assert.equal(check('Two reduction in forces occur.').length,1);
});
test('quoted terms, literal body names, headings and source strikeouts remain protected',()=>{
 assert.equal(check('The term “surgeon generals” is quoted. The Surgeon Generals Association is a literal name. The Chief Of Staffs Council is named.').length,0);
 const doc=makeDocument(['LEGISLATIVE COUNSEL’S DIGEST\nThe bill applies.\nThe people do enact as follows:\nline 1 The surgeon\nline 2 generals are eligible.'],'Current');const found=compoundPluralIssues(doc,refs);assert.equal(found.length,1);assert.equal(found[0].suggestion,'surgeons general');assert.equal(doc.text.slice(found[0].start,found[0].end),found[0].text);
 doc.struck=[{start:found[0].start,end:found[0].end}];assert.equal(compoundPluralIssues(doc,refs).length,0);
 assert.deepEqual(jointStylisticIssues(makeDocument(['The secretary generals and brigadier generals act.'],'Current'),refs).map(i=>i.suggestion),['secretaries general']);
});
