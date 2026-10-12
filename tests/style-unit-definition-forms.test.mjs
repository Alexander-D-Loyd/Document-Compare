import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {metricDefinitionIssues} from '../app/style-metric-definitions.mjs';import {METRIC_UNITS,LCB_LISTED_UNIT_DEFINITIONS} from '../app/metric-units.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>metricDefinitionIssues(makeDocument([text],'Current'),refs);
test('explicit names resolve spaced and punctuated known unit symbols with exact whole-symbol selections',()=>{
 const text='The units are kilowatts (K W), megawatts (M.W.), and megabytes (M B).';
 assert.deepEqual(check(text).map(i=>[text.slice(i.start,i.end),i.suggestion,i.guideId]),[['K W','kW','lcb'],['M.W.','MW','lcb'],['M B','MB','lcb']]);
});
test('all source-defined metric symbols retain singular form in explicit plural-name pairs',()=>{
 for(const unit of [...METRIC_UNITS,...LCB_LISTED_UNIT_DEFINITIONS]){
  const symbol=unit.symbol+'s',text='The quantity is measured in '+(unit.plural||unit.name+'s')+' ('+symbol+').',found=check(text);
  assert.equal(found.length,1,unit.name);assert.equal(found[0].suggestion,unit.symbol);assert.equal(text.slice(found[0].start,found[0].end),symbol);
 }
});
test('LCB unit-name case needs an explicit measured quantity role rather than an apparent name',()=>{
 const text='Power is measured in KiloWatts (kW). Storage capacity in MegaBytes (MB) is specified. Output is expressed in MegaWatts (M Ws).';
 assert.deepEqual(check(text).map(i=>i.suggestion),['kilowatts','megabytes','megawatts','MW']);
 for(const text of ['Megawatts (MW) measure power.','The company called Megabyte (MB) is registered.','The text refers to KILOWATTS (kW).','The table caption Megawatt (MW) is shown.'])assert.equal(check(text).length,0,text);
});
test('unknown symbol meanings and isolated abbreviations are not rewritten',()=>{
 for(const text of ['The symbol MBs is displayed.','Use 3 MBs of storage.','The grams (dry) are weighed.','Use liters (total).','The megawatts (power) are stated.','Megabytes (McB) are recorded.','Kilowatts (custom) are recorded.'])assert.equal(check(text).length,0,text);
 assert.equal(check('Use micrograms (µg), megawatts (MW), and megabytes (MB).').length,0);
});
test('complete written-name and symbol evidence reject strikes in either side and across removed bridges',()=>{
 for(const text of ['Use megaformerwatts (mw).','Use megawatts former (mw).','Use kiloformergrams (KG).','Use megawatts (M former W).']){
  const d=makeDocument([text],'Current'),start=d.text.indexOf('former');d.struck=[{start,end:start+6}];assert.equal(metricDefinitionIssues(d,refs).length,0,text);
 }
 const d=makeDocument(['Power is measured former in KiloWatts (kW).'],'Current'),start=d.text.indexOf('former');d.struck=[{start,end:start+6}];assert.equal(metricDefinitionIssues(d,refs).length,0);
});

test('an independent complete unit pair survives unrelated removed qualifier wording',()=>{
 const text='Use former watts (mw).',d=makeDocument([text],'Current'),start=text.indexOf('former');d.struck=[{start,end:start+6}];const found=metricDefinitionIssues(d,refs);assert.equal(found.length,1);assert.equal(found[0].suggestion,'W');assert.equal(found[0].text,'mw');
});
test('wrapped literal and table evidence cannot establish a name-symbol definition',()=>{
 for(const text of ['The literal "megawatts\n(M W)" remains.','The literal “megawatts\n(M W)” remains.'])assert.equal(check(text).length,0,text);
 const d=makeDocument(['Use megawatts\n(M W) of power.'],'Current');d.blocks[0].formatting={headerGaps:[1,2]};assert.equal(metricDefinitionIssues(d,refs).length,0);
});
test('identified page heads preserve precise whole-symbol selections while unknown bridges remain protected',()=>{
 const d=makeDocument(['ASSEMBLY BILL No. 9999\nline 1 Use megawatts (M','AB 9999 — 2 —\nline 1 W) of power.'],'Current');d.blocks.find(b=>b.ignored).formatting={headerParts:[{text:'AB 9999'}]};const found=metricDefinitionIssues(d,refs);assert.equal(found.length,1);assert.equal(found[0].suggestion,'MW');assert.equal(found[0].text,d.text.slice(found[0].start,found[0].end));assert.ok(found[0].text.includes('AB 9999'));
 const u=makeDocument(['Use megawatts (M\nunknown marker\nW) of power.'],'Current'),b=u.blocks.find(b=>b.text==='unknown marker');b.ignored=true;u.excluded.push({start:b.start,end:b.end});assert.equal(metricDefinitionIssues(u,refs).length,0);
});
test('rechecking changed source evidence does not preserve an obsolete definition warning',()=>{
 const d=makeDocument(['Use megawatts\n(M W) of power.'],'Current');assert.equal(metricDefinitionIssues(d,refs).length,1);d.blocks[0].formatting={headerGaps:[1,2]};assert.equal(metricDefinitionIssues(d,refs).length,0);delete d.blocks[0].formatting;assert.equal(metricDefinitionIssues(d,refs).length,1);
});
