import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';
import {lcbListedReferenceFormIssues,restoreListedReferenceEvidence,LCB_LISTED_REFERENCE_FORM_SCOPE}from '../app/style-lcb-listed-reference-forms.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),make=body=>makeDocument(['The people do enact as follows:\nline 1 '+body],'Current'),check=doc=>lcbListedReferenceFormIssues(doc,refs);

test('the exact XIIIB and ASCII XIII-B aliases receive one whole printed Article form suggestion',()=>{
 for(const alias of ['XIIIB','XIII-B']){const doc=make('Article '+alias+' of the California Constitution applies.'),saved=JSON.stringify(doc),found=check(doc);assert.equal(found.length,1);const i=found[0],e=i.listedReferenceEvidence;assert.equal(i.text,'Article '+alias);assert.equal(i.suggestion,'Article XIII B');assert.equal(i.checkId,'lcb-listed-reference-form');assert.equal(i.guidePage,22);assert.equal(doc.text.slice(i.start,i.end),i.text);for(const range of [e.selection,e.identifier,e.continuation])assert.equal(doc.text.slice(range.start,range.end),range.text);assert.equal(e.sourceText,'Article '+alias+' of the California Constitution');assert.equal(refs.lcb.pages[21].text.slice(e.sourceExample.start,e.sourceExample.end),'Article XIII B');assert.deepEqual(i.references[0].sourcePassage,{start:e.sourceExample.start,end:e.sourceExample.end,text:e.sourceExample.text});assert.equal(JSON.stringify(doc),saved);}
 assert.match(LCB_LISTED_REFERENCE_FORM_SCOPE,/no source text/);
});

test('compliant spacing, other legal identities, case variants and missing qualifiers stay quiet',()=>{
 for(const text of ['Article XIII B of the California Constitution applies.','Article XIII of the California Constitution applies.','Article XIVB of the California Constitution applies.','Article XIIIAB of the California Constitution applies.','Article 13 B of the California Constitution applies.','article XIIIB of the California Constitution applies.','Article xiiib of the California Constitution applies.','ARTICLE XIIIB OF THE CALIFORNIA CONSTITUTION applies.','Article XIIIB applies.','Article XIIIB of the United States Constitution applies.','Article XIIIB of the Nevada Constitution applies.','Article XIIIB of a California Constitution applies.','Article XIIIB of the California Constitutions apply.','Article XIIIB under the California Constitution applies.','Article XIII–B of the California Constitution applies.','Article XIII—B of the California Constitution applies.','Article XIII‐B of the California Constitution applies.','Article XIII-\nB of the California Constitution applies.'])assert.equal(check(make(text)).length,0,text);
 assert.deepEqual(lcbListedReferenceFormIssues(make('Article XIIIB of the California Constitution applies.'),{}),[]);
});

test('Unicode original boundaries and technical/name extensions cannot manufacture the listed form',()=>{
 for(const text of ['xArticle XIIIB of the California Constitution applies.','αArticle XIIIB of the California Constitution applies.','Article XIIIBé of the California Constitution applies.','Article XIIIB\u0301 of the California Constitution applies.','Article XIIIB2 of the California Constitution applies.','Article XIIIB of the California Constitution2 applies.','Article XIIIB of the California Constitution\u0301 applies.','https://example.gov/Article XIIIB of the California Constitution applies.','identifier/Article XIIIB of the California Constitution applies.','Form Article XIIIB of the California Constitution applies.','Model Article XIIIB of the California Constitution applies.','Nevada Article XIIIB of the California Constitution applies.','Article XIIIB of the California Constitution Act applies.','Article XIIIB of the California Constitution/code applies.','Article XIIIB of the California Constitution.2 applies.','Article XIIIB of the California Constitution’s text applies.'])assert.equal(check(make(text)).length,0,text);
});

test('every selected and qualifying character, including whitespace, needs intact source evidence',()=>{
 for(const alias of ['XIIIB','XIII-B']){const phrase='Article '+alias+' of the California Constitution',doc=make(phrase+' applies.'),start=doc.text.indexOf(phrase);assert.equal(check(doc).length,1);for(const field of ['struck','excluded'])for(let at=start;at<start+phrase.length;at++){const damaged=structuredClone(doc);damaged[field].push({start:at,end:at+1});assert.equal(check(damaged).length,0,field+' '+alias+' '+at);}}
});

test('masked original word prefixes and title suffixes remain protective negative evidence',()=>{
 for(const [text,removed]of [['xArticle XIIIB of the California Constitution applies.','x'],['Article XIIIBz of the California Constitution applies.','z'],['Article XIIIB of the California Constitutionz applies.','z'],['Article XIIIB of the California Constitution Act applies.','Act'],['Nevada Article XIIIB of the California Constitution applies.','Nevada']])for(const field of ['struck','excluded']){const doc=make(text),start=doc.text.indexOf(removed);doc[field].push({start,end:start+removed.length});assert.equal(check(doc).length,0,field+' '+text);}
});

test('literal quotes and bill-local quoted aliases apply only to the loaded bill',()=>{
 for(const [open,close]of [['“','”'],['"','"'],['‘','’'],["'","'"]]){
  assert.equal(check(make('The instruction states '+open+'Article XIIIB of the California Constitution applies.'+close)).length,0);
  assert.equal(check(make(open+'Article XIIIB'+close+' means this reference. Article XIIIB of the California Constitution applies.')).length,0);
  assert.equal(check(make(open+'XIIIB'+close+' means this identifier. Article XIIIB of the California Constitution applies.')).length,0);
  assert.equal(check(make(open+'article XIII-B'+close+' means this reference. Article XIII-B of the California Constitution applies.')).length,0);
 }
 assert.equal(check(make('Article XIIIB of the California Constitution applies.')).length,1);
});

test('damaging either original quote endpoint cannot expose the literal reference payload',()=>{
 for(const [open,close]of [['“','”'],['"','"'],['‘','’'],["'","'"]])for(const field of ['struck','excluded'])for(const side of ['open','close']){const doc=make('The instruction states '+open+'Article XIIIB of the California Constitution applies.'+close),at=side==='open'?doc.text.indexOf(open):doc.text.lastIndexOf(close);doc[field].push({start:at,end:at+1});assert.equal(check(doc).length,0,field+' '+side+' '+open);}
});

test('headings tables and unknown excluded content do not establish a constitutional reference',()=>{
 const phrase='Article XIIIB of the California Constitution applies.';
 const heading=makeDocument([phrase+'\nThe people do enact as follows:\nOther text applies.'],'Current');assert.equal(check(heading).length,0);
 const table=make(phrase);table.blocks.at(-1).formatting={headerGaps:[{},{},{}]};assert.equal(check(table).length,0);
 const unknown=makeDocument(['The people do enact as follows:\nArticle XIIIB\nUnknown heading\nof the California Constitution applies.'],'Current'),block=unknown.blocks.find(b=>b.text==='Unknown heading');block.ignored=true;unknown.excluded.push({start:block.start,end:block.end});assert.equal(check(unknown).length,0);
});

test('recognized physical page heads retain exact selected and continuation evidence offsets',()=>{
 for(const pages of [['The people do enact as follows:\nline 1 Article','AB 224 — 2 —\nline 1 XIIIB of the California Constitution applies.'],['The people do enact as follows:\nline 1 Article XIIIB of the','AB 224 — 2 —\nline 1 California Constitution applies.']]){const doc=makeDocument(pages,'Current'),head=doc.blocks.find(b=>b.text==='AB 224 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};const saved=JSON.stringify(doc),issues=check(doc);assert.equal(issues.length,1);const i=issues[0],e=i.listedReferenceEvidence,restored=restoreListedReferenceEvidence(e,x=>x,doc.text);assert.equal(doc.text.slice(i.start,i.end),i.text);assert.equal(restored.sourceText,doc.text.slice(restored.start,restored.end));for(const range of [restored.selection,restored.identifier,restored.continuation])assert.equal(doc.text.slice(range.start,range.end),range.text);assert.deepEqual(restored.sourceExample,e.sourceExample);assert.equal(JSON.stringify(doc),saved);head.runningHead=false;head.layoutLabel=false;head.formatting={};assert.equal(check(doc).length,0);}
});
