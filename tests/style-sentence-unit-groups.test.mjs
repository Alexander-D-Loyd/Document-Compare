import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {numeralIssues} from '../app/style-numerals.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=text=>makeDocument(['The people do enact as follows:\nline 1 '+text],'Current');
function review(doc){const before=JSON.stringify(doc),result=jointStylisticIssues(doc,refs);assert.equal(JSON.stringify(doc),before);return result.filter(i=>i.checkId==='numerals');}
const flagged=(doc,text)=>review(doc).filter(i=>i.start===doc.text.indexOf(text)&&i.end===doc.text.indexOf(text)+text.split(' ')[0].length);
test('same written unit across arbitrary intervening prose remains figures in the same sentence',()=>{
 for(const [text,target]of [
  ['The employee may complete 6 hours online as part of the required 36 hours of training.','6 hours'],
  ['The employee must complete 36 hours of training, of which 6 hours may be online.','6 hours'],
  ['A project occupies 1 acre, and the maximum project area is 10 acres.','1 acre'],
  ['A project is more than 1 acre and contains 10 acres.','1 acre'],
  ['The limit is 5 days, although a board may extend that limit to 30 days.','5 days'],
  ['A project is more than 1 acre and is considered desirable and less than 10 acres.','1 acre'],
  ['The agency employs 3 employees, operates 2 facilities, and will employ 20 employees.','3 employees'],
  ['The service covers 1 child and will subsequently cover 10 children.','1 child'],
  ['The program reaches 1 person and, after expansion, 20 people.','1 person'],
  ['The office inspects 1 facility while another office inspects 10 facilities.','1 facility'],
  ['A total of 6 hours of the required 36 hours may be earned.','6 hours'],
  ['The project covers 1 square foot and may expand to 10 square feet.','1 square foot'],
  ['The deadline is 3 business days and may be extended to 10 business days.','3 business days']
 ])assert.equal(flagged(make(text),target).length,0,text);
});
test('explicit same-unit relationship still flags words, while conservative sentence matching creates no new speculative findings',()=>{
 const doc=make('A total of six hours or fewer of the required 36 hours may be earned.'),found=review(doc).find(i=>i.text==='six');assert.ok(found);assert.equal(found.suggestion,'6');assert.equal(found.rule,'Numerals: Bill, item 3');assert.equal(found.relationshipEvidence.kind,'explicit-part-of-total-unit-range');
 assert.equal(doc.text.slice(found.start,found.end),'six');for(const member of found.relationshipEvidence.members)assert.equal(doc.text.slice(member.start,member.end),member.sourceText);
 assert.ok(found.references.some(r=>r.guideId==='lcb'&&r.guidePage===21));
 assert.equal(review(make('A conviction within 10 years carries not exceeding one year in jail.')).length,0);
 assert.equal(review(make('The employee may complete six hours online as part of the required 36 hours of training.')).length,0);
});
test('different units, qualified units and different sentences do not authorize the exception',()=>{
 for(const [text,target]of [
  ['The employee may complete 6 hours and must train for 36 days.','6 hours'],
  ['The deadline is 3 business days and the other deadline is 10 calendar days.','3 business days'],
  ['The project covers 1 square foot and contains 10 cubic feet.','1 square foot'],
  ['The employee completes 6 hours. Another employee completes 36 hours.','6 hours'],
  ['The project occupies 1 acre. Another project occupies 10 acres.','1 acre'],
  ['The project serves 3 employees and operates 20 facilities.','3 employees'],
  ['The employee completes 6 hours and a total of 9 hours is required.','6 hours']
 ])assert.equal(flagged(make(text),target).length,1,text);
});
test('a complete decimal peer establishes ten or more without rounding or accepting a partial numeric token',()=>{
 for(const peer of ['10.0','36.5','10.000000000000000001','900719925474099312345678901234567890'])assert.equal(flagged(make('The employee completes 6 hours out of the required '+peer+' hours.'),'6 hours').length,0,peer);
 for(const peer of ['9.999999999999999999999','-36','36/5'])assert.equal(flagged(make('The employee completes 6 hours out of the required '+peer+' hours.'),'6 hours').length,1,peer);
});
test('intervening unrelated units retain their own form while repeated units use figures',()=>{
 const doc=make('The agency employs 3 employees, operates 2 facilities, and will employ 20 employees.');assert.equal(flagged(doc,'3 employees').length,0);assert.equal(flagged(doc,'2 facilities').length,1);
});
test('age and elapsed years remain different numerical expressions under LCB',()=>{
 for(const text of ['A person 18 years of age shall serve three, five, or seven years.','A person 18 years old shall serve three years.','A person aged 18 years shall serve three years.','A person of the age of 18 years shall serve three years.'])assert.equal(review(make(text)).length,0,text);
 const separate=make('A person who, within 10 years of the conviction, owns a firearm is punishable by imprisonment in a county jail not exceeding 1 year.');assert.equal(flagged(separate,'1 year').length,1,'A conviction lookback and jail term are separate numerical expressions');
});
test('sentence-opening figures retain their independent spelling rule',()=>{
 const doc=make('6 hours of the required 36 hours may be online.');assert.equal(flagged(doc,'6 hours')[0]?.suggestion,'Six');
 const already=make('Ten hours of training includes 1 hour online.');assert.equal(flagged(already,'1 hour').length,0);
});
test('struck or quoted peers, legal identifiers and uncertain unit source cannot establish same-unit authority',()=>{
 for(const field of ['struck','excluded'])for(const target of ['36','hours']){
  const doc=make('The employee completes 6 hours out of the required 36 hours.'),at=target==='36'?doc.text.indexOf('36'):doc.text.lastIndexOf('hours');doc[field].push({start:at,end:at+target.length});assert.equal(flagged(doc,'6 hours').length,1,field+' '+target);
 }
 for(const text of ['The employee completes 6 hours and the instruction quotes “36 hours”.','The employee completes 6 hours under Section 36.','The employee completes 6 hours and cites Article 36 hours.'])assert.equal(flagged(make(text),'6 hours').length,1,text);
 const doc=make('The employee completes 6 hours. Another employee completes 36 hours.'),at=doc.text.indexOf('. Another');doc.excluded.push({start:at,end:at+1});assert.equal(flagged(doc,'6 hours').length,1,'An uncertain period cannot join separate sentences');
});
test('quoted terms remain local and changed source quantities remain intact',()=>{
 const doc=make('“six hours” means the training term. A total of six hours or fewer of the required 36 hours may be earned.'),at=doc.text.lastIndexOf('six hours');assert.ok(!review(doc).some(i=>i.start===at));assert.equal(review(make('A total of six hours or fewer of the required 36 hours may be earned.')).find(i=>i.text==='six')?.suggestion,'6');
});
test('physical line/page divisions and reader-known heads preserve source locations',()=>{
 const doc=makeDocument(['The people do enact as follows:\nline 1 The employee completes 6 hours online as part of','AB 1 — 2 —\nline 1 the required 36 hours of training.'],'Current'),head=doc.blocks.find(b=>b.text==='AB 1 — 2 —');head.runningHead=true;head.ignored=true;head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};doc.excluded.push({start:head.start,end:head.end});assert.equal(flagged(doc,'6 hours').length,0);
});
