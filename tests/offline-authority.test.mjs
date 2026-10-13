import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {validateAuthority,authorityIndex,authorityAccepts,authorityStore}from '../app/offline-authority.mjs';
import {makeDocument,spellingCandidates}from '../app/core.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const authority=()=>validateAuthority({version:1,authority:'Office preference list',edition:'Test edition',source:'Office approved export',permissions:'Office owns this test data',datasetId:'a'.repeat(64),entries:[{entry:'color noun',spellings:['color','colour']},{entry:'technical noun',spellings:['microplate','microplait']},{entry:'conflict control',spellings:['healthcare','health-care']}]});
const check=doc=>jointStylisticIssues(typeof doc==='string'?makeDocument([doc],'Current'):doc,refs,{authority:authority(),includeReviewSuggestions:true}).filter(i=>i.reviewKind==='imported-dictionary-preference');
test('authority imports require explicit source, edition, rights metadata and ordered whole words',()=>{
 const valid=authority();assert.equal(valid.entries[0].spellings[0],'color');
 for(const mutate of [d=>d.version=2,d=>d.authority='Dictionary',d=>d.edition='',d=>delete d.permissions,d=>d.entries=[],d=>d.entries[0].entry='',d=>d.entries[0].spellings=['two words'],d=>d.entries[0].spellings=['same','same'],d=>d.entries[0].spellings=['<script>'],d=>d.entries[0].spellings=['x'.repeat(151)]]){const d=structuredClone(valid);mutate(d);assert.throws(()=>validateAuthority(d));}
 assert.throws(()=>validateAuthority({...valid,entries:[{entry:'same apostrophe',spellings:["reader’s","reader's"]}]}));
});
test('explicit valid forms are accepted without inventing inflections or proper-name case',()=>{
 const index=authorityIndex(authority());for(const s of ['color','colour','Colour','microplait'])assert.ok(authorityAccepts(index,s),s);
 for(const s of ['colours','COLOUR','MicroPlait','other'])assert.ok(!authorityAccepts(index,s),s);
 const candidates=spellingCandidates(makeDocument(['The micro-\nplait is used.'],'Current'));assert.equal(candidates.find(c=>c.word==='microplait').word,'microplait');
});
test('later forms are review-only, source-identified and keep exact physical offsets',()=>{
 const text='The colour is recorded.',found=check(text);assert.equal(found.length,1);const i=found[0];assert.equal(text.slice(i.start,i.end),'colour');assert.equal(i.suggestion,null);assert.deepEqual(i.conditionalSuggestions,['color']);assert.ok(i.reviewSuggested);assert.equal(i.dictionaryEvidence.edition,'Test edition');assert.match(i.checkId,/a{64}$/u);assert.match(i.message,/does not certify complete/);
 assert.equal(check('The color is recorded.').length,0);assert.equal(check('The colourless material is used.').length,0);
 const d=makeDocument(['line 1 The micro-\nline 2 plait is used.'],'Current',[],[],new Set(['microplait'])),i2=check(d)[0];assert.equal(i2.matchText,'microplait');assert.equal(d.text.slice(i2.start,i2.end),'micro-\nline 2 plait');assert.equal(d.text,'line 1 The micro-\nline 2 plait is used.');
});
test('meanings remain ambiguous and guide disagreements cannot return through imported data',()=>{
 const d=authority();d.entries.push({entry:'alternate sense',spellings:['chroma','colour']});const found=jointStylisticIssues(makeDocument(['The colour is recorded.'],'Current'),refs,{authority:d}).find(i=>i.reviewKind==='imported-dictionary-preference');assert.deepEqual(found.conditionalSuggestions,['color','chroma']);assert.equal(found.suggestion,null);
 assert.equal(check('The health-care program is supported.').length,0);
 const grey=authority();grey.entries.push({entry:'gray',spellings:['gray','grey']});const all=jointStylisticIssues(makeDocument(['The grey paint is applied.'],'Current'),refs,{authority:grey});assert.equal(all.filter(i=>i.text==='grey').length,1);assert.equal(all.find(i=>i.text==='grey').checkId,'merriam-first-spelling');
});
test('source literals, removed delimiters, tables, headings and partial excluded words stay protected',()=>{
 for(const s of ['The term “colour” is defined.','The term \'colour\' is literal.','The Colour Company is named.','LEGISLATIVE COUNSEL’S DIGEST\nExisting law acts.\nThe people of the State of California do enact as follows:\nThe color is used.'])assert.equal(check(s).length,0,s);
 const d=makeDocument(['The term “colour” is defined.'],'Current');d.struck=[{start:d.text.indexOf('“'),end:d.text.indexOf('“')+1},{start:d.text.indexOf('”'),end:d.text.indexOf('”')+1}];assert.equal(check(d).length,0);
 for(const change of [d=>d.struck=[{start:4,end:10}],d=>d.excluded.push({start:4,end:10}),d=>d.excluded.push({start:4,end:5})]){const d=makeDocument(['The colour is used.'],'Current');change(d);assert.equal(check(d).length,0);}
});
test('unavailable or malformed local stores cannot silently install data',async()=>{
 await assert.rejects(authorityStore(null).load(),/unavailable/);let opened=false;const factory={open(){opened=true;throw Error('storage denied');}};await assert.rejects(authorityStore(factory).save({}),/authority JSON/);assert.equal(opened,false);await assert.rejects(authorityStore(factory).save(authority()),/storage denied/);
});
