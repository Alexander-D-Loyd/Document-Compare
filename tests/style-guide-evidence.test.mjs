import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {guidePassage,attachGuideEvidence} from '../app/style-guide-evidence.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
test('LCB restarted item numbers select the actual Bill provision, not the general or Digest provision',()=>{
 const passage=guidePassage(refs.lcb,{guideId:'lcb',guidePage:21,rule:'Numerals: Bill, item 3'});
 assert.equal(passage.kind,'Source provision');assert.match(passage.text,/different numerical expressions/);assert.equal(refs.lcb.pages[20].text.slice(passage.start,passage.end).replace(/\s+/gu,' ').trim(),passage.text);
});
test('printed lexical examples retain their role annotation and exact spelling',()=>{
 const passage=guidePassage(refs.lcb,{guideId:'lcb',guidePage:10,rule:'Hyphenation examples',preferred:'data-processing'});
 assert.equal(passage.kind,'Printed source example');assert.match(passage.text,/data-processing.*u\.m\./u);
});
test('LCB numeral citations show the relevant printed section and original source bounds',()=>{
 for(const [page,rule,heading,unrelated] of [[23,'Numerals: Percent','PERCENT','MONEY'],[23,'Numerals: Measures','MEASURES','PERCENT'],[22,'Numerals: Code Sections and Constitution','CODE SECTIONS AND CONSTITUTION','CORRELATIVES/SPREADS']]){
  const passage=guidePassage(refs.lcb,{guideId:'lcb',guidePage:page,rule});assert.equal(passage.kind,'Printed source examples');assert.ok(passage.text.startsWith(heading));assert.ok(!passage.text.includes(unrelated));assert.equal(refs.lcb.pages[page-1].text.slice(passage.start,passage.end).replace(/\s+/gu,' ').trim(),passage.text);
 }
});
test('printed retirement names preserve the full actual source example beside word-only corrections',()=>{
 for(const name of ['Public Employees’ Retirement System','State Teachers’ Retirement System']){
  const passage=guidePassage(refs.lcb,{guideId:'lcb',guidePage:7,rule:'Punctuation: Printed named forms',preferred:'Employees’',ruleText:name});assert.equal(passage.kind,'Printed source example');assert.equal(passage.text,name);assert.equal(refs.lcb.pages[6].text.slice(passage.start,passage.end).replace(/\s+/gu,' ').trim(),name);
 }
});
test('GPO source provision is read beyond a short page snippet and stops before the next provision',()=>{
 const passage=guidePassage(refs.gpo,{guideId:'gpo',guidePage:115,rule:'6.16'});
 assert.equal(passage.kind,'Source provision');assert.match(passage.text,/Restraint/u);assert.doesNotMatch(passage.text,/6\.17\./u);
});
test('unresolved example citations honestly expose the source page rather than fabricating a passage',()=>{
 const citation={guideId:'lcb',guidePage:8,rule:'Hyphenation examples',preferred:'unlisted-form',ruleText:'Invented paraphrase'};
 const passage=guidePassage(refs.lcb,citation);assert.match(passage.kind,/Source page/u);assert.equal(passage.text,refs.lcb.pages[7].text.replace(/\s+/gu,' ').trim());
 assert.equal(guidePassage(refs.lcb,{...citation,guidePage:999}),null);
 const issue={start:0,end:5,text:'words',suggestion:null,references:[citation]},copy=JSON.stringify(issue),result=attachGuideEvidence(issue,refs);
 assert.match(result.reviewTask,/no replacement/u);assert.notEqual(result.references[0].sourcePassage.text,citation.ruleText);assert.equal(JSON.stringify(issue),copy);
});

test('validated detector witnesses preserve exact source examples without trusting a finding label',()=>{
 for(const [page,text]of [[7,'April 1, 2001,'],[3,'any time (n.)'],[3,'anytime (adv.)']]){
  const source=refs.lcb.pages[page-1].text,start=source.indexOf(text);assert.ok(start>=0);const citation={guideId:'lcb',guidePage:page,rule:'Bounded printed example',preferred:'anytime',sourcePassage:{start,end:start+text.length,text,kind:'Unverified supplied label'}};
  const saved=JSON.stringify(citation),found=guidePassage(refs.lcb,citation);assert.equal(found.text,text);assert.equal(found.kind,'Printed source passage');assert.equal(found.page,page);assert.equal(source.slice(found.start,found.end),text);assert.equal(JSON.stringify(citation),saved);
  const attached=attachGuideEvidence({text:'any-time',suggestion:'anytime',references:[citation]},refs);assert.deepEqual(attached.references[0].sourcePassage,found);
 }
});

test('invalid source bounds text or page cannot replace the established source fallback',()=>{
 const citation={guideId:'lcb',guidePage:7,rule:'Bounded printed example',preferred:'unlisted-form'},text='April 1, 2001,',start=refs.lcb.pages[6].text.indexOf(text),good={start,end:start+text.length,text};
 const expected=guidePassage(refs.lcb,citation);
 for(const sourcePassage of [{...good,start:String(start)},{...good,end:Infinity},{...good,start:-1},{...good,end:good.start},{...good,end:refs.lcb.pages[6].text.length+1},{...good,text:'Invented requirement'},{...good,page:3},{...good,text:''},{...good,text:' '}])assert.deepEqual(guidePassage(refs.lcb,{...citation,sourcePassage}),expected);
});

test('an identified numbered provision retains its conditions ahead of a supplied example fragment',()=>{
 const source=refs.lcb.pages[20].text,text='Bill',start=source.indexOf(text),citation={guideId:'lcb',guidePage:21,rule:'Numerals: Bill, item 3',sourcePassage:{start,end:start+text.length,text}};
 const found=guidePassage(refs.lcb,citation);assert.equal(found.kind,'Source provision');assert.match(found.text,/different numerical expressions/u);
});
