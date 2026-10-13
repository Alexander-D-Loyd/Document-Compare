import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {semicolonSeriesIssues} from '../app/style-semicolon-series.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=t=>jointStylisticIssues(makeDocument([t],'Current'),refs);
test('expanded legislative noun phrases retain the serial comma rule',()=>{
 for(const items of [['nonprofit organizations','commercial businesses','professional associations'],['public roads','local bridges','state highways'],['renewable energy','natural resources','public utilities'],['patients','practitioners','manufacturers']]){
  const t='The list includes '+items[0]+', '+items[1]+' and '+items[2]+'.',i=check(t).find(i=>i.suggestion===', and');assert.ok(i,t);const good=t.replace(' and ', ', and ');assert.equal(check(good).length,0,good);
 }
});
test('grouped phrases, letters and figures share the final semicolon requirement',()=>{
 for(const series of ['public schools, private hospitals; local clinics, regional agencies and county boards, city commissions','A, B; C, D and E, F','1, 2; 3, 4 and 5, 6','patients, practitioners; manufacturers, distributors and retailers, wholesalers']){
  const t='The list includes '+series+'.',doc=makeDocument([t],'Current'),i=semicolonSeriesIssues(doc,refs)[0];assert.ok(i,t);assert.equal(t.slice(i.start,i.end),'and');assert.ok(i.suggestion==='; and');assert.equal(semicolonSeriesIssues(makeDocument([t.slice(0,i.start)+i.suggestion+t.slice(i.end)],'Current'),refs).length,0);
  assert.ok(check(t).some(i=>i.checkId==='semicolon-series'),t);
 }
});
test('single-value semicolon groups, clauses, nested alternatives, names and literals remain manual',()=>{
 for(const t of ['The list includes 10,000; 20,000 and 30,000.','The list includes providers who work, patients who visit; retailers who sell and growers who cultivate.','The list includes public schools, private hospitals or local clinics, and county boards.','The term “public schools, private hospitals; local clinics, regional agencies and county boards, city commissions” is literal.','The list includes Smith Institute, Jones Foundation and Brown Organization.'])assert.equal(check(t).length,0,t);
});
