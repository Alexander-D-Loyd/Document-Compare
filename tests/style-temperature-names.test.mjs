import {jointStylisticIssues} from '../app/joint-style.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {measurementIssues} from '../app/style-measures.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>measurementIssues(makeDocument([text],'Current'),refs).filter(i=>i.checkId==='temperature-name');
test('explicit temperature scale names use LCB capitalization with independent agreement checks',()=>{
 const found=check('Use 20 degrees celsius, 68 degrees fahrenheit and 20 degrees Centigrade.');assert.deepEqual(found.map(i=>i.suggestion),['Celsius','Fahrenheit']);assert.equal(check('Use 20 degrees Celsius and 68 degrees Fahrenheit.').length,0);
});
test('quoted names, unrelated words and struck text are preserved',()=>{
 assert.equal(check('See “degrees celsius” and the Celsius research group.').length,0);
 const doc=makeDocument(['Use degrees celsius.'],'Current');doc.struck=[{start:12,end:19}];assert.equal(measurementIssues(doc,refs).length,0);
});

test('the centigrade/Celsius guide choice is excluded under the user policy',()=>{
 for(const term of ['centigrade','Centigrade','Celsius'])assert.equal(jointStylisticIssues(makeDocument(['Use 20 degrees '+term+'.'],'Current'),refs).length,0,term);
 assert.ok(refs.lcb.pages[17].text.includes('centigrade'));assert.ok(refs.gpo.pages[249].text.includes('Preferred form (superseding Centigrade)'));
});
