import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
import {CHECK_COVERAGE} from '../app/style-coverage.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=t=>makeDocument(Array.isArray(t)?t:[t],'Current'),check=d=>jointStylisticIssues(d,refs).filter(i=>['numerals','compound-cardinals'].includes(i.checkId)&&!i.conflict);
test('malformed unconjoined written counts cannot produce plausible fragment values',()=>{
 for(const q of ['one hundred two one','twenty twenty','twenty-three four','one hundred two thousand one two','two hundred thirty-five six','one thousand two hundred forty-five six'])assert.deepEqual(check(make('Review '+q+' members.')).map(i=>i.suggestion),[],q);
});
test('whole canonical unconjoined counts retain every quantity component',()=>{
 for(const [q,value]of [['one hundred two','102'],['twenty-three','23'],['two hundred thirty-five','235'],['one thousand two hundred forty-five','1245'],['one hundred twenty-three trillion four hundred fifty-six billion seven hundred eighty-nine million one hundred twenty-three thousand four hundred five','123456789123405']]){
  const d=make('Review '+q+' members.'),r=check(d);assert.deepEqual(r.map(i=>i.suggestion),[value]);assert.equal(r[0].start,d.text.indexOf(q));assert.equal(r[0].end,d.text.indexOf(q)+q.length);assert.equal(check(make('Review '+value+' members.')).length,0);
 }
});
test('ordinary conjunction series keep independent quantity decisions',()=>{
 for(const [text,wanted]of [['Review 3 and 4 records.',['three','four']],['Review twenty and thirty records.',['20','30']],['Review two or twelve records.',['2','12']],['Review twenty members and 3 records.',['20','three']]])assert.deepEqual(check(make(text)).map(i=>i.suggestion),wanted,text);
 assert.deepEqual(check(make('The list includes twenty-one two-year programs and three programs.')).map(i=>i.suggestion),['21','3']);
});
test('invalid runs preserve unrelated ordinary counts and reference identifiers',()=>{
 const d=make('Review one hundred two one members. Refer to Section one. Review 3 records.');assert.deepEqual(check(d).map(i=>i.suggestion),['1','three']);
});
test('malformed unconjoined runs remain indivisible through identified page heads',()=>{
 const d=make(['ASSEMBLY BILL No. 9999\nThe people do enact as follows:\nline 1 Review one hundred two','AB 9999 — 2 —\nline 1 one members. Review 3 records.']);for(const b of d.blocks.filter(b=>b.ignored))b.formatting={headerParts:[{}]};const saved=JSON.stringify(d);assert.deepEqual(check(d).map(i=>i.suggestion),['three']);assert.equal(JSON.stringify(d),saved);
});
test('uncertain ordinary cardinal components do not invent complete suffixes',()=>{
 for(const field of ['struck','excluded'])for(const part of ['one thousand ',' hundred ','forty','-five']){const d=make('Review one thousand two hundred forty-five members. Review 3 records.'),start=d.text.indexOf(part);assert.ok(start>=0);d[field].push({start,end:start+part.length});assert.deepEqual(check(d).map(i=>i.suggestion),['three'],field+' '+part);}
});
test('ordinal and fractional constructions keep their dedicated complete recognizers',()=>{
 for(const [text,wanted]of [['Review the 3rd record.',['third']],['The one hundred twenty-third applicant qualifies.',['123rd']],['Review 2/3 of the records.',['two-thirds']],['Review one hundred and two members.',['102']]])assert.deepEqual(jointStylisticIssues(make(text),refs).filter(i=>['numerals','compound-cardinals','large-ordinals','fractions'].includes(i.checkId)&&!i.conflict).map(i=>i.suggestion),wanted,text);
});
test('ordinary cardinal coverage states ambiguity and remaining meaning limits',()=>{
 const row=CHECK_COVERAGE.find(r=>r.title==='Whole ordinary cardinal integrity');assert.ok(row);for(const s of ['Malformed adjacent counts','and/or series','rather than repairing','whole-rule','dictionary authority'])assert.ok(row.text.includes(s),s);
 const rows=styleRuleInventory(refs).filter(r=>r.guide==='lcb'&&r.page===21&&r.status==='Partially automated');assert.ok(rows.length);assert.ok(rows.every(r=>r.scope.includes('Complete unconjoined cardinal runs')));
});
