import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {referenceIssues} from '../app/style-references.mjs';import {GPO_ASSESSMENTS} from '../app/style-rule-assessments.mjs';
const refs={gpo:JSON.parse(fs.readFileSync(new URL('../app/data/gpo-reference.json',import.meta.url)))};
const check=text=>referenceIssues(makeDocument([text],'Current'),refs);
test('chained section and paragraph identifiers close up while shared-prefix alternatives stay spaced',()=>{
 assert.deepEqual(check('See Section 7 (B) (1) (a), paragraph 23 (a), and paragraph (a) (2).').map(i=>i.suggestion),['Section 7(B)(1)(a)','paragraph 23(a)','paragraph (a)(2)']);
 assert.equal(check('See section 9(a) (1) and (2), section 7 a and b, and section 7(B)(1)(a).').length,0);
});
test('reference checks retain wrapped source offsets and ignore removed references',()=>{
 const doc=makeDocument(['line 1 See Section 7\nline 2 (a).'],'Current');const issue=referenceIssues(doc,refs)[0];assert.equal(issue.suggestion,'Section 7(a)');assert.equal(doc.text.slice(issue.start,issue.end),issue.text);
 doc.struck=[{start:issue.start,end:issue.end}];assert.equal(referenceIssues(doc,refs).length,0);
});
test('all chapter 2 rules have an explicit audited applicability or manual-check explanation',()=>{
 assert.equal([...GPO_ASSESSMENTS.keys()].filter(id=>id.startsWith('2.')).length,128);for(let n=1;n<=128;n++)assert.ok(GPO_ASSESSMENTS.get('2.'+n)?.scope.length>80);
 assert.equal(GPO_ASSESSMENTS.get('2.25').status,'Partially automated');assert.equal(GPO_ASSESSMENTS.get('2.74').status,'Manual review required');
 assert.ok(refs.gpo.pages[26].text.includes('2.25.'));
});
