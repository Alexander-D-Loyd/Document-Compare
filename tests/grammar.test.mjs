import assert from 'node:assert/strict';
import {makeDocument} from '../app/core.mjs';
import {grammarIssues} from '../app/grammar.mjs';
const doc=makeDocument(['line 1 They is ready. An report repeats repeats words.\nline 2 We should of checked this.'],'current');
const issues=grammarIssues(doc);
assert.equal(issues.length,4);
for(const issue of issues){assert.ok(doc.text.slice(issue.start,issue.end).trim());assert.ok(issue.suggestion);assert.ok(!doc.excluded.some(r=>r.start<issue.end&&r.end>issue.start));}
assert.equal(grammarIssues(makeDocument(['They are ready. A report includes an amendment. A university had had a problem.'],'okay')).length,0);
assert.equal(grammarIssues(makeDocument(['They\nis ready.'],'wrapped')).length,1);
const struck=makeDocument(['They is ready.'],'struck',[[{start:0,end:7}]]);
assert.equal(grammarIssues(struck).length,0);
console.log('PASS: grammar rules, suggestions, source offsets, wrapping, exclusions and pronunciation exceptions');
