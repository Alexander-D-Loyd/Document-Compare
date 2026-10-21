import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {wholeClockTimeIssues,GPO_WHOLE_CLOCK_TIME_SCOPE} from '../app/style-whole-clock-times.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=text=>makeDocument(['The people do enact as follows:\n'+text],'Current');
const run=input=>{const d=typeof input==='string'?make(input):input,before=JSON.stringify(d),found=wholeClockTimeIssues(d,refs);assert.equal(JSON.stringify(d),before);for(const i of found)assert.equal(d.text.slice(i.start,i.end),i.text);return found;};

test('bare numeric meridians and exact closed :00 forms follow the printed source without changing hours',()=>{
 assert.match(refs.gpo.pages[249].text,/10 a\.m\. \(not 10:00 a\.m\.\)/u);assert.match(refs.lcb.pages[22].text,/3 a\.m\./u);assert.match(GPO_WHOLE_CLOCK_TIME_SCOPE,/one-through-twelve/u);
 for(const h of ['1','2','9','10','11','12'])for(const [tail,wanted]of [['A. M.','a.m.'],['P.M.','p.m.'],['a. m.','a.m.']])for(const gap of ['',' ']){
  for(const zero of ['',':00']){const phrase=h+zero+gap+tail,[i]=run('Meet at '+phrase);assert.ok(i,phrase);assert.equal(i.suggestion,h+' '+wanted);assert.equal(i.rule,'9.54');assert.equal(i.guidePage,250);assert.equal(i.guidePrintedPage,'236');assert.deepEqual(i.references.map(r=>[r.guideId,r.guidePage]),[['gpo',250],['lcb',23]]);}
 }
 for(const phrase of ['10 a.m.','12 p.m.','3\na.m.','3   a.m.'])assert.deepEqual(run('Meet at '+phrase),[],phrase);
});

test('finite written and numeric o’clock forms receive one complete agreement-backed suggestion',()=>{
 const words=['one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve'];
 for(let n=0;n<words.length;n++)for(const hour of [words[n],words[n].toUpperCase(),String(n+1)])for(const mark of ["'",'’']){const phrase=hour+' o'+mark+'clock P. M.',[i]=run('Meet at '+phrase);assert.ok(i,phrase);assert.equal(i.suggestion,String(n+1)+' p.m.');assert.equal(i.text,phrase);assert.equal(i.rule,'9.55');assert.deepEqual(i.references.map(r=>r.guideId),['gpo','lcb']);assert.equal(i.timeEvidence.writtenHour,!/\d/u.test(hour));}
 const [both]=run('Meet at 10:00 o’clock a.m.');assert.equal(both.suggestion,'10 a.m.');assert.deepEqual(both.references.map(r=>r.rule),['9.55','9.54','Numerals: TIME']);
 assert.deepEqual(wholeClockTimeIssues(make('Meet at ten o’clock P.M.'),{gpo:refs.gpo}),[]);assert.equal(wholeClockTimeIssues(make('Meet at 10 o’clock P.M.'),{gpo:refs.gpo})[0].suggestion,'10 p.m.');
});

test('unsupported hour meanings and nonzero-minute clocks remain outside the whole-hour helper',()=>{
 for(const phrase of ['0 A.M.','13 P.M.','01 A.M.','010:00 A.M.','0:00 a.m.','13:00 p.m.','2:30 P.M.','2:03 o’clock p.m.','ten P.M.','thirteen o’clock p.m.','one:00 o’clock p.m.','10 AM','10 a.m','10 am.','noon','midnight','10 o’clock','3 hours'])assert.deepEqual(run('Meet at '+phrase),[],phrase);
});

test('every original clock word digit punctuation and bridge is required, including masked old :00 text',()=>{
 for(const phrase of ['10:00A.M.','2 P. M.','ten o’clock p.m.']){const d=make('Meet at '+phrase),start=d.text.indexOf(phrase);for(const property of ['struck','excluded'])for(let n=0;n<phrase.length;n++){const x=structuredClone(d);x[property].push({start:start+n,end:start+n+1});assert.deepEqual(run(x),[],property+' '+phrase+' '+n);}}
 for(const property of ['struck','excluded'])for(const [phrase,needle]of [['10 old P.M.','old'],['10:old00 P.M.','old'],['two old o’clock P.M.','old'],['10:00 P.M.',':00']]){const x=make('Meet at '+phrase),at=x.text.indexOf(needle);x[property].push({start:at,end:at+needle.length});assert.deepEqual(run(x),[],property+' '+phrase);}
});

test('original complete name and quotation evidence protects all new clock forms',()=>{
 for(const phrase of ['10P.M.','10:00A.M.','two o’clock P.M.']){
  for(const [open,close]of [['“','”'],['"','"'],["'","'"]]){const x=make('The words are '+open+phrase+close+'.');assert.deepEqual(run(x),[],phrase);for(const property of ['struck','excluded'])for(const at of [x.text.indexOf(open),x.text.lastIndexOf(close)]){const y=structuredClone(x);y[property].push({start:at,end:at+1});assert.deepEqual(run(y),[],property+' '+phrase);}}
  for(const tail of ['Program applies.','West Foundation is hereby established.',', Inc., is hereby established.'])assert.deepEqual(run('The '+phrase+(tail.startsWith(',')?'':' ')+tail),[],phrase+' '+tail);
  const named=make('The '+phrase+' West Foundation is hereby established.'),start=named.text.indexOf('West');for(const property of ['struck','excluded'])for(let at=start;at<named.text.length-1;at++){const x=structuredClone(named);x[property].push({start:at,end:at+1});assert.deepEqual(run(x),[],property+' name '+phrase+' '+at);}
 }
 assert.deepEqual(run('“ten o’clock P.M.” is the term. Meet at ten o’clock P.M.'),[]);
});

test('original Unicode technical numeric and operator boundaries cannot expose a whole-clock suffix',()=>{
 for(const phrase of ['10:00A.M.','2 P.M.','two o’clock P.M.']){
  for(const [before,after]of [['é',''],['𐐀',''],['\u0301',''],['path/',''],['pre-',''],['1e+ ',''],['1 / ',''],['− ',''],['1: ',''],['1 . ',''],['','é'],['','\u0301'],['','_key'],['','/key'],['','.key'],['','^2'],['',' × 2']]){const x=make(before+phrase+after);assert.deepEqual(run(x),[],before+phrase+after);for(const property of ['struck','excluded']){const y=structuredClone(x),needle=before||after,at=y.text.indexOf(needle);y[property].push({start:at,end:at+needle.length});assert.deepEqual(run(y),[],property+' '+before+phrase+after);}}
  assert.deepEqual(run('Cite Section '+phrase),[]);assert.ok(run('Meet—'+phrase).length,phrase);assert.ok(run('Meet at '+phrase+'—approval follows.').length,phrase);
 }
});

test('whole clocks protect tables and unknown heads while restoring complete genuine PDF spans',()=>{
 for(const phrase of ['10:00A.M.','two o’clock P.M.']){const x=make('Meet at '+phrase);x.blocks.at(-1).formatting={headerGaps:[{},{}]};assert.deepEqual(run(x),[],phrase);}
 assert.deepEqual(run(makeDocument(['Meet at two o’clock P.M.\nThe people do enact as follows:'],'Current')),[]);
 const d=makeDocument(['The people do enact as follows:\nline 1 Meet at two','AB 999 — 2 —\nline 1 o’clock P.M.'],'Current'),head=d.blocks.find(b=>b.text==='AB 999 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};const [i]=run(d);assert.ok(i);assert.equal(i.suggestion,'2 p.m.');assert.match(i.text,/AB 999/u);assert.equal(i.start,d.text.indexOf('two'));
 head.formatting=null;head.runningHead=false;head.layoutLabel=false;head.ignored=true;assert.deepEqual(run(d),[]);
});

test('production selects the complete agreement-backed clock instead of overlapping numeral fragments',()=>{
 const clocks=d=>jointStylisticIssues(d,refs).filter(i=>['9.54','9.55'].includes(i.rule));
 for(const [phrase,wanted]of [['ten o’clock P.M.','10 p.m.'],['one o’clock a.m.','1 a.m.'],['10:00A.M.','10 a.m.'],['2P.M.','2 p.m.']]){
  const d=make('Meet at '+phrase),before=JSON.stringify(d),all=jointStylisticIssues(d,refs),found=all.filter(i=>i.start<d.text.indexOf(phrase)+phrase.length&&i.end>d.text.indexOf(phrase));assert.equal(found.length,1,phrase);const [i]=found;assert.equal(i.text,phrase);assert.equal(i.suggestion,wanted);assert.equal(i.checkId,'gpo-whole-clock');assert.equal(i.conflict,false);assert.deepEqual(i.references.map(r=>r.guideId),['gpo','lcb']);assert.ok(i.references.every(r=>r.sourcePassage?.text));assert.equal(JSON.stringify(d),before);
 }
 for(const phrase of ['ten o’clock P.M.','10:00A.M.','2P.M.']){
  for(const text of ['Meet at 1 / '+phrase,'Meet at '+phrase+' × 2','The '+phrase+' West Foundation is hereby established.','“'+phrase+'” is the term. Meet at '+phrase])assert.deepEqual(clocks(make(text)),[],text);
  for(const property of ['struck','excluded']){const d=make('Meet at '+phrase),at=d.text.indexOf(phrase)+1;d[property].push({start:at,end:at+1});assert.deepEqual(clocks(d),[],property+' '+phrase);}
 }
});

test('original larger signed and decimal quantities cannot expose a finite hour suffix',()=>{
 const checks=[d=>wholeClockTimeIssues(d,refs),d=>jointStylisticIssues(d,refs).filter(i=>i.checkId==='gpo-whole-clock')];
 for(const prefix of ['one hundred ','one hundred and ','twenty ','one point ','negative ','minus ','100 ','100 and ','twenty-','twenty - '])for(const hour of ['five','5']){
  const phrase=prefix+hour+' o’clock P.M.',d=make('Meet at '+phrase);for(const check of checks)assert.deepEqual(check(d),[],phrase);
  for(const property of ['struck','excluded'])for(const needle of [prefix.trim(),...(prefix.includes('and')?['and']:[]),...(prefix.includes('-')?['-']:[])]){const x=structuredClone(d),at=x.text.indexOf(needle);x[property].push({start:at,end:at+needle.length});for(const check of checks)assert.deepEqual(check(x),[],property+' '+needle+' '+phrase);}
 }
 for(const check of checks){const found=check(make('Meet at one o’clock A.M. and ten o’clock P.M.'));assert.deepEqual(found.map(i=>i.suggestion),['1 a.m.','10 p.m.']);}
});
