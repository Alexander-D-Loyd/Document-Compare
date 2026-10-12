import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {contractionIssues,CONTRACTION_FORMS} from '../app/style-contractions.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
test('each supported contraction has precise detection with either apostrophe',()=>{
 for(const r of CONTRACTION_FORMS)for(const apostrophe of ["'",'’']){const text='The text says '+r.form.replace("'",apostrophe)+' proceed.',doc=makeDocument([text],'Current'),found=contractionIssues(doc,refs);assert.equal(found.length,1,r.form);assert.equal(text.slice(found[0].start,found[0].end),r.form.replace("'",apostrophe));assert.deepEqual(found[0].alternatives,r.expansions);assert.equal(contractionIssues(makeDocument(['The text says '+r.expansions[0]+' proceed.'],'Current'),refs).length,0);assert.ok(jointStylisticIssues(doc,refs).some(i=>i.rule==='Spelling and usage, item 3'||i.category==='Contractions'));}
});
test('ambiguous expansions are explicit alternatives rather than an asserted meaning',()=>{
 const doc=makeDocument(["She's eligible. They'd qualify. It's required."],'Current'),issues=contractionIssues(doc,refs);assert.deepEqual(issues.map(i=>i.alternatives),[['She is','She has'],['They had','They would'],['It is','It has']]);assert.ok(issues.every(i=>i.message.includes('depends on meaning')));
});
test('possessives, literal source copy, names and removed text stay protected',()=>{
 for(const text of ['The contractor’s license applies.','The workers’ compensation is paid.','The driver’s license is required.','O’Neill’s report applies.','The term “she’s eligible” is literal.','The term "they\'d qualify" is literal.',"The Who's Who title is shown."])assert.equal(contractionIssues(makeDocument([text],'Current'),refs).length,0,text);
 const doc=makeDocument(["She's eligible."],'Current');doc.struck=[{start:0,end:5}];assert.equal(contractionIssues(doc,refs).length,0);
});
