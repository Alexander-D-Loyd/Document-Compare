import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {lcbListedAgencyFormIssues,LCB_LISTED_AGENCY_FORM_SCOPE} from '../app/style-lcb-listed-agency-form.mjs';
const refs={lcb:JSON.parse(fs.readFileSync(new URL('../app/data/lcb-reference.json',import.meta.url)))};
const make=(t,kind='Bill')=>makeDocument([kind==='Digest'?'LEGISLATIVE COUNSEL’S DIGEST\n'+t+'\nThe people do enact as follows:':'The people do enact as follows:\nline 1 '+t],'Current');
const check=d=>lcbListedAgencyFormIssues(d,refs);

test('Cal-OSHA printed form owns complete alias and established program or requirement head',()=>{
 for(const kind of ['Bill','Digest'])for(const v of ['Cal OSHA','CalOSHA','cal osha','calosha','cal-osha'])for(const h of ['program','programs','requirement','requirements']){
  const d=make('The '+v+' '+h+' applies.',kind),saved=JSON.stringify(d),found=check(d);assert.equal(found.length,1,v+' '+h);const i=found[0];
  assert.equal(i.text,v);assert.equal(i.suggestion,'Cal-OSHA');assert.equal(i.guidePage,9);assert.equal(i.checkId,'lcb-listed-agency-form');assert.equal(i.listedNameEvidence.sourcePage,9);assert.equal(i.listedNameEvidence.printedName,'Cal-OSHA');assert.equal(d.text.slice(i.start,i.end),v);assert.equal(d.text.slice(i.listedNameEvidence.start,i.listedNameEvidence.end),v+' '+h);assert.equal(i.references[0].ruleText,'Cal-OSHA');assert.equal(JSON.stringify(d),saved);
 }
 assert.ok(refs.lcb.pages[8].text.includes('Cal-OSHA'));assert.ok(LCB_LISTED_AGENCY_FORM_SCOPE.includes('exact printed'));
});

test('printed agency, unfamiliar agency forms, extended names and technical fragments are protected',()=>{
 for(const text of ['The Cal-OSHA program applies.','The CAL OSHA program applies.','The Cal OSHA applies.','The Cal OSHA staff acts.','The Cal EPA program applies.','The xCalOSHA program applies.','The CalOSHAé program applies.','The CalOSHA\u0301 program applies.','The Cal OSHA programé applies.','The Cal OSHA program\u0301 applies.','The CalOSHA-program applies.','The Cal—OSHA program applies.','The Cal OSHA Program applies.','The Cal OSHA program of Nevada applies.','The Cal OSHA requirements Act applies.','The Nevada Cal OSHA program applies.','The Cal OSHA program Fund applies.','The identifier/CalOSHA program applies.','The CalOSHA program/key applies.','The CalOSHA requirements.2 apply.'])assert.equal(check(make(text)).length,0,text);
});

test('each alias, space and establishing head character requires original source evidence',()=>{
 const d=make('The Cal OSHA requirements apply.'),start=d.text.indexOf('Cal'),end=start+'Cal OSHA requirements'.length;
 for(const field of ['struck','excluded'])for(let at=start;at<end;at++){const damaged=structuredClone(d);damaged[field].push({start:at,end:at+1});assert.equal(check(damaged).length,0,field+' '+at);}
 for(const field of ['struck','excluded'])for(const [t,cut]of [['The Nevada Cal OSHA program applies.','Nevada'],['The Cal OSHA program of Nevada applies.','of Nevada']]){const d2=make(t),at=d2.text.indexOf(cut);d2[field].push({start:at,end:at+cut.length});assert.equal(check(d2).length,0,field+' '+cut);}
});

test('quoted agency variants remain bill-local authority and cannot carry over',()=>{
 for(const marks of [['“','”'],['"','"'],['‘','’'],["'","'"]])assert.equal(check(make('The '+marks[0]+'Cal OSHA'+marks[1]+' program applies.')).length,0);
 assert.equal(check(make('“Cal OSHA” means the program. The cal OSHA requirements apply.')).length,0);
 assert.equal(check(make('The cal OSHA requirements apply.')).length,1);
 for(const field of ['struck','excluded']){const d=make('The “Cal OSHA” program applies.'),at=d.text.indexOf('“');d[field].push({start:at,end:at+1});assert.equal(check(d).length,0);}
});

test('headings and tables are quiet; known page-head bridges preserve original alias and head spans',()=>{
 const heading=makeDocument(['Cal OSHA program\nThe people do enact as follows:\nline 1 Other text.'],'Current');assert.equal(check(heading).length,0);
 const table=make('The Cal OSHA requirements apply.');table.blocks.at(-1).formatting={headerGaps:[{},{},{}]};assert.equal(check(table).length,0);
 for(const pages of [['The people do enact as follows:\nline 1 The Cal','AB 224 — 2 —\nline 1 OSHA program applies.'],['The people do enact as follows:\nline 1 The Cal OSHA','AB 224 — 2 —\nline 1 requirements apply.']]){
  const d=makeDocument(pages,'Current'),header=d.blocks.find(b=>b.text==='AB 224 — 2 —');header.formatting={headerParts:[{start:0,end:header.text.length,anchor:'left'}]};const saved=JSON.stringify(d),found=check(d);assert.equal(found.length,1);const i=found[0];assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(d.text.slice(i.listedNameEvidence.start,i.listedNameEvidence.end),i.listedNameEvidence.sourceText);assert.equal(JSON.stringify(d),saved);
  header.runningHead=false;header.layoutLabel=false;header.formatting={};assert.equal(check(d).length,0);
 }
});
