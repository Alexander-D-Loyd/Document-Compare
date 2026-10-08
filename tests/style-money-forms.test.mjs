import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {moneyFormIssues} from '../app/style-money-forms.mjs';import {legislativeContext} from '../app/legislative-context.mjs';
const refs={lcb:JSON.parse(fs.readFileSync(new URL('../app/data/lcb-reference.json',import.meta.url)))};
const bill=body=>'The people of the State of California do enact as follows:\nSECTION 1. Section 123 of the Government Code is amended to read:\nline 1 123. '+body;
const check=text=>moneyFormIssues(makeDocument([text],'Current'),refs);
test('codified monetary form requires words and parenthetical figures but unknown prose is left for review',()=>{
 assert.deepEqual(check(bill('Pay ten dollars or $25.')).map(i=>i.suggestion),['ten dollars ($10)','twenty-five dollars ($25)']);
 assert.equal(check(bill('Pay ten dollars ($10) or twenty-five dollars ($25).')).length,0);
 assert.equal(check('Pay ten dollars or $25.').length,0);
 assert.equal(check('SECTION 1. The board refers to Section 123 of the Government Code, which is amended elsewhere. Pay $25.').length,0);
});
test('digest, uncodified findings and resolutions use figures alone, separately from codified sections',()=>{
 const text='LEGISLATIVE COUNSEL’S DIGEST\nThe bill costs ten dollars.\nThe people of the State of California do enact as follows:\nSECTION 1. The Legislature finds and declares all of the following:\nThe cost is ten dollars ($10).\nSEC. 2. Section 123 of the Government Code is amended to read:\n123. Pay $10.';
 assert.deepEqual(check(text).map(i=>i.suggestion),['$10','$10','ten dollars ($10)']);
 const doc=makeDocument([text],'Current'),ctx=legislativeContext(doc);assert.equal(ctx.moneyAt(doc.text.indexOf('The cost')),'UncodifiedFindings');assert.equal(ctx.moneyAt(doc.text.indexOf('123. Pay')),'Codified');
 assert.deepEqual(check('ASSEMBLY CONCURRENT RESOLUTION No. 1\nThe project costs ten dollars.').map(i=>i.suggestion),['$10']);
});
test('monetary modifiers, cents, mills and amount precision preserve complete expressions',()=>{
 assert.deepEqual(check(bill('Use a two-hundred-dollar minimum. Pay $0.01 or $0.002 or $1.50.')).map(i=>i.suggestion),['two-hundred-dollar ($200)','one cent ($0.01)','two mills ($0.002)','one dollar and fifty cents ($1.50)']);
 assert.equal(check(bill('Use a two-hundred-dollar ($200) minimum. Pay one cent ($0.01).')).length,0);
 assert.equal(check(bill('Pay $1.123 or $1.5 million.')).length,0);
});
test('quotes, foreign currency, denominations, tables and source strikeouts avoid unsupported monetary corrections',()=>{
 assert.equal(check(bill('The term “ten dollars” is defined. Issue ten dollar coins or US $10.')).length,0);
 const doc=makeDocument([bill('Pay ten\nline 2 dollars.')],'Current');const issue=moneyFormIssues(doc,refs)[0];assert.equal(doc.text.slice(issue.start,issue.end),issue.text);assert.equal(issue.suggestion,'ten dollars ($10)');
 doc.struck=[{start:issue.start,end:issue.end}];assert.equal(moneyFormIssues(doc,refs).length,0);
});
