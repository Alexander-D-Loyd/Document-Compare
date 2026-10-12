import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {scalarSeriesRanges} from '../app/style-scalar-series.mjs';import {styleContext} from '../app/style-context.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=t=>jointStylisticIssues(makeDocument([t],'Current'),refs);
test('an explicit pure scalar series shares its numerical expression across large and small values',()=>{
 for(const t of ['The eligible values are 1,000 and 2.','The values are 1,000, 2, and 3.','The numbers are 10 or 3.','The list includes 1,000, 2, and 3.'])assert.equal(check(t).length,0,t);
 assert.deepEqual(check('The values are 1,000 and two.').map(i=>i.suggestion),['2']);
 assert.deepEqual(check('The list includes one, two, and 10.').map(i=>i.suggestion),['1','2']);
 assert.equal(check('The values are one, two, and three.').length,0);
});
test('small all-figure series retain the ordinary bill spelling rule and independent list punctuation',()=>{
 assert.deepEqual(check('The values are 2, 3, and 4.').map(i=>i.suggestion),['two','three','four']);
 const found=check('The list includes 1,000, 2 and 3.');assert.deepEqual(found.map(i=>i.suggestion),[', and']);assert.equal(found[0].text,'and');
});
test('different units, unknown clauses, decimal continuations, references and literals stay outside scalar inference',()=>{
 for(const t of ['The values are 10 hours and three miles.','The list includes one hundred and two.','The list includes 1.5 months and two years.','The list includes Sections 1, 2, and 3.','The term “values are 1,000 and two” is literal.'])assert.equal(scalarSeriesRanges(styleContext(makeDocument([t],'Current'))).length,0,t);
 assert.equal(check('The values are 10 hours and three miles.').length,0);
 assert.equal(check('The term “values are 1,000 and two” is literal.').length,0);
});
test('number series preserve printed-margin positions and digest one exception',()=>{
 const doc=makeDocument(['line 1 The values are 1,000,\nline 2 two, and three.'],'Current'),found=jointStylisticIssues(doc,refs);assert.deepEqual(found.map(i=>i.suggestion),['2','3']);for(const i of found)assert.equal(doc.text.slice(i.start,i.end),i.text);
 assert.equal(check('LEGISLATIVE COUNSEL’S DIGEST\nThe values are one, 2, and 10.').length,0);
});
test('related counts in an explicit list share an expression across different recognized noun heads',()=>{
 for(const t of ['The board consists of 11 licensed veterinarians, one registered veterinary technician, and three public members.','The packet includes 10 forms, three reports, and two documents.']){
  const found=check(t).filter(i=>i.checkId==='numerals');assert.deepEqual(found.map(i=>i.suggestion),t.includes('veterinarians')?['1','3']:['3','2'],t);assert.ok(found.every(i=>i.references.some(r=>r.guideId==='gpo'&&r.rule==='12.5')));
 }
 assert.equal(check('The board consists of 11 licensed veterinarians, 1 registered veterinary technician, and 3 public members.').length,0);
 assert.equal(check('The packet includes 10 forms, 3 reports, and 2 documents.').length,0);
 assert.equal(check('The board consists of four licensed veterinarians, one registered veterinary technician, and three public members.').length,0);
});
test('nested durations, different units and unknown clauses are never pulled into counted list totals',()=>{
 const t='The list includes 11 two-year programs and three programs.',found=check(t);assert.deepEqual(found.map(i=>i.suggestion),['3']);assert.equal(found[0].text,'three');
 assert.equal(check('The list includes 10 hours and three programs.').length,0);
 assert.equal(check('The packet includes 10 forms and two reports that shall be filed.').length,0);
 assert.equal(check('The term “includes 10 forms and three reports” is literal.').length,0);
});
test('digest count lists exclude the actual one-versus-1 guide disagreement but retain agreed figure checks',()=>{
 const a='LEGISLATIVE COUNSEL’S DIGEST\nThe packet includes 10 forms, 1 report, and 3 documents.';assert.equal(check(a).length,0);
 const b='LEGISLATIVE COUNSEL’S DIGEST\nThe packet includes 10 forms, one report, and three documents.',found=check(b);assert.deepEqual(found.map(i=>i.suggestion),['3']);
});
test('whole larger written leading counts share the list expression without pulling in nested modifiers',()=>{
 assert.deepEqual(check('The packet includes twenty-one forms, three reports, and two documents.').map(i=>i.suggestion),['21','3','2']);
 assert.deepEqual(check('The packet includes one hundred forms and three reports.').map(i=>i.suggestion),['100','3']);
 assert.deepEqual(check('The list includes twenty-one two-year programs and three programs.').map(i=>i.suggestion),['21','3']);
 assert.equal(check('The packet includes 21 forms, 3 reports, and 2 documents.').length,0);
});
