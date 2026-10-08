import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {calendarAbbreviationIssues} from '../app/style-calendar-abbreviations.mjs';
const refs={gpo:JSON.parse(fs.readFileSync(new URL('../app/data/gpo-reference.json',import.meta.url)))};
const check=text=>calendarAbbreviationIssues(makeDocument([text],'Current'),refs);
test('explicit calendar abbreviations in ordinary prose expand with exact source citations',()=>{
 const found=check('Meet on Tues. and file by Jan. 1.');assert.deepEqual(found.map(i=>i.suggestion),['Tuesday','January']);assert.deepEqual(found.map(i=>i.rule),['9.46','9.44']);assert.equal(check('Meet on Tuesday and file by January 1.').length,0);
});
test('quoted, parenthetical reference, ambiguous month and tabulated usages remain protected',()=>{
 assert.equal(check('See “on Tues.” and (Pub. L. 119-21, on Jan. 1). File by Mar. Act.').length,0);
 const doc=makeDocument(['Meet on Tues.'],'Current');doc.blocks[0].formatting={headerGaps:[{},{}]};assert.equal(calendarAbbreviationIssues(doc,refs).length,0);
});
