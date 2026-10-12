import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=t=>jointStylisticIssues(makeDocument([t],'Current'),refs);
test('zero bill counts fall back to GPO without inventing an LCB zero rule',()=>{
 const i=check('There are 0 applicants.').find(i=>i.checkId==='numerals');assert.ok(i);assert.equal(i.suggestion,'zero');assert.equal(i.guideId,'gpo');assert.equal(i.rule,'12.23');assert.equal(check('There are zero applicants.').length,0);
 assert.ok(!check('There are 0 or 10 applicants.').some(i=>i.suggestion==='zero'));
 for(const body of ['There are 0 applicants.','There are zero applicants.'])assert.equal(check('LEGISLATIVE COUNSEL’S DIGEST\n'+body).length,0,body);
 assert.equal(check('The charge is 0 percent.').length,0);
});
test('signed quantities and exponents do not get isolated cardinal-word replacements',()=>{
 for(const t of ['The adjustment is -1 unit.','The adjustment is −3 units.','The adjustment is +2 units.','The adjustment is - 5 units.','The value is 10^-3 units.','The value is (−3).'])assert.ok(!check(t).some(i=>i.checkId==='numerals'),t);
 assert.ok(check('There are 3 applicants.').some(i=>i.suggestion==='three'));
});
