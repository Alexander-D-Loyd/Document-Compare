import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument,spellingCandidates} from '../app/core.mjs';
import {guidePhraseSpellingRanges} from '../app/spelling-guide-phrases.mjs';
import {workerSpell} from './helpers/spelling-worker.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const check=text=>workerSpell(spellingCandidates(makeDocument([text],'Current')));
test('the complete GPO abbreviation et al. is source-listed and supplies bounded spelling acceptance',async()=>{
 for(const page of [255,267])assert.ok(refs.gpo.pages[page-1].text.includes('et al.'));
 assert.deepEqual(await check('CSM 4437 et al., 99-TC-03. Et al. is an abbreviation.'),[]);
 assert.equal(guidePhraseSpellingRanges(makeDocument(['CSM 4437 et al., 99-TC-03.'],'Current')).length,1);
});
test('et al. never accepts isolated et or incomplete, misspelled or altered-capitalization forms',async()=>{
 for(const text of ['et','et al','et-al.','etal.','et a1.','et aI.','et Al.','ET al.','et all.','xet al.','_et al.','et al.x']){
  assert.equal(guidePhraseSpellingRanges(makeDocument([text],'Current')).length,0,text);
  assert.ok((await check(text)).length,text);
 }
 const words=(await check('CSM 4437 et al. with et language and mispelled text.')).map(i=>i.word);
 assert.deepEqual(words,['et','mispelled']);
});
test('the complete citation abbreviation bridges printed margins and known page heads with exact ranges',async()=>{
 const doc=makeDocument(['ASSEMBLY BILL No. 109\nline 13 CSM 4437 et','AB 109 — 696 —\nline 1 al., 99-TC-03 applies.'],'Current');
 const head=doc.blocks.find(b=>b.ignored);head.formatting={headerParts:[{text:head.text}]};const ranges=guidePhraseSpellingRanges(doc);
 assert.equal(ranges.length,1);assert.equal(ranges[0].phrase,'et al.');assert.match(doc.text.slice(ranges[0].start,ranges[0].end),/AB 109/);
 assert.ok(!(await workerSpell(spellingCandidates(doc))).some(i=>i.word==='et'));
});
test('unknown ignored content, native strikes, punctuation and excessive gaps cannot complete et al.',()=>{
 const unknown=makeDocument(['et\nunknown marker\nal.'],'Current'),row=unknown.blocks[1];row.ignored=true;unknown.excluded=[{start:row.start,end:row.end}];assert.equal(guidePhraseSpellingRanges(unknown).length,0);
 const struck=makeDocument(['et al.'],'Current');struck.struck=[{start:3,end:5}];assert.equal(guidePhraseSpellingRanges(struck).length,0);
 for(const text of ['et, al.','et (al.)','et'+ ' '.repeat(5000)+'al.'])assert.equal(guidePhraseSpellingRanges(makeDocument([text],'Current')).length,0);
});
test('abbreviation spelling acceptance preserves literal typography, table wording and independent stylistic checks',async()=>{
 const doc=makeDocument(['A claim for 1 claimant cites "CSM 4437 et al.".'],'Current'),before=doc.text,tokens=JSON.stringify(doc.tokens);
 assert.ok(!(await workerSpell(spellingCandidates(doc))).some(i=>i.word==='et'));
 assert.ok(jointStylisticIssues(doc,refs).some(i=>i.suggestion==='one'));
 assert.equal(doc.text,before);assert.equal(JSON.stringify(doc.tokens),tokens);
 const table=makeDocument(['Item Amount\nCSM 4437 et al. 1,000'],'Current');assert.equal(guidePhraseSpellingRanges(table).length,1);
});
