import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument,spellingCandidates}from '../app/core.mjs';
import {statuteChapterSpellingRanges}from '../app/spelling-statute-chapters.mjs';
import {workerSpell}from './helpers/spelling-worker.mjs';
const doc=text=>makeDocument([text],'Current'),check=text=>statuteChapterSpellingRanges(doc(text));
test('chapter abbreviation acceptance is backed by the supplied GPO publication-parts rule',()=>{
 const guide=JSON.parse(fs.readFileSync(new URL('../app/data/gpo-reference.json',import.meta.url))),page=guide.pages[244];assert.equal(page.printedPage,'231');assert.ok(page.text.includes('9.38.'));assert.ok(page.text.includes('ch., chs. (chapter, chapters)'));assert.ok(page.text.includes('parentheses, brackets'));
});
test('complete statute citations accept chapter abbreviations while unrelated spelling stays active',async()=>{
 for(const text of ['Budget Act of 2024 (Chs. 22, 35, and 994, Stats. 2024).','The citation [chs. 22 through 35, Statutes 2024] applies.','The act (Ch. 22, Stats. 2024) applies.']){
  const d=doc(text),saved=JSON.stringify(d),ranges=statuteChapterSpellingRanges(d);assert.equal(ranges.length,1,text);assert.equal(d.text.slice(ranges[0].start,ranges[0].end),ranges[0].abbreviation);assert.equal(JSON.stringify(d),saved);assert.ok(!(await workerSpell(spellingCandidates(d))).some(i=>/^(?:Chs|chs|Ch|ch)$/.test(i.word)));
 }
 const errors=await workerSpell(spellingCandidates(doc('The act (Chs. 22, 35, and 994, Stats. 2024) contains mispelled text and bare Chs.')));assert.ok(errors.some(i=>i.word==='mispelled'));assert.ok(errors.some(i=>i.word==='Chs'));
});
test('bare malformed mixed-case or incomplete citations cannot supply spelling acceptance',()=>{
 for(const text of ['Chs. 22, Stats. 2024','(Chs 22, Stats. 2024)','(cHs. 22, Stats. 2024)','(Chs. claimant)','(Chs. 22)','(Chs. 22, Stats. 2024]','(Chs. 22x, Stats. 2024)','(Chs. 22, Stats. 2024x)','(Chs. 22, Stats. 2024','(Chs. 22, Stats. 2024 5)'])assert.equal(check(text).length,0,text);
});
test('whole source citation evidence protects strikes and unknown exclusions',()=>{
 const text='The act (Chs. 22, 35, and 994, Stats. 2024) applies.';
 for(const part of ['Chs.','22','and','Stats.','2024',' '])for(const field of ['struck','excluded']){
  const d=doc(text),start=part===' '?d.text.indexOf(' ',d.text.indexOf('Chs.')):d.text.indexOf(part);d[field].push({start,end:start+part.length});assert.equal(statuteChapterSpellingRanges(d).length,0,field+' '+part);
 }
 const d=makeDocument(['The act (Chs.','unknown marker','22, Stats. 2024) applies.'],'Current'),b=d.blocks[1];b.ignored=true;d.excluded.push({start:b.start,end:b.end});assert.equal(statuteChapterSpellingRanges(d).length,0);
});
test('printed margins and identified page heads retain complete citation offsets',()=>{
 const d=makeDocument(['line 46 The act (Chs.','SB 100 — 2 —\nline 1 22, 35, and 994, Stats. 2024) applies.'],'Current'),head=d.blocks.find(b=>b.text==='SB 100 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};
 const ranges=statuteChapterSpellingRanges(d);assert.equal(ranges.length,1);assert.equal(d.text.slice(ranges[0].start,ranges[0].end),'Chs.');assert.ok(d.text.slice(ranges[0].evidenceStart,ranges[0].evidenceEnd).includes('SB 100'));
 head.runningHead=false;head.formatting={};assert.equal(statuteChapterSpellingRanges(d).length,0);
});
