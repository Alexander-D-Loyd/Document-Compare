import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument} from '../app/core.mjs';import {lcbExpressionIssues} from '../app/style-lcb-expressions.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
import {CHECK_COVERAGE} from '../app/style-coverage.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),make=t=>makeDocument(Array.isArray(t)?t:[t],'Current'),check=d=>lcbExpressionIssues(d,refs);
// Independently selected listed noun, base/inflected verb, adverb and full phrase roles.
const cases=[['The right of way is established.','right of way','right-of-way','The','is'],['The agency shall loan shark the borrower.','loan shark','loan-shark','shall',null],['The agency works cost effectively.','cost effectively','cost-effectively','works',null],['The court cross examines the witness.','cross examines','cross-examines','court','the witness'],['The officer was re-elected.','re-elected','reelected','was',null],['Before cross examining the witness, the court acts.','cross examining','cross-examining','Before',null],['The guide-dogs are trained.','guide-dogs','guide dogs','The','are'],['The first come first served basis is established.','first come first served basis','first-come-first-served basis',null,null]];
test('existing explicit LCB expression roles retain exact selections and compliant counterparts',()=>{
 for(const [text,term,good]of cases){const d=make(text),saved=JSON.stringify(d),r=check(d);assert.equal(r.length,1,text);assert.equal(r[0].suggestion,good);assert.equal(d.text.slice(r[0].start,r[0].end),term);assert.equal(check(make(text.replace(term,good))).length,0);assert.equal(JSON.stringify(d),saved);}
});
test('complete expression words protect Unicode and hidden combining-mark boundaries',()=>{
 for(const [text,term]of cases)for(const [side,mark]of [['before','α'],['after','α'],['after','\u0301']])for(const hidden of [false,true]){const at=text.indexOf(term)+(side==='after'?term.length:0),d=make(text.slice(0,at)+mark+text.slice(at));if(hidden)d.excluded.push({start:at,end:at+mark.length});assert.equal(check(d).length,0,term+' '+side+mark+' '+hidden);}
});
test('supporting role spaces and finite object words cannot be sourced from strikeouts',()=>{
 for(const [text,term,,left,right]of cases){for(const side of [left?'before':null,right?'after':null].filter(Boolean)){const at=side==='before'?text.indexOf(term)-1:text.indexOf(term)+term.length,d=make(text);d.struck=[{start:at,end:at+1}];assert.equal(check(d).length,0,term+' '+side);}
 if(right==='the witness'){const d=make(text),at=text.indexOf('witness')+2;d.struck=[{start:at,end:at+1}];assert.equal(check(d).length,0,'complete object word');}}
});
test('unknown excluded text cannot establish expression or nominal continuation evidence',()=>{
 for(const [text,term,,left,right]of cases){for(const side of [left?'before':null,right?'after':null].filter(Boolean)){const at=text.indexOf(term)+(side==='after'?term.length:0),d=make(text.slice(0,at)+(side==='after'?' unknown':'unknown ')+text.slice(at)),start=d.text.indexOf('unknown');d.excluded.push({start,end:start+7});assert.equal(check(d).length,0,term+' '+side);}}
});
test('wrapped literals and table evidence protect complete expression roles',()=>{
 for(const [text,term,,left,right]of cases){const wrapped=make('The title "'+text.replace(term,term+'\n')+'" is literal.');assert.equal(check(wrapped).length,0,term+' literal');
 if(left){const at=text.indexOf(term),d=make(text.slice(0,at)+'\n'+text.slice(at));d.blocks[0].formatting={headerGaps:[1,2]};assert.equal(check(d).length,0,term+' left table');}
 if(right){const at=text.indexOf(term)+term.length,d=make(text.slice(0,at)+'\n'+text.slice(at));d.blocks[1].formatting={headerGaps:[1,2]};assert.equal(check(d).length,0,term+' right table');}}
});
test('identified interior page heads preserve complete role cues beyond the old character window',()=>{
 for(const [text,term,good,left]of cases.filter(c=>c[3])){const at=text.indexOf(term),d=make(['ASSEMBLY BILL No. 9999\nThe people do enact as follows:\nline 1 '+text.slice(0,at),'AB 9999 — 2 —\nline 1 '+text.slice(at)]),header=d.blocks.find(b=>b.ignored);header.formatting={headerParts:[{}]};
 // An independently recognized long layout label tests the retained source gap.
 const inserted=make(['ASSEMBLY BILL No. 9999\nThe people do enact as follows:\nline 1 '+text.slice(0,at),'AB 9999 — '+('recognized layout label '.repeat(6))+'2 —\nline 1 '+text.slice(at)]),long=inserted.blocks.find(b=>b.page===2&&!b.margin);long.ignored=true;long.layoutLabel=true;inserted.excluded.push({start:long.start,end:long.end});const saved=JSON.stringify(inserted),r=check(inserted);assert.equal(r.length,1,term);assert.equal(r[0].suggestion,good);assert.equal(JSON.stringify(inserted),saved);assert.equal(check(d).length,1,term+' normal');}
});
test('an intact alternative adverb cue survives a different uncertain cue',()=>{
 const d=make('The agency shall unknown cost effectively operate.'),at=d.text.indexOf('unknown');d.excluded.push({start:at,end:at+7});const r=check(d);assert.equal(r.length,1);assert.equal(r[0].suggestion,'cost-effectively');
 const noun=make('The unknown right of way is established.'),n=noun.text.indexOf('unknown');noun.excluded.push({start:n,end:n+7});assert.equal(check(noun).length,0,'noun requires both cues');
});
test('final combined review does not recreate rejected expression fragments',()=>{
 for(const [text,term,,left,right]of cases.filter(c=>c[3]||c[4])){const d=make(text),at=left?text.indexOf(term)-1:text.indexOf(term)+term.length;d.struck=[{start:at,end:at+1}];assert.ok(!jointStylisticIssues(d,refs).some(i=>i.checkId==='lcb-expressions'),term);}
});
test('long known-adverb cues are complete and unrelated preceding matter is not inspected',()=>{
 const text='The officer was '+('recently also '.repeat(40))+'re-elected.',d=make(text),r=check(d);assert.equal(r.length,1);assert.equal(r[0].suggestion,'reelected');const at=d.text.indexOf('also')+2;d.struck=[{start:at,end:at+1}];assert.equal(check(d).length,0);
 const independent=make('Unrelated table........100\nThe officer was re-elected.');assert.equal(check(independent).length,1);
});
test('expression coverage records complete source cues and remaining semantic limits',()=>{
 const scope=CHECK_COVERAGE.find(r=>r.title==='Complete listed expression role evidence');assert.match(scope.text,/Reverse lexical discovery/);assert.match(scope.text,/broader semantic roles/);
 const inventory=styleRuleInventory(refs),record=inventory.find(r=>r.guide==='lcb'&&r.text?.includes('right-of-way')&&/complete original expression/.test(r.scope));assert.ok(record,'mapped expression scope');assert.match(record.scope,/complete object word/);
});
