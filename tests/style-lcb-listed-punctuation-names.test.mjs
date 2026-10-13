import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {lcbListedPunctuationNameIssues} from '../app/style-lcb-listed-punctuation-names.mjs';
import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=(text,context='Bill')=>makeDocument([context==='Digest'?'LEGISLATIVE COUNSEL’S DIGEST\n'+text+'\nThe people do enact as follows:':'The people do enact as follows:\nline 1 '+text],'Current');
const check=d=>lcbListedPunctuationNameIssues(d,refs),names=['Public Employees’ Retirement System','State Teachers’ Retirement System'];

test('LCB7 exact source word tokens restore selected case and possessive punctuation only',()=>{
 for(const context of ['Bill','Digest'])for(const name of names){
  const variants=[name.toLowerCase().replace('’',''),name.replace('’',''),name.toLowerCase()];
  for(const variant of variants){const d=make('The '+variant+' acts.',context),saved=JSON.stringify(d),found=check(d);assert.ok(found.length);const wanted=name.split(' '),words=variant.split(' ');assert.deepEqual(found.map(i=>i.suggestion),wanted.filter((w,n)=>words[n]!==w));
   for(const i of found){assert.equal(i.checkId,'lcb-listed-punctuation-name');assert.equal(i.guidePage,7);assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(i.listedNameEvidence.printedName,name);assert.equal(i.listedNameEvidence.sourceText,variant);assert.equal(i.references[0].ruleText,name);assert.ok(refs.lcb.pages[6].text.replace(/\s+/gu,' ').includes(name));}
   assert.equal(JSON.stringify(d),saved);
  }
 }
});

test('the printed and straight-apostrophe equivalents are quiet and unknown word identities stay manual',()=>{
 for(const name of names)for(const variant of [name,name.replace('’',"'"),name.toUpperCase()])assert.equal(check(make('The '+variant+' acts.')).length,0,variant);
 for(const variant of ['Public Employee Retirement System','Public Employees’s Retirement System','State Teacher Retirement System','State Teachers’s Retirement System','Public Employee Pension System','State Teachers Retirement Scheme','xPublic Employees Retirement System','Public Employees Retirement Systemé','State Teachers Retirement System-identifier'])assert.equal(check(make('The '+variant+' acts.')).length,0,variant);
});

test('complete longer titles and non-California name prefixes remain protected',()=>{
 for(const variant of ['Public Employees Retirement System Authority','Public Employees Retirement System Fund','State Teachers Retirement System of Nevada','State Teachers Retirement System Trust','Nevada Public Employees Retirement System','New York State Teachers Retirement System'])assert.equal(check(make('The '+variant+' acts.')).length,0,variant);
 assert.ok(check(make('The California public employees retirement system acts.')).length);
 for(const field of ['struck','excluded'])for(const [text,word]of [['The Nevada public employees retirement system acts.','Nevada'],['The public employees retirement system Authority acts.','Authority']]){const d=make(text),at=d.text.indexOf(word);d[field].push({start:at,end:at+word.length});assert.equal(check(d).length,0,field+' '+word);}
});

test('literal or bill-local quoted spellings are respected and cannot authorize a later bill',()=>{
 const variant='public employees retirement system';
 for(const quote of [['“','”'],['"','"']])assert.equal(check(make('The '+quote[0]+variant+quote[1]+' acts.')).length,0);
 assert.equal(check(make('“'+variant+'” means the system. The '+variant+' acts.')).length,0);
 assert.ok(check(make('The '+variant+' acts.')).length);
});

test('every establishing source character remains necessary including connecting spaces',()=>{
 const d=make('The public employees retirement system acts.'),start=d.text.indexOf('public'),end=start+'public employees retirement system'.length;assert.equal(check(d).length,4);
 for(const field of ['struck','excluded'])for(let at=start;at<end;at++){const bad=structuredClone(d);bad[field].push({start:at,end:at+1});assert.equal(check(bad).length,0,field+' '+at);}
 const combining=make('The public employees retirement systemé acts.');assert.equal(check(combining).length,0);
});

test('heading table and known versus unknown page bridges preserve exact word selections',()=>{
 const heading=makeDocument(['public employees retirement system\nThe people do enact as follows:\nline 1 Other content applies.'],'Current');assert.equal(check(heading).length,0);
 const table=make('The public employees retirement system acts.');table.blocks.at(-1).formatting={headerGaps:[{},{},{}]};assert.equal(check(table).length,0);
 const d=makeDocument(['The people do enact as follows:\nline 1 The public employees','AB 192 — 2 —\nline 1 retirement system acts.'],'Current'),head=d.blocks.find(b=>b.text==='AB 192 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};const saved=JSON.stringify(d),found=check(d);assert.deepEqual(found.map(i=>[d.text.slice(i.start,i.end),i.suggestion]),[['public','Public'],['employees','Employees’'],['retirement','Retirement'],['system','System']]);assert.equal(JSON.stringify(d),saved);
 head.runningHead=false;head.layoutLabel=false;head.formatting={};assert.equal(check(d).length,0);
});

test('integrated production preserves printed-name ownership and exact physical source evidence',()=>{
 const cases=[make('The public employees retirement system acts.'),make('The Public Employees Retirement System acts.'),make('The state teachers retirement system acts.','Digest'),makeDocument(['The people do enact as follows:\nline 1 The Public Employees','AB 192 — 2 —\nline 1 Retirement System acts.'],'Current')];
 for(const d of cases){const h=d.blocks.find(b=>b.text==='AB 192 — 2 —');if(h)h.formatting={headerParts:[{start:0,end:h.text.length,anchor:'left'}]};const saved=JSON.stringify(d),direct=check(d),joint=jointStylisticIssues(d,refs,{includeReviewSuggestions:true}).filter(i=>i.checkId==='lcb-listed-punctuation-name');assert.deepEqual(joint.map(i=>[i.start,i.end,i.suggestion]),direct.map(i=>[i.start,i.end,i.suggestion]));assert.ok(joint.length);
  for(const i of joint){assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(d.text.slice(i.listedNameEvidence.start,i.listedNameEvidence.end),i.listedNameEvidence.sourceText);assert.ok(i.references[0].sourcePassage.text.includes(i.listedNameEvidence.printedName));}assert.equal(JSON.stringify(d),saved);
 }
 for(const name of names){const d=make('The '+name+' acts.');assert.equal(jointStylisticIssues(d,refs,{includeReviewSuggestions:true}).filter(i=>i.checkId==='lcb-listed-punctuation-name').length,0);}
});
