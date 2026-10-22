import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {gpoLiteralDateTimeIssues as check,GPO_LITERAL_DATE_TIME_SCOPE,restoreGpoLiteralEvidence} from '../app/style-gpo-literal-date-time.mjs';
import {CALENDAR_MONTHS} from '../app/style-calendar-dates.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=text=>makeDocument(['The people do enact as follows:\n'+text],'Current');
function run(input,options={},references=refs){
 const doc=typeof input==='string'?make(input):input,before=JSON.stringify(doc),found=check(doc,references,options);
 assert.equal(JSON.stringify(doc),before);
 for(const i of found){assert.equal(doc.text.slice(i.start,i.end),i.text);assert.equal(i.evidenceStart,i.start);assert.equal(i.evidenceEnd,i.end);assert.equal(i.gpoLiteralEvidence.text,i.text);assert.equal(restoreGpoLiteralEvidence(i.gpoLiteralEvidence,x=>x,doc.text).text,i.text);for(const c of i.references){const p=references[c.guideId].pages.find(p=>p.page===c.guidePage);assert.equal(p.text.slice(c.sourcePassage.start,c.sourcePassage.end),c.sourcePassage.text);}}
 return found;
}
const cases=[
 ['The hearing is on June 29th, 1985.','June 29th, 1985','June 29, 1985','date-ordinal-suffix'],
 ['The event occurred in the year 2,000.','in the year 2,000','in the year 2000','explicit-year-grouping'],
 ['Meet at 2 p.m. in the afternoon.','2 p.m. in the afternoon','2 p.m.','clock-redundant-daypart'],
 ['The thickness is .2500 inch.','.2500 inch','0.2500 inch','decimal-leading-zero'],
 ['The program runs from March 6, 1990, to April 15, 1990.','March 6, 1990, to April 15, 1990','March 6 to April 15, 1990','same-year-complete-date-range']
];
test('the five finite numeral families retain whole original evidence and exact source passages',()=>{
 assert.match(GPO_LITERAL_DATE_TIME_SCOPE,/not whole numeral-rule automation/);
 for(const [text,selected,wanted,kind]of cases){const found=run(text);assert.equal(found.length,1,text);assert.equal(found[0].text,selected);assert.equal(found[0].suggestion,wanted);assert.equal(found[0].gpoLiteralEvidence.kind,kind);assert.equal(found[0].guidePage,289);assert.equal(found[0].guidePrintedPage,'275');}
});
test('validated month/day/year ordinal dates preserve every digit and do not reinterpret ordinary ordinals',()=>{
 for(const month of CALENDAR_MONTHS)for(const [day,suffix]of [['1','st'],['2','nd'],['3','rd'],['4','th'],['11','th'],['12','th'],['13','th'],['21','st'],['22','nd'],['23','rd'],['28','th']])assert.equal(run('On '+month+' '+day+suffix+', 2024.')[0]?.suggestion,month+' '+day+', 2024');
 assert.equal(run('On February 29th, 2000.')[0]?.suggestion,'February 29, 2000');
 for(const text of ['On February 29th, 1900.','On February 30th, 2024.','On April 31st, 2024.','On June 29st, 1985.','On June 09th, 1985.','On June 29th.','On June 29th, 85.','On June 29th, 01985.','On June 29, 1985.','The Fourth of July applies.','The 29th day applies.','On Jun. 29th, 1985.'])assert.deepEqual(run(text),[],text);
});
test('only the original explicit grouped-year cue identifies a year punctuation change',()=>{
 for(const year of ['1,000','2,001','9,999'])assert.equal(run('It happened in the year '+year+'.')[0]?.suggestion,'in the year '+year.replace(',',''));
 assert.equal(run('In the year 2,000, the event occurred.')[0]?.suggestion,'In the year 2000');
 for(const text of ['There are 2,000 people.','The year 2,000 is listed.','In year 2,000.','It happened in the year 0,001.','It happened in the year 20,000.','It happened in the year 2,000,000.','It happened in the year 2,000.5.','It happened in the year 2,000th.','It happened in the year 2000.'])assert.deepEqual(run(text),[],text);
});
test('only the printed complete daypart redundancy is selected and opening figures stay with their LCB owner',()=>{
 for(const text of ['Meet at 2 p.m.','Meet at 2 p.m. in the evening.','Meet at 3 p.m. in the afternoon.','Meet at 12 p.m. in the afternoon.','Meet at 2:30 p.m. in the afternoon.','Meet at 2 P.M. in the afternoon.','Meet at 2 a.m. in the afternoon.','The event is in the afternoon.','2 p.m. in the afternoon is available.'])assert.deepEqual(run(text),[],text);
});
test('decimal leading zeros preserve all digits and trailing zeros while the printed caliber exception remains unchanged',()=>{
 for(const n of ['.0','.25','.0001','.3000'])for(const unit of ['inch','inches'])assert.equal(run('The width is '+n+' '+unit+'.')[0]?.suggestion,'0'+n+' '+unit);
 for(const text of ['The bore is .30 caliber.','The bore is .30 calibers.','The thickness is 0.25 inch.','The thickness is 1.25 inches.','The thickness is .25-inch.','The thickness is .25 mm.','The thickness is .25 meter.','The thickness is .25inch.','The thickness is .25e2 inches.','The thickness is 0 .25 inch.','.25 inch is required.','The symbol x = .25 inch applies.'])assert.deepEqual(run(text),[],text);
 for(const text of ['The width is .25 inch, as written in copy.','The width is as written in copy, .25 inch.'])for(const channel of ['struck','excluded']){const d=make(text);assert.deepEqual(run(d),[]);const start=d.text.indexOf('copy');d[channel].push({start,end:start+4});assert.deepEqual(run(d),[],channel+' original copy cue remains protective');}
});
test('complete same-year ranges validate both endpoints and keep both original day digit strings',()=>{
 for(const phrase of ['March 6, 1990, to April 15, 1990','January 1, 2024, to December 31, 2024','February 29, 2000, to March 1, 2000'])assert.equal(run('It runs from '+phrase+'.').length,1,phrase);
 for(const phrase of ['March 6, 1990, to April 15, 1991','March 6 to April 15, 1990','March 6, 1990 and April 15, 1990','March 6, 1990, through April 15, 1990','April 15, 1990, to March 6, 1990','March 6, 1990, to March 6, 1990','February 29, 1900, to March 1, 1900','March 6, 01990, to April 15, 01990','Mar. 6, 1990, to Apr. 15, 1990'])assert.deepEqual(run('It runs from '+phrase+'.'),[],phrase);
});
test('every positive evidence character including cue words separators and range connectors must survive BOTH removal channels',()=>{
 for(const [text,selected]of cases){const d=make(text),start=d.text.indexOf(selected);for(const channel of ['struck','excluded'])for(let n=0;n<selected.length;n++){const copy=structuredClone(d);copy[channel].push({start:start+n,end:start+n+1});assert.deepEqual(run(copy),[],channel+' '+selected+' '+n);}}
 for(const [text,removed]of [['It happened in hidden the year 2,000.','hidden'],['The hearing is on June hidden 29th, 1985.','hidden'],['It runs March 6, 1990, hidden to April 15, 1990.','hidden'],['Meet at 2 p.m. in hidden the afternoon.','hidden'],['The width is .25 hidden inch.','hidden']])for(const channel of ['struck','excluded']){const d=make(text),start=d.text.indexOf(removed);d[channel].push({start,end:start+removed.length});assert.deepEqual(run(d),[],channel+' cannot create evidence '+text);}
});
test('quotes bill-local forms names tables and headings protect all five families including removed quote/name boundaries',()=>{
 for(const [,phrase]of cases){
  for(const [open,close]of [['“','”'],['"','"'],["'","'"]]){const d=make('Keep '+open+phrase+close+'.');assert.deepEqual(run(d),[]);for(const channel of ['struck','excluded'])for(const at of [d.text.indexOf(open),d.text.lastIndexOf(close)]){const copy=structuredClone(d);copy[channel].push({start:at,end:at+1});assert.deepEqual(run(copy),[],channel+' quote');}}
  assert.deepEqual(run('“'+phrase+'” is the local term. Use '+phrase+'.'),[]);
  const named=make('The '+phrase+' West Foundation is hereby established.');assert.deepEqual(run(named),[]);for(const channel of ['struck','excluded']){const copy=structuredClone(named),at=copy.text.indexOf('West');copy[channel].push({start:at,end:at+4});assert.deepEqual(run(copy),[],channel+' name');}
  const table=make('Use '+phrase+'.');table.blocks.at(-1).formatting={headerGaps:[{},{}]};assert.deepEqual(run(table),[]);
  assert.deepEqual(run(makeDocument(['Use '+phrase+'.\nThe people do enact as follows:'],'Current')),[]);
 }
});
test('original Unicode and technical endpoint exclusions cannot expose suffixes or smaller expressions',()=>{
 for(const [,phrase]of cases)for(const [prefix,suffix]of [['é',''],['𐐀',''],['\u0301',''],['path/',''],['pre-',''],['','é'],['','\u0301'],['','_key'],['','/key'],['','.key'],['- ',''],['1 / ',''],['minus ',''],['= ',''],['',' × 2'],['',' / 2']]){
  const text='Use '+prefix+phrase+suffix+'.',d=make(text);assert.deepEqual(run(d),[],text);
  for(const channel of ['struck','excluded']){const copy=structuredClone(d),at=prefix?4:4+phrase.length;copy[channel].push({start:at,end:at+(prefix||suffix).length});assert.deepEqual(run(copy),[],channel+' '+text);}
 }
});
test('known interior running heads preserve full physical selections while unknown ignored bridges remain blocked',()=>{
 const d=makeDocument(['The people do enact as follows:\nline 1 On June 29th,','AB 999 — 2 —\nline 1 1985.'],'Current'),head=d.blocks.find(b=>b.text==='AB 999 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};
 const [i]=run(d);assert.ok(i);assert.match(i.text,/AB 999/u);assert.equal(i.suggestion,'June 29, 1985');
 head.formatting=null;head.runningHead=false;head.layoutLabel=false;head.ignored=true;assert.deepEqual(run(d),[]);
});
test('source-backed candidates respect an overlapping existing LCB owner and require their intact printed passage',()=>{
 for(const [text,, ,kind]of cases){const d=make(text),[i]=run(d);assert.deepEqual(run(d,{existingIssues:[{guideId:'lcb',start:i.start,end:i.end,suggestion:null}]}),[]);const changed=structuredClone(refs),p=changed.gpo.pages[288],a=i.references[0].sourcePassage;p.text=p.text.slice(0,a.start)+'X'+p.text.slice(a.start+1);assert.ok(!run(d,{},changed).some(j=>j.gpoLiteralEvidence.kind===kind));}
});
