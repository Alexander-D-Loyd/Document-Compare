import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const review=doc=>jointStylisticIssues(doc,refs).filter(i=>i.checkId==='numerals');

test('LCB explicit point-size example applies to written font/type sizes with agreeing guide references',()=>{
 for(const [text,word,value] of [['The form uses six-point type.','six','6'],['The box uses three-point boldface type.','three','3'],['The font size is eight points roman type.','eight','8'],['The body uses twelve-point fonts.','twelve','12']]){
  const doc=makeDocument([text],'Current'),issues=review(doc);assert.equal(issues.length,1,text);const i=issues[0];
  assert.equal(i.suggestion,value);assert.equal(doc.text.slice(i.start,i.end),word);assert.equal(i.conflict,false);assert.equal(i.guidePage,23);assert.equal(i.references[0].rule,'Numerals: Measures');assert.equal(i.references[1].rule,'12.9');
 }
});

test('point-size findings retain exact page/margin offsets and skip literal or removed text',()=>{
 const pages=['ASSEMBLY BILL No. 495\nline 1 The form uses three-point\n94','AB 495 — 2 —\nline 1 boldface type and 4 reports.'],doc=makeDocument(pages,'Current'),issues=review(doc);
 assert.deepEqual(issues.map(i=>[doc.text.slice(i.start,i.end),i.suggestion]),[['three','3'],['4','four']]);
 for(const text of ['The form uses “three-point type” as a literal.','The guide calls it "eight-point font".','The plan uses a three-point typewriter setting.','Three-point type is used.','The 3-Point Type Institute supplies the records.','The Three-Point Type Institute supplies the records.'])assert.equal(review(makeDocument([text],'Current')).length,0,text);
 const removed='The form uses three-point type.',start=removed.indexOf('three');assert.deepEqual(review(makeDocument([removed],'Current',[[{start,end:start+5}]])),[]);
});

test('ordinary point counts and genuine small-measure guide disagreements retain their existing rules',()=>{
 assert.deepEqual(review(makeDocument(['The office uses a 3-point plan and 4 reports.'],'Current')).map(i=>[i.text,i.suggestion]),[['3','three'],['4','four']]);
 assert.deepEqual(review(makeDocument(['The board uses two feet of cable.'],'Current')),[],'The user excludes an actual LCB/GPO measurement disagreement');
 assert.ok(review(makeDocument(['3-point type is used.'],'Current')).some(i=>i.text==='3'&&i.suggestion==='Three'));
});
