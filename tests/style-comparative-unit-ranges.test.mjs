import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
import {makeDocument} from '../app/core.mjs';import {styleContext} from '../app/style-context.mjs';
import {comparativeUnitRanges,COMPARATIVE_UNIT_RANGE_SCOPE} from '../app/style-comparative-unit-ranges.mjs';
import {numeralIssues} from '../app/style-numerals.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const sourceFixture=JSON.parse(fs.readFileSync(new URL('./fixtures/lcb-related-quantity-source.json',import.meta.url)));
const sha=t=>crypto.createHash('sha256').update(t).digest('hex'),make=body=>makeDocument(['The people do enact as follows:\nline 1 '+body],'Current');
const groups=doc=>{const before=JSON.stringify(doc),result=comparativeUnitRanges(doc,styleContext(doc));assert.equal(JSON.stringify(doc),before);return result;};
const review=doc=>{const before=JSON.stringify(doc),issues=jointStylisticIssues(doc,refs);assert.equal(JSON.stringify(doc),before);return issues;};

test('exact Current AB76 and AB1502 PDF-source quantities stay figures with original text, strikes and source offsets preserved',()=>{
 assert.equal(sourceFixture.entries.length,2);
 for(const entry of sourceFixture.entries){assert.equal(sha(entry.text),entry.textSHA256);assert.match(entry.sourcePDF.sha256,/^[a-f\d]{64}$/);const doc=makeDocument([entry.text],entry.sourcePDF.name,[structuredClone(entry.struck)]),start=doc.text.indexOf(entry.target),numberEnd=start+entry.target.indexOf(' '),proof=groups(doc);assert.ok(start>=0);assert.equal(proof.length,1,entry.id);assert.equal(proof[0].members[0].start,start);assert.equal(proof[0].members[0].end,numberEnd);assert.ok(proof[0].members.every(m=>!doc.struck.some(r=>r.start<m.end&&r.end>m.start)));
  assert.ok(!numeralIssues(doc,refs).some(i=>i.start===start&&i.end===numberEnd),entry.id+' direct');assert.ok(!review(doc).some(i=>i.start===start&&i.end===numberEnd),entry.id+' production');assert.equal(doc.text,entry.text);assert.deepEqual(doc.struck,entry.struck);
 }
 const current=sourceFixture.entries[0],struck=current.struck[0];assert.equal(current.text.slice(struck.start,struck.end),'one');assert.equal(current.physicalPage,6);assert.equal(sourceFixture.entries[1].physicalPage,24);
});

test('explicit same-unit bounds apply Bill item3 and select only the live numeral violation',()=>{
 for(const [body,target,replacement,head] of [['A project is more than one acre and less than 10 acres.','one','1','acre'],['A project is at least two feet and at most 10 feet.','two','2','foot'],['A period is not less than three days and not more than 20 days.','three','3','day'],['A project is less than 10 acres and more than one acre.','one','1','acre'],['A total of six hours or fewer of the required 36 hours may be earned.','six','6','hour']]){
  const doc=make(body),start=doc.text.indexOf(target),issues=review(doc),found=issues.find(i=>i.start===start&&i.suggestion===replacement);assert.ok(found,body);assert.equal(found.rule,'Numerals: Bill, item 3');assert.equal(found.guideId,'lcb');assert.equal(found.conflict,false);assert.equal(doc.text.slice(found.start,found.end),target);assert.equal(issues.filter(i=>i.start<found.end&&i.end>found.start).length,1);assert.equal(found.relationshipEvidence.head,head);assert.ok(found.references.some(r=>r.guideId==='lcb'&&r.guidePage===21&&r.sourcePassage?.text.includes('different numerical expressions')));for(const member of found.relationshipEvidence.members)assert.equal(doc.text.slice(member.start,member.end),member.sourceText);
 }
 for(const body of ['A project is more than 1 acre and less than 10 acres.','A total of 6 hours or fewer of the required 36 hours may be earned.'])assert.equal(review(make(body)).length,0,body);
});

test('exact magnitudes and the ten threshold are preserved without rounding a decimal or large peer',()=>{
 for(const upper of ['10','10.0','10.000000000000000001','900719925474099312345678901234567890','9,007,199,254,740,993']){const doc=make('A project is more than 1 acre and less than '+upper+' acres.'),found=groups(doc);assert.equal(found.length,1,upper);assert.equal(found[0].members[1].sourceText,upper);assert.equal(found[0].members[1].exactSourceValue,upper.replaceAll(',',''));assert.ok(!review(doc).some(i=>i.text==='1'),upper);}
 for(const upper of ['9','9.999999999999999999999999'])assert.equal(groups(make('A project is more than 1 acre and less than '+upper+' acres.')).length,0,upper);
 for(const upper of ['01','1e2','1,00','1/2','-10','+10'])assert.equal(groups(make('A project is more than 1 acre and less than '+upper+' acres.')).length,0,upper);
});

test('unrelated quantities, different units and incomplete comparison or part-of-total cues do not acquire item3 ownership',()=>{
 for(const body of ['A project is more than 1 acre and less than 10 feet.','A project is more than 1 acre and contains 10 acres.','A project is more than 1 acre. Another project is less than 10 acres.','A project is more than 1 acre and is considered desirable and less than 10 acres.','A project is more than 1 thing and less than 10 things.','A project is more than 1 acreα and less than 10 acres.','A project is more than 1 acre and less than 10 acres-identifier.','A total of 6 hours of the required 36 hours may be earned.','A total of 6 hours or fewer of 36 hours may be earned.','A total of 6 hours or fewer of the required 36 days may be earned.','A total of 6 hours. Of the required 36 hours, other terms apply.','A total of 6 hours or fewer of the required 36 hours Act applies.'])assert.equal(groups(make(body)).length,0,body);
 const doc=make('A project is more than 1 acre. The board meets for 10 hours.'),start=doc.text.indexOf('1 acre');assert.ok(review(doc).some(i=>i.start===start&&i.suggestion==='one'),'Independent small unit retains its existing Bill spelling rule');
 const digest=makeDocument(['LEGISLATIVE COUNSEL’S DIGEST\nA project is more than 1 acre and less than 10 acres.'],'Current');assert.equal(groups(digest).length,0,'This relation invokes Bill item3 only');
 assert.match(COMPARATIVE_UNIT_RANGE_SCOPE,/independent clauses/);
});

test('every live comparison operator, amount, unit and connector remains intact through source masks',()=>{
 for(const body of ['A project is more than 1 acre and less than 10 acres.','A total of 6 hours or fewer of the required 36 hours may be earned.']){
  const original=make(body),proof=groups(original)[0];assert.ok(proof);
  for(const field of ['struck','excluded'])for(let at=proof.start;at<proof.end;at++){const doc=structuredClone(original);doc[field].push({start:at,end:at+1});assert.equal(groups(doc).length,0,field+' '+body+' '+at);}
 }
 for(const [body,cut] of [['A project is more than 1 acre unknown and less than 10 acres.','unknown'],['A project is more than 1 acre and not less than 10 acres.','not'],['A total of 6 hours or fewer unknown of the required 36 hours may be earned.','unknown']])for(const field of ['struck','excluded']){const doc=make(body),start=doc.text.indexOf(cut);doc[field].push({start,end:start+cut.length});assert.equal(groups(doc).length,0,body+' '+field);}
 const source=make('A project is more than one\nline 2 1 acre and less than 10 acres.'),old=source.text.indexOf('one');source.struck.push({start:old,end:old+3});assert.equal(groups(source).length,1,'Known wholly struck same-value old word is not a live relationship member');
 const uncertain=structuredClone(source);uncertain.struck=[];uncertain.excluded.push({start:old,end:old+3});assert.equal(groups(uncertain).length,0,'Unknown exclusions never authorize the old-word exception');
});

test('quotes, quoted terms, titles, tables and damaged literal boundaries retain their protections',()=>{
 for(const body of ['A project is more than 1 acre and less than 10 acres.','A total of 6 hours or fewer of the required 36 hours may be earned.'])for(const marks of [['“','”'],['"','"'],['‘','’'],["'","'"]]){
  const doc=make('The instruction shall insert '+marks[0]+body+marks[1]);assert.equal(groups(doc).length,0);
  for(const field of ['struck','excluded'])for(const at of [doc.text.indexOf(marks[0]),doc.text.lastIndexOf(marks[1])]){const bad=structuredClone(doc);bad[field].push({start:at,end:at+1});assert.equal(groups(bad).length,0,field+' '+marks.join(''));}
 }
 const doc=make('A project is more than one acre and less than 10 acres.');doc.blocks.at(-1).formatting={headerGaps:[1,2]};assert.equal(groups(doc).length,0);
 const quoted=make('“one” means the specified term. A project is more than one acre and less than 10 acres.');assert.ok(!review(quoted).some(i=>i.text==='one'));
 assert.ok(review(make('A project is more than one acre and less than 10 acres.')).some(i=>i.text==='one'&&i.suggestion==='1'),'The quoted authority cannot carry to the next bill');
});

test('recognized PDF line/page divisions preserve whole source evidence and reject unknown head bridges',()=>{
 const doc=makeDocument(['The people do enact as follows:\nline 1 A project is more than one acre and','AB 76 — 6 —\nline 1 less than 10 acres.'],'Current'),head=doc.blocks.find(b=>b.text==='AB 76 — 6 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};const found=review(doc).find(i=>i.text==='one'&&i.suggestion==='1');assert.ok(found);assert.equal(found.relationshipEvidence.members[0].sourceText,'one');assert.equal(found.relationshipEvidence.members[1].sourceText,'10');for(const member of found.relationshipEvidence.members)assert.equal(doc.text.slice(member.headStart,member.headEnd).replace(/\s+/gu,' '),member===found.relationshipEvidence.members[0]?'acre':'acres');
 const bad=structuredClone(doc),unknown=bad.blocks.find(b=>b.text==='AB 76 — 6 —');unknown.formatting={};unknown.runningHead=false;unknown.layoutLabel=false;assert.equal(groups(bad).length,0);
});
