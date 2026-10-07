import test from 'node:test';
import assert from 'node:assert/strict';
import {makeDocument} from '../app/core.mjs';
import {verifyAmendments,nonAmendmentEdits} from '../app/amendments.mjs';
import {amendmentDeletionRanges} from '../app/amendment-highlights.mjs';
test('heading line deletion is scoped to authors and does not overlap unrelated numbered body lines',()=>{
 const before=makeDocument(['ASSEMBLY BILL No. 1\nIntroduced by Assembly Member A\n(Coauthors: Assembly Members B, C, D, and\nE)\n(Coauthor: Senator F)\nFebruary 9, 2026\nAn act to amend the Code.\nline 4 Old body wording.'],'previous');
 const after=makeDocument(['ASSEMBLY BILL No. 1\nIntroduced by Assembly Member A\n(Coauthors: Assembly Members C and D)\nFebruary 9, 2026\nAn act to amend the Code.\nline 4 New body wording.'],'current');
 const instructions='Amendment 1\nIn the heading, in line 2, strike out “B, C, D, and”, strike out line 3 and insert:\nC and D)\nAmendment 2\nIn the heading, strike out line 4\nAmendment 3\nOn page 1, in line 4, strike out “Old” and insert:\nNew';
 const results=verifyAmendments(instructions,before,after);assert.ok(results.every(r=>r.status==='implemented'));
 assert.deepEqual(nonAmendmentEdits(instructions,before,after,results).ranges,[[],[]]);
 const ranges=amendmentDeletionRanges(before,results[1],0);assert.equal(ranges.length,1);assert.equal(before.text.slice(ranges[0].start,ranges[0].end),'(Coauthor: Senator F)');
});
