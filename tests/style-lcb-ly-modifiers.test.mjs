import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {LY_ADVERBS} from '../app/ly-adverbs.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>jointStylisticIssues(makeDocument([text],'Current'),refs);
test('unambiguous ly adverbs retain open modifier forms under both guides',()=>{
 for(const adverb of LY_ADVERBS){const bad='A '+adverb+'-funded program applies.',found=check(bad);assert.ok(found.some(i=>i.suggestion===adverb+' funded'),adverb);assert.equal(check('A '+adverb+' funded program applies.').length,0,adverb);}
});
test('family and elderly before productive participles are not mistaken for adverbs',()=>{
 for(const noun of ['family','elderly'])for(const ending of ['based','related','approved','adopted']){const found=check('A '+noun+' '+ending+' program applies.');assert.ok(found.some(i=>i.suggestion===noun+'-'+ending),noun+' '+ending);assert.equal(check('A '+noun+'-'+ending+' program applies.').length,0);}
 for(const text of ['A family-owned business applies.','A friendly-faced worker applies.','A daily-paid employee applies.','The term “federally-funded program” is quoted.','The term “family based program” is quoted.'])assert.equal(check(text).length,0,text);
});
