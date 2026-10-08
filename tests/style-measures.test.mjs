import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
import {measurementIssues} from '../app/style-measures.mjs';
const refs={lcb:JSON.parse(fs.readFileSync(new URL('../app/data/lcb-reference.json',import.meta.url))),gpo:JSON.parse(fs.readFileSync(new URL('../app/data/gpo-reference.json',import.meta.url)))};
const check=text=>measurementIssues(makeDocument([text],'Current'),refs);
test('metric spacing and singular/plural symbols follow GPO while identifiers stay intact',()=>{
 assert.deepEqual(check('Use 25kg, 30 kgs, 40 MWs, and 20 lbs.').map(i=>i.suggestion),['25 kg','30 kg','40 MW','20 lb']);
 assert.equal(check('Use 25 kg, 30 mg, 40 MW, and 20 lb.').length,0);
 assert.equal(check('Use 20 ms. Cite Form 25kg and Section 30cms.').length,0);
});
test('temperature notation is distinct from plane-angle degrees and time checks protect minutes',()=>{
 assert.deepEqual(check('Use 100°C and 212° F. Meet at 10:00 a.m. and 2 o’clock p.m.').map(i=>i.suggestion),['100 °C','212 °F','10 a.m.','2 p.m.']);
 assert.equal(check('Use 100 °C, 33°15′21″, 273.15 K and 10:30 p.m. Meet at 10 a.m.').length,0);
});
test('measurement checks retain source offsets across margins and exclude crossed source text',()=>{
 const doc=makeDocument(['line 1 Use 20\nline 2 kgs.'],'Current');const issue=measurementIssues(doc,refs)[0];assert.equal(issue.suggestion,'20 kg');assert.equal(doc.text.slice(issue.start,issue.end),issue.text);
 doc.struck=[{start:issue.start,end:issue.end}];assert.equal(measurementIssues(doc,refs).length,0);
});

test('combined review preserves figure-unit symbols while still checking fully written measures',()=>{
 const good=jointStylisticIssues(makeDocument(['Use 3 kg and 4 min.'],'Current'),refs);assert.equal(good.filter(i=>!i.matchesPrimary).length,0);
 const bad=jointStylisticIssues(makeDocument(['Use 3 kgs. Wait 4 minutes.'],'Current'),refs);assert.ok(bad.some(i=>i.text==='3 kgs'&&i.suggestion==='3 kg'));assert.ok(!bad.some(i=>i.text==='4'));
});
