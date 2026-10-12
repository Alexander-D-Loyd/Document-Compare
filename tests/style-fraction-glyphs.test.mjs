import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=t=>jointStylisticIssues(makeDocument([t],'Current'),refs);
test('standalone Unicode fractions retain their exact glyph span and fraction value',()=>{
 for(const [glyph,words] of [['¼','one-fourth'],['½','one-half'],['¾','three-fourths'],['⅐','one-seventh'],['⅑','one-ninth'],['⅒','one-tenth'],['⅓','one-third'],['⅔','two-thirds'],['⅕','one-fifth'],['⅖','two-fifths'],['⅗','three-fifths'],['⅘','four-fifths'],['⅙','one-sixth'],['⅚','five-sixths'],['⅛','one-eighth'],['⅜','three-eighths'],['⅝','five-eighths'],['⅞','seven-eighths']]){
  const t='Allocate '+glyph+' of the funds.',i=check(t).find(i=>i.checkId==='fractions');assert.ok(i,t);assert.equal(i.suggestion,words);assert.equal(t.slice(i.start,i.end),glyph);assert.equal(check('Allocate '+words+' of the funds.').length,0);
 }
});
test('sentence-opening fraction corrections begin with a capital',()=>{
 for(const t of ['½ of the funds is allocated.','1/2 of the funds is allocated.'])assert.ok(check(t).some(i=>i.suggestion==='One-half'),t);
});
test('mixed glyphs, percentages, identifiers, units, quotes and digest conflicts stay protected',()=>{
 for(const t of ['Wait 3½ hours.','A person is 70½ years of age.','Wait 3 ½ hours.','Wait three and ½ hours.','Allocate ½ percent.','See Section ½.','Use a ¾-ton truck.','The term “½ of the amount” is literal.','LEGISLATIVE COUNSEL’S DIGEST\nAllocate ½ of the amount.'])assert.ok(!check(t).some(i=>i.checkId==='fractions'),t);
});
