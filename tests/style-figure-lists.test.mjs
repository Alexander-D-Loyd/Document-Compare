import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {serialCommaIssues} from '../app/style-serial-commas.mjs';
import {semicolonSeriesIssues} from '../app/style-semicolon-series.mjs';
import {listNounPhrase,listItemPhrase,countedListPhrase,punctuationListNounPhrase} from '../app/style-list-phrases.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=t=>makeDocument(Array.isArray(t)?t:[t],'Current'),serial=t=>serialCommaIssues(typeof t==='string'?make(t):t,refs),grouped=t=>semicolonSeriesIssues(typeof t==='string'?make(t):t,refs);
test('explicit decimal fraction percentage and colon figure lists select only the final conjunction',()=>{
 for(const items of [['1.5','2.5','3.5'],['.5','.6','.7'],['1,234.5','2,345.6','3,456.7'],['-1.5','+2.5','−3.5'],['1/2','2/3','3/4'],['1 ⁄ 2','2 ⁄ 3','3 ⁄ 4'],['10%','20%','30%'],['3:30','4:45','5:15']])for(const join of ['and','or','nor']){
  const text='The values include '+items[0]+', '+items[1]+' '+join+' '+items[2]+'.',d=make(text),before=JSON.stringify(d),r=serial(d);assert.equal(r.length,1,text);assert.equal(r[0].text,join);assert.equal(d.text.slice(r[0].start,r[0].end),join);assert.equal(r[0].suggestion,', '+join);assert.equal(serial(text.replace(' '+join+' ', ', '+join+' ')).length,0);assert.equal(JSON.stringify(d),before);
 }
});
test('figure recognition is confined to punctuation and does not widen numerical-expression grouping',()=>{
 for(const atom of ['1.5','.5','−1.5','1/2','1 ⁄ 2','10%','3:30']){assert.ok(punctuationListNounPhrase(atom,refs.lcb),atom);assert.equal(listNounPhrase(atom,refs.lcb),false);assert.equal(listItemPhrase(atom,refs.lcb),false);assert.equal(countedListPhrase(atom+' years',refs.lcb),null);}
});
test('complete numerical alternatives can form one finite punctuation item',()=>{
 assert.equal(serial('The values include 1.5 or 2.5, 3.5 and 4.5.').length,1);assert.equal(serial('The values include 1/2, 2/3 and 3/4 or 4/5.').length,1);assert.equal(serial('The values include 1.5 or 2.5 or 3.5, 4.5 and 5.5.').length,0);
});
test('grouped figure series distinguish grouping commas from item separators',()=>{
 for(const text of ['The values include 1.5, 2.5; 3.5, 4.5 and 5.5, 6.5.','The values include 1,234.5, 2,345.6; 3,456.7, 4,567.8 and 5,678.9, 6,789.1.','The values include 1/2, 2/3; 3/4, 4/5 and 5/6, 6/7.']){const r=grouped(text);assert.equal(r.length,1,text);assert.equal(r[0].text,'and');assert.equal(r[0].suggestion,'; and');assert.equal(grouped(text.replace(' and ','; and ')).length,0);}
});
test('unrecognized numeric expressions identifiers clauses and attached Unicode do not create partial lists',()=>{
 for(const tail of ['3.5-year programs','3:30-hour shifts','3/4-year programs','3.5α','3.5e2','3.5.6','3.5+4.5','3.5/4.5','ABC/DEF','3.5 if eligible','3,45.6','3.5%%'])assert.equal(serial('The values include 1.5, 2.5 and '+tail+'.').length,0,tail);
 assert.equal(serial('The values αinclude 1.5, 2.5 and 3.5.').length,0);assert.equal(serial('The values include 1.5, 2.5 and 3.5. The time is 4:30.').length,1);
});
test('all figure evidence retains source strike table literal and excluded-context protections',()=>{
 const text='The values include 1.5, 2.5 and 3.5.';assert.equal(serial('The title "'+text+'" is literal.').length,0);
 for(const position of [text.indexOf('include'),text.indexOf('1.5'),text.indexOf('2.5')-1,text.indexOf('3.5')]){const d=make(text);d.struck=[{start:position,end:position+1}];assert.equal(serial(d).length,0);const e=make(text);e.excluded.push({start:position,end:position+1});assert.equal(serial(e).length,0);}
 const table=make('The values include 1.5,\n2.5 and 3.5.');table.blocks[1].formatting={headerGaps:[{},{}]};assert.equal(serial(table).length,0);
});
test('wrapped fractions and identified page heads preserve exact original conjunction selections',()=>{
 const d=make(['ASSEMBLY BILL No. 9999\nThe people do enact as follows:\nline 1 The values include 1 /\nline 2 2, 2 /','AB 9999 — 2 —\nline 1 3 and 3 / 4.']);d.blocks.find(b=>b.ignored).formatting={headerParts:[{}]};const before=JSON.stringify(d),r=serial(d);assert.equal(r.length,1);assert.equal(r[0].text,'and');assert.equal(d.text.slice(r[0].start,r[0].end),'and');assert.equal(JSON.stringify(d),before);
});
