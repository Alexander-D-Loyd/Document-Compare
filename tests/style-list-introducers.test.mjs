import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=t=>jointStylisticIssues(makeDocument([t],'Current'),refs);
test('ordinary legislative enumeration introductions share noun-list and related-count checks',()=>{
 for(const intro of ['includes','including','comprises','consists of','is composed of','is comprised of','contains','includes, but is not limited to,','including, but not limited to,']){
  const t='The packet '+intro+' 10 forms, three reports and two documents.',found=check(t);assert.deepEqual(found.map(i=>i.suggestion),['3',', and','2'],t);
  const good='The packet '+intro+' 10 forms, 3 reports, and 2 documents.';assert.equal(check(good).length,0,good);
 }
});
test('introduced grouped lists retain the final semicolon and preserve source quotations',()=>{
 const t='The packet contains public schools, private clinics; tax-exempt organizations, nonprofit associations and full-time employees, part-time workers.',found=check(t);assert.ok(found.some(i=>i.suggestion==='; and'));assert.equal(check('The term “'+t+'” is literal.').length,0);
 assert.equal(check('The term “The packet is composed of 10 forms, three reports and two documents.” is literal.').length,0);
});
