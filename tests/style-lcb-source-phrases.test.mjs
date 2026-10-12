import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=t=>jointStylisticIssues(makeDocument([t],'Current'),refs);
test('discreet prudence checks require an explicit confidential-disclosure requirement',()=>{
 for(const t of ['The person shall be discrete when disclosing confidential information.','The person must be discrete in sharing personal data.']){const i=check(t).find(i=>i.suggestion==='discreet');assert.ok(i,t);assert.equal(t.slice(i.start,i.end),'discrete');assert.equal(check(t.replace(i.text,i.suggestion)).length,0);}
 for(const t of ['The discrete data elements are stored.','The person shall be discrete.','The discrete judgment is retained.','The term “shall be discrete when disclosing confidential information” is literal.'])assert.equal(check(t).length,0,t);
});
test('listed class identifiers keep their reference symbol without capitalizing descriptive class',()=>{
 for(const [bad,wanted] of [['The Class II device is inspected.','class II'],['The Class B license is required.','class B'],['The class ii device is inspected.','class II'],['The class b license is required.','class B']]){const i=check(bad).find(i=>i.suggestion===wanted);assert.ok(i,bad);assert.equal(check(bad.replace(i.text,i.suggestion)).length,0);}
 for(const t of ['The class II device is inspected.','The class B license is required.','Class II devices are inspected.','The Class B Drug Act applies.','The term “Class II device” is literal.'])assert.equal(check(t).length,0,t);
});
test('one-time action checks require an explicit only-once predicate',()=>{
 for(const variant of ['one time','onetime'])for(const [noun,verb] of [['payment','paid'],['fee','collected'],['grant','awarded'],['assessment','assessed']]){
  const bad='The '+variant+' '+noun+' shall be '+verb+' only once.',i=check(bad).find(i=>i.suggestion==='one-time');assert.ok(i,bad);assert.equal(check(bad.replace(i.text,i.suggestion)).length,0);
 }
 for(const t of ['The onetime director is named.','The one time payment is considered.','The one-time payment shall be paid only once.','The term “onetime payment shall be paid only once” is literal.','The fee is paid one time.'])assert.equal(check(t).length,0,t);
});
test('after-school time phrases remain separate from before-noun modifiers',()=>{
 for(const bad of ['The meeting is held after-school.','The review is conducted after-school on Mondays.','The person shall apply immediately after-school.']){const i=check(bad).find(i=>i.suggestion==='after school');assert.ok(i,bad);assert.equal(check(bad.replace(i.text,i.suggestion)).length,0);}
 for(const t of ['The after-school program applies.','The meeting is held after school.','The term “held after-school” is literal.'])assert.equal(check(t).length,0,t);
});
test('listed physicians and surgeons remain separate practitioner nouns',()=>{
 for(const tail of ['are licensed','shall register','who apply','have licenses']){const bad='The physicians-and-surgeons '+tail+'.',i=check(bad).find(i=>i.suggestion==='physicians and surgeons');assert.ok(i,bad);assert.equal(bad.slice(i.start,i.end),'physicians-and-surgeons');assert.equal(check(bad.replace(i.text,i.suggestion)).length,0);}
 for(const t of ['The physicians and surgeons are licensed.','The physicians-and-surgeons association is named.','The term “physicians-and-surgeons” is literal.'])assert.equal(check(t).length,0,t);
});
test('medium-sized structures and structures of medium size retain their stated roles',()=>{
 for(const [bad,wanted] of [['The medium sized structures are inspected.','medium-sized'],['The structures of medium-size are inspected.','medium size']]){const i=check(bad).find(i=>i.suggestion===wanted);assert.ok(i,bad);assert.equal(bad.slice(i.start,i.end),i.text);assert.equal(check(bad.replace(i.text,wanted)).length,0);}
 for(const t of ['The medium-sized structures are inspected.','The structures of medium size are inspected.','The structures of medium-size construction are inspected.','The term “medium sized structures” is literal.'])assert.equal(check(t).length,0,t);
 const rows=styleRuleInventory(refs);assert.equal(rows.find(i=>i.page===12&&i.text.startsWith('medium-sized structures')).status,'Partially automated');
});
test('a numbered executive order is a named title while generic orders stay descriptive',()=>{
 for(const t of ['The executive order No. 34 applies.','The Executive Order no. 34 applies.','The executive order no. 34 applies.']){const i=check(t).find(i=>i.suggestion==='Executive Order No.');assert.ok(i,t);assert.equal(check(t.replace(i.text,i.suggestion)).length,0);}
 for(const t of ['The Executive Order No. 34 applies.','The executive order applies.','The executive orders apply.','The term “executive order no. 34” is literal.','The Executive Order No. 34 Foundation is named.','The Executive Order no. 34 Foundation is named.'])assert.equal(check(t).length,0,t);
});
