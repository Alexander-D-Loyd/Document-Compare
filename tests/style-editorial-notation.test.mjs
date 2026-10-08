import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>jointStylisticIssues(makeDocument([text],'Current'),refs).filter(i=>i.checkId==='editorial-notation');
test('exact bracketed underscore annotation is checked without restyling source emphasis or literal text',()=>{
 assert.deepEqual(check('The extract follows [underscore supplied]. Preserve [emphasis in original], [emphasis added], and [emphasis ours].').map(i=>i.suggestion),['italic supplied']);
 assert.equal(check('The extract follows [italic supplied]. The term “underscore supplied” is literal.').length,0);
});
test('case connector requires an explicit legal cue and preserves other V initials',()=>{
 const doc=makeDocument(['The case of Smith V. Brown governs. Consider the decision in Jones V. Adams. Henry V. Jones signed the form. The phrase “case of Smith V. Brown” is quoted.'],'Current');
 const found=jointStylisticIssues(doc,refs).filter(i=>i.checkId==='editorial-notation');assert.deepEqual(found.map(i=>i.suggestion),['v.','v.']);assert.ok(found.every(i=>doc.text.slice(i.start,i.end)===i.text&&i.rule==='11.8'));
 assert.equal(check('The case of Smith v. Brown governs. Henry V. Jones signed the form.').length,0);
 doc.struck=[{start:doc.text.indexOf('V.'),end:doc.text.indexOf('V.')+2}];assert.equal(jointStylisticIssues(doc,refs).filter(i=>i.checkId==='editorial-notation').length,1);
});
