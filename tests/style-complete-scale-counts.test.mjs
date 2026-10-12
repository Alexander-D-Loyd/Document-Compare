import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
import {CHECK_COVERAGE} from '../app/style-coverage.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),make=t=>makeDocument(Array.isArray(t)?t:[t],'Current'),check=d=>jointStylisticIssues(d,refs).filter(i=>['compound-cardinals','numerals'].includes(i.checkId));
const long='one hundred twenty-three trillion four hundred fifty-six billion seven hundred eighty-nine million one hundred twenty-three thousand four hundred and five',wanted='123,456,789,123,405';
test('a complete supported long scale-and-remainder count has one whole correction',()=>{
 const d=make('Review '+long+' members.'),r=check(d);assert.deepEqual(r.map(i=>i.suggestion),[wanted]);assert.equal(d.text.slice(r[0].start,r[0].end),long);assert.equal(check(make('Review '+wanted+' members.')).length,0);
 const t=long.replace('four hundred and five','four hundred and twenty-five');assert.deepEqual(check(make('Review '+t+' schooldays and report attendance.')).map(i=>i.suggestion),['123,456,789,123,425']);
});
test('noncanonical scale conjunctions never yield invented values or isolated fragments',()=>{
 for(const q of ['one hundred and and two','one hundred and twenty and three','one hundred and two and three','one hundred and two thousand thousand and three','one hundred and two hundred','one hundred and two one','one hundred and zero'])assert.equal(check(make('Review '+q+' members.')).length,0,q);
});
test('conventional internal scale conjunctions retain a complete canonical value',()=>{
 for(const [q,value]of [['one hundred and one thousand and two','101,002'],['one hundred and two million three hundred and four thousand five hundred and six','102,304,506']])assert.deepEqual(check(make('Review '+q+' members.')).map(i=>i.suggestion),[value],q);
});
test('long quantities preserve whole offsets across more than one identified page head',()=>{
 const parts=['one hundred twenty-three trillion','four hundred fifty-six billion seven hundred eighty-nine million','one hundred twenty-three thousand four hundred and five'],d=make(parts.map((p,i)=>(i?'AB 9999 — '+(i+1)+' —':'ASSEMBLY BILL No. 9999\nThe people do enact as follows:')+'\nline 1 '+(i?'':'Review ')+p+(i===2?' members.':'')));for(const b of d.blocks.filter(b=>b.ignored))b.formatting={headerParts:[{}]};const saved=JSON.stringify(d),r=check(d);assert.deepEqual(r.map(i=>i.suggestion),[wanted]);assert.equal(r[0].start,d.text.indexOf(parts[0]));assert.equal(r[0].end,d.text.indexOf(parts[2])+parts[2].length);assert.equal(JSON.stringify(d),saved);
});
test('whole long quantity and head evidence protects source uncertainty',()=>{
 for(const field of ['struck','excluded'])for(const part of ['one hundred twenty-three trillion ','trillion',' billion ','and five','members']){const d=make('Review '+long+' members.'),start=d.text.indexOf(part);d[field].push({start,end:start+part.length});assert.equal(check(d).length,0,field+' '+part);}
});
test('complete long literals names tables and unknown bridges remain protected',()=>{
 for(const text of ['The title "Review '+long.replace('billion ','billion\n')+' members" applies.','Review '+long+' members.................100','The '+long.replace(/\b\w/g,c=>c.toUpperCase())+' Members Association applies.'])assert.equal(check(make(text)).length,0,text);
});
test('invalid long runs do not suppress independent intact ordinary counts',()=>{
 const d=make('Review '+('one hundred and two '.repeat(80))+'members. Review 3 records.');assert.deepEqual(check(d).map(i=>i.suggestion),['three']);
});
test('whole-value scope preserves safe-value and remaining meaning limits',()=>{
 const row=CHECK_COVERAGE.find(r=>r.title==='Complete scale-and-remainder values');assert.ok(row);for(const text of ['no fixed19-token cap','Invalid repeated scales','safe-integer','whole-rule','dictionary authority'])assert.ok(row.text.includes(text),text);
 const rows=styleRuleInventory(refs).filter(r=>r.guide==='lcb'&&r.page===21&&r.status==='Partially automated');assert.ok(rows.length);assert.ok(rows.every(r=>r.scope.includes('no fixed19-token cap')));
});
