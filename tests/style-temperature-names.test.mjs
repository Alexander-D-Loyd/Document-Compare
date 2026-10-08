import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {measurementIssues} from '../app/style-measures.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>measurementIssues(makeDocument([text],'Current'),refs).filter(i=>i.checkId==='temperature-name');
test('explicit temperature scale names use LCB capitalization and the sourced Celsius preference',()=>{
 const found=check('Use 20 degrees celsius, 68 degrees fahrenheit and 20 degrees Centigrade.');assert.deepEqual(found.map(i=>i.suggestion),['Celsius','Fahrenheit','Celsius']);assert.ok(found[2].references.some(r=>r.rule==='9.56, temperature footnote'));assert.equal(check('Use 20 degrees Celsius and 68 degrees Fahrenheit.').length,0);
});
test('quoted names, unrelated words and struck text are preserved',()=>{
 assert.equal(check('See “degrees celsius” and the Celsius research group.').length,0);
 const doc=makeDocument(['Use degrees celsius.'],'Current');doc.struck=[{start:12,end:19}];assert.equal(measurementIssues(doc,refs).length,0);
});
