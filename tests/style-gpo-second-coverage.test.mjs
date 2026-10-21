import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {reviewStyleIssues} from '../app/style-review.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';import {CHECK_COVERAGE} from '../app/style-coverage.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
test('abbreviation table and mathematical spacing disclose finite source coverage and exceptions',()=>{
 const inventory=styleRuleInventory(refs);for(const [id,page,pattern]of [['gpo-9.58',251,/23 bare.*21/u],['gpo-10.3',277,/grouped/u]]){const row=inventory.find(r=>r.id===id);assert.ok(row,id);assert.equal(row.status,'Partially automated');assert.equal(row.page,page);assert.match(row.scope,pattern);assert.match(row.scope,/manual/u);}
 const table=CHECK_COVERAGE.find(r=>r.title==='GPO English measurement and time abbreviations'),math=CHECK_COVERAGE.find(r=>r.title==='GPO mathematical operator spacing');assert.ok(table&&math);assert.match(table.text,/ds.*hs/u);assert.match(math.text,/magnification.*breeding/u);assert.match(math.text,/whole/u);
});
test('both new GPO checks retain exact source and independent LCB and California Codes findings',()=>{
 const d=makeDocument(['The people do enact as follows:\nUse 25 bbls and 20 ts. Apply the formula A + 1,000. The healthcare is provided. Government Code (CIV).'],'Current'),before=JSON.stringify(d),issues=reviewStyleIssues(d,refs);
 for(const wanted of ['25 bbl','20 t','A+1,000'])assert.ok(issues.some(i=>i.guideId==='gpo'&&i.suggestion===wanted),wanted);
 assert.ok(issues.some(i=>i.guideId==='lcb'&&i.suggestion==='health care'));assert.ok(issues.some(i=>i.guideId==='california-codes'&&i.suggestion==='GOV'));for(const i of issues)assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(JSON.stringify(d),before);
});
