import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument} from '../app/core.mjs';import {contextualNameIssues} from '../app/style-lcb-contextual-names.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {NAME_EVIDENCE_CASES} from './helpers/contextual-name-evidence-cases.mjs';
import {CHECK_COVERAGE} from '../app/style-coverage.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),make=t=>makeDocument(Array.isArray(t)?t:[t],'Current'),check=d=>contextualNameIssues(d,refs);
test('coverage records complete identity evidence and the finite shared GPO disease witness',()=>{
 const row=CHECK_COVERAGE.find(r=>r.title==='Complete contextual identity evidence');assert.match(row.text,/300 characters/);assert.match(row.text,/do not authenticate identities/);const inventory=styleRuleInventory(refs),gpo=inventory.find(r=>r.id==='gpo-3.32');assert.equal(gpo.status,'Partially automated');assert.match(gpo.scope,/type I\/II diabetes/);assert.match(gpo.scope,/Unencoded domain meanings/);for(const c of NAME_EVIDENCE_CASES)assert.ok(inventory.some(r=>r.guide==='lcb'&&r.page===c.page&&/Complete original selected words/.test(r.scope||'')),c.suggestion);
 const issue=check(make('The type I Diabetes is treated.'))[0];assert.ok(issue.references.some(r=>r.guideId==='gpo'&&r.rule==='3.32'&&r.guidePage===50));
});
test('existing finite identity witnesses retain exact corrections without source mutation',()=>{
 for(const c of NAME_EVIDENCE_CASES){const d=make(c.text),before=JSON.stringify(d),r=check(d).find(i=>i.suggestion===c.suggestion);assert.ok(r,c.text);assert.equal(r.text,c.selection);assert.equal(r.guidePage,c.page);assert.equal(check(make(c.text.replace(c.selection,c.suggestion))).length,0,c.text);assert.equal(JSON.stringify(d),before);assert.ok(jointStylisticIssues(d,refs).some(i=>i.suggestion===c.suggestion),c.text);}
});
test('complete identity cues reject original strikeouts including their establishing spaces',()=>{
 for(const c of NAME_EVIDENCE_CASES){const d=make(c.text),space=d.text.indexOf(' ',Math.min(d.text.indexOf(c.cue),d.text.indexOf(c.selection)));assert.ok(space>=0,c.text);d.struck=[{start:space,end:space+1}];assert.equal(check(d).length,0,c.text);}
});
test('unknown excluded letters cannot become whitespace establishing an identity',()=>{
 for(const c of NAME_EVIDENCE_CASES){const gap=c.text.indexOf(' ',Math.min(c.text.indexOf(c.cue),c.text.indexOf(c.selection))),d=make(c.text.slice(0,gap)+' unknown '+c.text.slice(gap+1)),at=d.text.indexOf('unknown');d.excluded.push({start:at,end:at+7});assert.equal(check(d).length,0,c.text);}
});
test('original Unicode selected and supporting words must be complete tokens',()=>{
 for(const c of NAME_EVIDENCE_CASES)for(const suffix of ['α','\u0301','2','_']){
  // A terminal punctuation mark is an abbreviation boundary, tested
  // separately by intact country and name evidence rather than a suffix.
  if(c.cue.endsWith('.')||/^\d+$/.test(c.cue)&&suffix==='2')continue;
  const text=c.text.replace(c.cue,c.cue+suffix);assert.equal(check(make(text)).length,0,text);
 }
 for(const c of NAME_EVIDENCE_CASES){const text=c.text.replace(c.selection,'α'+c.selection);assert.equal(check(make(text)).length,0,text);}
});
test('later tables and quoted establishing roles cannot supply identity evidence',()=>{
 for(const c of NAME_EVIDENCE_CASES.filter(c=>c.text.indexOf(c.cue)>c.text.indexOf(c.selection)+c.selection.length)){
  const t=c.text.replace(' '+c.cue,'\n'+c.cue+'........100');assert.equal(check(make(t)).length,0,t);
  const q=c.text.replace(c.cue,'"'+c.cue+'"');assert.equal(check(make(q)).length,0,q);
 }
});
test('an independent intact identity survives another uncertain alternative',()=>{
 const a=make('The type I Diabetes type II is treated.'),at=a.text.indexOf('type II');a.struck=[{start:at,end:at+7}];assert.equal(check(a)[0]?.suggestion,'diabetes');
 const b=make('The United States senator Jane Smith shall act.'),start=b.text.indexOf('United States');b.struck=[{start,end:start+13}];assert.equal(check(b)[0]?.suggestion,'Senator');
 assert.equal(check(make('The allies supplied the report "Historical Summary" during World War II.'))[0]?.suggestion,'Allies');
});
test('complete identity qualifiers can cross known interior page heads while unknown bridges stay protected',()=>{
 const d=make(['ASSEMBLY BILL No. 9999\nThe people do enact as follows:\nline 1 The United States','AB 9999 — 2 —'+' '.repeat(80)+'\nline 1 senator shall act.']);d.blocks.find(b=>b.ignored).formatting={headerParts:[{}]};const r=check(d);assert.equal(r.length,1);assert.equal(r[0].text,'senator');assert.equal(r[0].suggestion,'Senator');
 const e=make('The United States\nunknown marker\nsenator shall act.'),b=e.blocks[1];b.ignored=true;e.excluded.push({start:b.start,end:b.end});assert.equal(check(e).length,0);
});
test('a clipped identity window cannot start inside an original country qualifier',()=>{
 const prefix='xUnited States'+' '.repeat(300-'United States'.length),text=prefix+'senator shall act.';assert.equal(check(make(text)).length,0);
});
test('masked adjacent characters cannot create selected-name or supporting-head boundaries',()=>{
 for(const text of ['The black studentsα are eligible.','The αblack students are eligible.','The U.S. constitutionα applies.','The executive order no. 34α applies.','The allies during World War IIα supplied records.']){
  const d=make(text),start=d.text.indexOf('α');d.excluded.push({start,end:start+1});assert.equal(check(d).length,0,text);
 }
});
test('a quoted historical report may intervene but a quoted or unknown time referent cannot',()=>{
 assert.equal(check(make('The allies supplied "Historical Summary" during World War II.'))[0]?.suggestion,'Allies');
 for(const text of ['The allies supplied records "during World War II."','The allies supplied records during World War IIα.'])assert.equal(check(make(text)).length,0,text);
 const d=make('The allies supplied unknown records during World War II.'),start=d.text.indexOf('unknown');d.excluded.push({start,end:start+7});assert.equal(check(d).length,0);
});
