import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeDocument} from '../app/core.mjs';import {stylisticIssues} from '../app/gpo-style.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {CHECK_COVERAGE} from '../app/style-coverage.mjs';import {styleRuleInventory} from '../app/style-rule-inventory.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
// Independent examples read from GPO physical114–115, not a production rule export.
export const cases=[['long term','loan'],['high speed','line'],['large scale','project'],['low cost','housing'],['lump sum','payment'],['part time','personnel'],['state of the art','technology'],['cost of living','increase']];
const make=t=>makeDocument(Array.isArray(t)?t:[t],'Current'),direct=d=>stylisticIssues(d,refs.gpo).filter(i=>i.rule==='6.15'),joint=d=>jointStylisticIssues(d,refs);
test('eight existing GPO examples select only the modifier and preserve original documents',()=>{
 for(const [phrase,noun]of cases){const d=make('Funds provide '+phrase+' '+noun+'.'),before=JSON.stringify(d),r=direct(d);assert.equal(r.length,1,phrase);assert.equal(r[0].text,phrase);assert.equal(r[0].suggestion,phrase.replaceAll(' ','-'));assert.equal(r[0].guidePage,114);assert.equal(d.text.slice(r[0].start,r[0].end),phrase);assert.equal(JSON.stringify(d),before);assert.equal(direct(make('Funds provide '+phrase.replaceAll(' ','-')+' '+noun+'.')).length,0);}
});
test('struck supporting nouns and spaces cannot justify a generic modifier correction',()=>{
 for(const [phrase,noun]of cases)for(const span of ['head','space']){const d=make('Funds provide '+phrase+' '+noun+'.'),at=d.text.indexOf(noun,d.text.indexOf(phrase)+phrase.length);d.struck=[{start:span==='space'?at-1:at,end:span==='space'?at:at+noun.length}];assert.equal(direct(d).length,0,phrase+' '+span);assert.equal(joint(d).length,0,phrase+' final '+span);}
});
test('unknown excluded content between the complete modifier and noun is not whitespace evidence',()=>{
 for(const [phrase,noun]of cases){const d=make('Funds provide '+phrase+' unknown '+noun+'.'),at=d.text.indexOf('unknown');d.excluded.push({start:at,end:at+7});assert.equal(direct(d).length,0,phrase);assert.equal(joint(d).length,0,phrase+' final');}
});
test('original Unicode and combining-mark noun boundaries remain complete when hidden',()=>{
 for(const [phrase,noun]of cases)for(const tail of ['α','\u0301']){const d=make('Funds provide '+phrase+' '+noun+tail+'.'),at=d.text.indexOf(tail);d.excluded.push({start:at,end:at+tail.length});assert.equal(direct(d).length,0,phrase+tail);assert.equal(joint(d).length,0,phrase+' final '+tail);}
});
test('dotted continuation rows and wrapped literal noun evidence stay protected',()=>{
 for(const [phrase,noun]of cases)for(const text of ['Funds provide '+phrase+'\n'+noun+'........100','Funds provide "'+phrase+'\n'+noun+'."']){const d=make(text);assert.equal(direct(d).length,0,phrase);assert.equal(joint(d).length,0,phrase+' final');}
});
test('recognized page heads preserve intact modifier evidence and selected body offsets',()=>{
 for(const [phrase,noun]of cases){const d=make(['ASSEMBLY BILL No. 9999\nThe people do enact as follows:\nline 1 Funds provide '+phrase,'AB 9999 — 2 —\nline 1 '+noun+'.']);d.blocks.find(b=>b.ignored).formatting={headerParts:[{}]};const before=JSON.stringify(d),r=direct(d);assert.equal(r.length,1,phrase);assert.equal(d.text.slice(r[0].start,r[0].end),phrase);assert.equal(JSON.stringify(d),before);}
});

test('generic example noun evidence remains bounded and separately documented',()=>{const r=CHECK_COVERAGE.find(r=>r.title==='Complete GPO example modifier evidence');assert.match(r.text,/eight existing/);assert.match(r.text,/Unfamiliar modifiers/);assert.match(styleRuleInventory(refs).find(r=>r.id==='gpo-6.15').scope,/eight existing printed GPO example constructions/);for(const [phrase,noun]of cases)assert.ok(refs.gpo.pages.slice(113,115).some(p=>p.text.includes(phrase.replaceAll(' ','-')+' '+noun)),phrase);});
