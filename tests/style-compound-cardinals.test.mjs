import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=t=>jointStylisticIssues(makeDocument([t],'Current'),refs);
test('whole recognized counts containing and never yield isolated numeral fragments',()=>{
 for(const [word,wanted] of [['one hundred and two','102'],['two hundred and twelve','212'],['one thousand and three','1,003'],['one thousand two hundred and twenty-one','1,221'],['two million and six','2,000,006']]){
  const t='The board has '+word+' members.',found=check(t);assert.equal(found.length,1,t);assert.equal(found[0].suggestion,wanted);assert.equal(found[0].text,word);assert.equal(check(t.replace(word,wanted)).length,0);
 }
});
test('bare ambiguous series, starts, names, literals, money and fractions retain their own context',()=>{
 for(const t of ['The list includes one hundred and two.','One hundred and two members are appointed.','The One Hundred And Two Members Association is named.','The term “one hundred and two members” is literal.','The agency pays one hundred and two dollars.','The two and one-half shares apply.'])assert.equal(check(t).length,0,t);
});
test('full written counts preserve exact printed-line spans and strikeout exclusions',()=>{
 const doc=makeDocument(['line 1 The agency has one thousand two hundred\nline 2 and twenty-one members.'],'Current'),found=jointStylisticIssues(doc,refs);assert.equal(found.length,1);assert.equal(found[0].suggestion,'1,221');assert.equal(doc.text.slice(found[0].start,found[0].end),found[0].text);
 doc.struck=[{start:found[0].start,end:found[0].end}];assert.equal(jointStylisticIssues(doc,refs).length,0);
});
test('budget appropriation identifiers do not hide a grouped ordinary count',()=>{
 const t='Budget Act of 2026.\nThe values are 1,000 and two.\nItem 0250-101-0932 applies.',found=check(t);assert.deepEqual(found.map(i=>i.suggestion),['2']);assert.equal(found[0].text,'two');
});
test('a malformed extracted currency group never becomes an isolated zero quantity',()=>{
 const t='Budget Act of 2026.\nThe amount is $3,000,0000.\nUp to $10,795,0000 is available.\nThe values are 1,000 and two.',found=check(t);assert.deepEqual(found.filter(i=>i.checkId==='numerals').map(i=>i.suggestion),['2']);
});
test('noncanonical repetitions do not receive invented whole-number values',()=>{
 for(const t of ['The agency has one hundred hundred members.','The agency has one thousand thousand workers.','The agency has twenty twenty members.'])assert.ok(!check(t).some(i=>i.suggestion==='10000'||i.suggestion==='1000000'||i.suggestion==='40'),t);
});
