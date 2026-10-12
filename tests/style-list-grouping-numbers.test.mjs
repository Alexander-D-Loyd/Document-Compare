import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {serialCommaIssues} from '../app/style-serial-commas.mjs';import {semicolonSeriesIssues} from '../app/style-semicolon-series.mjs';import {splitListCommas} from '../app/style-list-phrases.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
test('grouping commas do not turn two figures into a three-item list',()=>{
 for(const t of ['The values are 1,000 and 2.','The eligible values are 1,000 and 2,000.','The list includes 1,000 and 2,000.','The list includes 1,234,567 and 2,345,678.'])assert.equal(serialCommaIssues(makeDocument([t],'Current'),refs).length,0,t);
 assert.deepEqual(splitListCommas('1,000, 2,000 and 3,000'),['1,000',' 2,000 and 3,000']);
});
test('three actual grouped figures still require a serial comma with exact source offsets',()=>{
 for(const t of ['The list includes 1,000, 2,000 and 3,000.','The eligible values are 1,234,567, 2,345,678 or 3,456,789.']){const i=serialCommaIssues(makeDocument([t],'Current'),refs)[0];assert.ok(i,t);assert.equal(t.slice(i.start,i.end),i.text);assert.ok(['and','or'].includes(i.text));assert.equal(serialCommaIssues(makeDocument([t.slice(0,i.start)+i.suggestion+t.slice(i.end)],'Current'),refs).length,0);}
});
test('semicolon groups count actual figures rather than their grouping comma pieces',()=>{
 const bad='The list includes 1,000, 2,000; 3,000, 4,000 and 5,000, 6,000.',i=semicolonSeriesIssues(makeDocument([bad],'Current'),refs)[0];assert.ok(i);assert.equal(bad.slice(i.start,i.end),'and');assert.equal(i.suggestion,'; and');assert.equal(semicolonSeriesIssues(makeDocument([bad.slice(0,i.start)+i.suggestion+bad.slice(i.end)],'Current'),refs).length,0);
 for(const t of ['The list includes 1,000; 2,000 and 3,000.','The list includes 1,234,567; 2,345,678 and 3,456,789.','The term “includes 1,000, 2,000 and 3,000” is literal.'])assert.equal(semicolonSeriesIssues(makeDocument([t],'Current'),refs).length,0,t);
});
