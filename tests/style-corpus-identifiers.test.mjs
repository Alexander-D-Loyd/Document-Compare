import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {numeralIssues} from '../app/style-numerals.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const corrections=text=>numeralIssues(makeDocument([text],'Current'),refs).filter(i=>!i.matchesPrimary);
test('actual budget citation and program-label forms are protected without exempting prose durations',()=>{
 const text='Budget Act of 2026. See P.L. 114-95, Pub. L. 119-21 (Jul. 4, 2025) 139 Stat. 72, S.B. 362, H.R. 1, Chs.4 and 5, Chs 4 and, 5, and 2009–10 3rd Ex. Sess. Use Round 8, Reach 6 and Bargaining Unit 9. See 8 Cal. Code Regs. 3401(c).\n6049-2006 California Community College Capital Outlay Bond Fund.\nA report covers 1 year.';
 assert.deepEqual(corrections(text).map(i=>[i.text,i.suggestion]),[['1','one']]);
});
test('zero-emission, scale money, quoted identifiers, fractions and divided words are not isolated numbers',()=>{
 assert.equal(corrections('Prioritize zero-emission vehicles. Allocate $190 million to California “Press 3” services. Pay one-twelfth of the appropriation. Obtain writ-\nline 1 ten consent.').length,0);
 assert.deepEqual(corrections('Allow 1 year for zero-emission vehicles.').map(i=>i.suggestion),['one']);
});
test('zero in lexical compounds is distinguished from numerical zero',()=>{
 assert.equal(corrections('A net-zero change uses zero-based budgeting and a zero-sum approach. Net- zero costs remain stable. A zero-tolerance policy applies.').length,0);
 assert.deepEqual(corrections('The rate is zero percent. Allow 1 year for a net-zero change.').map(i=>i.suggestion),['0','one']);
});
test('version strings, numbered buildings, committees and spaced chapter citations retain figures',()=>{
 assert.equal(corrections('Use Data Guide v4.1, Building 2 Phase 1, Subcommittee 1 and Bargaining Units 1, 3, 4, 11, and 21. See 8 Cal. Code Regs., 3401 and Ch. 5 8 8 , S t a t s . 2019.').length,0);
 assert.deepEqual(corrections('Allow 1 year under 8 Cal. Code Regs., 3401.').map(i=>i.suggestion),['one']);
});
test('literal source names are preserved while ordinary uses of the same compounds are checked',()=>{
 const doc=makeDocument(['The Department of Healthcare Access and Infor-\nline 1 mation acts. The Missing Persons DNA Data Base Fund pays. California Health-\nline 2 care, Research and Prevention Tobacco Tax Act applies. Municipal Storm\nline 3 Water and Urban Runoff Discharges Mandate applies. School Bus Safety I and II applies. Centers for Medicare and Medicaid Services\nline 4 approved projects continue. Ordinary storm water and data sharing agreements remain.'],'Current');
 const corrections=jointStylisticIssues(doc,refs).filter(i=>!i.matchesPrimary);assert.deepEqual(corrections.map(i=>i.suggestion),['stormwater','data-sharing']);
});
test('a citation continues across a PDF page header without treating the next identifier as a quantity',()=>{
 const doc=makeDocument(['Budget Act of 2026.\nline 1 Chs. 4','AB 109 — 2 —\nItem Amount\nline 1 and 5, Stats. 2025.\nline 2 A report covers 1 year.'],'Current');
 const heading=doc.blocks.find(b=>b.text==='Item Amount');heading.formatting={headerParts:[{},{}]};
 assert.deepEqual(numeralIssues(doc,refs).filter(i=>!i.matchesPrimary).map(i=>i.suggestion),['one']);
});
