import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {metricDefinitionIssues} from '../app/style-metric-definitions.mjs';import {METRIC_UNITS,METRIC_SYMBOLS} from '../app/metric-units.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
import {numeralIssues} from '../app/style-numerals.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>metricDefinitionIssues(makeDocument([text],'Current'),refs);
test('each GPO prefix and base unit has a consistent explicit name/symbol check',()=>{
 assert.equal(METRIC_UNITS.length,78);
 for(const r of METRIC_UNITS){
  const wrong=r.symbol==='g'?'m':'g',text='The quantity is measured in '+(r.plural||r.name+'s')+' ('+wrong+').';
  const found=check(text);assert.equal(found.length,1,r.name);assert.equal(found[0].suggestion,r.symbol);assert.equal(text.slice(found[0].start,found[0].end),wrong);
  assert.equal(check('The quantity is measured in '+(r.plural||r.name+'s')+' ('+r.symbol+').').length,0,r.name);
 }
});
test('explicit names resolve significant prefix case without rewriting ambiguous isolated symbols',()=>{
 assert.deepEqual(check('Use milligrams (MG), megagrams (mg), liters (l), and kilograms (Kg).').map(i=>i.suggestion),['mg','Mg','L','kg']);
 for(const text of ['Use micrograms (µg) and micrometers (μm).','The grams (dry) are weighed.','Use 5 Mpa of pressure.','A literal “milligrams (MG)” is shown.','Use liters (total).','Use grams (mass).'])assert.equal(check(text).length,0,text);
});
test('SI symbols remain figures while ordinary durations and legal references keep separate rules',()=>{
 for(const symbol of METRIC_SYMBOLS){const issues=jointStylisticIssues(makeDocument(['Use 5 '+symbol+' of material.'],'Current'),refs);assert.ok(!issues.some(i=>i.checkId==='numerals'&&i.text==='5'),symbol);}
 const doc=makeDocument(['Wait 1 year under Article 1 and Section 1.'],'Current'),raw=numeralIssues(doc,refs);assert.ok(raw.some(i=>i.suggestion==='one'&&i.conflict));assert.ok(!raw.some(i=>i.text==='1'&&i.start>15));assert.deepEqual(jointStylisticIssues(doc,refs).map(i=>[i.text,i.suggestion]),[['1','one']]);
});
test('source wrapping keeps precise symbol highlights and deleted definitions stay excluded',()=>{
 const doc=makeDocument(['line 1 Use milligrams\nline 2 (MG) of material.'],'Current');const i=metricDefinitionIssues(doc,refs)[0];assert.equal(doc.text.slice(i.start,i.end),'MG');assert.equal(i.suggestion,'mg');doc.struck=[{start:i.start,end:i.end}];assert.equal(metricDefinitionIssues(doc,refs).length,0);
});
