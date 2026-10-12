import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {californiaEntityReview} from '../app/style-california-entities.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
import {CALIFORNIA_ENTITIES} from '../app/data/california-entities.mjs';import {searchCoverage} from '../app/style-coverage.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=t=>makeDocument(Array.isArray(t)?t:[t],'Current');
function ignore(d,text,known=false){const b=d.blocks.find(b=>b.text===text);assert.ok(b,text);b.ignored=true;if(known)b.formatting={headerParts:[{text}]};d.excluded.push({start:b.start,end:b.end});return b;}
test('complete entity cannot bridge unknown ignored content, with or without a word division',()=>{
 for(const t of ['line 1 The department of\nunknown marker\nline 2 consumer affairs shall act.','line 1 The depa-\nunknown marker\nline 2 rtment of consumer affairs shall act.']){const d=make(t);ignore(d,'unknown marker');const before=JSON.stringify(d),r=californiaEntityReview(d,refs);assert.equal(r.issues.length,0);assert.equal(r.ranges.length,0);assert.equal(JSON.stringify(d),before);}
});
test('complete entity evidence protects every intersecting table row, including a divided suffix',()=>{
 for(const t of ['line 1 The department of\nline 2 consumer affairs shall act.','line 1 The department of consu-\nline 2 mer affairs shall act.']){const d=make(t),b=d.blocks[1];b.formatting={headerGaps:[{left:0,right:100},{left:200,right:300}]};assert.deepEqual(californiaEntityReview(d,refs),{issues:[],ranges:[]});}
});
test('arbitrary excluded body content cannot supply whitespace within a complete entity',()=>{
 const d=make('line 1 The department of OMIT consumer affairs shall act.'),start=d.text.indexOf('OMIT');d.excluded.push({start,end:start+4});assert.deepEqual(californiaEntityReview(d,refs),{issues:[],ranges:[]});
});
test('source strike in an entity word-division gap cannot establish a registry identity',()=>{
 const d=make('line 1 The depa-\nREMOVED\nline 2 rtment of consumer affairs shall act.'),start=d.text.indexOf('REMOVED');d.struck=[{start,end:start+7}];assert.deepEqual(californiaEntityReview(d,refs),{issues:[],ranges:[]});
});
test('known interior running heads preserve complete source name and independent numeral',()=>{
 const d=make('line 1 The depa-\nAB 9999 — 2 —\nline 2 rtment of consumer affairs shall appoint 3 workers.');ignore(d,'AB 9999 — 2 —',true);const r=jointStylisticIssues(d,refs);assert.deepEqual(r.map(i=>i.suggestion),['Department of Consumer Affairs','three']);assert.equal(r[0].text,d.text.slice(r[0].start,r[0].end));assert.ok(r[0].text.includes('AB 9999'));
});
test('complete-name evidence is revalidated after a table or ignored block is identified',()=>{
 const d=make('line 1 The department of\nline 2 consumer affairs shall act.');assert.equal(californiaEntityReview(d,refs).issues.length,1);d.blocks[1].ignored=true;d.excluded.push({start:d.blocks[1].start,end:d.blocks[1].end});assert.deepEqual(californiaEntityReview(d,refs),{issues:[],ranges:[]});
});
test('every eligible complete entity protects an interior table and unknown masked bridge',()=>{
 for(const e of CALIFORNIA_ENTITIES.entries.filter(e=>e.checkEligible)){const at=e.name.indexOf(' ');assert.ok(at>0,e.name);for(const kind of ['table','unknown']){const name=e.name.toLowerCase(),d=make('line 1 The '+name.slice(0,at)+'\n'+(kind==='unknown'?'unknown marker\n':'')+'line 2 '+name.slice(at+1)+' shall act.');if(kind==='unknown')ignore(d,'unknown marker');else d.blocks[1].formatting={headerGaps:[{},{}]};assert.deepEqual(californiaEntityReview(d,refs),{issues:[],ranges:[]},e.name+' '+kind);}}
});
test('unknown entity evidence cannot suppress an independent intact numeral finding',()=>{
 const d=make('line 1 The department of\nunknown marker\nline 2 consumer affairs shall appoint 3 workers.');ignore(d,'unknown marker');const r=jointStylisticIssues(d,refs);assert.equal(r.filter(i=>i.checkId==='california-entities').length,0);assert.ok(r.some(i=>i.suggestion==='three'&&i.start===d.text.indexOf('3 workers')));
});
test('coverage search states complete entity evidence limits',()=>{
 assert.ok(searchCoverage('complete entity evidence').some(r=>r.guide==='lcb'&&r.page===17&&r.text.includes('unknown ignored')));
});
