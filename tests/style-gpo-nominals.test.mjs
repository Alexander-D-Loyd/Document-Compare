import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {gpoNominalIssues} from '../app/style-gpo-nominals.mjs';
import {GPO_NOMINAL_FORMS} from '../app/gpo-nominal-forms.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>gpoNominalIssues(makeDocument([text],'Current'),refs);
test('all explicit particle-ending source nouns have a checked variant and accepted preferred form',()=>{
 assert.equal(GPO_NOMINAL_FORMS.length,461);assert.equal(new Set(GPO_NOMINAL_FORMS.map(r=>r.variant)).size,461);
 for(const r of GPO_NOMINAL_FORMS){
  assert.match(r.raw,/n\./);assert.ok(r.page>=127&&r.page<=206);assert.equal(r.printedPage,String(r.page-14));
  const bad='The '+r.variant+' is required.',issues=check(bad);assert.ok(issues.some(i=>i.suggestion===r.preferred),r.variant);
  assert.equal(check('The '+r.preferred+' is required.').length,0,r.preferred);
 }
});
test('column-preserved representative words match their printed source forms',()=>{
 const expected=[['check in','check-in',137],['check up','checkup',137],['phase in','phase-in',173],['lay out','layout',163],['set aside','set-aside',183],['run on','run-on',180],['write off','writeoff',206]];
 for(const [variant,preferred,page] of expected)assert.ok(GPO_NOMINAL_FORMS.some(r=>r.variant===variant&&r.preferred===preferred&&r.page===page));
});
test('verbs, prepositions, literal names, tables and source strikeouts are protected',()=>{
 for(const text of ['The workers shall check up on the issue.','They drive in a car.','The agency shall set aside money.','The term “check up” is required.','The term "set aside" is defined.','The Check Up is a product.','CHECK UP IS REQUIRED','Budget Act of 2026\nThe check up is required................ 1000'])assert.equal(check(text).length,0,text);
 const doc=makeDocument(['The check up is required.'],'Current');doc.struck=[{start:4,end:12}];assert.equal(gpoNominalIssues(doc,refs).length,0);
});
test('worker-facing joint checks include noun forms without changing conflicting guide policy',()=>{
 const doc=makeDocument(['The check up is required. The phase in is required. Use healthcare. The workers shall check up on the issue.'],'Current');
 const issues=jointStylisticIssues(doc,refs);assert.ok(issues.some(i=>i.suggestion==='checkup'&&i.guidePage===137));assert.ok(issues.some(i=>i.suggestion==='phase-in'));assert.ok(!issues.some(i=>i.conflict||/healthcare/.test(i.text)));
});
test('wrapped noun phrases highlight only the source compound with exact offsets',()=>{
 const doc=makeDocument(['line 1 The check\nline 2 up is required.'],'Current');const issues=gpoNominalIssues(doc,refs);assert.equal(issues.length,1);assert.equal(issues[0].suggestion,'checkup');assert.equal(doc.text.slice(issues[0].start,issues[0].end),issues[0].text);
});
