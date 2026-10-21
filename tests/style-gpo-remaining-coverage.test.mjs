import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {reviewStyleIssues} from '../app/style-review.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';import {styleWordDivisionView} from '../app/style-word-divisions.mjs';import {workerWords} from './helpers/spelling-worker.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),words=await workerWords();
test('new numbered wording rules disclose finite partial coverage and preserved manual meanings',()=>{
 const rows=styleRuleInventory(refs);for(const id of ['gpo-9.53','gpo-9.54','gpo-9.55','gpo-10.3','gpo-10.6','gpo-6.33','gpo-8.16','gpo-3.25','gpo-11.16']){const r=rows.find(r=>r.id===id);assert.ok(r,id);assert.equal(r.status,'Partially automated');assert.match(r.scope,/manual/u);}
 assert.match(rows.find(r=>r.id==='gpo-9.53').scope,/six|Celsius.*Fahrenheit.*Rankine.*kelvin.*Baumé.*Twaddell/u);assert.match(rows.find(r=>r.id==='gpo-10.6').scope,/Bill monetary wording retains priority/u);
});
test('complete source-bound additions coexist with LCB and both user lists',()=>{
 const d=makeDocument(['The people do enact as follows:\nUse 25 kelvins (°k). Meet at ten o’clock P.M. The result is 4 × 4. The agency shall reredirect the payment. They acted for goodness sake. On ramadan the agency shall act. The healthcare is provided. Government Code (CIV). Los Angeles County.'],'Current'),before=JSON.stringify(d),issues=reviewStyleIssues(d,refs,{includeReviewSuggestions:true});
 for(const [guideId,wanted]of [['gpo','K'],['gpo','10 p.m.'],['gpo','4×4'],['gpo','re-redirect'],['gpo','for goodness’ sake'],['gpo','Ramadan'],['lcb','health care'],['california-codes','GOV'],['california-counties','County of Los Angeles']])assert.ok(issues.some(i=>i.guideId===guideId&&i.suggestion===wanted),wanted);
 assert.ok(!issues.some(i=>i.conflict));for(const i of issues)assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(JSON.stringify(d),before);
});
test('all new structured evidence retains original physical offsets after an earlier word division',()=>{
 const d=makeDocument(['The people do enact as follows:\nThe high qual-\nity services shall apply. Use 25 feet (F.T.). Use 25 kelvins (°k). The agency shall reredirect the payment. On ramadan the agency shall act.'],'Current',[],[],words),view=styleWordDivisionView(d);assert.ok(view,'Require a genuine earlier length-changing style projection.');const before=JSON.stringify(d),issues=reviewStyleIssues(d,refs,{includeReviewSuggestions:true});
 for(const [wanted,key,phrase]of [['ft','measurementDefinitionEvidence','25 feet (F.T.)'],['K','temperatureGravityEvidence','25 kelvins (°k)'],['re-redirect','listedWordingEvidence','shall reredirect the payment'],['Ramadan','holidayEvidence','On ramadan the agency shall']]){const i=issues.find(i=>i.suggestion===wanted);assert.ok(i,wanted);const e=i[key],start=e.evidenceStart??e.start,end=e.evidenceEnd??e.end;assert.equal(d.text.slice(start,end),phrase,wanted);if(e.sourceText!==undefined)assert.equal(e.sourceText,phrase);assert.equal(d.text.slice(i.start,i.end),i.text);}
 assert.equal(JSON.stringify(d),before);
});
