import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
const checklist=JSON.parse(fs.readFileSync(new URL('../app/data/lcb-implementation-checklist.json',import.meta.url))),ref=JSON.parse(fs.readFileSync(new URL('../app/data/lcb-reference.json',import.meta.url)));
test('all23 LCB source pages have a current individually fingerprinted checklist with applicability limits',()=>{
 assert.equal(checklist.pages.length,23);assert.deepEqual(checklist.pages.map(p=>p.page),Array.from({length:23},(_,i)=>i+1));assert.equal(checklist.wholeRuleCertification,false);assert.equal(checklist.officeAccuracyMeasured,false);
 for(const p of checklist.pages){assert.equal(p.sourceSha256,crypto.createHash('sha256').update(ref.pages[p.page-1].text).digest('hex'));assert.ok(p.implemented.length>20);assert.ok(p.remainingLimits.length>20);assert.match(p.status,/Selected source conditions/);}
});
test('lexical and provision accounting separates duplicate examples, external dependencies and quote exceptions',()=>{
 const c=checklist.counts;assert.equal(c.historicalLexicalProbeSetsWithAnyLcbFinding+c.manualPrefixPrescriptions+c.quotedCorporationLetterExceptions,c.canonicalLexicalRows);assert.equal(c.canonicalLexicalRows+c.provisionAndExampleRows-c.overlappingCapitalizationRows,c.distinctSourceRows);
 assert.equal(checklist.pages.reduce((n,p)=>n+p.canonicalLexicalRows,0),c.canonicalLexicalRows);assert.equal(checklist.pages.reduce((n,p)=>n+p.provisionRows,0),c.provisionAndExampleRows);assert.ok(checklist.remaining.some(r=>/licensed offline importer/.test(r.status)));assert.ok(checklist.remaining.some(r=>/California Style Manual/.test(r.item)&&/unavailable/.test(r.status)));assert.match(checklist.countInterpretation,/does not establish a trigger for the target entry/);
});
