import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>jointStylisticIssues(makeDocument([text],'Current'),refs);
test('ordinal severity and crime degrees retain their rank instead of becoming cardinal quantities',()=>{
 for(const phrase of ['first-degree murder','second-degree offense','third-degree burns','first degree','third degree'])assert.ok(!check('The rule concerns '+phrase+'.').some(i=>i.checkId==='numerals'),phrase);
 assert.ok(check('The rule concerns 1st-degree murder.').some(i=>i.suggestion==='first'));
 assert.ok(check('The rule concerns 3rd-degree burns.').some(i=>i.suggestion==='third'));
});
test('actual temperature and angle degree quantities still require figures',()=>{
 for(const phrase of ['five degrees Celsius','three degrees of rotation','five °C'])assert.ok(check('The reading is '+phrase+'.').some(i=>i.suggestion===String(phrase.startsWith('three')?3:5)),phrase);
 for(const phrase of ['5 degrees Celsius','3 degrees of rotation'])assert.equal(check('The reading is '+phrase+'.').length,0,phrase);
});
