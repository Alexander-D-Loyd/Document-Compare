import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {openingMeasureIssues} from '../app/style-opening-measures.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {METRIC_UNITS} from '../app/metric-units.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>openingMeasureIssues(makeDocument([text],'Current'),refs);
test('sentence-opening SI quantities spell out both the figure and recognized unit',()=>{
 for(const unit of METRIC_UNITS){const text='5 '+unit.symbol+' is required.';const found=check(text);assert.equal(found.length,1,text);assert.equal(found[0].suggestion,'Five '+(unit.plural||unit.name+'s'));assert.equal(text.slice(found[0].start,found[0].end),'5 '+unit.symbol);assert.equal(check('Five '+(unit.plural||unit.name+'s')+' is required.').length,0);}
 assert.equal(check('1 L is required.')[0].suggestion,'One liter');assert.equal(check('1,000 kg is required.')[0].suggestion,'One thousand kilograms');
 assert.equal(check('The test is complete. 5 μg is required.')[0].suggestion,'Five micrograms');
});
test('ordinary figures, citations, decimals, quotations and tables remain protected',()=>{
 for(const text of ['Use 5 kg of material.','Section 5 m is referenced.','Article 1 L is referenced.','2.5 kg is required.','-5 kg is required.','“5 kg is required.”','$5 m is appropriated.','5 kg...........100','5 unknown is required.'])assert.equal(check(text).length,0,text);
 const doc=makeDocument(['5 kg is required.'],'Current');doc.struck=[{start:0,end:4}];assert.equal(openingMeasureIssues(doc,refs).length,0);
});
test('wrapped SI quantities retain full highlights and replace partial spacing suggestions',()=>{
 const doc=makeDocument(['line 1 5\nline 2 kg is required.'],'Current');const i=openingMeasureIssues(doc,refs)[0];assert.equal(doc.text.slice(i.start,i.end),'5\nline 2 kg');assert.equal(i.suggestion,'Five kilograms');
 const issues=jointStylisticIssues(makeDocument(['5kg is required.'],'Current'),refs);assert.equal(issues.filter(i=>i.start<3).length,1);assert.equal(issues.find(i=>i.start===0).suggestion,'Five kilograms');
});
