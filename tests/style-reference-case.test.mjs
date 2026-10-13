import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
import {styleRuleInventory} from '../app/style-rule-inventory.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>jointStylisticIssues(makeDocument([text],'Current'),refs).filter(i=>i.checkId==='reference-case'||i.checkId==='legal-references');
test('numbered-reference capitalization follows the explicit printed LCB forms',()=>{
 assert.deepEqual(check('See section 7 and Section 8, Schedule 1, and this section.').map(i=>[i.text,i.suggestion]),[['section','Section']]);assert.equal(check('See Section 7 and Schedule 1, and this section.').length,0);
 const rows=styleRuleInventory(refs);for(const text of ['Section (with number)','Schedule (with number)']){const r=rows.find(r=>r.guide==='lcb'&&r.page===19&&r.text===text);assert.equal(r.status,'Partially automated');assert.match(r.scope,/LCB takes priority/);assert.match(r.scope,/source evidence/);}
});
test('reference spacing and LCB capitalization combine without overlapping partial corrections',()=>{
 const found=check('See section 7 (a).');assert.equal(found.length,1);assert.equal(found[0].suggestion,'Section 7(a)');assert.equal(found[0].conflict,false);
});
test('section labels, quoted source wording, explicit titles and removed references avoid reference-case flags',()=>{
 assert.equal(check('SECTION 1.\nSee “section 7” and Section 2: Test Construction Theory.').length,0);
 const doc=makeDocument(['See section 7.'],'Current');doc.struck=[{start:4,end:11}];assert.equal(jointStylisticIssues(doc,refs).filter(i=>i.checkId==='reference-case').length,0);
});
