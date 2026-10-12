import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {CHECK_COVERAGE} from '../app/style-coverage.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),make=t=>makeDocument(Array.isArray(t)?t:[t],'Current'),check=d=>jointStylisticIssues(d,refs).filter(i=>i.checkId==='nominal-plurals');
const pairs=[['back ups','backups'],['build ups','buildups'],['catch ups','catchups'],['clean ups','cleanups'],['follow ups','followups'],['hook ups','hookups'],['lay offs','layoffs'],['mock ups','mockups'],['pass throughs','passthroughs'],['phase outs','phaseouts'],['set offs','setoffs'],['stand bys','standbys'],['start ups','startups'],['drive bys','drivebys'],['phase ins','phase-ins'],['run offs','runoffs']];
test('independent plural spellings retain complete determiner modifier and count roles',()=>{
 for(const [bad,good]of pairs)for(const [prefix,end]of [['The planned ',' are recorded.'],['Review two proposed ','.'],['The policy requires additional ','.']]){const text=prefix+bad+end,d=make(text),r=check(d);assert.deepEqual(r.map(i=>i.suggestion),[good],text);assert.equal(d.text.slice(r[0].start,r[0].end),bad);assert.deepEqual(check(make(prefix+good+end)),[]);}
});
test('explicit existential predicates establish selected modified plural nouns',()=>{
 for(const [text,wanted]of [['There are back ups.','backups'],['There were planned lay offs.','layoffs'],['There are two planned follow ups.','followups'],['There will be additional phase ins.','phase-ins']])assert.deepEqual(check(make(text)).map(i=>i.suggestion),[wanted],text);
 for(const text of ['The word there precedes unknown back ups wording.','There is back ups.','There were policy back ups wording.'])assert.deepEqual(check(make(text)),[],text);
});
test('plural possessive apostrophes and complete recognized heads remain in the selected correction',()=>{
 for(const [bad,good]of pairs)for(const apostrophe of ["'",'’']){const text='The '+bad+apostrophe+' timing is recorded.',d=make(text),r=check(d);assert.deepEqual(r.map(i=>i.suggestion),[good+apostrophe]);assert.equal(d.text.slice(r[0].start,r[0].end),bad+apostrophe);assert.deepEqual(check(make(text.replace(bad,good))),[]);}
});
test('expanded roles protect every establishing modifier count existential and possessive cue',()=>{
 for(const field of ['struck','excluded'])for(const [text,parts]of [['The planned lay offs are recorded.',['The','planned','lay','offs','are']],['Review two proposed follow ups.',['two','proposed','follow','ups']],['There are planned back ups.',['There','are','planned','back','ups']],['The lay offs’ timing is recorded.',['lay','offs','’','timing']]])for(const part of parts){const d=make(text),start=d.text.indexOf(part);d[field].push({start,end:start+part.length});assert.deepEqual(check(d),[],field+' '+text+' '+part);}
});
test('nominal positive evidence cannot be manufactured from Unicode or masked token fragments',()=>{
 for(const field of ['intact','struck','excluded'])for(const text of ['The αplanned back ups are recorded.','The plannedα back ups are recorded.','αThere are back ups.','There areα back ups.','The back ups’ timingα is recorded.']){const d=make(text);if(field!=='intact'){const start=d.text.indexOf('α');d[field].push({start,end:start+1});}assert.deepEqual(check(d),[],field+' '+text);}
});
test('literals titles tables unfamiliar heads and ordinary verbs remain protected',()=>{
 for(const text of ['The title "planned lay offs" applies.',"The label 'the lay offs are recorded' applies.","The label 'lay offs' timing applies.",'The label ‘lay offs’ timing applies.','The Lay Offs’ Timing Association applies.','The lay offs’ Timing Association applies.','The planned back ups........100','The back ups’ unfamiliarword applies.','The agency shall back up records.','The agency backedup the records.'])assert.deepEqual(check(make(text)),[],text);
});
test('intervening modifiers and possessive heads preserve full three-page evidence and selections',()=>{
 const pages=()=>{const d=make(['ASSEMBLY BILL No. 9998\nThe people do enact as follows:\nline 1 Review two planned','AB 9998 — 2 —\nline 1 follow','AB 9998 — 3 —\nline 1 ups.']);for(const b of d.blocks.filter(b=>b.ignored))b.formatting={headerParts:[{}]};return d;};const d=pages(),saved=JSON.stringify(d),r=check(d);assert.deepEqual(r.map(i=>i.suggestion),['followups']);assert.equal(r[0].start,d.text.indexOf('follow\n'));assert.equal(r[0].end,d.text.indexOf('ups.')+3);assert.equal(JSON.stringify(d),saved);
 const unknown=pages(),b=unknown.blocks.find(b=>b.page===2&&b.ignored);b.formatting={};b.runningHead=false;b.layoutLabel=false;assert.deepEqual(check(unknown),[]);const table=pages();table.blocks.find(b=>b.page===1&&b.margin&&b.text.includes('Review')).formatting={headerGaps:[{},{}]};assert.deepEqual(check(table),[]);
});
test('expanded nominal scope states finite modifier possessive and existential limits',()=>{
 const row=CHECK_COVERAGE.find(r=>r.title==='Complete plural noun role extensions');assert.ok(row);for(const term of ['existential','possessive','modifiers','original','dictionary'])assert.ok(row.text.includes(term),term);
});
