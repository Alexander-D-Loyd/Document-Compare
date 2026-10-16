import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {numeralIssues} from '../app/style-numerals.mjs';import {fractionIssues} from '../app/style-fractions.mjs';
import {CHECK_COVERAGE} from '../app/style-coverage.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=t=>makeDocument(Array.isArray(t)?t:[t],'Current'),numbers=d=>numeralIssues(d,refs),fractions=d=>fractionIssues(d,refs);
test('leading decimal and spaced mixed glyphs never produce standalone digit corrections',()=>{
 for(const n of ['.5','+.5','− .5','2 ½','2½','2 1/2','2 1 / 2','2⁄3','2.5.3','12,34','2..5','2/0','2/3/4'])assert.equal(numbers(make('Operate '+n+' schooldays and report attendance.')).length,0,n);
});
test('fraction candidates require the entire numeric expression',()=>{
 for(const n of ['2/3/4','2⁄3⁄4','.2/3','1.2/3','2/3.5','2 / 3 / 4','2 1/2','2 ½','-2/3','+⅔','− ⅔'])assert.equal(fractions(make('Use '+n+' of the amount.')).length,0,n);
 for(const n of ['2/3','2 / 3','2⁄3','⅔'])assert.deepEqual(fractions(make('Use '+n+' of the amount.')).map(i=>i.suggestion),['two-thirds'],n);
});
test('masked prefixes and numeric punctuation cannot manufacture standalone quantities',()=>{
 for(const [n,part]of [['12.5','12.'],['2 1/2','2'],['2 ½','2'],['2/3/4','2/'],['2/3','/'],['− 2','−']])for(const field of ['struck','excluded']){
  const d=make('Use '+n+' of the amount.'),start=d.text.indexOf(n)+n.indexOf(part);d[field].push({start,end:start+part.length});assert.equal(numbers(d).length,0,n+' '+field);assert.equal(fractions(d).length,0,n+' '+field);
 }
});
test('whole mixed quantity evidence spans identified page heads without marking the head',()=>{
 const d=make(['ASSEMBLY BILL No. 9999\nThe people do enact as follows:\nline 1 Use 2','AB 9999 — 2 —\nline 1 1/2 of the amount.']);for(const b of d.blocks.filter(b=>b.ignored))b.formatting={headerParts:[{}]};assert.equal(numbers(d).length,0);assert.equal(fractions(d).length,0);
});
test('independent counts and whole simple fractions remain checked',()=>{
 for(const t of ['Use 3 records.','Use 4 records.'])assert.equal(numbers(make(t)).length,1,t);
 assert.deepEqual(numbers(make('Use 3 records and 12 applications.')).filter(i=>!i.conflict).map(i=>i.suggestion),['three']);
 assert.equal(fractions(make('Use 2/3 of the amount and 1/2 of the reserve.')).length,2);
 const d=make('Use 2 1/2 hours.');assert.ok(fractions(d).some(i=>i.text==='2 1/2'&&i.suggestion==='two and one-half'));
});
test('numeric boundary scope stays partial and preserves existing ordinal decisions',()=>{
 assert.deepEqual(numbers(make('A 3rd meeting applies.')).map(i=>i.suggestion),['third']);
 const card=CHECK_COVERAGE.find(r=>r.title==='Whole numeric expression evidence');assert.ok(card);assert.match(card.text,/Original uncertain body text/);assert.match(card.text,/partially automated/);
 const rows=styleRuleInventory(refs).filter(r=>r.id.startsWith('lcb-21-')&&r.status==='Partially automated');assert.ok(rows.length);assert.ok(rows.every(r=>r.scope.includes('Whole numeric source expressions')));
});
