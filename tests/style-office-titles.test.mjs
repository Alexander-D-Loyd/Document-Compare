import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {officeTitleIssues} from '../app/style-office-titles.mjs';
const refs={lcb:JSON.parse(fs.readFileSync(new URL('../app/data/lcb-reference.json',import.meta.url)))};
const check=text=>officeTitleIssues(makeDocument([text],'Current'),refs);
test('standalone office words are distinguished from complete official names and quoted definitions',()=>{
 assert.deepEqual(check('The Department shall act. The Board of Supervisors may act. Each Trustee is appointed.').map(i=>i.suggestion),['department','board of supervisors','trustee']);
 assert.equal(check('The Department of Finance shall act. The board of supervisors may act. The Director of Finance acts.').length,0);
 assert.equal(check('“Department” means the Department of Finance. The Department shall act.').length,0);
});
test('Superintendent exception requires Education Code context and an explicit Public Instruction referent',()=>{
 const prefix='SECTION 1. Section 123 of the Education Code is amended to read:\n123. “superintendent” means the Superintendent of Public Instruction. ';
 assert.equal(check(prefix+'The superintendent shall act.')[0].suggestion,'Superintendent');
 assert.equal(check(prefix+'The county superintendent shall act. The Superintendent shall act.').length,0);
 assert.equal(check(prefix.replace('Education Code','Government Code')+'The superintendent shall act.').length,0);
 assert.equal(check('SECTION 1. Section 123 of the Education Code is amended to read:\n123. The superintendent shall act.').length,0);
});
test('office checks preserve source offsets across margin labels and ignore crossed source wording',()=>{
 const doc=makeDocument(['line 1 The Board of\nline 2 Supervisors shall act.'],'Current');const issue=officeTitleIssues(doc,refs)[0];assert.equal(issue.suggestion,'board of supervisors');assert.equal(doc.text.slice(issue.start,issue.end),issue.text);
 doc.struck=[{start:issue.start,end:issue.end}];assert.equal(officeTitleIssues(doc,refs).length,0);
});
