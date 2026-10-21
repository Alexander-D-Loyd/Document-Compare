import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {gpoHolidayNameIssues,GPO_HOLIDAY_NAME_SCOPE} from '../app/style-gpo-holiday-names.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const forms=[['Halloween',48],['Hanukkah',48],['Ramadan',49],['Rosh Hashanah',49],['Yom Kippur',49]],leads=['on','during','before','after','through','until','since'];
const make=text=>makeDocument(['The people do enact as follows:\n'+text],'Current');
const run=input=>{const d=typeof input==='string'?make(input):input,before=JSON.stringify(d),found=gpoHolidayNameIssues(d,refs);assert.equal(JSON.stringify(d),before);for(const i of found){assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(d.text.slice(i.evidenceStart,i.evidenceEnd),i.holidayEvidence.sourceText);}return found;};

test('all five printed holiday names use complete finite calendar leads and exact source pages',()=>{
 assert.match(refs.gpo.pages[47].text,/The names of holidays and ecclesiastic feast and fast days are\s+capitalized/u);assert.match(GPO_HOLIDAY_NAME_SCOPE,/five additional/u);
 for(const [name,page]of forms)for(const lead of leads)for(const ending of ['.',' the office will close.']){const [i]=run(lead[0].toUpperCase()+lead.slice(1)+' '+name.toLowerCase()+ending);assert.ok(i,name+' '+lead);assert.equal(i.text,name.toLowerCase());assert.equal(i.suggestion,name);assert.equal(i.rule,'3.25');assert.equal(i.guidePage,page);assert.equal(i.guidePrintedPage,page===48?'34':'35');const witness=i.references[0].sourcePassage;assert.equal(refs.gpo.pages[page-1].text.slice(witness.start,witness.end),name);}
 for(const [name]of forms)assert.deepEqual(run('Meet on '+name+'.'),[]);
});

test('unfamiliar names aliases and missing calendar roles remain manual',()=>{
 for(const text of ['Use halloween.','The halloween program applies.','Meet on Halloween Program.','Meet on halloween 2026.','Meet on hallowe’en.','Meet on chanukah.','Meet on eid.','Meet on ramadhan.','Meet on rosh hashanah day.','Meet on yom kippurim.','Meet on HALLOWEEN.','Meet on halloweenish.','Meet on ramadan today.'])assert.deepEqual(run(text),[],text);
});

test('every original calendar cue name connector and prose continuation character must survive',()=>{
 for(const text of ['Meet during rosh hashanah.','Since ramadan the office will close.']){const d=make(text),[i]=run(d);for(const property of ['struck','excluded'])for(let at=i.evidenceStart;at<i.evidenceEnd;at++){const x=structuredClone(d);x[property].push({start:at,end:at+1});assert.deepEqual(run(x),[],property+' '+text+' '+at);}}
 for(const [text,needle]of [['Meet on old halloween.','old'],['Meet on rosh old hashanah.','old'],['Meet on halloween old the office will close.','old'],['Meet éon halloween.','é'],['Meet on halloweené.','é']])for(const property of ['struck','excluded']){const d=make(text),at=d.text.indexOf(needle);d[property].push({start:at,end:at+needle.length});assert.deepEqual(run(d),[],property+' '+text);}
});

test('original names bill-local wording quotations and technical Unicode attachments protect holiday-shaped text',()=>{
 for(const [name]of forms){const text='Meet on '+name.toLowerCase()+'.';for(const [open,close]of [['“','”'],['"','"'],["'","'"]]){const d=make(open+text+close);assert.deepEqual(run(d),[]);for(const property of ['struck','excluded'])for(const at of [d.text.indexOf(open),d.text.lastIndexOf(close)]){const x=structuredClone(d);x[property].push({start:at,end:at+1});assert.deepEqual(run(x),[]);}}
  assert.deepEqual(run('“'+name.toLowerCase()+'” is the term. '+text),[]);
  for(const tail of [' Program.',' West Foundation is hereby established.',', Inc., is hereby established.',' , Inc., is hereby established.']){const d=make('Meet on '+name.toLowerCase()+tail);assert.deepEqual(run(d),[],name+tail);for(const property of ['struck','excluded']){const x=structuredClone(d),at=x.text.indexOf(tail);x[property].push({start:at,end:at+tail.length-1});assert.deepEqual(run(x),[],property+' '+name+tail);}}
  for(const mark of ['é','\u0301','_key','/key','.key','-key'])for(const side of ['before','after']){const payload=side==='before'?mark+name.toLowerCase():name.toLowerCase()+mark,d=make('Meet on '+payload+'.');assert.deepEqual(run(d),[],side+mark);for(const property of ['struck','excluded']){const x=structuredClone(d),at=x.text.indexOf(mark);x[property].push({start:at,end:at+mark.length});assert.deepEqual(run(x),[],property+' '+side+mark);}}
 }
});

test('headings tables and uncertain bridges stay protected while recognized heads preserve exact holiday spans',()=>{
 const table=make('Meet on halloween.');table.blocks.at(-1).formatting={headerGaps:[{},{}]};assert.deepEqual(run(table),[]);assert.deepEqual(run(makeDocument(['Meet on halloween.\nThe people do enact as follows:'],'Current')),[]);
 const d=makeDocument(['The people do enact as follows:\nline 1 Meet on rosh','AB 999 — 2 —\nline 1 hashanah.'],'Current'),head=d.blocks.find(b=>b.text==='AB 999 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};const [i]=run(d);assert.ok(i);assert.equal(i.suggestion,'Rosh Hashanah');assert.match(i.text,/AB 999/u);head.formatting=null;head.runningHead=false;head.layoutLabel=false;head.ignored=true;assert.deepEqual(run(d),[]);
});

test('production retains one complete holiday comparison with exact printed witnesses and original metadata',()=>{
 for(const [name,page]of forms){const d=makeDocument(['The people do enact as follows:\nThe qual-\nity remains. Meet on '+name.toLowerCase()+'.'],'Current',[],[],new Set(['quality'])),before=JSON.stringify(d),all=jointStylisticIssues(d,refs),start=d.text.indexOf(name.toLowerCase()),found=all.filter(i=>i.start<start+name.length&&i.end>start);assert.equal(found.length,1,name);const [i]=found;assert.equal(i.checkId,'gpo-holiday-names');assert.equal(i.suggestion,name);assert.equal(i.guidePage,page);assert.equal(i.start,start);assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(i.holidayEvidence.start,i.evidenceStart);assert.equal(i.holidayEvidence.end,i.evidenceEnd);assert.equal(d.text.slice(i.evidenceStart,i.evidenceEnd),i.holidayEvidence.sourceText);assert.ok(i.references.every(r=>r.sourcePassage?.text));assert.equal(JSON.stringify(d),before);}
 const joint=d=>jointStylisticIssues(d,refs).filter(i=>i.checkId==='gpo-holiday-names');for(const text of ['“halloween” is the term. Meet on halloween.','Meet on halloween, Inc., is hereby established.','Meet on halloween West Foundation is hereby established.','Meet on chanukah.'])assert.deepEqual(joint(make(text)),[],text);
 const d=makeDocument(['The people do enact as follows:\nline 1 Meet on rosh','AB 999 — 2 —\nline 1 hashanah.'],'Current'),head=d.blocks.find(b=>b.text==='AB 999 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};const [i]=joint(d);assert.ok(i);assert.match(i.holidayEvidence.sourceText,/AB 999/u);assert.equal(d.text.slice(i.evidenceStart,i.evidenceEnd),i.holidayEvidence.sourceText);assert.equal(d.text.slice(i.start,i.end),i.text);
 assert.equal(joint(make('Meet on halloween. Program administration begins.')).length,1);
 const ordinary=makeDocument(['The people do enact as follows:\nThe qual-\nity remains. On ramadan the agency shall act.'],'Current',[],[],new Set(['quality'])),[positive]=joint(ordinary);assert.ok(positive);assert.equal(positive.suggestion,'Ramadan');assert.equal(positive.start,ordinary.text.indexOf('ramadan'));assert.equal(ordinary.text.slice(positive.start,positive.end),'ramadan');assert.equal(ordinary.text.slice(positive.holidayEvidence.start,positive.holidayEvidence.end),positive.holidayEvidence.sourceText);assert.equal(positive.holidayEvidence.sourceText,'On ramadan the agency shall');assert.ok(positive.references.every(r=>r.sourcePassage?.text));
 for(const continuation of ['shall act.','will fund the program.','must account for costs.','may commission a report.']){const d=make('On ramadan the agency '+continuation);for(const check of [run,joint])assert.equal(check(d).length,1,continuation);}
});
