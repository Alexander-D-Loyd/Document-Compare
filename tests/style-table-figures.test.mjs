import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>jointStylisticIssues(makeDocument([text],'Current'),refs);
test('recognized budget amount cells use figures without applying prose spelling to table labels',()=>{
 const doc=makeDocument(['Budget Act of 2026\nItem Amount\nline 1 Support of Five Rivers Program............. two thousand\nline 2 Local assistance.......................... five'],'Current');
 const found=jointStylisticIssues(doc,refs);assert.deepEqual(found.map(i=>i.suggestion),['2,000','5']);assert.ok(found.every(i=>i.context==='Table'&&i.references.some(r=>r.rule==='13.101')&&doc.text.slice(i.start,i.end)===i.text));
 assert.equal(check('Budget Act of 2026\nItem Amount\nSupport of Five Rivers Program............. 2,000\nLocal assistance.......................... 5').length,0);
});
test('table names, None, unrelated leaderwork and source strikeouts do not become amounts',()=>{
 assert.equal(check('Budget Act of 2026\nItem Amount\nProgram................... None\nOrganization.............. Five Rivers\nAccount................... one two').length,0);
 assert.equal(check('Named works\nTitle.................. One').length,0);
 const doc=makeDocument(['Budget Act of 2026\nItem Amount\nProgram................... two thousand'],'Current');const start=doc.text.indexOf('two thousand');doc.struck=[{start,end:start+12}];assert.equal(jointStylisticIssues(doc,refs).length,0);
});

test('terminal periods before separated budget leaders are omitted while abbreviations remain literal',()=>{
 const doc=makeDocument(['Budget Act of 2026\nItem Amount\nLocal assistance. ............ 2,000\nEquipment. ............ $5,000\nDept. ............ 300\nMisc. ............ 100\nProgram.................. 12'],'Current');
 const found=jointStylisticIssues(doc,refs);assert.equal(found.length,2);
 assert.ok(found.every(i=>i.rule==='14.1'&&i.text==='.'&&i.suggestion===''&&doc.text.slice(i.start,i.end)==='.'));
 assert.equal(check('Contents\nLocal assistance. ............ 20').length,0);
});
