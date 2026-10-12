import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {wordChoiceIssues} from '../app/style-word-choice.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=t=>wordChoiceIssues(makeDocument([t],'Current'),refs);
test('lineal descent and an explicit birth date distinguish LCB meaning pairs',()=>{
 for(const [bad,good] of [['The linear descendants are eligible.','lineal'],['The linear descendant is eligible.','lineal'],['The birth certificate states the child was borne on May 1, 2000.','born'],['The birth record states the applicant was borne on June 5, 1990.','born']]){const i=check(bad)[0];assert.equal(i.suggestion,good);assert.equal(bad.slice(i.start,i.end),i.text);assert.equal(check(bad.replace(i.text,good)).length,0);}
});
test('geometric relationships, carried persons and literal statements remain unchanged',()=>{
 for(const t of ['The linear relationship applies.','The child was borne on a stretcher.','The patient was borne on the vehicle.','The child was borne in May.','The patient was borne on May 1 to the hospital.','The cost was borne by the agency.','The child was born on May 1, 2000.','The term “linear descendants” is literal.','The linear descendants........100'])assert.equal(check(t).length,0,t);
});
