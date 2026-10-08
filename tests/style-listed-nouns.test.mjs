import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {listedNounIssues,LISTED_NOUN_RULES} from '../app/style-listed-nouns.mjs';
const refs={lcb:JSON.parse(fs.readFileSync(new URL('../app/data/lcb-reference.json',import.meta.url)))};
test('every encoded listed noun has a violation, compliant form and exact source reference',()=>{
 for(const r of LISTED_NOUN_RULES){const doc=makeDocument(['The '+r.variant+' is available.'],'Current'),found=listedNounIssues(doc,refs);assert.ok(found.some(i=>i.suggestion===r.preferred&&i.guidePage===r.page),r.variant);assert.equal(listedNounIssues(makeDocument(['The '+r.preferred+' is available.'],'Current'),refs).length,0,r.preferred);for(const i of found)assert.equal(doc.text.slice(i.start,i.end),i.text);}
});
test('uncued uses, literal titles, quotes, source divisions and removed wording avoid noun joins',()=>{
 const doc=makeDocument(['People work day and night. The “work force” is named. School Bus Safety I and II is a title. The work-\nline 1 force acts.'],'Current');assert.equal(listedNounIssues(doc,refs).length,0);
 const removed=makeDocument(['The work force acts.'],'Current');removed.struck=[{start:4,end:14}];assert.equal(listedNounIssues(removed,refs).length,0);
});
