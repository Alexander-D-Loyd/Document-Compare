import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {reviewStyleIssues} from '../app/style-review.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';import {CHECK_COVERAGE} from '../app/style-coverage.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
test('near-completion GPO source slices keep partial status and disclose manual exceptions',()=>{
 const inventory=styleRuleInventory(refs);
 for(const [id,match]of [['gpo-5.6',/nine/u],['gpo-9.44',/seven printed weekday and nine printed month/u],['gpo-9.46',/sentence-opening/u],['gpo-9.54',/noon\/midnight/u],['gpo-9.55',/military time/u],['gpo-11.4',/four printed emphasis/u],['gpo-11.8',/legal case identity/u]]){const row=inventory.find(r=>r.id===id);assert.ok(row,id);assert.equal(row.status,'Partially automated',id);assert.match(row.scope,match,id);assert.match(row.scope,/manual/u,id);}
 for(const title of ['GPO calendar abbreviations','GPO measurement notation','Compound plurals','Editorial annotations and legal versus']){const row=CHECK_COVERAGE.find(r=>r.title===title);assert.ok(row,title);assert.equal(row.guide,'gpo');assert.match(row.text,/manual/u);}
});
test('new GPO forms coexist with LCB priority and the separate California Codes reference',()=>{
 const text='The people do enact as follows:\nOn Tues. the agency meets. By Jan. 1 the agency acts. The coming-ins are recorded. Meet at 10:00 A.M. The extract follows [underscore supplied]. Case of Smith V. Brown governs. The healthcare is provided. Government Code (CIV).',d=makeDocument([text],'Current'),before=JSON.stringify(d),issues=reviewStyleIssues(d,refs);
 for(const [rule,suggestion]of [['9.46','Tuesday'],['9.44','January'],['5.6','comings-in'],['9.54','10 a.m.'],['11.4','italic supplied'],['11.8','v.']])assert.ok(issues.some(i=>i.guideId==='gpo'&&i.rule===rule&&i.suggestion===suggestion),rule);
 assert.ok(issues.some(i=>i.guideId==='lcb'&&i.suggestion==='health care'));assert.ok(issues.some(i=>i.guideId==='california-codes'&&i.suggestion==='GOV'));assert.ok(!issues.some(i=>i.conflict));for(const i of issues)assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(JSON.stringify(d),before);
});
