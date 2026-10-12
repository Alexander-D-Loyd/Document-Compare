import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {numberArticleIssues} from '../app/style-number-articles.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>numberArticleIssues(makeDocument([text],'Current'),refs);
test('integer article checks use spoken leading syllables, including large quantities',()=>{
 for(const value of [8,11,18,80,81,89,800,8000,11000,18000,80000,8000000]){const bad='Use a '+value+'-member board.';assert.equal(check(bad)[0].suggestion,'an',bad);assert.equal(check('Use an '+value+'-member board.').length,0);}
 for(const value of [0,1,2,7,9,10,12,19,70,90,100,110,180,1000,180000]){const bad='Use an '+value+'-member board.';assert.equal(check(bad)[0].suggestion,'a',bad);assert.equal(check('Use a '+value+'-member board.').length,0);}
 assert.equal(check('Require a 11,000-member organization.')[0].suggestion,'an');assert.equal(check('A 11-year-old qualifies.')[0].suggestion,'An');
});
test('ambiguous identifiers, decimals, literal names, quotes and tables stay protected',()=>{
 for(const text of ['Use a 8.5-hour shift.','Use a 08-member board.','Use a VIII classification.','Use an Article 1 reference.','Use a 8 file.','The term “a 11-year-old” is shown.','A 11-member board..........100'])assert.equal(check(text).length,0,text);
 const doc=makeDocument(['Use a 11-member board.'],'Current');doc.struck=[{start:4,end:5}];assert.equal(numberArticleIssues(doc,refs).length,0);
});
test('precise article ranges coexist with numeral checks and preserve wrapped source text',()=>{
 const doc=makeDocument(['line 1 Require a\nline 2 11-year-old applicant.'],'Current');const i=numberArticleIssues(doc,refs)[0];assert.equal(doc.text.slice(i.start,i.end),'a');assert.equal(i.suggestion,'an');
 assert.ok(jointStylisticIssues(makeDocument(['Require a 11-year-old applicant.'],'Current'),refs).some(i=>i.checkId==='number-articles'&&i.text==='a'&&i.suggestion==='an'));
});
