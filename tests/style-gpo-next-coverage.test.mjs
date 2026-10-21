import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {reviewStyleIssues} from '../app/style-review.mjs';
import {styleRuleInventory} from '../app/style-rule-inventory.mjs';
import {CHECK_COVERAGE} from '../app/style-coverage.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
test('measurement definitions and complete symbol series retain finite partial rule claims',()=>{
 const rows=styleRuleInventory(refs);
 for(const [id,pattern]of [['gpo-9.56',/explicit|Explicit/u],['gpo-9.58',/explicit|Explicit/u],['gpo-10.5',/complete homogeneous lists/u],['gpo-10.6',/same-unit physical/u]]){const row=rows.find(r=>r.id===id);assert.ok(row,id);assert.equal(row.status,'Partially automated',id);assert.match(row.scope,pattern);assert.match(row.scope,/manual/u);}
 for(const title of ['Explicit measurement abbreviation definitions','Arithmetic symbols, dimension marks and percent series']){const row=CHECK_COVERAGE.find(r=>r.title===title);assert.ok(row,title);assert.match(row.text,/manual/u);}
});
test('production review combines complete GPO evidence with LCB and both supplied California lists',()=>{
 const d=makeDocument(['The people do enact as follows:\nUse 25 feet (F.T.) and 25 square meters (M3). Prices rose 9 percent, 12 percent, 15 percent, and 19 percent. The panels are 5, 7, and 9″ long. Meet at 2:30 P. M. Since Jan. 1 the agency acts. As of Tues. the agency meets. The healthcare is provided. Government Code (CIV). Los Angeles County.'],'Current'),before=JSON.stringify(d),issues=reviewStyleIssues(d,refs,{includeReviewSuggestions:true});
 for(const wanted of ['ft','m2','9, 12, 15, and 19 percent','5″, 7″, and 9″','2:30 p.m.','January','Tuesday'])assert.ok(issues.some(i=>i.guideId==='gpo'&&i.suggestion===wanted),wanted);
 for(const [guideId,wanted]of [['lcb','health care'],['california-codes','GOV'],['california-counties','County of Los Angeles']])assert.ok(issues.some(i=>i.guideId===guideId&&i.suggestion===wanted),wanted);
 assert.ok(!issues.some(i=>i.conflict));for(const i of issues)assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(JSON.stringify(d),before);
});
