import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument} from '../app/core.mjs';import {compoundIssues,NOMINAL_COMPOUNDS} from '../app/style-compounds.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
import {CHECK_COVERAGE} from '../app/style-coverage.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),make=t=>makeDocument(Array.isArray(t)?t:[t],'Current'),target=(d,preferred='followup')=>compoundIssues(d,refs).filter(i=>i.suggestion.toLowerCase()===preferred);
test('legacy compound noun heads reject a following table outside the selected term',()=>{
 for(const [open,preferred]of NOMINAL_COMPOUNDS){const d=make('The '+open+'\nprograms are required.............100');assert.equal(target(d,preferred).length,0,open);}
});
test('legacy compound evidence cannot bridge excluded or ignored unknown wording',()=>{
 for(const ending of ['programs are required.','of the program is required.']){const d=make('The follow-up\nunknown marker\n'+ending),b=d.blocks[1];b.ignored=true;d.excluded.push({start:b.start,end:b.end});assert.equal(target(d).length,0,ending);const e=make('The follow-up unknown '+ending),at=e.text.indexOf('unknown ');e.excluded.push({start:at,end:at+8});assert.equal(target(e).length,0,ending+' excluded');}
});
test('source strikes in supporting whitespace do not manufacture legacy noun evidence',()=>{
 for(const text of ['The follow-up programs are required.','The follow-up of the program is required.']){const d=make(text),start=d.text.indexOf('follow-up')+9;d.struck=[{start,end:start+1}];assert.equal(target(d).length,0,text);}
});
test('legacy noun, predicate and determiner cues require complete original Unicode tokens',()=>{
 for(const text of ['The follow-up programsα are required.','The follow-up programs2 are required.','The follow-up isα required.','The follow-up ofα the program is required.','αThe follow-up of the program is required.','𐐀The follow-up of the program is required.'])assert.equal(target(make(text)).length,0,text);
});
test('reader-identified interior heads keep the original compound selection and complete noun evidence',()=>{
 const d=make(['ASSEMBLY BILL No. 9999\nThe people do enact as follows:\nline 1 The follow','AB 9999 — 2 —\nline 1 up programs are required.']);d.blocks.find(b=>b.ignored).formatting={headerParts:[{}]};const before=JSON.stringify(d),r=target(d);assert.equal(r.length,1);assert.equal(r[0].end,d.text.indexOf('up programs')+2);assert.equal(JSON.stringify(d),before);
});
test('complete existing heads and nominal endings survive unrelated protected wording',()=>{
 for(const [open,preferred]of NOMINAL_COMPOUNDS){const d=make('unknown marker\nThe '+open+' programs are required.'),b=d.blocks[0];b.ignored=true;d.excluded.push({start:b.start,end:b.end});assert.equal(target(d,preferred).length,1,open);}
 for(const ending of ['of the program is required.','is required.','shall apply.','; it is required.'])assert.equal(target(make('The follow-up '+ending)).length,1,ending);
});
test('complete legacy evidence guards are effective through the full style review',()=>{
 const d=make('The follow-up\nprograms are required.............100');assert.equal(jointStylisticIssues(d,refs).filter(i=>i.suggestion.toLowerCase()==='followup').length,0);assert.ok(jointStylisticIssues(make('The follow-up programs are required.'),refs).some(i=>i.suggestion==='followup'));
});
test('legacy compound coverage describes bounded whole evidence without whole-rule certification',()=>{
 const row=CHECK_COVERAGE.find(r=>r.title==='Complete listed compound noun evidence');assert.match(row.text,/all 16/);assert.match(row.text,/35-character/);assert.match(row.text,/Unfamiliar grammatical roles/);const records=styleRuleInventory(refs).filter(r=>r.guide==='lcb'&&/Existing finite noun-head and determiner/.test(r.scope||''));assert.ok(records.length);assert.ok(records.every(r=>r.status==='Partially automated'));
});
