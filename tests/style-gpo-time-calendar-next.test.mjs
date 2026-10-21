import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {nonzeroMinuteTimeIssues,GPO_NONZERO_MINUTE_TIME_SCOPE} from '../app/style-time-abbreviations-next.mjs';
import {calendarAbbreviationIssues} from '../app/style-calendar-abbreviations.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=text=>makeDocument(['The people do enact as follows:\n'+text],'Current');
const run=(fn,input)=>{const d=typeof input==='string'?make(input):input,before=JSON.stringify(d),issues=fn(d,refs);assert.equal(JSON.stringify(d),before);for(const i of issues)assert.equal(d.text.slice(i.start,i.end),i.text);return issues;};
const times=input=>run(nonzeroMinuteTimeIssues,input),calendar=input=>run(calendarAbbreviationIssues,input);

test('nonzero clock meridians retain original digits and cite printed GPO/LCB agreement',()=>{
 assert.match(refs.gpo.pages[249].text,/2:30 p\.m\./u);assert.match(refs.lcb.pages[22].text,/10:30 p\.m\./u);assert.match(GPO_NONZERO_MINUTE_TIME_SCOPE,/nonzero/u);
 for(const hour of ['1','2','9','10','11','12'])for(const minute of ['01','03','30','59'])for(const [suffix,wanted]of [['P. M.','p.m.'],['A.M.','a.m.'],['a. m.','a.m.']]){
  const phrase=hour+':'+minute+' '+suffix,[i]=times('Meet at '+phrase);assert.ok(i,phrase);assert.equal(i.text,phrase);assert.equal(i.suggestion,hour+':'+minute+' '+wanted);assert.equal(i.rule,'9.54');assert.equal(i.guidePage,250);assert.equal(i.guidePrintedPage,'236');assert.deepEqual(i.references.map(r=>[r.guideId,r.guidePage]),[['gpo',250],['lcb',23]]);
 }
 for(const [phrase,wanted]of [['2:30P.M.','2:30 p.m.'],['10:03a.m.','10:03 a.m.']])assert.equal(times('Meet at '+phrase)[0].suggestion,wanted);
});

test('canonical clocks and unsupported numeric meanings remain outside the new check',()=>{
 for(const text of ['Meet at 2:30 p.m.','Meet at 2:30\np.m.','Meet at 2:30  p.m.','Meet at 10:00 P.M.','Meet at 0:30 P.M.','Meet at 13:30 P.M.','Meet at 02:30 P.M.','Meet at 2:60 P.M.','Meet at 2:3 P.M.','Meet at 2:030 P.M.','Meet at 2.30 P.M.','Meet at 2:30 pm.','Meet at ten o’clock p.m.','Meet at noon.','Meet at midnight.'])assert.deepEqual(times(text),[],text);
});

test('all original clock digits meridian punctuation and bridges must remain active',()=>{
 const phrase='2:30 P. M.',d=make('Meet at '+phrase),at=d.text.indexOf(phrase);
 for(const property of ['struck','excluded'])for(let n=0;n<phrase.length;n++){const x=structuredClone(d);x[property].push({start:at+n,end:at+n+1});assert.deepEqual(times(x),[],property+' '+n);}
 for(const property of ['struck','excluded']){const x=make('Meet at 2:30 hidden P.M.'),start=x.text.indexOf('hidden');x[property].push({start,end:start+6});assert.deepEqual(times(x),[],property);}
});

test('clock original literal names and technical boundaries cannot expose new findings',()=>{
 for(const phrase of ['“2:30 P.M.”','"2:30 P.M."',"'2:30 P.M.'"]){const d=make('The wording is '+phrase+'.');assert.deepEqual(times(d),[]);for(const property of ['struck','excluded'])for(const n of [d.text.indexOf(phrase),d.text.indexOf(phrase)+phrase.length-1]){const x=structuredClone(d);x[property].push({start:n,end:n+1});assert.deepEqual(times(x),[],property+' quote');}}
 assert.deepEqual(times('“2:30 P.M.” is the term. Meet at 2:30 P.M.'),[]);
 for(const text of ['The 2:30 P.M. Program applies.','The 2:30 P.M. West Foundation is hereby established.','The 2:30 P.M., Inc., is hereby established.','Cite Section 2:30 P.M.'])assert.deepEqual(times(text),[],text);
 const named=make('The 2:30 P.M. West Foundation is hereby established.'),start=named.text.indexOf('West');for(const property of ['struck','excluded'])for(let at=start;at<named.text.length-1;at++){const x=structuredClone(named);x[property].push({start:at,end:at+1});assert.deepEqual(times(x),[],property+' name '+at);}
 for(const [pre,post]of [['é',''],['𐐀',''],['\u0301',''],['path/',''],['pre-',''],['','é'],['','\u0301'],['','_key'],['','/key'],['','.key']]){const text=pre+'2:30 P.M.'+post,d=make(text);assert.deepEqual(times(d),[],text);for(const property of ['struck','excluded']){const x=structuredClone(d),at=x.text.indexOf(pre||post);x[property].push({start:at,end:at+(pre||post).length});assert.deepEqual(times(x),[],property+' '+text);}}
});

test('clock table and unknown layout evidence stay blocked while known physical heads retain offsets',()=>{
 const table=make('Meet at 2:30 P.M.');table.blocks.at(-1).formatting={headerGaps:[{},{}]};assert.deepEqual(times(table),[]);
 assert.deepEqual(times(makeDocument(['Meet at 2:30 P.M.\nThe people do enact as follows:'],'Current')),[]);
 const d=makeDocument(['The people do enact as follows:\nline 1 Meet at 2:30','AB 999 — 2 —\nline 1 P.M.'],'Current'),head=d.blocks.find(b=>b.text==='AB 999 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};const [i]=times(d);assert.ok(i);assert.equal(i.suggestion,'2:30 p.m.');assert.match(i.text,/AB 999/u);
 head.formatting=null;head.runningHead=false;head.layoutLabel=false;head.ignored=true;assert.deepEqual(times(d),[]);
});

test('original numeric technical prefixes and operator continuations cannot expose a clock suffix',()=>{
 for(const [before,after]of [['1e+ ',''],['1 / ',''],['− ',''],['1: ',''],['1 . ',''],['1 , ',''],['1⁄ ',''],['','^2'],['',' × 2'],['',' / 2'],['',': 2']]){
  const phrase=before+'2:30 P.M.'+after,d=make(phrase);assert.deepEqual(times(d),[],phrase);
  for(const property of ['struck','excluded']){const x=structuredClone(d),start=x.text.indexOf(before||after);x[property].push({start,end:start+(before||after).length});assert.deepEqual(times(x),[],property+' '+phrase);}
 }
 for(const phrase of ['Meet—2:30 P.M.','Meet at 2:30 P.M.—approval follows.','Meet at 2:30 P.M. to 3:30 P.M.'])assert.ok(times(phrase).length,phrase);
});

const leads=['Since','As of','Effective','Beginning','Starting','No later than'];
test('new finite calendar leads use the printed ordinary-prose forms and original abbreviation selections',()=>{
 for(const lead of leads)for(const phrase of [lead+' Tues. the agency acts.',lead+' Jan. 12, the law applies.']){const [i]=calendar(phrase);assert.ok(i,phrase);assert.equal(i.text,phrase.includes('Tues.')?'Tues.':'Jan.');assert.equal(i.suggestion,phrase.includes('Tues.')?'Tuesday':'January');assert.equal(i.guidePage,247);assert.equal(i.guidePrintedPage,'233');}
 for(const text of ['Since Tuesday the agency acts.','As of January 12, the law applies.','Effective Mar. Act.'])assert.deepEqual(calendar(text),[],text);
});

test('every compound calendar cue and day character must be complete original evidence',()=>{
 for(const phrase of ['As of Jan. 12','No later than Tues.','Effective Jan. 1']){const d=make(phrase+'.'),start=d.text.indexOf(phrase);for(const property of ['struck','excluded'])for(let n=0;n<phrase.length;n++){const x=structuredClone(d);x[property].push({start:start+n,end:start+n+1});assert.deepEqual(calendar(x),[],property+' '+phrase+' '+n);}}
 for(const property of ['struck','excluded'])for(const phrase of ['As hidden of Jan. 12','No later hidden than Tues.']){const x=make(phrase),start=x.text.indexOf('hidden');x[property].push({start,end:start+6});assert.deepEqual(calendar(x),[],property+' '+phrase);}
});

test('new calendar leads retain original citations lists quotations names and technical safeguards',()=>{
 for(const text of ['See (As of Jan. 12).','See [Effective Jan. 1].','“Since Tues.” is quoted.','"No later than Jan. 1" is quoted.','• Effective Jan. 1.','1. Since Tues.','The Effective Jan. 1 Program applies.','The Effective Jan. 1 West Foundation is hereby established.','The Effective Jan. 1, Inc., is hereby established.','“Tues.” is the term. Since Tues. the agency acts.'])assert.deepEqual(calendar(text),[],text);
 for(const phrase of ['Effective Jan. 1','Since Tues.']){const table=make(phrase);table.blocks.at(-1).formatting={headerGaps:[{},{}]};assert.deepEqual(calendar(table),[]);}
 const named=make('The Effective Jan. 1 West Foundation is hereby established.'),start=named.text.indexOf('West');for(const property of ['struck','excluded'])for(let at=start;at<named.text.length-1;at++){const x=structuredClone(named);x[property].push({start:at,end:at+1});assert.deepEqual(calendar(x),[],property+' name '+at);}
 for(const text of ['path/Effective Jan. 1.','éSince Tues.','As of Jan. 1/key','No later than Jan. 1é','Starting Jan. 1.5'])assert.deepEqual(calendar(text),[],text);
 for(const property of ['struck','excluded'])for(const [phrase,needle]of [['path/Effective Jan. 1.','/'],['As of Jan. 1/key','/'],['éSince Tues.','é']]){const x=make(phrase),at=x.text.indexOf(needle);x[property].push({start:at,end:at+needle.length});assert.deepEqual(calendar(x),[],property+' '+phrase);}
});

test('new compound calendar leads retain physical selections through identified heads only',()=>{
 const d=makeDocument(['The people do enact as follows:\nline 1 No later','AB 999 — 2 —\nline 1 than Jan.\nline 2 12.'],'Current'),head=d.blocks.find(b=>b.text==='AB 999 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};const [i]=calendar(d);assert.ok(i);assert.equal(i.text,'Jan.');assert.equal(i.suggestion,'January');assert.equal(i.start,d.text.indexOf('Jan.'));
 head.formatting=null;head.runningHead=false;head.layoutLabel=false;head.ignored=true;assert.deepEqual(calendar(d),[]);
});
