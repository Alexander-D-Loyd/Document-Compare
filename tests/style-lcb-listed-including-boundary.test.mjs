import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';
import{lcbListedIncludingBoundaryIssues,LCB_LISTED_INCLUDING_BOUNDARY_SCOPE}from '../app/style-lcb-listed-including-boundary.mjs';
const refs={lcb:JSON.parse(fs.readFileSync(new URL('../app/data/lcb-reference.json',import.meta.url)))};
const make=(t,kind='Bill')=>makeDocument([kind==='Digest'?'LEGISLATIVE COUNSEL’S DIGEST\n'+t+'\nThe people do enact as follows:':'The people do enact as follows:\nline 1 '+t],'Current'),check=d=>lcbListedIncludingBoundaryIssues(d,refs);

test('LCB7 complete listed including phrase supplies its missing initial comma with one head/phrase correction',()=>{
 for(const kind of ['Bill','Digest'])for(const phrase of ['including but not limited to','including, but not limited to','including but not limited to,','including, but not limited to,'])for(const prefix of ['The agency lists','The department provides','The court requires','The board shall list']){
  const d=make(prefix+' items '+phrase+' fees.',kind),saved=JSON.stringify(d),found=check(d);assert.equal(found.length,1,prefix+' '+phrase);const i=found[0];assert.equal(i.text,'items '+phrase);assert.equal(i.suggestion,'items, including, but not limited to,');assert.equal(i.guidePage,7);assert.equal(i.references[0].ruleText,', including, but not limited to,');assert.equal(i.checkId,'lcb-listed-including-boundary');assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(d.text.slice(i.includingBoundaryEvidence.evidenceStart,i.includingBoundaryEvidence.evidenceEnd),i.includingBoundaryEvidence.sourceText);assert.equal(JSON.stringify(d),saved);
 }
 assert.ok(refs.lcb.pages[6].text.includes(', including, but not limited to,'));assert.ok(LCB_LISTED_INCLUDING_BOUNDARY_SCOPE.includes('No general English'));
});

test('compliant boundaries and separate existing internal-comma roles remain quiet',()=>{
 for(const t of ['The agency lists items, including, but not limited to, fees.','The agency lists items, including but not limited to fees.','The list includes but is not limited to fees.','The list includes, but is not limited to, fees.','The lists include but are not limited to fees.','Under existing law the agency acts.','The agency acts under existing law.'])assert.equal(check(make(t)).length,0,t);
});

test('unknown roles sentence/paragraph starts and title or technical contexts do not establish the printed boundary',()=>{
 for(const t of ['Including, but not limited to, fees applies.','including, but not limited to, fees applies.','The agency acts without including, but not limited to, fees.','The agency refers to including, but not limited to, fees.','The phrase is items including, but not limited to, fees.','The agency lists item including, but not limited to, fees.','The agency lists unknown items including, but not limited to, fees.','The agency lists items including, but not limited to, novelword.','The agency lists items including, but not limited to, fees limited only by statute.','The agency lists items including, but not limited to, Fees.','Named agency lists items including, but not limited to, fees.','The Agency lists items including, but not limited to, fees.','The agency lists items including, but not limited to, fees Act.','The agency lists items including, but not limited to, fees/key.','The agency lists items including, but not limited to, fees.2','The xagency lists items including, but not limited to, fees.','The agency lists itemsé including, but not limited to, fees.','The agency lists items including, but not limited to, fees\u0301.','The agency lists items including, but not limited to, feesé.'])assert.equal(check(make(t)).length,0,t);
});

test('full original lead, head, phrase, item and connecting spaces remain necessary',()=>{
 const d=make('The agency lists items including, but not limited to, fees.'),base=check(d)[0];assert.ok(base);
 for(const field of ['struck','excluded'])for(let at=base.evidenceStart;at<base.evidenceEnd;at++){const damaged=structuredClone(d);damaged[field].push({start:at,end:at+1});assert.equal(check(damaged).length,0,field+' '+at);}
 for(const field of ['struck','excluded'])for(const [t,cut]of [['Named agency lists items including, but not limited to, fees.','Named'],['The agency lists items including, but not limited to, fees Act.','Act']]){const d2=make(t),at=d2.text.indexOf(cut);d2[field].push({start:at,end:at+cut.length});assert.equal(check(d2).length,0,field+' '+cut);}
});

test('literal and bill-local quoted phrases protect exact wording and reset on a different bill',()=>{
 const bad='items including, but not limited to, fees';
 for(const marks of [['“','”'],['"','"'],['‘','’'],["'","'"]])assert.equal(check(make('The agency lists '+marks[0]+bad+marks[1]+'.')).length,0);
 assert.equal(check(make('“'+bad+'” means the items. The agency lists '+bad+'.')).length,0);
 assert.equal(check(make('The agency lists '+bad+'.')).length,1);
 for(const field of ['struck','excluded']){const d=make('“The agency lists '+bad+'.”'),at=d.text.indexOf('“');d[field].push({start:at,end:at+1});assert.equal(check(d).length,0);}
});

test('heading table and unknown page evidence stay quiet; known interior heads preserve exact physical spans',()=>{
 const text='The agency lists items including, but not limited to, fees.';
 const heading=makeDocument([text+'\nThe people do enact as follows:\nline 1 Other content.'],'Current');assert.equal(check(heading).length,0);
 const table=make(text);table.blocks.at(-1).formatting={headerGaps:[{},{},{}]};assert.equal(check(table).length,0);
 const d=makeDocument(['The people do enact as follows:\nline 1 The agency lists items including, but','AB 224 — 2 —\nline 1 not limited to, fees.'],'Current'),header=d.blocks.find(b=>b.text==='AB 224 — 2 —');header.formatting={headerParts:[{start:0,end:header.text.length,anchor:'left'}]};const saved=JSON.stringify(d),found=check(d);assert.equal(found.length,1);const i=found[0];assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(i.suggestion,'items, including, but not limited to,');assert.equal(d.text.slice(i.includingBoundaryEvidence.phraseStart,i.includingBoundaryEvidence.phraseEnd),d.text.slice(d.text.indexOf('including'),d.text.indexOf('to, fees')+3));assert.equal(d.text.slice(i.includingBoundaryEvidence.evidenceStart,i.includingBoundaryEvidence.evidenceEnd),i.includingBoundaryEvidence.sourceText);assert.equal(JSON.stringify(d),saved);
 header.runningHead=false;header.layoutLabel=false;header.formatting={};assert.equal(check(d).length,0);
});

test('recognized divided source words preserve complete physical correction and evidence coordinates',()=>{
 for(const text of ['The agency lists it-\nems including, but not limited to, fees.','The agency lists items inclu-\nding, but not limited to, fees.','The agency lists items including, but not lim-\nited to, fees.','The agen-\ncy lists items including, but not limited to, fees.']){
  const d=make(text);assert.ok(d.wrappedWords.length,text);if(text.includes('it-\nems'))assert.equal(check(d).length,0,'unrecognized list-head split remains manual');
  // Controlled reader metadata, not a dictionary claim: the reader has
  // already recognized this complete physically divided source word.
  for(const w of d.wrappedWords)w.recognized=true;
  const saved=JSON.stringify(d),found=check(d);assert.equal(found.length,1,text);const i=found[0],e=i.includingBoundaryEvidence;assert.equal(d.text.slice(i.start,i.end),i.text);assert.equal(i.suggestion,'items, including, but not limited to,');assert.equal(d.text.slice(e.evidenceStart,e.evidenceEnd),e.sourceText);assert.equal(i.evidenceStart,e.evidenceStart);assert.equal(i.evidenceEnd,e.evidenceEnd);assert.equal(d.text.slice(e.itemStart,e.itemEnd),'fees');assert.equal(JSON.stringify(d),saved);
  const part=d.wrappedWords.find(w=>w.recognized).spans.at(-1);d.struck.push({start:part.start,end:part.end});assert.equal(check(d).length,0);
 }
});
