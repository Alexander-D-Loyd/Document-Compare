import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {suffixSpellingIssues,SUFFIX_SPELLINGS} from '../app/style-suffix-spelling.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>suffixSpellingIssues(makeDocument([text],'Current'),refs);
test('listed suffix examples flag close misspellings with their specific rule',()=>{
 for(const [bad,good,rule] of SUFFIX_SPELLINGS.filter(([bad])=>!['robing','robed'].includes(bad))){const text='The word '+bad+' appears.';const i=check(text)[0];assert.equal(i.suggestion,good);assert.equal(i.rule,rule);assert.equal(text.slice(i.start,i.end),bad);assert.equal(check('The word '+good+' appears.').length,0);assert.ok(jointStylisticIssues(makeDocument([text],'Current'),refs).some(i=>i.suggestion===good));}
});
test('valid clothing words, names, literal spellings, tables and strikeouts remain protected',()=>{
 for(const text of ['The robed judge enters the robing room.','The term “formating” is quoted.','The term "referrence" is quoted.','The Formating Company acts.','FORMATING IS REQUIRED','The formating.............100'])assert.equal(check(text).length,0,text);
 const doc=makeDocument(['The formating is shown.'],'Current');doc.struck=[{start:4,end:13}];assert.equal(suffixSpellingIssues(doc,refs).length,0);
});
