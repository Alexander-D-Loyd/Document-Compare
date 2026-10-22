import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {measurementIssues} from '../app/style-measures.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=text=>makeDocument(['The people do enact as follows:\n'+text],'Current');
const direct=doc=>measurementIssues(doc,refs).filter(i=>['9.54','9.55'].includes(i.rule));
const joint=doc=>jointStylisticIssues(doc,refs).filter(i=>['9.54','9.55'].includes(i.rule));
test('complete numeric exact-hour and redundant-clock forms follow the printed GPO passages',()=>{
 const page=refs.gpo.pages[249];assert.match(page.text,/10 a\.m\. \(not 10:00 a\.m\.\)/);assert.match(page.text,/not 10 o’clock p\.m\./);
 for(const [text,wanted,rule]of [['Meet at 10:00 A.M.','10 a.m.','9.54'],['Meet at 12:00 P. M.','12 p.m.','9.54'],["Meet at 2 o'clock p.m.",'2 p.m.','9.55'],['Meet at 10 O’CLOCK A. M.','10 a.m.','9.55'],['Meet at 2:03 o’clock p.m.','2:03 p.m.','9.55']]){
  const doc=make(text),before=JSON.stringify(doc);for(const check of [direct,joint]){const found=check(doc);assert.equal(found.length,1,text);const i=found[0];assert.equal(i.suggestion,wanted);assert.equal(i.rule,rule);assert.equal(i.guidePage,250);assert.equal(doc.text.slice(i.start,i.end),i.text);assert.equal(i.guidePrintedPage,'236');}assert.equal(JSON.stringify(doc),before);
 }
});
test('canonical meridians and unsupported time meanings remain quiet',()=>{
 for(const text of ['Meet at 10 a.m.','Meet at 2:30 p.m.','Meet at 12 p.m.','Meet at 12 a.m.','Meet at noon.','Meet at midnight.','Meet at 0:00 a.m.','Meet at 13:00 p.m.','Meet at 2:63 o’clock p.m.'])for(const check of [direct,joint])assert.equal(check(make(text)).length,0,text);
});
test('technical and Unicode endpoints never turn a clock fragment into an exact hour',()=>{
 for(const text of ['Use x10:00 a.m.','Use 10:00 a.m.x','Use 10:00 a.m.é','Use 10:00 a.m.\u0301','Use key/10:00 a.m.','Use 10:00 a.m./key','Use pre-10:00 a.m.','Use 10:00 a.m.-key','Use 2:63 o’clock a.m.','Cite Section 10:00 a.m.'])for(const check of [direct,joint])assert.equal(check(make(text)).length,0,text);
});
test('every hour meridian and interior bridge character requires intact original evidence',()=>{
 for(const phrase of ['10:00 a.m.','2 o’clock p.m.']){
  const doc=make('Meet at '+phrase),start=doc.text.indexOf(phrase);for(const field of ['struck','excluded'])for(let n=0;n<phrase.length;n++){const d=structuredClone(doc);d[field].push({start:start+n,end:start+n+1});for(const check of [direct,joint])assert.equal(check(d).length,0,field+' '+phrase+' '+n);}
 }
 for(const field of ['struck','excluded']){const doc=make('Meet at 10:00 old a.m.'),start=doc.text.indexOf('old');doc[field].push({start,end:start+3});for(const check of [direct,joint])assert.equal(check(doc).length,0,field+' hidden bridge');}
});
test('original quotes bill-local authority and longer named titles remain protected',()=>{
 for(const [open,close]of [['“','”'],['"','"'],["'","'"]]){const doc=make('The wording is '+open+'10:00 a.m.'+close);for(const check of [direct,joint])assert.equal(check(doc).length,0,open);for(const field of ['struck','excluded'])for(const at of [doc.text.indexOf(open),doc.text.lastIndexOf(close)]){const d=structuredClone(doc);d[field].push({start:at,end:at+1});for(const check of [direct,joint])assert.equal(check(d).length,0,field+' quote');}}
 for(const check of [direct,joint]){assert.equal(check(make('“10:00 a.m.” is the term. Meet at 10:00 a.m.')).length,0);assert.equal(check(make('Meet at 10:00 a.m.')).length,1);assert.equal(check(make('The 10:00 a.m. Program applies.')).length,0);}
});
test('table and headings are protected while known physical page heads preserve original ranges',()=>{
 const table=make('Meet at 10:00 a.m.');table.blocks.at(-1).formatting={headerGaps:[{},{}]};for(const check of [direct,joint])assert.equal(check(table).length,0);
 const heading=makeDocument(['Meet at 10:00 a.m.\nThe people do enact as follows:\nMeet at 10 a.m.'],'Current');for(const check of [direct,joint])assert.equal(check(heading).length,0);
 const doc=makeDocument(['The people do enact as follows:\nline 1 Meet at 10:00','AB 999 — 2 —\nline 1 a.m.'],'Current'),head=doc.blocks.find(b=>b.text==='AB 999 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};const before=JSON.stringify(doc);
 for(const check of [direct,joint]){const [i]=check(doc);assert.ok(i);assert.equal(i.suggestion,'10 a.m.');assert.match(i.text,/AB 999/);assert.equal(doc.text.slice(i.start,i.end),i.text);}assert.equal(JSON.stringify(doc),before);
 const unknown=structuredClone(doc),h=unknown.blocks.find(b=>b.text==='AB 999 — 2 —');h.formatting=null;h.runningHead=false;h.layoutLabel=false;h.ignored=true;for(const check of [direct,joint])assert.equal(check(unknown).length,0,'unknown page head');
});
test('complete original creation names protect time-shaped title text without hiding ordinary clock corrections',()=>{
 for(const tail of ['West Foundation','Company','Wést Foundation','West Community Foundation'])for(const phrase of ['10:00 a.m.','2 o’clock p.m.']){
  const text='The '+phrase+' '+tail+' is hereby established.',d=make(text),before=JSON.stringify(d);for(const check of [direct,joint])assert.equal(check(d).length,0,text);assert.equal(JSON.stringify(d),before);
 }
 const text='The 10:00 a.m. West Foundation is hereby established.',d=make(text),suffix=d.text.indexOf('West'),end=d.text.lastIndexOf('.');
 for(const property of ['struck','excluded'])for(let at=suffix;at<end;at++){const changed=structuredClone(d);changed[property].push({start:at,end:at+1});for(const check of [direct,joint])assert.equal(check(changed).length,0,property+' creation suffix '+at);}
 for(const text of ['The meeting is at 10:00 a.m. West Foundation is hereby established.','Meet at 10:00 a.m. The Company is hereby established.','The meeting at 2 o’clock p.m. will continue.'])for(const check of [direct,joint])assert.equal(check(make(text)).length,1,text);
 for(const property of ['struck','excluded'])for(const tail of ['é','\u0301','_path']){const changed=make('The 10:00 a.m.'+tail+' West Foundation is hereby established.'),at=changed.text.indexOf(tail);changed[property].push({start:at,end:at+tail.length});for(const check of [direct,joint])assert.equal(check(changed).length,0,property+' original time attachment '+tail);}
});
