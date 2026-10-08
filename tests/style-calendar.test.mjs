import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {calendarIssues} from '../app/style-calendar.mjs';
const refs={gpo:JSON.parse(fs.readFileSync(new URL('../app/data/gpo-reference.json',import.meta.url)))};
const check=text=>calendarIssues(makeDocument([text],'Current'),refs);
test('calendar cues capitalize months and weekdays with source references',()=>{
 const found=check('File by january 1, 2027, and on tuesday. Meet every fridays. Submit after march 2.');
 assert.deepEqual(found.map(i=>i.suggestion),['January','March','Tuesday','Friday']);assert.ok(found.every(i=>i.rule==='3.24'&&i.references[0].guidePage>0));
 assert.equal(check('File by January 1, 2027, on Tuesday and every Fridays.').length,0);
});
test('modal may, verb march, seasons, quoted wording and capitals remain intact',()=>{
 assert.equal(check('The board may act. They march through the area in spring. See “on tuesday” and ON MONDAY.').length,0);
 const doc=makeDocument(['File by january 1.'],'Current');doc.struck=[{start:8,end:15}];assert.equal(calendarIssues(doc,refs).length,0);
});
test('listed holiday names preserve apostrophes and margins',()=>{
 const doc=makeDocument(["line 1 Meet on new year's\nline 2 day and independence day."],'Current'),found=calendarIssues(doc,refs);
 assert.deepEqual(found.map(i=>i.suggestion),['Independence Day','New Year’s Day']);for(const i of found)assert.equal(doc.text.slice(i.start,i.end),i.text);
 assert.equal(check('Meet on New Year’s Day and Independence Day.').length,0);
});
