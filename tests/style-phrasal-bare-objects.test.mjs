import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {CHECK_COVERAGE} from '../app/style-coverage.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),make=t=>makeDocument(Array.isArray(t)?t:[t],'Current'),check=d=>jointStylisticIssues(d,refs).filter(i=>i.checkId==='phrasal-inflections');
const forms=[['backedup','backed up',9],['builtup','built up',9],['caughtup','caught up',9],['cleanedup','cleaned up',9],['followed-up','followed up',10],['hookedup','hooked up',11],['laid-off','laid off',11],['mockedup','mocked up',12],['passedthrough','passed through',12],['phasedout','phased out',12],['setoff','set off',13],['stoodby','stood by',13],['startedup','started up',13],['droveby','drove by',10],['phased-in','phased in',12],['ranoff','ran off',13]];
test('complete finite subjects establish bare plural and mass phrasal verb objects',()=>{
 for(const [bad,good,page]of forms)for(const object of ['records','funding','required records','requests and reports','records, reports, and requests']){const text='The agency '+bad+' '+object+'.',d=make(text),r=check(d);assert.deepEqual(r.map(i=>i.suggestion),[good],text);assert.equal(r[0].guidePage,page);assert.equal(d.text.slice(r[0].start,r[0].end),bad);assert.deepEqual(check(make(text.replace(bad,good))),[]);}
});
test('bare objects establish finite and auxiliary inflections without nominal possession',()=>{
 for(const [prefix,bad,good]of [['The agency ','backsup','backs up'],['The agencies ','backup','back up'],['They ','laid-off','laid off'],['The agency has recently ','followed-up','followed up'],['The agency was ','backingup','backing up']])assert.deepEqual(check(make(prefix+bad+' required records.')).map(i=>i.suggestion),[good],prefix+bad);
 for(const text of ['The agency has runoff.','The agency had setoff against a claim.','The agency has runoff reports.','The agency had setoff records.','The agency has startup funding.','The agency has followup reports.'])assert.deepEqual(check(make(text)),[],text);
});
test('an object predicate unknown modifiers titles literals and tables cannot establish a verb',()=>{
 for(const text of ['The agency followed-up requests are required.','The agency backedup records shall remain available.','Review agency backedup records.','The agency followed-up obscure requests.','The agency followed-up Requests Association.','The agency followed-up record.','The agency followed-up records and obscure items.','The agency followed-up records and reports are required.','The title "The agency followed-up requests." applies.',"The title 'The agency followed-up requests.' applies.",'The agency followed-up requests........100'])assert.deepEqual(check(make(text)),[],text);
});
test('all complete bare object subject modifier and coordination evidence is guarded',()=>{
 const text='The agency followed-up required records and reports.';
 for(const field of ['struck','excluded'])for(const part of ['The','agency','followed-up','required','records','and','reports',' ']){const d=make(text),start=part===' '?d.text.indexOf('agency')+6:d.text.indexOf(part);d[field].push({start,end:start+part.length});assert.deepEqual(check(d),[],field+' '+part);}
 const d=make(text),row=d.blocks.find(b=>b.text.includes('records'));row.formatting={headerGaps:[{},{}]};assert.deepEqual(check(d),[]);
});
test('original Unicode word boundaries cannot invent complete bare object evidence',()=>{
 for(const part of ['The','agency','followed-up','required','records','reports'])for(const side of ['before','after'])for(const field of ['intact','struck','excluded']){const word=side==='before'?'α'+part:part+'α',text='The agency followed-up required records and reports.'.replace(part,word),d=make(text);if(field!=='intact'){const start=d.text.indexOf('α');d[field].push({start,end:start+1});}assert.deepEqual(check(d),[],field+' '+side+' '+part);}
});
test('bare verb and complete coordinated object evidence crosses identified pages exactly',()=>{
 const makePages=()=>{const d=make(['ASSEMBLY BILL No. 9998\nThe people do enact as follows:\nline 1 The agency followed-','AB 9998 — 2 —\nline 1 up required records and','AB 9998 — 3 —\nline 1 reports.']);for(const b of d.blocks.filter(b=>b.ignored))b.formatting={headerParts:[{}]};return d;};
 const d=makePages(),saved=JSON.stringify(d),r=check(d);assert.deepEqual(r.map(i=>i.suggestion),['followed up']);assert.equal(r[0].start,d.text.indexOf('followed'));assert.equal(r[0].end,d.text.indexOf('up required')+2);assert.equal(JSON.stringify(d),saved);
 const unknown=makePages(),b=unknown.blocks.find(b=>b.page===2&&b.ignored);b.formatting={};b.runningHead=false;b.layoutLabel=false;assert.deepEqual(check(unknown),[]);
 const table=makePages();table.blocks.find(b=>b.page===3&&b.margin).formatting={headerGaps:[{},{}]};assert.deepEqual(check(table),[]);
 for(const field of ['struck','excluded'])for(const word of ['required','and','reports']){const x=makePages(),start=x.text.indexOf(word);x[field].push({start,end:start+word.length});assert.deepEqual(check(x),[],field+' '+word);}
});
test('complete object punctuation and independently intact clauses retain their roles',()=>{
 for(const suffix of ['.',';','!','?'])assert.deepEqual(check(make('The agency followed-up requests'+suffix)).map(i=>i.suggestion),['followed up']);
 const d=make('The agency followed-up requests. The agency backedup required records.'),start=d.text.indexOf('requests');d.struck.push({start,end:start+8});assert.deepEqual(check(d).map(i=>i.suggestion),['backed up']);
});
test('bare-object coverage distinguishes finite source evidence from full grammar',()=>{
 const card=CHECK_COVERAGE.find(r=>r.title==='Bare phrasal verb objects');assert.ok(card);for(const word of ['plural','mass','coordinated','original','dictionary','manual'])assert.ok(card.text.includes(word),word);
});
