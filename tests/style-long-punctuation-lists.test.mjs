import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument} from '../app/core.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {serialCommaIssues} from '../app/style-serial-commas.mjs';import {semicolonSeriesIssues} from '../app/style-semicolon-series.mjs';
import {introducedListRanges} from '../app/style-introduced-lists.mjs';
import {CHECK_COVERAGE} from '../app/style-coverage.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),make=t=>makeDocument(Array.isArray(t)?t:[t],'Current'),serial=d=>serialCommaIssues(d,refs),grouped=d=>semicolonSeriesIssues(d,refs);
const longSerial='The list includes '+Array(32).fill('public schools').join(', ')+', private hospitals and local clinics.',longGrouped='The list includes '+Array(30).fill('public schools, private hospitals').join('; ')+'; county agencies, city boards and regional commissions, local clinics.';
test('recognized serial lists have no arbitrary source-length cutoff and select only the final conjunction',()=>{
 for(const join of ['and','or','nor']){const d=make(longSerial.replace(' and ',' '+join+' ')),r=serial(d);assert.ok(d.text.length>240);assert.equal(r.length,1);assert.equal(r[0].text,join);assert.equal(r[0].suggestion,', '+join);assert.equal(serial(make(d.text.replace(' '+join+' local clinics',', '+join+' local clinics'))).length,0);}
});
test('recognized grouped series retain full semicolon grammar beyond the old source bound',()=>{
 const d=make(longGrouped),r=grouped(d);assert.ok(d.text.length>300);assert.equal(r.length,1);assert.equal(r[0].text,'and');assert.equal(r[0].suggestion,'; and');assert.equal(grouped(make(longGrouped.replace(' and ','; and '))).length,0);
});
test('longer lists preserve finite noun roles, nested alternatives and literal name protections',()=>{
 for(const ending of ['private hospitals and local clinics that qualify.','if eligible and local clinics.','John Smith and Mary Jones.','private hospitals or local clinics and county agencies.'])assert.equal(serial(make(longSerial.slice(0,longSerial.lastIndexOf('private hospitals'))+ending)).length,0,ending);
 assert.equal(grouped(make(longGrouped.replace('county agencies, city boards','county agencies, boards approve clinics'))).length,0);
});
test('identified interior running heads retain full serial and grouped evidence without selecting page labels',()=>{
 for(const [text,check]of [[longSerial,serial],[longGrouped,grouped]]){const at=text.indexOf('private hospitals'),d=make(['ASSEMBLY BILL No. 9999\nThe people do enact as follows:\nline 1 '+text.slice(0,at),'AB 9999 — 2 —\nline 1 '+text.slice(at)]);d.blocks.find(b=>b.ignored).formatting={headerParts:[{}]};const before=JSON.stringify(d),r=check(d);assert.equal(r.length,1);assert.equal(r[0].text,'and');assert.equal(JSON.stringify(d),before);}
});
test('complete long list evidence rejects every intersecting table row including rows before the final conjunction',()=>{
 for(const [text,check]of [[longSerial,serial],[longGrouped,grouped]]){const at=text.indexOf('private hospitals'),d=make(text.slice(0,at)+'\n'+text.slice(at));d.blocks[1].formatting={headerGaps:[{},{}]};assert.equal(check(d).length,0);}
});
test('complete long list evidence rejects unknown ignored and excluded source fragments',()=>{
 for(const [text,check]of [[longSerial,serial],[longGrouped,grouped]]){const at=text.indexOf('private hospitals'),d=make(text.slice(0,at)+'\nunknown marker\n'+text.slice(at)),b=d.blocks[1];b.ignored=true;d.excluded.push({start:b.start,end:b.end});assert.equal(check(d).length,0);const e=make(text.slice(0,at)+'unknown '+text.slice(at));e.excluded.push({start:at,end:at+8});assert.equal(check(e).length,0);}
});
test('introducer and item evidence protect source strikes including supporting spaces',()=>{
 for(const [text,check]of [[longSerial,serial],[longGrouped,grouped]]){const d=make(text),at=d.text.indexOf('includes')+8;d.struck=[{start:at,end:at+1}];assert.equal(check(d).length,0);}
});
test('source Unicode boundaries and non-list punctuation cannot create introduced lists',()=>{
 for(const text of [longSerial.replace('includes','αincludes'),longSerial.replace('local clinics','local clinicsα'),longSerial.replace('public schools','public schools / private schools'),longGrouped.replace('local clinics','local clinicsα')])assert.equal([...serial(make(text)),...grouped(make(text))].length,0,text.slice(-100));assert.equal(serial(make('α'+longSerial)).length,1,'unrelated word before intact introducer');
});
test('long quoted lists stay literal and multiple introduced clauses retain independent selections',()=>{
 assert.equal(serial(make('The title "'+longSerial+'" is literal.')).length,0);assert.equal(grouped(make('The title "'+longGrouped+'" is literal.')).length,0);const d=make(longSerial+'\n'+longGrouped),r=jointStylisticIssues(d,refs).filter(i=>i.rule==='Punctuation: Commas'||i.rule==='Punctuation: Semicolons');assert.equal(r.length,2);assert.ok(r.every(i=>i.text==='and'));
});
test('many ordinary clauses do not suppress a later complete list',()=>{
 const d=make(Array(2500).fill('The agency retains records.').join('\n')+'\n'+longSerial);assert.equal(serial(d).length,1);assert.equal(serial(make('The list includes '+Array(1000).fill('public schools').join(', ')+', private hospitals and local clinics.')).length,1);
});
test('nested failed introducer clauses have one complete finite-list suffix per lexical run',()=>{
 const text=Array(1000).fill('The list includes unknown wording and').join(' ')+' The list includes public schools, private hospitals and local clinics.',ranges=[...introducedListRanges(text,'includes')];assert.equal(ranges.length,1);assert.equal(ranges[0].start,text.lastIndexOf('includes'));assert.equal(serial(make(text)).length,1);
});
test('short single-word fallback cannot restore Unicode or excluded-evidence warnings',()=>{
 for(const text of ['The list αincludes schools, hospitals and clinics.','The list includes schools, hospitals and clinicsα.'])assert.equal(jointStylisticIssues(make(text),refs).filter(i=>i.rule==='Punctuation: Commas').length,0,text);const d=make('The list includes schools, unknown hospitals and clinics.'),at=d.text.indexOf('unknown ');d.excluded.push({start:at,end:at+8});assert.equal(jointStylisticIssues(d,refs).filter(i=>i.rule==='Punctuation: Commas').length,0);
});
test('a decimal or clock punctuation mark cannot pretend to terminate a complete list',()=>{
 for(const text of ['The list includes A, B and 1.5-year programs.','The list includes A, B and 3:30-hour shifts.','The list includes schools, hospitals; clinics, providers and boards, 1.5-year programs.'])assert.equal([...serial(make(text)),...grouped(make(text))].length,0,text);assert.equal(serial(make('The list includes public schools, private hospitals and local clinics. The time is 3:30.')).length,1);
});
test('list coverage records unbounded source discovery while preserving finite semantic limits',()=>{
 const row=CHECK_COVERAGE.find(r=>r.title==='Complete introduced list scanning');assert.match(row.text,/240 or 300/);assert.match(row.text,/semantic grouping remain manual/);const inventory=styleRuleInventory(refs),lcb=inventory.filter(r=>r.guide==='lcb'&&r.page===6);assert.ok(lcb.length&&lcb.every(r=>r.status==='Partially automated'));assert.ok(lcb.some(r=>/no 240\/300-character cutoff/.test(r.scope)));for(const id of ['gpo-8.46','gpo-8.148']){const gpo=inventory.find(r=>r.id===id);assert.ok(gpo);assert.match(gpo.scope,/no arbitrary source-length cap/);assert.equal(gpo.status,'Partially automated');}
});
