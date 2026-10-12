import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {CHECK_COVERAGE} from '../app/style-coverage.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),make=t=>makeDocument(Array.isArray(t)?t:[t],'Current'),check=d=>jointStylisticIssues(d,refs).filter(i=>i.checkId==='phrasal-inflections');
const forms=[['backedup','backed up',9],['builtup','built up',9],['caughtup','caught up',9],['cleanedup','cleaned up',9],['followed-up','followed up',10],['hookedup','hooked up',11],['laid-off','laid off',11],['mockedup','mocked up',12],['passedthrough','passed through',12],['phasedout','phased out',12],['setoff','set off',13],['stoodby','stood by',13],['startedup','started up',13],['droveby','drove by',10],['phased-in','phased in',12],['ranoff','ran off',13]];
test('independent regular and irregular past forms keep source phrasal verb components',()=>{
 for(const [bad,good,page]of forms){const text='The agency '+bad+' the records.',d=make(text),r=check(d);assert.deepEqual(r.map(i=>i.suggestion),[good],text);assert.equal(r[0].guidePage,page);assert.equal(d.text.slice(r[0].start,r[0].end),bad);assert.deepEqual(check(make(text.replace(bad,good))),[]);}
});
test('third-person progressive perfect and plural finite roles use appropriate inflections',()=>{
 for(const [bad,good,prefix]of [['backsup','backs up','The agency '],['catchesup','catches up','The agency '],['backingup','backing up','The agency is '],['layingoff','laying off','The agency was recently '],['drivenby','driven by','The agency has '],['runoff','run off','The agency had '],['backup','back up','The agencies '],['setoff','set off','The agency has ']])assert.deepEqual(check(make(prefix+bad+' the records.')).map(i=>i.suggestion),[good],prefix+bad);
});
test('finite subject and complete object protect every establishing word and space',()=>{
 for(const field of ['struck','excluded'])for(const part of ['agency','backedup','the','records',' ']){const text='The agency backedup the records.',d=make(text),start=part===' '?d.text.indexOf('agency')+6:d.text.indexOf(part);d[field].push({start,end:start+part.length});assert.deepEqual(check(d),[],field+' '+part);}
 for(const field of ['struck','excluded'])for(const part of ['has','recently','drivenby','the','records']){const d=make('The agency has recently drivenby the records.'),start=d.text.indexOf(part);d[field].push({start,end:start+part.length});assert.deepEqual(check(d),[],field+' '+part);}
});
test('nominal gerunds possession names tables literals and unknown roles stay clear',()=>{
 for(const text of ['The backingup is required.','The agency has runoff.','The agency had setoff against the claim.','The startups qualify.','The agency provides startups.','Consider unfamiliar backedup wording.','The label "agency backedup the records" applies.','The Agency Backedup Records Association applies.','The agency backedup the records........100','The agency backs up the records.'])assert.deepEqual(check(make(text)),[],text);
});
test('original Unicode and masked boundaries cannot invent inflected verb words or cues',()=>{
 for(const field of ['intact','struck','excluded'])for(const text of ['The αagency backedup the records.','The agency αbackedup the records.','The agency backedupα the records.','The agency backedup the recordsα.']){const d=make(text);if(field!=='intact'){const start=d.text.indexOf('α');d[field].push({start,end:start+1});}assert.deepEqual(check(d),[],field+' '+text);}
});
test('whole verb and object evidence continues across identified heads with exact offsets',()=>{
 const pages=()=>{const d=make(['ASSEMBLY BILL No. 9998\nThe people do enact as follows:\nline 1 The agency has recently backed','AB 9998 — 2 —\nline 1 up the','AB 9998 — 3 —\nline 1 records.']);for(const b of d.blocks.filter(b=>b.ignored))b.formatting={headerParts:[{}]};return d;};
 // An ordinary open word division is already correct. A hyphenated form
 // retains an actual spacing correction, with the complete object as evidence.
 const d=pages();assert.deepEqual(check(d),[]);const bad=make(['ASSEMBLY BILL No. 9998\nThe people do enact as follows:\nline 1 The agency has recently backed-','AB 9998 — 2 —\nline 1 up the','AB 9998 — 3 —\nline 1 records.']);for(const b of bad.blocks.filter(b=>b.ignored))b.formatting={headerParts:[{}]};const saved=JSON.stringify(bad),r=check(bad);assert.deepEqual(r.map(i=>i.suggestion),['backed up']);assert.equal(r[0].start,bad.text.indexOf('backed'));assert.equal(r[0].end,bad.text.indexOf('up the')+2);assert.equal(JSON.stringify(bad),saved);
 const unknown=structuredClone(bad),b=unknown.blocks.find(b=>b.page===2&&b.ignored);b.formatting={};b.runningHead=false;b.layoutLabel=false;assert.deepEqual(check(unknown),[]);const table=structuredClone(bad);table.blocks.find(b=>b.page===3&&b.margin).formatting={headerGaps:[{},{}]};assert.deepEqual(check(table),[]);
});
test('auxiliary participles and ordinary passive grammar remain distinct from nominal complements',()=>{
 for(const [text,wanted]of [['The records were backedup.','backed up'],['The records are backingup.','backing up'],['The agency has recently followed-up the records.','followed up'],['The agency shall be phased-in.','phased in']])assert.deepEqual(check(make(text)).map(i=>i.suggestion),[wanted],text);
 for(const text of ['The agency has runoff from rainfall.','The agency has setoff against a claim.','The agency is a backup.','The agency is startup funding.'])assert.deepEqual(check(make(text)),[],text);
});
test('inflection coverage identifies derivation limits and original source evidence',()=>{
 const row=CHECK_COVERAGE.find(r=>r.title==='Listed phrasal verb inflections');assert.ok(row);for(const term of ['sixteen','irregular','dictionary','original','nominal'])assert.ok(row.text.includes(term),term);
});
