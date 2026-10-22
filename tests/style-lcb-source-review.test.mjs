import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {lcbSourceReviewIssues,lcbSourceReviewRows} from '../app/style-lcb-source-review.mjs';
import {reviewStyleIssues} from '../app/style-review.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=t=>lcbSourceReviewIssues(makeDocument([t],'Current'),refs);


test('complete unqualified mismatches are questions while unknown modifier roles stay quiet',()=>{
 const doc=makeDocument(['The panel considers in kind thermotherapy, school based textiles and an African-American protocol.'],'Current'),before=JSON.stringify(doc),issues=lcbSourceReviewIssues(doc,refs);
 assert.deepEqual(issues.map(i=>i.matchText),['African-American']);
 assert.equal(issues[0].suggestion,null);assert.ok(issues[0].references.some(r=>r.rule==='African American'));assert.equal(doc.text.slice(issues[0].start,issues[0].end),issues[0].text);assert.equal(JSON.stringify(doc),before);
});
test('matching printed spellings stay quiet without a grammatical role proof',()=>{
 for(const text of ['Staff have full time obligations. The release is hands free.','Load-serving entities receive state-mandated services.','The state reimburses costs mandated by the state.','State-mandated local program: yes.','The panel considers full-time thermotherapy.'])assert.deepEqual(check(text),[],text);
});
test('unlisted prefix roots and productive ending guesses are outside source comparisons',()=>{
 for(const text of ['A bi-astronomical and multi-galactic criterion is non-zoological and in-operable.','An asteroid related protocol applies. The school based textiles are retained.'])assert.deepEqual(check(text),[],text);
});
test('precise listed correction owns its fallback comparison',()=>{
 const doc=makeDocument(['The board provides other in kind or cash assistance. An asteroid related protocol applies.'],'Current');
 const full=reviewStyleIssues(doc,refs,{includeReviewSuggestions:true,includeCompleteLcbReview:true});assert.deepEqual(full.filter(i=>i.matchText==='in kind'||i.text==='in kind').map(i=>i.suggestion),['in-kind']);assert.ok(!full.some(i=>i.text==='asteroid related'));
});
test('every source table row retains its exact page and text',()=>{
 const rows=lcbSourceReviewRows(refs.lcb),lexical=rows.filter(r=>r.id.startsWith('lcb-source-'));assert.equal(lexical.length,663);for(const row of lexical)assert.ok(refs.lcb.pages.find(p=>p.page===row.page).lexicalEntries.includes(row.text),row.id);assert.equal(rows.filter(r=>r.page===15).length,47);assert.equal(new Set(rows.map(r=>r.id)).size,rows.length);
});
test('literal names identifiers rhetorical dashes and headings cannot establish a mismatch',()=>{
 for(const text of ['The terms “in kind” and ‘in kind’ are literal.','The In Kind Institute has operated.','The in kindα protocol applies.','The in—kind protocol applies.','https://example.test/in-kind/record'])assert.deepEqual(check(text),[],text);
});
test('every character of a complete mismatch remains protected',()=>{
 const term='African-American',doc=makeDocument(['The panel studies '+term+' textiles.'],'Current'),start=doc.text.indexOf(term);assert.ok(lcbSourceReviewIssues(doc,refs).length);
 for(let at=start;at<start+term.length;at++)for(const field of ['struck','excluded']){const d=structuredClone(doc);d[field].push({start:at,end:at+1});assert.ok(!lcbSourceReviewIssues(d,refs).some(i=>i.start<=at&&i.end>at));}
});
test('physical margins and word divisions retain exact original selections',()=>{
 const doc=makeDocument(['line 1 The staff study African-\nline 2 American thermotherapy.'],'Current'),issues=lcbSourceReviewIssues(doc,refs);assert.deepEqual(issues.map(i=>i.matchText),['African- American']);for(const i of issues)assert.equal(doc.text.slice(i.start,i.end),i.text);
 const correct=makeDocument(['line 1 A hands-','line 1 free observation applies.'],'Current',[],[],new Set(['hands-free']));assert.deepEqual(lcbSourceReviewIssues(correct,refs),[]);
});
test('missing listed source does not manufacture authority',()=>{
 const changed=structuredClone(refs);changed.lcb.pages.find(p=>p.page===11).lexicalEntries=changed.lcb.pages.find(p=>p.page===11).lexicalEntries.filter(e=>e!=='in-kind (u.m.)');assert.deepEqual(lcbSourceReviewIssues(makeDocument(['The panel studies in kind textiles.'],'Current'),changed),[]);assert.deepEqual(lcbSourceReviewIssues(makeDocument(['An in kind protocol applies.'],'Current'),{}),[]);
});
test('listed names preserve exact internal capitals',()=>{
 for(const term of ['African-American','Asian-American','Mexican-American','limited-English-proficiency','medi-cal','MediCal','Medi Cal'])assert.ok(check('The staff study '+term+' carefully.').some(i=>i.text===term),term);
 for(const term of ['African American','limited English proficiency','Medi-Cal'])assert.deepEqual(check('The staff study '+term+' carefully.'),[],term);
});
test('explicit numbered capitalization conditions still apply without guessing other roles',()=>{
 assert.deepEqual(check('The court shall apply Section 12 in this state. The payment schedule applies.'),[]);
 assert.ok(check('This section 12 governs.').some(i=>i.matchText==='section'));assert.ok(check('The funds in schedule (1)(d) are available.').some(i=>i.matchText==='schedule'));
 for(const text of ['The funds in Schedule (1)(d) are available.','The funds in Schedule are available.','The court of appeals shall act.'])assert.deepEqual(check(text),[],text);
});
