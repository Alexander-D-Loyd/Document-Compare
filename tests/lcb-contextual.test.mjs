import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {lcbContextualIssues,lcbModifierForms} from '../app/lcb-contextual.mjs';
const refs={lcb:JSON.parse(fs.readFileSync(new URL('../app/data/lcb-reference.json',import.meta.url)))};
const check=text=>lcbContextualIssues(makeDocument([text],'Current'),refs);
test('initialism article checks retain periods and handle both vowel and consonant letter sounds',()=>{
 const found=check('A F.C.C. ruling applies. An C.D.C. report applies. An CPUC order applies. An DNA test applies.');
 assert.deepEqual(found.map(i=>i.suggestion),['An F.C.C.','A C.D.C.','A CPUC','A DNA']);
 for(const text of ['An F.C.C. ruling applies. A C.D.C. report applies.','A NASA program applies. A N.A.S.A. program applies.','An FCCD token applies.','An lowercase cdc token applies.'])assert.equal(check(text).length,0,text);
 const doc=makeDocument(['line 1 A F.\nline 2 C.C. ruling applies.'],'Current');const i=lcbContextualIssues(doc,refs)[0];assert.equal(i.suggestion,'An F. C.C.');assert.equal(doc.text.slice(i.start,i.end),i.text);
});
test('initialism articles preserve sentence capitalization and cite both guides',()=>{
 const both={...refs,gpo:JSON.parse(fs.readFileSync(new URL('../app/data/gpo-reference.json',import.meta.url)))};
 const found=lcbContextualIssues(makeDocument(['A FCC ruling applies. An SB amendment applies. An AB bill applies.'],'Current'),both).filter(i=>i.category==='Articles before initials');
 assert.deepEqual(found.map(i=>i.suggestion),['An FCC']);assert.ok(found[0].references.some(r=>r.rule==='5.18'));
 assert.equal(lcbContextualIssues(makeDocument(['A NASA program applies. A lowercase ab token applies.'],'Current'),both).length,0);
});
test('listed modifiers require a noun head and keep noun/predicate/open exceptions',()=>{
 assert.ok(lcbModifierForms(refs.lcb).length>50);
 assert.deepEqual(check('A cost effective plan has an age appropriate program and a full time employee.').map(i=>i.suggestion),['cost-effective','age-appropriate','full-time']);
 assert.equal(check('The plan is cost effective. Full time is required. Collective bargaining rights protect public health services and land use programs.').length,0);
 assert.deepEqual(check('The plan is cost-effective. It is a cost-effective plan.').map(i=>i.suggestion),['cost effective']);
});
test('productive participial modifiers, foreign phrases and initials preserve exceptions',()=>{
 assert.deepEqual(check('A community based program and a board approved policy are adopted. The federally funded program uses ex-officio members. A a FCC ruling and a SB amendment apply.').map(i=>i.suggestion),['community-based','board-approved','ex officio','an FCC','an SB']);
 assert.equal(check('A NASA program and an FCC ruling apply. A publicly owned utility is approved.').length,0);
});
test('source offsets survive printed line wrapping and removed wording stays excluded',()=>{
 const doc=makeDocument(['line 1 A cost\nline 2 effective plan.'],'Current'),issues=lcbContextualIssues(doc,refs);
 assert.equal(issues.length,1);assert.equal(doc.text.slice(issues[0].start,issues[0].end),issues[0].text);
 doc.struck=[{start:issues[0].start,end:issues[0].end}];assert.equal(lcbContextualIssues(doc,refs).length,0);
});
test('budget prose prepositions, determiners and possessives are not noun modifiers',()=>{
 assert.equal(check('There is a reduction in state funding. Any related facility lease applies under the Commission’s adopted policy. Funds are available for approved contract costs. Employ-\nment Related Services are discussed.').length,0);
 assert.deepEqual(check('The in state provider serves a community based program.').map(i=>i.suggestion),['in-state','community-based']);
});

test('multiword participial modifiers highlight the full modifier and avoid partial corrections',()=>{
 const doc=makeDocument(['A mental health related service provides assistance. A public health based program is approved. Mental health is related to funding.'],'Current');
 const found=lcbContextualIssues(doc,refs);
 assert.deepEqual(found.map(i=>i.suggestion),['mental-health-related','public-health-based']);
 assert.equal(found[0].text,'mental health related');
});
