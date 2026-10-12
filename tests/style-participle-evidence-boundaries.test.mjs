import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {participleModifierIssues} from '../app/style-participle-modifiers.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=d=>participleModifierIssues(d,refs);
const struck=text=>{const d=makeDocument([text],'Current'),start=d.text.indexOf('former');d.struck=[{start,end:start+6}];return d;};
test('complete source/participle/noun evidence cannot bridge removed wording',()=>{
 for(const text of ['The county former owned properties are reviewed.','The county owned former properties are reviewed.','The agency provides board former funded programs.','The agency provides board funded former programs.'])assert.equal(check(struck(text)).length,0,text);
 for(const text of ['The county owned properties are reviewed.','The agency provides board funded programs.'])assert.equal(check(makeDocument([text],'Current')).length,1,text);
});
test('exact before and after noun cues cannot bridge native source strikeouts',()=>{
 for(const text of ['The agency provides former board funded programs.','The county owned properties former are reviewed.','The agency requires former employer financed plans.'])assert.equal(check(struck(text)).length,0,text);
});
test('every source/participle/noun and finite cue row is protected against table context',()=>{
 for(const [rows,tableIndex]of [[['The agency provides','board funded programs.'],0],[['The county owned','properties are reviewed.'],1],[['The county owned properties','are reviewed.'],1]]){
  const d=makeDocument([rows.join('\n')],'Current');d.blocks[tableIndex].formatting={headerGaps:[1,2]};assert.equal(check(d).length,0,rows.join('\n'));
 }
});
test('unknown ignored bridges cannot supply candidate wording, noun or exact cue',()=>{
 for(const rows of [['The county','owned properties are reviewed.'],['The county owned','properties are reviewed.'],['The county owned properties','are reviewed.'],['The agency provides','board funded programs.']]){
  const d=makeDocument([rows.join('\nunknown marker\n')],'Current'),b=d.blocks[1];b.ignored=true;d.excluded.push({start:b.start,end:b.end});assert.equal(check(d).length,0,rows.join('\n'));
 }
});
test('identified interior page heads retain complete body modifier and contextual cues',()=>{
 for(const rows of [['The county','owned properties are reviewed.'],['The county owned','properties are reviewed.'],['The county owned properties','are reviewed.'],['The agency provides','board funded programs.']]){
  const d=makeDocument(['ASSEMBLY BILL No. 9999\nline 10 '+rows[0],'AB 9999 — 2 —\nline 1 '+rows[1]],'Current');d.blocks.find(b=>b.ignored).formatting={headerParts:[{text:'AB 9999'}]};const issues=check(d);assert.equal(issues.length,1,rows.join('\n'));assert.equal(issues[0].text,d.text.slice(issues[0].start,issues[0].end));assert.match(issues[0].suggestion,/county-owned|board-funded/);
 }
});
test('wrapped literal modifiers remain literal while independent review continues',()=>{
 const d=makeDocument(['The literal "The county\nowned properties are reviewed" remains. Funds support 1 claimant.'],'Current');assert.equal(check(d).length,0);assert.ok(jointStylisticIssues(d,refs).some(i=>i.suggestion==='one'));
});
test('unrelated earlier strikes and an independently intact alternative cue preserve findings',()=>{
 for(const text of ['The former provision ends; the agency provides board funded programs.','The agency provides former board funded programs are reviewed.']){const issues=check(struck(text));assert.equal(issues.length,1,text);assert.equal(issues[0].suggestion,'board-funded');}
 for(const text of ['The county owned properties.','The board funded programs.','The programs are government sponsored.','A board funded program.'])assert.equal(check(makeDocument([text],'Current')).length,0,text);
});
test('participle evidence reevaluates edited metadata and preserves existing finite grammar',()=>{
 const d=makeDocument(['The county owned\nproperties are reviewed.'],'Current');assert.equal(check(d).length,1);d.blocks[1].formatting={headerGaps:[1,2]};assert.equal(check(d).length,0);delete d.blocks[1].formatting;assert.equal(check(d).length,1);
 assert.equal(check(makeDocument(['The agency acts within board funded programs.'],'Current')).length,0);
});
