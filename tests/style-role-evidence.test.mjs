import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {lcbRoleFormIssues,LCB_ROLE_FORMS} from '../app/style-lcb-role-forms.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {searchCoverage} from '../app/style-coverage.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=t=>makeDocument(Array.isArray(t)?t:[t],'Current'),check=d=>lcbRoleFormIssues(d,refs);
function exclude(d,text){const b=d.blocks.find(b=>b.text===text);assert.ok(b);b.ignored=true;d.excluded.push({start:b.start,end:b.end});}
test('role correction needs the complete modifier and its following noun outside every table row',()=>{
 const d=make('line 1 The in-service\nline 2 training shall apply.');d.blocks[1].formatting={headerGaps:[{},{}]};assert.equal(check(d).length,0);
});
test('unknown ignored or excluded content cannot manufacture a modifier head',()=>{
 for(const kind of ['ignored','excluded']){const d=make('line 1 The in-service\nunknown marker\nline 2 training shall apply.');if(kind==='ignored')exclude(d,'unknown marker');else{const start=d.text.indexOf('unknown marker');d.excluded.push({start,end:start+14});}assert.equal(check(d).length,0);}
});
test('quoted noun evidence cannot establish an outside modifier correction',()=>{
 const d=make('The term “in-service\ntraining” is literal.');assert.equal(check(d).length,0);assert.equal(jointStylisticIssues(d,refs).filter(i=>i.checkId==='lcb-role-forms').length,0);
});
test('noun object evidence protects the complete preceding verb cue and nominal ending',()=>{
 for(const kind of ['table','unknown']){const d=make('line 1 The agency shall retain\n'+(kind==='unknown'?'unknown marker\n':'')+'line 2 case-law under this section.');if(kind==='table')d.blocks[0].formatting={headerGaps:[{},{}]};else exclude(d,'unknown marker');assert.equal(check(d).length,0);}
});
test('nominal determiner evidence cannot bridge unknown masked body content',()=>{
 const d=make('line 1 The\nunknown marker\nline 2 collective-bargaining is required.');exclude(d,'unknown marker');assert.equal(check(d).length,0);
});
test('special modifier predicate evidence is protected separately from its selected phrase',()=>{
 const d=make('line 1 The man made structures\nline 2 are inspected.');d.blocks[1].formatting={headerGaps:[{},{}]};assert.equal(check(d).length,0);
});
test('an independently intact preceding cue retains an existing special modifier correction',()=>{
 const d=make('line 1 The agency provides man made structures\nline 2 are inspected.');d.blocks[1].formatting={headerGaps:[{},{}]};const r=check(d);assert.equal(r.length,1);assert.equal(r[0].suggestion,'man-made');assert.equal(r[0].text,'man made');
});
test('identified interior page heads preserve role wording and source selections',()=>{
 const d=make(['ASSEMBLY BILL No. 9999\nThe people do enact as follows:\nline 1 The agency shall retain','AB 9999 — 2 —\nline 1 case-law under this section.\nline 2 The in-service training shall apply.']);const r=check(d);assert.deepEqual(r.map(i=>i.suggestion).sort(),['case law','inservice']);for(const i of r)assert.equal(i.text,d.text.slice(i.start,i.end));
});
test('all finite listed role forms protect their complete establishing continuation',()=>{
 for(const r of LCB_ROLE_FORMS){const ending=r.role==='modifier'?' '+(r.heads?.split('|')[0]||'program')+' applies.':' is required.',d=make('line 1 The '+r.variant+'\nline 2'+ending);assert.ok(check(d).some(i=>i.suggestion===r.preferred),r.variant);d.blocks[1].formatting={headerGaps:[{},{}]};assert.equal(check(d).length,0,r.variant);}
});
test('source strikes in whitespace between a role phrase and its cue stay protected',()=>{
 for(const t of ['The in-service training applies.','The collective-bargaining is required.','The agency shall retain case-law under this section.']){const d=make(t),r=check(d);assert.equal(r.length,1);const start=r[0].end;d.struck=[{start,end:start+1}];assert.equal(check(d).length,0,t);}
});
test('an intact determiner remains independent of a protected modal object cue',()=>{
 const d=make('line 1 The agency shall retain\nline 2 the case-law under this section.');d.blocks[0].formatting={headerGaps:[{},{}]};const r=check(d);assert.equal(r.length,1);assert.equal(r[0].suggestion,'case law');assert.match(r[0].message,/determiner and nominal continuation/);
});
test('each new role review revalidates its establishing evidence and exposes bounded coverage',()=>{
 const d=make('line 1 The in-service\nline 2 training applies.');assert.equal(check(d).length,1);d.blocks[1].ignored=true;d.excluded.push({start:d.blocks[1].start,end:d.blocks[1].end});assert.equal(check(d).length,0);assert.ok(searchCoverage('role-form evidence').some(r=>r.text.includes('finite')&&r.text.includes('remain manual')));
});
test('a clipped preceding window cannot manufacture a determiner, modal or special object verb',()=>{
 for(const [prefix,cue,term]of [['The agency says x','shall retain','case-law.'],['The prose mentions absin','the','case-law is required.'],['The prose says mis','provide','common sense rules out that result.']]){const d=make(prefix+cue+' '.repeat(100-cue.length)+term);assert.equal(check(d).length,0,cue);}
 for(const prefix of ['α','𐐀'])assert.equal(check(make('The '+prefix+'in-service training shall apply.')).length,0,'A complete Unicode source token cannot become a suffix variant');
});
