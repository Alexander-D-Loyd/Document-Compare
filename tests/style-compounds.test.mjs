import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
import {makeDocument} from '../app/core.mjs';import {compoundIssues,END_WORD_RULES,OPEN_END_RULES} from '../app/style-compounds.mjs';
const refs={lcb:JSON.parse(fs.readFileSync(new URL('../app/data/lcb-reference.json',import.meta.url)))};
const check=text=>compoundIssues(makeDocument([text],'Current'),refs);
test('every encoded LCB end-word example has a source entry, detects close variants and accepts its preferred form',()=>{
 for(const rule of [...END_WORD_RULES,...OPEN_END_RULES]){
  assert.ok(refs.lcb.pages[14].text.includes(rule.preferred),rule.preferred);
  const bad='Review the '+rule.variant+' carefully.',found=check(bad);
  assert.ok(found.some(i=>i.suggestion===rule.preferred),rule.variant);
  assert.equal(check('Review the '+rule.preferred+' carefully.').length,0,rule.preferred);
 }
});
test('LCB end-word exceptions, headings, source strikeouts and wrapped offsets are preserved',()=>{
 assert.equal(check('The certificate holder uses forest land, state park land, a low water mark, and a high water mark.').length,0);
 assert.equal(check('The state park lands are available.').length,0);
 assert.equal(check('POLICY HOLDER\nThe Ground Water Authority acts.').length,0);
 const doc=makeDocument(['line 1 The credential\nline 2 holder acts.'],'Current');const issue=compoundIssues(doc,refs)[0];assert.equal(issue.suggestion,'credentialholder');assert.equal(doc.text.slice(issue.start,issue.end),issue.text);
 doc.struck=[{start:issue.start,end:issue.end}];assert.equal(compoundIssues(doc,refs).length,0);
});
test('noun and attributive compounds are distinguished from their verb phrases',()=>{
 assert.deepEqual(check('The clean up costs apply to the start up program. The follow up is required.').map(i=>i.suggestion),['cleanup','startup','followup']);
 assert.equal(check('The workers clean up the site, follow up with the owner, and start up the engine.').length,0);
 assert.equal(check('The cleanup costs fund a startup program.').length,0);
});

test('real-corpus line division and extended mandate names are not compound errors',()=>{
 assert.equal(check('line 1 Support work-\nline 2 load associated with the program.').length,0);
 assert.equal(check('line 1 Municipal Storm\nline 2 Water and Urban Runoff Discharges Mandate applies.').length,0);
 assert.equal(check('The workers must clean up work areas and shall start up equipment.').length,0);
 assert.equal(check('The work-load applies.')[0].suggestion,'workload');
});

test('expanded compounds ignore the conflicting ground-water form',()=>{
 const guides={...refs,gpo:JSON.parse(fs.readFileSync(new URL('../app/data/gpo-reference.json',import.meta.url)))};
 const issue=jointStylisticIssues(makeDocument(['Compare ground water levels.'],'Current'),guides).find(i=>i.text==='ground water');
 assert.equal(issue,undefined);
});

test('ordinary noun plurals and fixed hyphenated nouns retain inflections and open exceptions',()=>{
 assert.deepEqual(check('The policy holders and decision makers use rights of way.').map(i=>i.suggestion),['policyholders','decisionmakers','rights-of-way']);
 assert.equal(check('The policyholders and decisionmakers use rights-of-way. The certificate holders act.').length,0);
 assert.equal(check('The community wide programs serve all communities.')[0].suggestion,'communitywide');
 assert.deepEqual(check('An attorney in fact handles a cross complaint concerning wellbeing.').map(i=>i.suggestion),['attorney-in-fact','cross-complaint','well-being']);
});
