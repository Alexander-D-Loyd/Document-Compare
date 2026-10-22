import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {CHECK_COVERAGE}from '../app/style-coverage.mjs';import {styleRuleInventory}from '../app/style-rule-inventory.mjs';import {makeDocument}from '../app/core.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),inventory=styleRuleInventory(refs),coverage=title=>{const row=CHECK_COVERAGE.find(item=>item.title===title);assert.ok(row,title);return row;},row=id=>{const result=inventory.find(item=>item.id===id);assert.ok(result,id);return result;};
function check(body,kind='bill'){const doc={...makeDocument([body],'Current'),styleDocumentType:kind},saved=JSON.stringify(doc),issues=jointStylisticIssues(doc,refs);for(const issue of issues)assert.equal(doc.text.slice(issue.start,issue.end),issue.text);assert.equal(JSON.stringify(doc),saved);return issues;}

test('modifier-chain coverage explicitly distinguishes disabled entry-level patterns from finite listed chains',()=>{
 const entry=coverage('Modifier chains and entry level');assert.equal(entry.status,'Selected contextual checks');assert.match(entry.text,/Generic entry level pattern checks are disabled/);assert.doesNotMatch(entry.text,/Entry level is checked/);assert.match(entry.text,/source-listed.*finite noun heads/);
 assert.deepEqual(check('The office shall provide entry level training.'),[]);const retained=check('The office provides entry level owner occupied housing.');assert.deepEqual(retained.map(issue=>issue.suggestion),['owner-occupied']);assert.equal(retained.some(issue=>/entry level/iu.test(issue.text)),false);
});

test('end-word coverage describes actual LCB wildland priority without claiming exclusion',()=>{
 const entry=coverage('Complete end-word exceptions');assert.match(entry.text,/wildland\/wildlands follows the printed LCB solid form/);assert.doesNotMatch(entry.text,/wildland\/wildlands[^.]*excluded/);assert.match(entry.text,/unfamiliar noun roles and meanings remain manual/);
 const found=check('The ground water reaches the wild land.');assert.deepEqual(found.map(issue=>issue.suggestion),['groundwater','wildland']);assert.ok(found.every(issue=>issue.checkId==='lcb-guide-priority'));assert.deepEqual(check('The groundwater reaches the wildland.'),[]);
});

test('capitalization summary and page19 inventory retain actual LCB priority',()=>{
 const entry=coverage('Capitalization'),page=row('lcb-page-19');assert.match(entry.text,/applicable LCB forms taking priority/);assert.doesNotMatch(entry.text,/known guide conflicts excluded|unrelated guide disagreements remain excluded/);assert.match(page.scope,/federal government form follows LCB priority/);assert.doesNotMatch(page.scope,/conflicts excluded/);
 const found=check('The Federal Government shall provide healthcare.');assert.deepEqual(found.map(issue=>issue.suggestion),['federal government','health care']);assert.ok(found.every(issue=>issue.checkId==='lcb-guide-priority'));assert.deepEqual(check('The federal government shall provide health care.'),[]);
});

test('canonical Constitution row matches the explicit Opinion role and preserves its Cover letter limit',()=>{
 const entry=row('lcb-entry-20-state-and-federal-constitutions-opinions-california-and-united-states-constitutions-bills');assert.equal(entry.status,'Partially automated');assert.match(entry.scope,/Explicit Opinion selection also checks/);assert.match(entry.scope,/Cover letter selection does not activate/);assert.doesNotMatch(entry.scope,/Opinion usage.*manual/);assert.match(entry.scope,/Unresolved short-form Constitutions/);
 const body='The State and Federal Constitutions apply.',found=check(body,'opinion').filter(issue=>issue.checkId==='lcb-opinion-forms');assert.deepEqual(found.map(issue=>issue.suggestion),['state and federal Constitutions']);assert.equal(check(body,'cover-letter').some(issue=>issue.checkId==='lcb-opinion-forms'&&issue.suggestion==='state and federal Constitutions'),false);assert.equal(check('The state and federal Constitutions apply.','opinion').some(issue=>issue.checkId==='lcb-opinion-forms'),false);
});

test('canonical Supreme Court row acknowledges only supported finite state qualifiers',()=>{
 const entry=row('lcb-entry-20-supreme-court-u-s-and-state');assert.equal(entry.status,'Partially automated');assert.match(entry.scope,/Selected state-prefix and of-this\/that\/the-state references/);assert.match(entry.scope,/intact finite court predicate/);assert.doesNotMatch(entry.scope,/Short descriptive state references.*excluded/);assert.match(entry.scope,/legal entity status remain manual/);
 const found=check('The supreme court of this state shall act.').filter(issue=>issue.checkId==='lcb-explicit-capitalization-qualifier');assert.deepEqual(found.map(issue=>issue.suggestion),['Supreme Court']);assert.equal(check('The Supreme Court of this state shall act.').some(issue=>issue.checkId==='lcb-explicit-capitalization-qualifier'),false);
});

test('amount summary acknowledges selected Opinion forms and preserves unknown-context limitations',()=>{
 const entry=coverage('Numerals: amounts, fractions and specialized forms');assert.match(entry.text,/Explicit Opinion and Cover letter selection supplies/);assert.match(entry.text,/other Opinion\/Cover letter contexts/);assert.doesNotMatch(entry.text,/Unknown provision types, opinions,/);assert.match(entry.text,/complex ratios.*manual review/);
 for(const kind of ['opinion','cover-letter']){const found=check('The fee is ten dollars.',kind).filter(issue=>issue.checkId==='lcb-opinion-forms');assert.deepEqual(found.map(issue=>issue.suggestion),['$10']);assert.equal(check('The fee is $10.',kind).some(issue=>issue.checkId==='lcb-opinion-forms'),false);}assert.equal(check('The fee is ten dollars.','bill').some(issue=>issue.checkId==='lcb-opinion-forms'),false);
});

test('metadata repair never re-enables broad parser prefix fuzzy or full-rule claims',()=>{
 for(const title of ['Selected suffix boundaries','Near-matching official entity names','Parsed numerical relationships across clauses'])assert.equal(coverage(title).status,'Disabled — manual review');
 for(const title of ['Parsed predicate compounds','Qualified noun-prefix review','Complete noun-prefix review','Unfamiliar unit modifiers'])assert.equal(coverage(title).status,'Disabled — manual review');
 for(const id of ['lcb-entry-9-bi-all-one-word','lcb-entry-11-in-as-a-prefix-generally-one-word','lcb-entry-12-multi-all-uses-one-word','lcb-entry-12-non-as-a-prefix-generally-one-word'])assert.equal(row(id).status,'Manual review required');
 assert.equal(row('lcb-21-opinions-and-cover-letters-source').status,'Partially automated');assert.equal(inventory.some(item=>item.guide==='lcb'&&item.status==='Fully automated'),false);
});
