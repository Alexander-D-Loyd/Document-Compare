import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {extendedFractionWords} from '../app/extended-fraction-forms.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=t=>jointStylisticIssues(makeDocument([t],'Current'),refs);
test('partitive hundredth and thousandth units preserve the GPO one-thousandth example',()=>{
 assert.equal(extendedFractionWords(1,1000),'one-thousandth');assert.equal(extendedFractionWords(2,1000),'two one-thousandths');
 for(const d of [100,1000])for(const n of [1,2,9,21,99]){
  const t='Use '+n+'/'+d+' of the appropriation.',good=extendedFractionWords(n,d),i=check(t).find(i=>i.checkId==='fractions');assert.ok(i,t);assert.equal(i.suggestion,good);assert.equal(t.slice(i.start,i.end),n+'/'+d);assert.equal(check('Use '+good+' of the appropriation.').length,0,good);
 }
 assert.ok(check('Use two thousandths of the appropriation.').some(i=>i.suggestion==='two one-thousandths'));
});
test('unsupported denominators, citations, mixed quantities and literal fractions remain protected',()=>{
 for(const t of ['See Section 1/1000 of the code.','Use 3 1/1000 of the allocation.','Use three and one-thousandth of the allocation.','Use 1/1001 of the allocation.','Use 1/1000 units.','The term “1/1000 of the amount” is literal.','Use 1/1000 of the amount........100'])assert.ok(!check(t).some(i=>i.checkId==='fractions'),t);
});

test('hyphenated fractional units are not converted to ordinal ranks',()=>{
 for(const text of ['A one-thousandth share is allocated.','A one-hundredth interest is conveyed.','Two one-thousandths are allocated.'])assert.ok(!check(text).some(i=>i.checkId==='numerals'),text);
 assert.ok(check('The one thousandth applicant qualifies.').some(i=>i.suggestion==='1,000th'));
});
