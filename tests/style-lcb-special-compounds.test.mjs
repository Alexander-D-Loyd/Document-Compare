import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>jointStylisticIssues(makeDocument([text],'Current'),refs);
test('LCB explicitly hyphenates all ordinary forms of air-condition',()=>{
 for(const [bad,good] of [['air condition','air-condition'],['aircondition','air-condition'],['air conditioned','air-conditioned'],['airconditioned','air-conditioned'],['air conditioning','air-conditioning'],['airconditioning','air-conditioning']]){const found=check('The '+bad+' equipment is required.');assert.ok(found.some(i=>i.suggestion===good),bad);assert.equal(check('The '+good+' equipment is required.').length,0);}
 assert.ok(check('Staff shall air condition the building.').some(i=>i.suggestion==='air-condition'));
});
test('x-ray checks recognize source noun and modifier roles while preserving unfamiliar uses',()=>{
 for(const phrase of ['x ray','xray'])for(const ending of [' equipment is required.',' examination is required.',' is required.']){const found=check('The '+phrase+ending);assert.ok(found.some(i=>i.suggestion==='x-ray'),phrase+ending);}
 for(const text of ['The x-ray examination is required.','The term “x ray” is quoted.','The term “air conditioning” is quoted.','The term “credential holder” is literal.','The Xray Company acts.','The formula x ray is shown.'])assert.equal(check(text).length,0,text);
});
