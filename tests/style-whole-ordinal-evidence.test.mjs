import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
import {CHECK_COVERAGE} from '../app/style-coverage.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';import {spellOrdinal as directSpellOrdinal} from '../app/style-cardinal-values.mjs';import {spellOrdinal as publicSpellOrdinal} from '../app/style-numerals.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),make=t=>makeDocument(Array.isArray(t)?t:[t],'Current'),check=d=>jointStylisticIssues(d,refs).filter(i=>['large-ordinals','numerals'].includes(i.checkId)&&!i.conflict);
test('uncertain ordinal prefixes cannot invent a smaller suffix rank',()=>{
 for(const [q,part]of [['one thousand two hundred first','one thousand '],['one thousand two hundredth','one thousand '],['one million two thousand third','one million ']])for(const field of ['struck','excluded']){const d=make('The '+q+' applicant qualifies.'),start=d.text.indexOf(part);d[field].push({start,end:start+part.length});assert.deepEqual(check(d),[],q+' '+field);}
});
test('complete ordinal evidence includes every number word connector and singular rank cue',()=>{
 const text='The one hundred and twenty-third applicant qualifies.';
 for(const field of ['struck','excluded'])for(const part of ['one ','hundred',' and ','twenty','-third','applicant','qualifies']){const d=make(text),start=d.text.indexOf(part);d[field].push({start,end:start+part.length});assert.deepEqual(check(d),[],field+' '+part);}
});
test('Unicode and original masked boundaries cannot manufacture standalone ordinal words',()=>{
 for(const c of ['α','\u0301','_'])for(const side of ['before','after'])for(const field of ['intact','struck','excluded']){const q=side==='before'?c+'one hundred first':'one hundred first'+c,d=make('The '+q+' applicant qualifies.');if(field!=='intact'){const start=d.text.indexOf(c);d[field].push({start,end:start+c.length});}assert.deepEqual(check(d),[],side+' '+field+' '+c);}
});
test('a whole long canonical rank has one independently specified value and complete offsets',()=>{
 const q='one hundred twenty-three trillion four hundred fifty-six billion seven hundred eighty-nine million one hundred twenty-three thousand four hundred fifth',d=make('The '+q+' applicant qualifies.'),r=check(d);assert.deepEqual(r.map(i=>i.suggestion),['123,456,789,123,405th']);assert.equal(r[0].start,d.text.indexOf(q));assert.equal(r[0].end,d.text.indexOf(q)+q.length);assert.equal(check(make('The 123,456,789,123,405th applicant qualifies.')).length,0);
});
test('whole ordinals bridge known heads but never unclassified body or table evidence',()=>{
 const makePages=()=>{const d=make(['ASSEMBLY BILL No. 9999\nThe people do enact as follows:\nline 1 The one thousand','AB 9999 — 2 —\nline 1 two hundred first applicant qualifies.']);for(const b of d.blocks.filter(b=>b.ignored))b.formatting={headerParts:[{}]};return d;};const d=makePages(),r=check(d),saved=JSON.stringify(d);assert.deepEqual(r.map(i=>i.suggestion),['1,201st']);assert.equal(r[0].start,d.text.indexOf('one thousand'));assert.equal(r[0].end,d.text.indexOf('first')+5);assert.equal(JSON.stringify(d),saved);
 const table=makePages();table.blocks.find(b=>b.page===2&&b.margin).formatting={headerGaps:[{},{}]};assert.deepEqual(check(table),[]);
 const unknown=makePages(),b=unknown.blocks.find(b=>b.page===2&&b.ignored);b.formatting={};b.runningHead=false;b.layoutLabel=false;assert.deepEqual(check(unknown),[]);
});
test('literals apparent names and malformed ordinal sequences stay protected',()=>{
 for(const text of ['The title "one thousand\ntwo hundred first applicant" applies.','The One Thousand Two Hundred First Applicant Association applies.','The one hundred hundred first applicant qualifies.','The one hundred twenty thirtieth applicant qualifies.','The one hundred first two applicant qualifies.','The one hundred and and first applicant qualifies.'])assert.deepEqual(check(make(text)),[],text);
});
test('count-plus-adjective plurals and independent intact quantities remain eligible',()=>{
 assert.ok(check(make('The one hundred first applicants are eligible.')).some(i=>i.suggestion==='100'));
 assert.ok(check(make('The one thousand first-grade pupils attend.')).some(i=>i.suggestion==='1000'));
 assert.deepEqual(check(make('Wait two hundred seconds.')).map(i=>i.suggestion),['200']);
 const d=make('The one thousand two hundred first applicant qualifies. Review 3 records.'),start=d.text.indexOf('one thousand ');d.struck.push({start,end:start+13});assert.deepEqual(check(d).map(i=>i.suggestion),['three']);
});
test('whole ordinal coverage retains authority and meaning limits and the shared public primitive',()=>{
 assert.equal(directSpellOrdinal,publicSpellOrdinal);const row=CHECK_COVERAGE.find(r=>r.title==='Complete written ordinal evidence');assert.ok(row);for(const s of ['no fixed13-word','singular-rank','plural count-plus-adjective','whole-rule','dictionary authority'])assert.ok(row.text.includes(s),s);
 const rows=styleRuleInventory(refs).filter(r=>r.guide==='lcb'&&r.page===21&&r.status==='Partially automated');assert.ok(rows.length);assert.ok(rows.every(r=>r.scope.includes('Complete canonical scale ordinals')));
});
