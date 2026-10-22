import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';
import {eraReferenceRanges,gpoEraReferenceIssues} from '../app/style-gpo-era-references.mjs';
import {attachGuideEvidence} from '../app/style-guide-evidence.mjs';
import {reviewStyleIssues} from '../app/style-review.mjs';
import {CALIFORNIA_CODES} from '../app/data/california-codes.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=text=>makeDocument(Array.isArray(text)?text:[text],'Current');
const check=text=>gpoEraReferenceIssues(typeof text==='string'?make(text):text,refs);
const review=doc=>reviewStyleIssues(typeof doc==='string'?make(doc):doc,refs,{includeReviewSuggestions:true,includeCompleteLcbReview:true});
const own=doc=>review(doc).filter(i=>i.checkId==='gpo-era-references');
const examples=[['A.D. 937','937 A.D.','A.D. 937'],['254 B.C.','B.C. 254','254 B.C.'],['120 C.E.','C.E. 120','120 C.E.'],['120 B.C.E.','B.C.E. 120','120 B.C.E.']];

test('all four printed era markers recognize complete year pairs; only inverted positions receive an exact source-backed comparison',()=>{
 for(const [valid,inverted,wanted] of examples){
  for(const phrase of [valid,inverted]){
   const doc=make('The event occurred in '+phrase+'.'),before=JSON.stringify(doc),ranges=eraReferenceRanges(doc);assert.equal(ranges.length,1,phrase);
   const [r]=ranges;assert.equal(doc.text.slice(r.start,r.end),phrase);assert.equal(doc.text.slice(r.markerStart,r.markerEnd),r.marker);assert.equal(doc.text.slice(r.yearStart,r.yearEnd),r.year);
   const found=check(doc);assert.equal(found.length,Number(phrase===inverted),phrase);
   if(found.length){const [i]=found;assert.equal(i.text,phrase);assert.equal(i.suggestion,wanted);assert.equal(i.text,doc.text.slice(i.start,i.end));assert.equal(i.evidenceStart,i.start);assert.equal(i.evidenceEnd,i.end);const cite=attachGuideEvidence(i,refs).references[0],p=refs.gpo.pages.find(p=>p.page===289);assert.equal(cite.guidePrintedPage,'275');assert.equal(cite.rule,'12.9(c)');assert.equal(p.text.slice(cite.sourcePassage.start,cite.sourcePassage.end),cite.sourcePassage.text);assert.match(cite.sourcePassage.text,/C\.E\. and B\.C\.E\. follow the year/u);}
   assert.equal(JSON.stringify(doc),before);
  }
 }
 for(const year of ['1','0','01','999999999999999999999999999999'])assert.equal(check('The event occurred in B.C. '+year+'.')[0]?.suggestion,year+' B.C.','digits are preserved, not interpreted');
});

test('unknown aliases standalone markers malformed quantities and ambiguous pairs do not establish an era role',()=>{
 for(const text of [
  'Use BC 120 and AD 937.', 'Use b.c. 120 and a.d. 937.', 'The marker is B.C..', 'The marker is C.E..',
  'Use B. C. 120.', 'Use B.C.120.', 'Use B.C. 120th.', 'Use B.C. 120.5.', 'Use B.C. 1,200.',
  'Use B.C. -120.', 'Use B.C. +120.', 'Use B.C. 120-130.', 'Use B.C. 120 / 5.',
  'Use -120 B.C..', 'Use minus 120 B.C..', 'Use 1 / 120 B.C..', 'Use 120 B.C. 110.',
  'Use A.D. 937 B.C..', 'Use 120 A.D. 937.', 'Use 120 B.C.E. 110.'
 ]){
  const doc=make(text);assert.equal(eraReferenceRanges(doc).length,0,text);assert.equal(check(doc).length,0,text);
 }
});

test('explicit statutory code contexts retain their own exact-list validation',()=>{
 for(const text of ['Cite California B.C. 120.','Cite Cal. B.C. 120.','Cite Section B.C. 120.','Cite Section 8 of B.C. 120.','Cite Section 8 of the B.C. 120.','Cite Civil Code (B.C. 120).','Cite B.C. 120 § 8.']){
  const doc=make(text);assert.equal(eraReferenceRanges(doc).length,0,text);assert.equal(check(doc).length,0,text);
 }
 for(const {name} of CALIFORNIA_CODES)for(const qualifier of ['of the '+name,'of '+name,'of the California '+name]){
  const text='Cite B.C. 120 '+qualifier+'.',doc=make(text);assert.equal(eraReferenceRanges(doc).length,0,text);assert.equal(check(doc).length,0,text);
 }
 for(const text of ['Cite B.C. 120 of the Civil Code.','See B.C. 120 of Code of Civil Procedure.']){
  const found=review(text);assert.ok(found.some(i=>i.checkId==='california-codes-shorthand'&&i.text==='B.C.'&&i.suggestion===null),text+' retains unknown code review');assert.ok(!found.some(i=>i.checkId==='gpo-era-references'),text+' has no era edit');
 }
 for(const channel of ['struck','excluded']){
  const doc=make('Cite B.C. 120 of the Civil Code.'),at=doc.text.indexOf('Civil');doc[channel].push({start:at,end:at+5});assert.equal(eraReferenceRanges(doc).length,0,channel+' source code title is negative evidence');assert.equal(check(doc).length,0);
 }
 assert.equal(check('The event occurred in B.C. 120 of the reconstruction period.')[0]?.suggestion,'120 B.C.','an arbitrary English phrase does not become a code title');
});

test('every marker period year digit and separator requires complete original evidence in both removal channels',()=>{
 for(const [,phrase] of examples){
  const doc=make('The event occurred in '+phrase+'.'),[r]=eraReferenceRanges(doc);assert.ok(r,phrase);
  for(const channel of ['struck','excluded'])for(let at=r.start;at<r.end;at++){
   const changed=structuredClone(doc);changed[channel].push({start:at,end:at+1});assert.equal(eraReferenceRanges(changed).length,0,channel+' '+phrase+' '+at);assert.equal(check(changed).length,0,channel+' '+phrase+' '+at);
  }
 }
 for(const channel of ['struck','excluded']){
  const doc=make('The event occurred in B.C. former 120.'),start=doc.text.indexOf('former');doc[channel].push({start,end:start+6});assert.equal(eraReferenceRanges(doc).length,0,channel+' cannot create whitespace evidence');
 }
});

test('original Unicode technical and sign boundaries cannot expose a shorter era/year pair',()=>{
 for(const prefix of ['X','é','𐐀','_','/','#','@','-','\u0301'])for(const phrase of ['B.C. 120','120 A.D.']){
  const text='Use '+prefix+phrase+'.',doc=make(text);assert.equal(eraReferenceRanges(doc).length,0,text);
  for(const channel of ['struck','excluded']){const changed=structuredClone(doc);changed[channel].push({start:4,end:4+prefix.length});assert.equal(eraReferenceRanges(changed).length,0,text+' '+channel);}
 }
 for(const suffix of ['X','é','𐐀','_','/id','#1','@x','-code','\u0301'])for(const phrase of ['B.C. 120','120 A.D.']){
  const text='Use '+phrase+suffix+'.',doc=make(text);assert.equal(eraReferenceRanges(doc).length,0,text);
  for(const channel of ['struck','excluded']){const changed=structuredClone(doc),start=4+phrase.length;changed[channel].push({start,end:start+suffix.length});assert.equal(eraReferenceRanges(changed).length,0,text+' '+channel);}
 }
});

test('literal table heading and created-title eras have identity without authorizing prose edits',()=>{
 for(const [open,close] of [['“','”'],['"','"'],['‘','’'],["'","'"]]){
  const text='The phrase '+open+'B.C. 120'+close+' is printed.',doc=make(text);assert.equal(eraReferenceRanges(doc).length,1,text);assert.equal(check(doc).length,0,text);
  for(const channel of ['struck','excluded'])for(const at of [text.indexOf(open),text.lastIndexOf(close)]){const changed=structuredClone(doc);changed[channel].push({start:at,end:at+1});assert.equal(check(changed).length,0,channel+' quote '+at);}
 }
 assert.equal(check('“B.C. 120” is the form. The event occurred in B.C. 120.').length,0);
 const table=make('The event occurred in B.C. 120.');table.blocks[0].formatting={headerGaps:[{},{}]};assert.equal(eraReferenceRanges(table).length,1);assert.equal(check(table).length,0);
 assert.equal(check(make('B.C. 120\nThe people do enact as follows:')).length,0);
 for(const text of ['The B.C. 120 Program applies.','The B.C. 120 West Foundation is hereby established.']){const doc=make(text);assert.equal(check(doc).length,0,text);const at=text.indexOf('120')+3;for(const channel of ['struck','excluded']){const changed=structuredClone(doc);changed[channel].push({start:at,end:text.length-1});assert.equal(check(changed).length,0,text+' '+channel);}}
});

test('source authority is exact and physical line/page bridges retain original selections',()=>{
 const doc=make('The event occurred in B.C. 120.');assert.equal(gpoEraReferenceIssues(doc,{}).length,0);
 const altered=structuredClone(refs);altered.gpo.pages.find(p=>p.page===289).text=altered.gpo.pages.find(p=>p.page===289).text.replace('A.D. precedes','A.D. follows');assert.equal(gpoEraReferenceIssues(doc,altered).length,0);
 const physical=make(['The people do enact as follows:\nline 1 The event occurred in B.C.','AB 999 — 2 —\nline 1 120.']),head=physical.blocks.find(b=>b.text==='AB 999 — 2 —');head.formatting={headerParts:[{text:head.text}]};
 const before=JSON.stringify(physical),[i]=check(physical);assert.ok(i);assert.equal(i.text,physical.text.slice(i.start,i.end));assert.match(i.text,/AB 999/u);assert.equal(i.suggestion,'120 B.C.');assert.equal(JSON.stringify(physical),before);
 const unknown=structuredClone(physical),bad=unknown.blocks.find(b=>b.text==='AB 999 — 2 —');bad.formatting={};bad.runningHead=false;bad.layoutLabel=false;assert.equal(eraReferenceRanges(unknown).length,0);assert.equal(check(unknown).length,0);
});

test('true era openings preserve sentence-opening requirements rather than introducing a figure through a position suggestion',()=>{
 for(const marker of ['B.C.','C.E.','B.C.E.']){
  const text=marker+' 120 marked the event.',doc=make(text),[i]=check(doc);assert.ok(i,text);assert.equal(i.suggestion,null);assert.equal(i.eraOpeningRephrase,true);assert.equal(i.text,marker+' 120');assert.ok(i.references.some(c=>c.rule==='12.16'));
  const [body]=check('The event occurred in '+marker+' 120.');assert.equal(body.suggestion,'120 '+marker);
  assert.equal(check('120 '+marker+' marked the event.').length,0,'era position is already correct; separate opening owner remains available');
 }
 assert.equal(check('937 A.D. marked the event.')[0].suggestion,'A.D. 937');
 assert.equal(check('A.D. 937 marked the event.').length,0);
});

test('production owns each inverted era pair once without misidentifying a code or spelling out its year',()=>{
 for(const [valid,inverted,wanted] of examples){
  for(const phrase of [valid,inverted]){
   const text='The event occurred in '+phrase+'.',doc=make(text),start=text.indexOf(phrase),end=start+phrase.length,all=review(doc).filter(i=>i.start<end&&i.end>start);
   assert.equal(all.length,Number(phrase===inverted),phrase+' '+JSON.stringify(all.map(i=>[i.checkId,i.text,i.suggestion])));
   if(all.length){assert.equal(all[0].checkId,'gpo-era-references');assert.equal(all[0].suggestion,wanted);}
  }
 }
 const all=review('The event occurred in B.C. 120. The agency retains 2 records.');assert.equal(all.filter(i=>i.checkId==='gpo-era-references').length,1);assert.ok(all.some(i=>i.text==='2'&&i.suggestion==='two'));
 assert.equal(own('The event occurred in 254 B.C. and 120 C.E..').length,0);
 for(const marker of ['B.C.','C.E.','B.C.E.']){
  const beginning=review('254 '+marker+' marked the event.');assert.ok(beginning.some(i=>i.rule==='Numerals, general item 1'||i.checkId==='lcb-integer-opening-review'),marker+' true opening retained');
  assert.equal(review('The event occurred in 254 '+marker+'.').length,0,marker+' in-sentence era stays quiet');
  const inverted=review(marker+' 120 marked the event.');assert.equal(inverted.length,1,marker+' opening has one owner');assert.equal(inverted[0].checkId,'gpo-era-references');assert.equal(inverted[0].suggestion,null);assert.equal(inverted[0].eraOpeningRephrase,true);
 }
});
