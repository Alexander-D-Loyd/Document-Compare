import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {wordChoiceIssues} from '../app/style-word-choice.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=t=>wordChoiceIssues(makeDocument([t],'Current'),refs);
test('explicit legal and geographic noun meanings retain complete words and inflections',()=>{
 for(const [t,bad,good] of [['The capitol city is identified.','capitol','capital'],['The principle residence is identified.','principle','principal'],['The established principals of law apply.','principals','principles'],['The fundamental principal of equity applies.','principal','principle'],['The internment of human remains is required.','internment','interment'],['The internment of the body of the decedent is required.','internment','interment'],['The agency shall execute a guarantee of payment.','guarantee','guaranty'],['The agency shall enforce the guarantee agreement.','guarantee','guaranty']]){
  const i=check(t).find(i=>i.suggestion===good);assert.ok(i,t);assert.equal(t.slice(i.start,i.end),bad);assert.equal(check(t.replace(bad,good)).length,0);assert.ok(jointStylisticIssues(makeDocument([t],'Current'),refs).some(i=>i.suggestion===good),t);
 }
});
test('ordinary guarantees, prison contexts, names and unqualified meanings remain unchanged',()=>{
 for(const t of ['The product guarantee applies.','The agency shall guarantee payment.','The applicant shall obtain a guarantee.','The internment of prisoners is restricted.','The internment camp is identified.','The capitol building is identified.','The principal borrower is identified.','The term “internment of human remains” is literal.','The Capitol City Institute is named.','The Guarantee Agreement Foundation is named.'])assert.equal(check(t).length,0,t);
});
