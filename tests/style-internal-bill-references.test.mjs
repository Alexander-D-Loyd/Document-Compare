import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
test('missing bill targets remain outside LCB style eligibility even with legacy review options',()=>{
 const doc=makeDocument(['The people of the State of California do enact as follows:\nSECTION 1. This act applies.\nSEC. 2. Section 9 of this bill shall become operative.'],'Current'),saved=JSON.stringify(doc);
 for(const includeReviewSuggestions of [false,true])assert.ok(!jointStylisticIssues(doc,refs,{includeReviewSuggestions}).some(i=>i.checkId==='lcb-internal-bill-reference-review'));
 assert.equal(JSON.stringify(doc),saved);
});
