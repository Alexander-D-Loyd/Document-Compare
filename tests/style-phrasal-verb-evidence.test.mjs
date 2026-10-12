import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {CHECK_COVERAGE} from '../app/style-coverage.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),make=t=>makeDocument(Array.isArray(t)?t:[t],'Current'),check=d=>jointStylisticIssues(d,refs).filter(i=>i.checkId==='phrasal-verbs');
test('complete original modal and verb words reject Unicode attachments',()=>{
 for(const c of ['α','\u0301','_'])for(const text of ['The agency '+c+'shall cleanup the site.','The agency shall cleanup'+c+' the site.'])for(const field of ['intact','struck','excluded']){const d=make(text);if(field!=='intact'){const start=d.text.indexOf(c);d[field].push({start,end:start+c.length});}assert.deepEqual(check(d),[],text+' '+field);}
});
test('struck or excluded modal and verb connectors cannot invent phrasal evidence',()=>{
 for(const field of ['struck','excluded'])for(const part of ['s','h','shall','cleanup',' ']){const text='The agency shall cleanup the site.',d=make(text),start=part===' '?d.text.indexOf('shall')+5:part.length===1?d.text.indexOf('shall')+(part==='h'?1:0):d.text.indexOf(part);d[field].push({start,end:start+part.length});assert.deepEqual(check(d),[],field+' '+part);}
 for(const field of ['struck','excluded']){const d=make('The agency shall precleanup the site.'),start=d.text.indexOf('pre');d[field].push({start,end:start+3});assert.deepEqual(check(d),[],field+' masked prefix');}
});
test('complete evidence includes every table row between the modal and verb',()=>{
 const d=make('The agency shall\ncleanup the site.');d.blocks[0].formatting={headerGaps:[{},{}]};assert.deepEqual(check(d),[]);
});
test('modal evidence can cross classified page heads but not unknown ignored content',()=>{
 const pages=()=>{const d=make(['ASSEMBLY BILL No. 9998\nThe people do enact as follows:\nline 1 The agency shall','AB 9998 — 2 —\nline 1 cleanup the site.']);for(const b of d.blocks.filter(b=>b.ignored))b.formatting={headerParts:[{}]};return d;};const d=pages(),r=check(d);assert.deepEqual(r.map(i=>i.suggestion),['clean up']);assert.equal(r[0].start,d.text.indexOf('cleanup'));assert.equal(r[0].end,d.text.indexOf('cleanup')+7);
 const unknown=pages(),b=unknown.blocks.find(b=>b.page===2&&b.ignored);b.formatting={};b.runningHead=false;b.layoutLabel=false;assert.deepEqual(check(unknown),[]);
});
test('complete source evidence stays independent of unrelated uncertain text',()=>{
 const d=make('The agency shall cleanup the site. The agency shall backup the records.'),start=d.text.indexOf('cleanup');d.struck.push({start,end:start+7});assert.deepEqual(check(d).map(i=>i.suggestion),['back up']);
});
test('wrapped literals titles and open verbs stay protected',()=>{
 for(const text of ['The label "shall\ncleanup the site" applies.','The agency shall Cleanup Equipment.','The agency shall clean up the site.','The agency shall provide cleanup equipment.','Access to backup equipment is required.'])assert.deepEqual(check(make(text)),[],text);
});
test('full modal source and formatting remains unchanged during review',()=>{
 const d=make('The agency must cleanup the site.'),saved=JSON.stringify(d),r=check(d);assert.deepEqual(r.map(i=>i.suggestion),['clean up']);assert.equal(JSON.stringify(d),saved);
});
test('phrasal verb coverage states complete evidence and finite grammar limits',()=>{
 const row=CHECK_COVERAGE.find(r=>r.title==='Complete phrasal verb evidence');assert.ok(row);for(const term of ['original','Unicode','unknown','grammar','dictionary'])assert.ok(row.text.includes(term),term);
});
