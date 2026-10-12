import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {makeDocument,spellingCandidates} from '../app/core.mjs';
import {workerSpell,workerWords} from './helpers/spelling-worker.mjs';
const source=new URL('../app/data/',import.meta.url),supplement=JSON.parse(fs.readFileSync(new URL('lcb-spelling-words.json',source),'utf8'));

test('each supplemental spelling is source-listed or an identified source-noun regular plural',()=>{
 const reference=JSON.parse(fs.readFileSync(new URL('lcb-reference.json',source),'utf8'));
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(supplement.sourceFile,source))).digest('hex'),supplement.sourceSha256);
 for(const row of supplement.words){
  assert.ok(reference.pages[row.page-1].text.split('\n').some(line=>line.trim()===row.sourceEntry),row.word);
  const lemma=row.sourceEntry.replace(/\s+\([^)]*\)$/,'');
  if(row.derivation){
   assert.equal(row.derivation,'Regular noun plural');assert.equal(row.sourceWord,lemma);
   assert.equal(row.word,/(?:s|x|z|ch|sh)$/.test(lemma)?lemma+'es':/[^aeiou]y$/.test(lemma)?lemma.slice(0,-1)+'ies':lemma+'s');
  }else assert.equal(lemma,row.word);
 }
});

test('actual local spelling worker accepts source-listed forms and retains nearby misspellings',async()=>{
 const words=['postsecondary','Postsecondary',"timeframe's",'timeframe','Timeframe','postsecondry','timframe','postSecondary','TimeFrame'];
 const issues=await workerSpell(words.map((word,start)=>({word,start,end:start+word.length})));
 assert.deepEqual(issues.map(i=>i.word),['postsecondry','timframe','postSecondary','TimeFrame']);
});

test('source-listed divided words are reconstructed across pages without accepting a misspelled whole',async()=>{
 const words=await workerWords(),doc=makeDocument(['ASSEMBLY BILL No. 653\nline 1 A postsec-\n94','AB 653 — 2 —\nline 1 ondary program has a postsecon-\nline 2 dry label.'],'Current',[],[],words);
 assert.ok(doc.tokens.some(t=>t.value==='postsecondary'));
 const issues=await workerSpell(spellingCandidates(doc));
 assert.ok(!issues.some(i=>i.word==='postsecondary'));assert.ok(issues.some(i=>i.word==='postsecondry'));
});

test('LCB Medi-Cal is accepted as a complete case-sensitive compound, without exempting its pieces',async()=>{
 const doc=makeDocument(["Medi-Cal's Medi‑Cal medi-Cal Medi-cal Medy-Cal Medi schoolsite Schoolsite schoolSite schoolste"],'Current');
 const issues=await workerSpell(spellingCandidates(doc));
 assert.deepEqual(issues.map(i=>i.word),['medi-Cal','Medi-cal','Medy','Medi','schoolSite','schoolste']);
});

test('Medi-Cal divided across pages keeps its permanent hyphen in comparison and source fragment spans',async()=>{
 const words=await workerWords(),doc=makeDocument(['ASSEMBLY BILL No. 116\nline 1 The Medi-\n97','AB 116 — 2 —\nline 1 Cal program applies.'],'Current',[],[],words);
 const wrap=doc.wrappedWords.find(w=>w.word==='Medi-Cal');
 assert.ok(wrap);assert.equal(wrap.recognized,false,'Permanent hyphens remain comparison tokens');
 assert.deepEqual(wrap.spans.map(s=>doc.text.slice(s.start,s.end)),['Medi','Cal']);
 assert.deepEqual(doc.tokens.filter(t=>['Medi','-','Cal'].includes(t.value)).map(t=>t.value),['Medi','-','Cal']);
 assert.ok(!(await workerSpell(spellingCandidates(doc))).some(i=>/Medi|Cal/.test(i.word)));
 const bad=makeDocument(['line 1 A Medi-\nline 2 cal program and Medi-\nline 3 call label.'],'Current',[],[],words);
 assert.deepEqual((await workerSpell(spellingCandidates(bad))).map(i=>i.word),['Medi-cal','Medicall']);
});

test('the actual local worker accepts the complete encoded LCB supplement without accepting capitalization or nearby spelling mistakes',async()=>{
 assert.deepEqual(await workerSpell(supplement.words.map((r,start)=>({word:r.word,start,end:start+r.word.length}))),[]);
 const words=['schoolbus','schoolbuses',"schoolbus's",'schoolsite','schoolsites',"schoolsites'",'Schoolsites','Schoolbus','hotline','Hotline','credentialholders','schoolbuss','schoolbusess','schoolste','schoolSite','schoolBus','hotlinne','credentialhorlders'];
 const issues=await workerSpell(words.map((word,start)=>({word,start,end:start+word.length})));
 assert.deepEqual(issues.map(i=>i.word),['schoolbuss','schoolbusess','schoolste','schoolSite','schoolBus','hotlinne','credentialhorlders']);
});

test('source-listed noun plurals reconstruct divided spellings across pages while malformed wholes remain flagged',async()=>{
 const words=await workerWords(),doc=makeDocument(['ASSEMBLY BILL No. 495\nline 1 The school-\n94','AB 495 — 2 —\nline 1 buses serve school-\nline 2 sites and school-\nline 3 busz stops.'],'Current',[],[],words);
 for(const word of ['schoolbuses','schoolsites']){assert.ok(doc.tokens.some(t=>t.value===word));const wrap=doc.wrappedWords.find(w=>w.word===word);assert.ok(wrap);assert.equal(wrap.spans.length,2);}
 const issues=await workerSpell(spellingCandidates(doc));assert.deepEqual(issues.map(i=>i.word),['schoolbusz']);
});

test('LCB spelling acceptance remains separate from role and meaning checks',async()=>{
 const word=async value=>(await workerSpell([{word:value,start:0,end:value.length}])).length;
 for(const valid of ['inservice','foregone','judgment','marshal','inclosure'])assert.equal(await word(valid),0,valid);
 for(const bad of ['inservce','foregon','judgemnet','marhsal','inclossure'])assert.equal(await word(bad),1,bad);
 // Plural formation is limited to the named source noun examples.
 for(const unsupported of ['inservices','postsecondaries','bloodbornes'])assert.equal(await word(unsupported),1,unsupported);
});
