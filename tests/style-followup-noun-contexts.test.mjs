import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {compoundIssues} from '../app/style-compounds.mjs';
import {CHECK_COVERAGE} from '../app/style-coverage.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),make=t=>makeDocument(Array.isArray(t)?t:[t],'Current'),target=d=>jointStylisticIssues(d,refs).filter(i=>i.suggestion.toLowerCase()==='followup');
test('original adoption contexts select follow-up alone with LCB10 noun-modifier spelling',()=>{
 for(const text of ['The guidance supports the follow-up adoption and subsequent implementation of instructional materials.','The guidance supports the follow-up adoption conducted pursuant to Section 60227.']){const r=target(make(text));assert.equal(r.length,1);assert.equal(r[0].text,'follow-up');assert.equal(r[0].guidePage,10);assert.equal(target(make(text.replace('follow-up','followup'))).length,0);}
});
test('a timely information direct object establishes the complete followup modifier role',()=>{
 const text='Staff from the Attorney General shall provide timely follow-up information to staff.',r=target(make(text));assert.equal(r.length,1);assert.equal(r[0].text,'follow-up');assert.equal(r[0].suggestion,'followup');assert.equal(target(make(text.replace('follow-up','followup'))).length,0);
});
test('recognized complete noun heads need independent nominal evidence and retain canonical spelling',()=>{
 for(const text of ['The follow up adoption is required.','The agency supports follow up elections.','Follow-up information is required.','The agency provides timely follow up information.']){const r=target(make(text));assert.equal(r.length,1,text);assert.equal(target(make(text.replace(r[0].text,r[0].suggestion))).length,0,text);}
});
test('ordinary verbs, bare fragments, extended tokens, titles and ambiguous other nominal compounds remain protected',()=>{
 for(const text of ['They follow up information.','The staff shall follow up information.','The staff must follow up adoption.','The staff need to follow up information.','follow-up adoption.','The follow-up adoptionα applies.','The Follow-Up Adoption Institute acts.','They report their current phase in Cal-Secure standards.','The term "follow-up adoption" is literal.'])assert.equal(target(make(text)).length,0,text);
});
test('supporting cue and noun ranges protect actual source strikes, tables and unknown ignored fragments',()=>{
 const text='The agency provides timely follow-up\ninformation to staff.',d=make(text);d.blocks[1].formatting={headerGaps:[{},{}]};assert.equal(target(d).length,0);const s=make(text),start=s.text.indexOf('timely');s.struck=[{start,end:start+6}];assert.equal(target(s).length,0);const u=make('The follow-up\nunknown marker\nadoption conducted under this section.'),b=u.blocks[1];b.ignored=true;u.excluded.push({start:b.start,end:b.end});assert.equal(target(u).length,0);
});
test('a known page head retains the complete selected compound but excludes its establishing noun',()=>{
 const d=make(['ASSEMBLY BILL No. 9999\nThe people do enact as follows:\nline 1 The follow','AB 9999 — 2 —\nline 1 up adoption is required.']);d.blocks.find(b=>b.ignored).formatting={headerParts:[{}]};const r=target(d);assert.equal(r.length,1);assert.equal(r[0].suggestion,'followup');assert.ok(r[0].text.includes('AB 9999'));assert.equal(r[0].end,d.text.indexOf('up adoption')+2);
});
test('clipped and Unicode cues cannot establish a new noun role, while an intact alternative can',()=>{
 assert.equal(target(make('xprovides'+' '.repeat(65-8)+'follow-up information.')).length,0);assert.equal(target(make('The follow-up information appliesα.')).length,1);assert.equal(target(make('Follow-up information appliesα.')).length,0);const d=make('The follow-up adoption\nshall apply.');d.blocks[1].formatting={headerGaps:[{},{}]};const before=JSON.stringify(d);assert.equal(compoundIssues(d,refs).filter(i=>i.suggestion==='followup').length,1);assert.equal(JSON.stringify(d),before);
});
test('followup coverage remains finite and partially automated with full evidence scope',()=>{
 const row=CHECK_COVERAGE.find(r=>r.title==='Followup noun and modifier context');assert.equal(row.page,10);assert.match(row.text,/65-character/);assert.match(row.text,/Unknown noun roles/);const records=styleRuleInventory(refs).filter(r=>r.guide==='lcb'&&/Additional followup contexts/.test(r.scope||''));assert.ok(records.length);assert.ok(records.every(r=>r.status==='Partially automated'));assert.ok(records.every(r=>/unknown roles, names and meaning remain manual/.test(r.scope)));
});
