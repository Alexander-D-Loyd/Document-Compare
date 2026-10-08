import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=doc=>jointStylisticIssues(typeof doc==='string'?makeDocument([doc],'Current'):doc,refs).filter(i=>i.checkId==='semicolon-series');
test('explicit grouped noun series needs a final semicolon and keeps exact source offsets',()=>{
 const doc=makeDocument(['line 1 The list includes cities, counties;\nline 2 districts, agencies and boards, commissions.'],'Current');
 const found=check(doc);assert.equal(found.length,1);assert.equal(found[0].suggestion,'cities, counties; districts, agencies; and boards, commissions');assert.equal(doc.text.slice(found[0].start,found[0].end),found[0].text);assert.deepEqual(found[0].references.map(r=>r.rule),['Punctuation: Semicolons','8.148']);
 assert.equal(check('The list includes cities, counties; districts, agencies; and boards, commissions.').length,0);
 assert.equal(check('The panel consists of schools, hospitals; clinics, providers and boards, commissions.').length,1);
});
test('simple series, ordinary clauses, names, quotations, tables and stricken text stay protected',()=>{
 for(const text of ['The list includes cities, counties and districts.','Cities, counties; districts, agencies and boards, commissions.','The list includes cities, counties; districts approve agencies and boards, commissions.','The list includes Oakland, Fresno; Los Angeles, Sacramento and San Diego, San Jose.','The title “The list includes cities, counties; districts, agencies and boards, commissions.” is literal.','Item Amount\nThe list includes cities, counties; districts, agencies and boards, commissions........................... 1000'])assert.equal(check(text).length,0,text);
 const text='The list includes cities, counties; districts, agencies and boards, commissions.';const doc=makeDocument([text],'Current');doc.struck=[{start:0,end:text.length}];assert.equal(check(doc).length,0);
});
