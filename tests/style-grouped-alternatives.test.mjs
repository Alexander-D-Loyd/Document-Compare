import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {serialCommaIssues} from '../app/style-serial-commas.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=t=>serialCommaIssues(makeDocument([t],'Current'),refs);
test('one explicit inner alternative remains one list member when selecting the final conjunction',()=>{
 for(const t of ['The list includes one, two, three or four and five.','The list includes A, B, C or D and E.','The list includes one or two, three and four.']){
  const found=check(t);assert.equal(found.length,1,t);assert.equal(found[0].suggestion,', and');assert.equal(t.slice(found[0].start,found[0].end),'and');const good=t.slice(0,found[0].start)+found[0].suggestion+t.slice(found[0].end);assert.equal(check(good).length,0);
 }
});
test('the source-listed city and county geographic phrase stays one item',()=>{
 const t='The list includes city, county or city and county.',found=check(t);assert.equal(found.length,1);assert.equal(found[0].text,'or');assert.equal(found[0].suggestion,', or');assert.equal(check('The list includes city, county, or city and county.').length,0);
});
test('ambiguous repeated alternatives, nested clauses, existing commas and quotations stay protected',()=>{
 for(const t of ['The list includes public schools, private hospitals or local clinics or county boards.','The list includes public schools, private hospitals or local clinics and county boards.','The list includes public schools, private hospitals that operate or local clinics and county boards.','The list includes one, two, three or four, and five.','The list includes public schools, private hospitals or local clinics, and county boards.','The term “The list includes one, two, three or four and five.” is literal.'])assert.equal(check(t).length,0,t);
});
test('grouped alternatives preserve source positions across printed line breaks',()=>{
 const doc=makeDocument(['line 1 The list includes one, two, three or four\nline 2 and five.'],'Current'),found=jointStylisticIssues(doc,refs).filter(i=>i.checkId==='serial-commas');assert.equal(found.length,1);assert.equal(doc.text.slice(found[0].start,found[0].end),'and');
});
