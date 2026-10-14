import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {lcbListedPunctuationNameIssues} from '../app/style-lcb-listed-punctuation-names.mjs';
const refs={lcb:JSON.parse(fs.readFileSync(new URL('../app/data/lcb-reference.json',import.meta.url)))};
const name='County Employees Retirement Law of 1937',variant='County Employees’ Retirement Law of 1937';
const make=(t,kind='Bill')=>makeDocument([kind==='Digest'?'LEGISLATIVE COUNSEL’S DIGEST\n'+t+'\nThe people do enact as follows:':'The people do enact as follows:\nline 1 '+t],'Current');
const check=d=>lcbListedPunctuationNameIssues(d,refs).filter(i=>i.listedNameEvidence.printedName===name);

test('complete LCB7 County law selects only printed case or apostrophe differences',()=>{
 for(const kind of ['Bill','Digest'])for(const v of [variant,variant.replace('’',"'"),variant.toLowerCase(),name.toLowerCase()]){
  const d=make('The '+v+' applies.',kind),saved=JSON.stringify(d),found=check(d),words=v.split(' '),preferred=name.split(' ');
  assert.deepEqual(found.map(i=>i.suggestion),preferred.filter((w,n)=>words[n]!==w));assert.ok(found.length);
  for(const i of found){assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(i.guidePage,7);assert.equal(i.listedNameEvidence.sourceText,v);assert.equal(i.listedNameEvidence.printedName,name);assert.equal(i.listedNameEvidence.sourcePage,7);assert.equal(i.references[0].ruleText,name);}
  assert.equal(JSON.stringify(d),saved);
 }
 assert.ok(refs.lcb.pages[6].text.replace(/\s+/gu,' ').includes(name));
 assert.ok(refs.lcb.pages[17].text.replace(/\s+/gu,' ').includes(name));
});

test('complete printed name is quiet and different years or word identities are protected',()=>{
 for(const v of [name,name.toUpperCase(),'County Employees’ Retirement Law','County Employees’ Retirement Law of 1938','County Employee’s Retirement Law of 1937','County Employees’ Pension Law of 1937','County Employees’s Retirement Law of 1937','County Employees’ Retirement Laws of 1937','County Employees’ Retirement Law of 1937é','County Employees’ Retirement Law of 1937\u0301','xCounty Employees’ Retirement Law of 1937','County Employees’ Retirement Law of 1937.2','County Employees’ Retirement Law of 1937-1938','identifier/County Employees’ Retirement Law of 1937','County Employees’ Retirement Law of 1937/key'])assert.equal(check(make('The '+v+' applies.')).length,0,v);
});

test('unknown longer law titles and removed name extensions cannot manufacture a listed name',()=>{
 for(const v of ['Nevada '+variant,variant+' Amendments',variant+' Fund',variant+' of Nevada','California County Employees’ Retirement Law of 1937 Board'])assert.equal(check(make('The '+v+' applies.')).length,0,v);
 for(const field of ['struck','excluded'])for(const [t,cut]of [['The Nevada '+variant+' applies.','Nevada'],['The '+variant+' Fund applies.','Fund']]){
  const d=make(t),at=d.text.indexOf(cut);d[field].push({start:at,end:at+cut.length});assert.equal(check(d).length,0,field+' '+cut);
 }
});

test('every law-name character and complete year qualifier remains required evidence',()=>{
 const d=make('The '+variant+' applies.'),start=d.text.indexOf('County'),end=start+variant.length;
 for(const field of ['struck','excluded'])for(let at=start;at<end;at++){const damaged=structuredClone(d);damaged[field].push({start:at,end:at+1});assert.equal(check(damaged).length,0,field+' '+at);}
 const d2=make('The '+variant+' applies.'),at=d2.text.indexOf('of 1937');d2.struck.push({start:at,end:at+7});assert.equal(check(d2).length,0);
});

test('quoted Bill-local County law forms retain exact punctuation and reset with each bill',()=>{
 for(const marks of [['“','”'],['"','"'],['‘','’'],["'","'"]])assert.equal(check(make('The '+marks[0]+variant+marks[1]+' applies.')).length,0);
 for(const marks of [['‘','’'],["'","'"]])assert.equal(check(make('The displayed text is '+marks[0]+'the '+variant+' applies'+marks[1]+'.')).length,0);
 assert.equal(check(make('“'+variant+'” means the law. The '+variant+' applies.')).length,0);
 for(const marks of [['‘','’'],["'","'"]]){assert.equal(check(make(marks[0]+variant+marks[1]+' means the law. The '+variant+' applies.')).length,0);assert.equal(check(make(marks[0]+variant+marks[1]+' means the law. The '+variant[0].toLowerCase()+variant.slice(1)+' applies.')).length,0);assert.equal(check(make(marks[0]+variant+marks[1]+' means the law. The '+variant.replace('Retirement','retirement')+' applies.')).length,2);}
 assert.ok(check(make('The '+variant+' applies.')).length);
 for(const field of ['struck','excluded']){const d=make('The “'+variant+'” applies.'),at=d.text.indexOf('“');d[field].push({start:at,end:at+1});assert.equal(check(d).length,0);}
});

test('headings tables and technical identifiers are quiet while reader-known page heads preserve physical words',()=>{
 const h=makeDocument([variant+'\nThe people do enact as follows:\nline 1 Other text.'],'Current');assert.equal(check(h).length,0);
 const t=make('The '+variant+' applies.');t.blocks.at(-1).formatting={headerGaps:[{},{},{}]};assert.equal(check(t).length,0);
 const d=makeDocument(['The people do enact as follows:\nline 1 The County Employees’ Retirement','AB 224 — 2 —\nline 1 Law of 1937 applies.'],'Current'),header=d.blocks.find(b=>b.text==='AB 224 — 2 —');header.formatting={headerParts:[{start:0,end:header.text.length,anchor:'left'}]};
 const saved=JSON.stringify(d),found=check(d);assert.deepEqual(found.map(i=>[i.text,i.suggestion]),[['Employees’','Employees']]);assert.equal(d.text.slice(found[0].listedNameEvidence.start,found[0].listedNameEvidence.end),found[0].listedNameEvidence.sourceText);assert.equal(JSON.stringify(d),saved);
 header.runningHead=false;header.layoutLabel=false;header.formatting={};assert.equal(check(d).length,0);
});
