import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {listedNounIssues,LISTED_NOUN_RULES} from '../app/style-listed-nouns.mjs';
const refs={lcb:JSON.parse(fs.readFileSync(new URL('../app/data/lcb-reference.json',import.meta.url)))};
test('every encoded listed noun has a violation, compliant form and exact source reference',()=>{
 for(const r of LISTED_NOUN_RULES){const doc=makeDocument(['The '+r.variant+' is available.'],'Current');for(const b of doc.blocks.filter(b=>b.ignored))b.formatting={headerParts:[{start:0,end:b.text.length,anchor:'left'}]};const found=listedNounIssues(doc,refs);assert.ok(found.some(i=>i.suggestion===r.preferred&&i.guidePage===r.page),r.variant);assert.equal(listedNounIssues(makeDocument(['The '+r.preferred+' is available.'],'Current'),refs).length,0,r.preferred);for(const i of found)assert.equal(doc.text.slice(i.start,i.end),i.text);}
});
test('uncued uses, literal titles, quotes, source divisions and removed wording avoid noun joins',()=>{
 const doc=makeDocument(['People work day and night. The “work force” is named. School Bus Safety I and II is a title. The work-\nline 1 force acts.'],'Current');assert.equal(listedNounIssues(doc,refs).length,0);
 const removed=makeDocument(['The work force acts.'],'Current');removed.struck=[{start:4,end:14}];assert.equal(listedNounIssues(removed,refs).length,0);
});

test('cash flow analysis and analyses supply a specific financial noun-modifier head',()=>{
 for(const [text,wanted] of [['The budget, multiyear financial projection, and cash flow analysis conducted by the board applies.','cashflow'],['Review budget and cash flow analyses.','cashflow'],['Cash flow analysis is available.','Cashflow'],['Review the cash-flow analysis.','cashflow']]){const doc=makeDocument([text],'Current');for(const b of doc.blocks.filter(b=>b.ignored))b.formatting={headerParts:[{start:0,end:b.text.length,anchor:'left'}]};const found=listedNounIssues(doc,refs);assert.deepEqual(found.map(i=>i.suggestion),[wanted],text);assert.equal(found[0].guidePage,9);assert.equal(doc.text.slice(found[0].start,found[0].end),found[0].text);}
 assert.equal(listedNounIssues(makeDocument(['The budget and cashflow analysis apply.'],'Current'),refs).length,0);
});

test('financial noun heads preserve cash flow verb roles, source divisions and literal names',()=>{
 for(const text of ['Let the cash flow.','Let the cash flow through the accounts.','Let cash flow.','Review the “cash flow analysis.”','The Cash Flow Analysis Team shall act.','Review the cash-\nline 2 flow analysis.','The cash flow analysis applies.\nThe people do enact as follows:'])assert.equal(listedNounIssues(makeDocument([text],'Current'),refs).length,0,text);
 const doc=makeDocument(['The budget and cash flow analysis apply.'],'Current');doc.struck=[{start:15,end:32}];assert.equal(listedNounIssues(doc,refs).length,0);
});

test('a financial modifier across source pages retains the complete cash flow range',()=>{
 const doc=makeDocument(['ASSEMBLY BILL No. 121\nThe people do enact as follows:\nline 1 The budget and cash\n97','AB 121 — 2 —\nline 1 flow analysis apply.'],'Current');for(const b of doc.blocks.filter(b=>b.ignored))b.formatting={headerParts:[{start:0,end:b.text.length,anchor:'left'}]};const found=listedNounIssues(doc,refs);assert.equal(found.length,1);assert.equal(found[0].suggestion,'cashflow');assert.equal(found[0].start,doc.text.indexOf('cash'));assert.equal(found[0].end,doc.text.indexOf('flow')+4);assert.equal(doc.text.slice(found[0].start,found[0].end),found[0].text);
});
