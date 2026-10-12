import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {wordChoiceIssues} from '../app/style-word-choice.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>jointStylisticIssues(makeDocument([text],'Current'),refs).filter(i=>i.checkId==='word-choice');
test('horse racing spelling requires an explicit local domain cue',()=>{
 assert.ok(check('The horse racing enclosure shall be inspected.').some(i=>i.suggestion==='inclosure'));
 for(const text of ['The horse racing inclosure shall be inspected.','The motor racing enclosure shall be inspected.','The building enclosure is sound.','The quote “horse racing enclosure” is literal.','The Horse Racing Enclosure Corporation acts.'])assert.equal(check(text).length,0,text);
});
test('Commercial Code spelling is scoped to its codified section, not the whole bill',()=>{
 const text='SECTION 1. Section 3204 of the Commercial Code is amended to read:\n3204. An endorsement is required. Multiple endorsements are accepted.\nSEC. 2. Section 9 of the Insurance Code is amended to read:\n9. An endorsement is required.';
 assert.deepEqual(check(text).map(i=>i.suggestion),['indorsement','indorsements']);
 const corrected=text.replace('An endorsement is required.','An indorsement is required.').replace('Multiple endorsements','Multiple indorsements');assert.equal(check(corrected).length,0);
 for(const text of ['The Commercial Code governs endorsement rules.','SECTION 1. The Legislature finds and declares that endorsements are used in the Commercial Code.','The insurance endorsement is required.'])assert.equal(check(text).length,0,text);
});
test('domain spelling checks exclude source strikeouts and preserve whole-word ranges',()=>{
 const doc=makeDocument(['SECTION 1. Section 3204 of the Commercial Code is amended to read:\n3204. The endorsements are required.'],'Current');const i=wordChoiceIssues(doc,refs)[0];assert.equal(doc.text.slice(i.start,i.end),'endorsements');doc.struck=[{start:i.start,end:i.end}];assert.equal(wordChoiceIssues(doc,refs).length,0);
});
