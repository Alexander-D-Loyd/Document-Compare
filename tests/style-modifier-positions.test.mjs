import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument} from '../app/core.mjs';import {modifierPositionIssues} from '../app/style-modifier-positions.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>modifierPositionIssues(makeDocument([text],'Current'),refs);
test('source adjective examples distinguish noun-modifier and predicate positions',()=>{
 assert.deepEqual(check('Use crystal clear water and fire tested material. The water is crystal-clear. The material is fire-tested.').map(i=>i.suggestion),['crystal-clear','fire-tested','crystal clear','fire tested']);
 assert.equal(check('Use crystal-clear water and fire-tested material. The water is crystal clear. The material is fire tested.').length,0);
 assert.equal(check('The water is a crystal-clear substance. The material is a fire-tested product. Crystal Clear Water District acts. The source says “crystal clear water”.').length,0);
 assert.ok(check('Use fire tested material.')[0].references.some(r=>r.rule==='7.7'));
});
test('wrapped modifier spans retain their exact source positions and ignore removed wording',()=>{
 const doc=makeDocument(['line 1 Use fire\nline 2 tested material.'],'Current');const found=jointStylisticIssues(doc,refs);assert.equal(found.length,1);assert.equal(found[0].suggestion,'fire-tested');assert.equal(found[0].matchText,'fire tested');assert.equal(doc.text.slice(found[0].start,found[0].end),found[0].text);
 doc.struck=[{start:found[0].start,end:found[0].end}];assert.equal(modifierPositionIssues(doc,refs).length,0);
});
