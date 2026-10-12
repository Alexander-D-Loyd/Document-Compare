import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {makeDocument} from '../app/core.mjs';
import {compareTokenValues} from '../app/text-diff.mjs';
import {parseAmendments,amendmentDisplays,verifyAmendments,nonAmendmentEdits} from '../app/amendments.mjs';
import {ocrDictionary,repairOcrSpacing,isOcrStyle} from '../app/ocr-text.mjs';
import {scannedEndMarker} from '../app/amendment-end-marker.mjs';
const Typo=createRequire(import.meta.url)('../app/vendor/typo.js');
const dic=fs.readFileSync(new URL('../app/vendor/en_US/index.dic',import.meta.url),'utf8'),aff=fs.readFileSync(new URL('../app/vendor/en_US/index.aff',import.meta.url),'utf8');
const words=ocrDictionary(dic,new Typo('en_US',aff,dic).dictionaryTable.keys());
test('AB 1502 OCR joins repair with inflected words protected and ambiguity preserved',()=>{
 assert.equal(repairOcrSpacing('propertraining humanesociety personassisting biologicaltests infertility proposedbyboththis becomeoperativeif ofthis',words),'proper training humane society person assisting biological tests infertility proposed by both this become operative if of this');
 assert.equal(repairOcrSpacing('therein',new Set(['the','rein','there','in'])),'therein');
 assert.ok(isOcrStyle({fontFamily:'monospace',ascent:1,descent:-.00048828125}));
 assert.ok(!isOcrStyle({fontFamily:'monospace',ascent:.8,descent:-.2}));
});
test('standalone donut ends parsing and display, without truncating inline or quoted payload',()=>{
 const text='Amendment1\nOn page 1, betweenlines 1 and 2, insert:\nnew words\n- 0 -\nAttachment\nAmendment2\nOn page 1, in line 1, insert:\nwrong attachment';
 assert.equal(parseAmendments(text).length,1);
 assert.equal(parseAmendments(text)[0].insertText,'new words');
 assert.equal(amendmentDisplays(makeDocument([text],'amends'))[0].payload.text,'new words');
 const previous=makeDocument(['line 1 First.\nline 2 Last.'],'previous'),current=makeDocument(['line 1 First.\nline 2 new words\nline 3 Last.'],'current');
 assert.equal(verifyAmendments(text,previous,current)[0].status,'implemented');
 for(const body of ['Use - 0 - as a symbol.','“- 0 -”'])assert.equal(parseAmendments('Amendment1\nOn page 1, after “First” insert:\n'+body)[0].insertText,body);
});
test('history rows compare as complete rows in ordinary and amendment-aware comparisons',()=>{
 const rows='AMENDED IN SENATE JULY 1, 2025\nAMENDED IN SENATE JUNE 25, 2025\ncalifornia legislature—2025–26 regular session\nASSEMBLY BILL No. 1502\nline 1 First sentence.\nline 2 Last sentence.';
 const previous=makeDocument([rows],'previous'),current=makeDocument(['AMENDED IN SENATE SEPTEMBER 3, 2025\n'+rows],'current');
 const changes=compareTokenValues(previous.tokens.map(t=>t.value),current.tokens.map(t=>t.value));
 assert.equal(changes.filter(c=>c.added).length,1);assert.equal(changes.find(c=>c.added).count,1);assert.ok(changes.find(c=>c.added).history);
 const {ranges}=nonAmendmentEdits('',previous,current,[]);
 assert.equal(ranges[0].length,0);assert.equal(ranges[1].length,1);
 assert.equal(current.text.slice(ranges[1][0].start,ranges[1][0].end),'AMENDED IN SENATE SEPTEMBER 3, 2025');
 const multiple=makeDocument(['AMENDED IN SENATE SEPTEMBER 3, 2025\nAMENDED IN SENATE AUGUST 4, 2025\n'+rows],'current');
 const extra=nonAmendmentEdits('',previous,multiple,[]).ranges[1];assert.equal(new Set(extra.map(r=>r.group)).size,2);
 assert.equal(makeDocument(['line 1 AMENDED IN SENATE JULY 1, 2025'],'body').tokens[0].value,'AMENDED');
});
test('scanned donut requires a ring and two dashes on an otherwise empty row',()=>{
 const width=400,height=300,data=new Uint8ClampedArray(width*height*4).fill(255),black=(x,y)=>{const i=(y*width+x)*4;data[i]=data[i+1]=data[i+2]=0;};
 for(let y=120;y<=130;y++)for(let x=198;x<=204;x++)if(x===198||x===204||y===120||y===130)black(x,y);
 for(let x=190;x<=194;x++)black(x,125);for(let x=208;x<=212;x++)black(x,125);
 assert.ok(scannedEndMarker({data,width,height}));
 for(let y=120;y<=130;y++)for(let x=70;x<=90;x++)black(x,y);
 assert.equal(scannedEndMarker({data,width,height}),null);
});
