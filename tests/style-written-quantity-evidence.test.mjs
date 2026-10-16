import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
import {CHECK_COVERAGE} from '../app/style-coverage.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),make=t=>makeDocument(Array.isArray(t)?t:[t],'Current');
const check=d=>jointStylisticIssues(d,refs).filter(i=>['compound-cardinals','numerals'].includes(i.checkId));
const headed=(left,right,label='AB 9999 — 2 —')=>{const d=make(['ASSEMBLY BILL No. 9999\nThe people do enact as follows:\nline 1 '+left,label+'\nline 1 '+right]);for(const b of d.blocks.filter(b=>b.ignored))b.formatting={headerParts:[{}]};return d;};
test('complete scale-and-remainder counts recognize schoolday and duration noun heads',()=>{
 for(const head of ['school days','schooldays','days','weeks','months','years','hours','minutes','seconds','business days','court days','calendar months','academic years','working days','consecutive days']){
  const d=make('Operate one hundred and two '+head+' and report attendance.'),r=check(d);assert.deepEqual(r.map(i=>i.suggestion),['102'],head);assert.equal(d.text.slice(r[0].start,r[0].end),'one hundred and two');assert.equal(check(make('Operate 102 '+head+' and report attendance.')).length,0,head+' compliant');
 }
});
test('whole written counts cross identified page heads and keep complete source offsets',()=>{
 for(const [left,right,wanted,tail]of [['Review two hundred','thirty-five councilmembers.','235','thirty-five'],['Review one thousand','two hundred forty-five records.','1245','two hundred forty-five'],['Review one hundred and','two schooldays and report attendance.','102','two']]){
  const d=headed(left,right),saved=JSON.stringify(d),r=check(d);assert.deepEqual(r.map(i=>i.suggestion),[wanted],left);assert.equal(r[0].start,d.text.indexOf(left)+7);assert.equal(r[0].end,d.text.indexOf(right)+tail.length);assert.equal(JSON.stringify(d),saved);
 }
});
test('identified page heads inside the noun evidence have no fixed hundred-character cutoff',()=>{
 const d=headed('Review one hundred and two','members apply.','AB 9999 — '+('recognized page header '.repeat(15))+'2 —'),b=d.blocks.find(b=>b.page===2&&!b.margin);b.ignored=true;b.formatting={headerParts:[{}]};d.excluded.push({start:b.start,end:b.end});assert.deepEqual(check(d).map(i=>i.suggestion),['102']);
});
test('whole original number components and connecting spaces reject source uncertainty',()=>{
 for(const text of ['Review one hundred and twenty-three members.','Review two hundred thirty-five records.','Review one million two hundred and three schooldays.'])for(const field of ['struck','excluded']){
  const start=text.indexOf('one')>=0?text.indexOf('one'):text.indexOf('two'),end=text.lastIndexOf(' members')>=0?text.lastIndexOf(' members'):text.lastIndexOf(' records')>=0?text.lastIndexOf(' records'):text.lastIndexOf(' schooldays');
  for(let at=start;at<end;at++){const d=make(text);d[field].push({start:at,end:at+1});assert.equal(check(d).length,0,text+' '+field+' '+at);}
 }
});
test('a removed leading written scale cannot leave a suffix count with an invented value',()=>{
 for(const field of ['struck','excluded']){const d=make('Review one million two hundred and three members.'),start=d.text.indexOf('one million');d[field].push({start,end:start+'one million '.length});assert.equal(check(d).length,0,field);}
});
test('complete noun head and boundaries remain establishing evidence',()=>{
 for(const field of ['struck','excluded'])for(const [text,part]of [['Review one hundred and two members.','member'],['Review one hundred and two school days.','school'],['Review one hundred and two members.',' and ']]){
  const d=make(text),start=text.indexOf(part);d[field].push({start,end:start+part.length});assert.equal(check(d).length,0,text+' '+field+' '+part);
 }
 for(const c of ['α','\u0301'])for(const field of ['struck','excluded']){const d=make('Review '+c+'one hundred and two members.'),start=d.text.indexOf(c);d[field].push({start,end:start+c.length});assert.equal(check(d).length,0,c+' '+field);}
});
test('literals tables unknown ignored bridges and unfamiliar duration names stay protected',()=>{
 for(const text of ['The title "Review one hundred\nand two schooldays" applies.','Review one hundred and two members..................100','Review one hundred and two School Days Association members.'])assert.equal(check(make(text)).length,0,text);
 const d=headed('Review one hundred','and two records.','Unclassified body words');const b=d.blocks.find(b=>b.page===2&&!b.margin);b.ignored=true;d.excluded.push({start:b.start,end:b.end});assert.equal(check(d).length,0,'unknown ignored bridge');
 const table=make('line 1 Review one hundred\nline 2 and two records.');table.blocks[0].formatting={headerGaps:[{},{}]};assert.equal(check(table).length,0,'whole count intersects table');
});
test('independent intact counts remain eligible beside unrelated uncertain quantities',()=>{
 const d=make('Review one million two hundred and three members.\nReview one hundred and two schooldays.'),start=d.text.indexOf('million');d.struck.push({start,end:start+7});assert.deepEqual(check(d).map(i=>i.suggestion),['102']);
 assert.deepEqual(check(make('Refer to Section one. Review 3 records.')).map(i=>i.suggestion),['1','three']);
});
test('written quantity metadata retains bounded role and whole-rule limits',()=>{
 const card=CHECK_COVERAGE.find(r=>r.title==='Complete written quantity evidence');assert.ok(card);for(const text of ['schoolday','original word','page heads','whole-rule','bounded'])assert.ok(card.text.includes(text),text);
 const rows=styleRuleInventory(refs).filter(r=>r.id.startsWith('lcb-21-')&&r.status==='Partially automated');assert.ok(rows.length);assert.ok(rows.every(r=>r.scope.includes('Complete written cardinal runs')));
});
