import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>jointStylisticIssues(makeDocument([text],'Current'),refs).filter(i=>i.checkId==='quantity-separators');
test('thousands grouping requires an explicit quantity noun and retains exact offsets',()=>{
 const doc=makeDocument(['line 1 Allocate resources for 1200\nline 2 applicants and 5500 pounds of material.'],'Current');
 const found=jointStylisticIssues(doc,refs).filter(i=>i.checkId==='quantity-separators');
 assert.deepEqual(found.map(i=>i.suggestion),['1,200','5,500']);
 assert.ok(found.every(i=>doc.text.slice(i.start,i.end)===i.text&&i.rule==='12.14'));
 assert.equal(check('Allocate resources for 1,200 applicants and 5,500 pounds of material.').length,0);
 doc.struck=[{start:doc.text.indexOf('1200'),end:doc.text.indexOf('1200')+4}];assert.equal(jointStylisticIssues(doc,refs).filter(i=>i.checkId==='quantity-separators').length,1);
});
test('serials, years, decimals, money, ranges and literal names are protected',()=>{
 assert.equal(check('See Section 1200 persons listed in the provision. In 2026 people qualify. The figure is 1.1200 units. Model 5500 vehicles qualify. Pay $1200 dollars. The title “1200 People” is literal. Use 1200-1400 units.').length,0);
 assert.equal(check('Item Amount\n1200 applicants........................... 1000').length,0);
});

test('a quantity after in is not treated as a year when its value cannot be a guarded date',()=>{
 assert.deepEqual(check('Invest in 5500 vehicles.').map(i=>i.suggestion),['5,500']);
});
test('malformed grouping and explicit population counts retain digits and exact source ranges',()=>{
 const text='Provide for 12,00 applicants, 1,20,000 records, and a population of 12000. Maintain an enrollment of 23456 and the headcount of 123456789012345.';
 const found=check(text);
 assert.deepEqual(found.map(i=>i.suggestion),['1,200','120,000','12,000','23,456','123,456,789,012,345']);
 assert.ok(found.every(i=>text.slice(i.start,i.end)===i.text&&i.text.replace(/,/g,'')===i.suggestion.replace(/,/g,'')));
 assert.equal(check('Provide for 1,200 applicants, 120,000 records, a population of 12,000 and an enrollment of 23,456.').length,0);
});
test('malformed numeric identifiers, decimals and literal source text remain protected',()=>{
 assert.equal(check('Section 12,00 persons qualify. Model 1,20,000 vehicles qualify. Use 12,00-15,00 units or 12,00/1500 units. Measure 12,00.5 feet or 1.12000 units. The title “12,00 People” is literal. Enroll 01200 applicants. In 2026 people qualify.').length,0);
 const text='Provide for 12,00 applicants.';const doc=makeDocument([text],'Current');doc.struck=[{start:text.indexOf('12,00'),end:text.indexOf('12,00')+5}];assert.equal(jointStylisticIssues(doc,refs).filter(i=>i.checkId==='quantity-separators').length,0);
});
