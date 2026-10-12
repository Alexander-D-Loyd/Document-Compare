import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
import {makeDocument,spellingCandidates} from '../app/core.mjs';import {guidePhraseSpellingRanges} from '../app/spelling-guide-phrases.mjs';
import {workerSpell} from './helpers/spelling-worker.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const data=new URL('../app/data/',import.meta.url),phrases=JSON.parse(fs.readFileSync(new URL('guide-spelling-phrases.json',data))).phrases;
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL(id+'-reference.json',data)))]));
const check=async text=>workerSpell(spellingCandidates(makeDocument([text],'Current')));

test('each complete phrase is printed in its exact bundled guide page, with source PDF provenance',()=>{
 const hashes={lcb:'ae0ef412dafe30a3257d891b221cdbb3f371b7a9f51cbe363051739735cb9688',gpo:'d4cfd249757b27bef01bd3fa76ce7da71fe6e4cb2cdcf510d371c7374d9ae630'};
 for(const [id,file]of [['lcb','lcb-stylemanual-2019.pdf'],['gpo','gpo-stylemanual-2016.pdf']])assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(file,data))).digest('hex'),hashes[id]);
 for(const r of phrases)assert.ok(refs[r.guide].pages[r.page-1].text.replace(/\s+/g,' ').includes(r.phrase),r.phrase);
});

test('guide-approved complete phrases suppress fragment false alarms without adding their words to a dictionary',async()=>{
 const doc=makeDocument([phrases.map(r=>r.phrase).join('; ')],'Current'),before=doc.text,tokens=JSON.stringify(doc.tokens);
 assert.equal(guidePhraseSpellingRanges(doc).length,12);assert.deepEqual(await workerSpell(spellingCandidates(doc)),[]);
 assert.equal(doc.text,before);assert.equal(JSON.stringify(doc.tokens),tokens);
 const isolated=await check('bona; fide; valorem; officio; vivos; rata; capita; diem; prima; facie; mortem; et; minimis.');
 assert.deepEqual(isolated.map(i=>i.word),['bona','fide','valorem','officio','vivos','rata','capita','diem','prima','facie','mortem','et','minimis']);
});

test('only exact lower-case and initial-capital phrase forms gain acceptance',async()=>{
 assert.deepEqual(await check('Bona fide; Per diem; Et seq.; Prima facie.'),[]);
 const doc=makeDocument(['bona Fide; bOna fide; et Seq.; per Diem; bona fideX; xprima facie; _bona fide.'],'Current');
 assert.equal(guidePhraseSpellingRanges(doc).length,0);
 assert.ok((await workerSpell(spellingCandidates(doc))).some(i=>i.word==='bOna'));
});

test('misspelled, hyphenated, joined and incomplete phrases remain checkable',async()=>{
 for(const text of ['bona fdie','bnoa fide','bonafide','bona-fide','per deim','perdiem','et seq','prima-face','de minmis']){
  const doc=makeDocument([text],'Current');assert.equal(guidePhraseSpellingRanges(doc).length,0,text);
  assert.ok((await workerSpell(spellingCandidates(doc))).length,text);
 }
});

test('complete phrases bridge printed margins and identified page heads with unchanged source offsets',async()=>{
 const doc=makeDocument(['ASSEMBLY BILL No. 1018\nline 39 A bona','AB 1018 — 2 —\nline 1 fide agreement and per\nline 2 diem compensation apply.'],'Current');
 const head=doc.blocks.find(b=>b.ignored);head.formatting={headerParts:[{text:head.text}]};
 const ranges=guidePhraseSpellingRanges(doc);assert.equal(ranges.length,2);
 assert.deepEqual(ranges.map(r=>r.phrase),['bona fide','per diem']);assert.match(doc.text.slice(ranges[0].start,ranges[0].end),/bona\nAB 1018/);
 assert.ok(!(await workerSpell(spellingCandidates(doc))).some(i=>['bona','fide','diem'].includes(i.word)));
});

test('unknown ignored boundaries, strikeouts, punctuation and excessively long gaps cannot establish a phrase',()=>{
 const unknown=makeDocument(['bona\nunknown marker\nfide'],'Current'),row=unknown.blocks[1];row.ignored=true;unknown.excluded=[{start:row.start,end:row.end}];assert.equal(guidePhraseSpellingRanges(unknown).length,0);
 const struck=makeDocument(['bona fide'],'Current');struck.struck=[{start:5,end:9}];assert.equal(guidePhraseSpellingRanges(struck).length,0);
 for(const text of ['bona, fide','bona (fide)','bona. fide','bona'+ ' '.repeat(5000)+'fide'])assert.equal(guidePhraseSpellingRanges(makeDocument([text],'Current')).length,0,text.slice(0,30));
});

test('spelling phrase acceptance does not hide independent style corrections or malformed foreign modifiers',async()=>{
 const doc=makeDocument(['A bona fide agreement covers 1 claimant. A bona-fide transaction applies.'],'Current');
 assert.ok(!(await workerSpell(spellingCandidates(doc))).some(i=>i.start<22));
 const style=jointStylisticIssues(doc,refs);assert.ok(style.some(i=>i.suggestion==='one'));assert.ok(style.some(i=>i.suggestion==='bona fide'));
});

test('a valid phrase does not exempt an adjacent isolated component or unrelated misspelling',async()=>{
 const issues=await check('A bona fide transaction has bona language, fide language, and mispelled text. Section 123 et seq. and et language apply.');
 assert.deepEqual(issues.map(i=>i.word),['bona','fide','mispelled','et']);
});
