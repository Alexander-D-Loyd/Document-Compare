import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';import {MERRIAM_FIRST_SPELLINGS} from '../app/style-merriam-spellings.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=t=>jointStylisticIssues(makeDocument([t],'Current'),refs);
test('user-selected Merriam-Webster first-spelling checks use a bundled verified subset',()=>{
 for(const [bad,good] of [['The grey paint is applied.','gray'],['The grey hair is described.','gray'],['The hair has greyed.','grayed'],['The hair is greying.','graying'],['The hair greys.','grays']]){const found=check(bad);assert.equal(found.length,1,bad);assert.equal(found[0].suggestion,good);assert.equal(found[0].checkId,'merriam-first-spelling');assert.equal(found[0].dictionarySource.authority,'Merriam-Webster.com Dictionary');assert.equal(found[0].dictionarySource.sourceUrl,'https://www.merriam-webster.com/dictionary/gray');assert.equal(check(bad.replace(found[0].text,good)).length,0);assert.match(found[0].message,/valid English/);}
});
test('dictionary preference protects names, scientific units, literal foreign usage and unknown senses',()=>{
 for(const t of ['The Grey family shall act.','The Earl Grey tea is used.','The Grey Paint Company is named.','The term “grey paint” is literal.','GREY PAINT','The greyhound runs.','The greyness is described.','The grey area is unresolved.','A dose of one gray is measured.','The greys are listed.'])assert.equal(check(t).length,0,t);
 const d=makeDocument(['line 1 The grey paint\nline 2 is applied.'],'Current'),i=jointStylisticIssues(d,refs)[0];assert.equal(d.text.slice(i.start,i.end),'grey');d.struck=[{start:i.start,end:i.end}];assert.equal(jointStylisticIssues(d,refs).length,0);
});
test('coverage records a subset rather than claiming an installed complete dictionary',()=>{
 const row=styleRuleInventory(refs).find(r=>r.id==='lcb-2-2');assert.equal(row.status,'Partially automated');assert.match(row.scope,/subset/);assert.match(row.scope,/remain manual/);assert.match(row.scope,/Merriam-Webster/);assert.equal(MERRIAM_FIRST_SPELLINGS.forms.length,4);
});
