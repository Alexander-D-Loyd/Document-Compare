import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import{makeDocument}from '../app/core.mjs';
import{lcbSingleQuotePunctuationIssues,restoreSingleQuotePunctuationEvidence,LCB_SINGLE_QUOTE_PUNCTUATION_SCOPE}from '../app/style-lcb-single-quote-punctuation.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),make=t=>makeDocument(['The people do enact as follows:\nline 1 '+t],'Current'),check=d=>lcbSingleQuotePunctuationIssues(d,refs);

test('LCB single-quote comma and period boundaries retain the complete original enclosure evidence',()=>{
 for(const [open,close]of [['‘','’'],["'","'"]])for(const mark of [',','.'])for(const intro of ['The term ','A word ','The phrase ','The text reads ','The notice states ','The notice says ']){const doc=make(intro+open+'eligible applicant'+close+mark+' The following applies.'),saved=JSON.stringify(doc),found=check(doc);assert.equal(found.length,1,intro+open+mark);const i=found[0],e=i.singleQuotePunctuationEvidence;assert.equal(i.text,close+mark);assert.equal(i.suggestion,mark+close);assert.equal(i.rule,'Punctuation: Quotation Marks');assert.equal(i.guidePage,6);assert.equal(doc.text.slice(i.start,i.end),i.text);for(const r of [e.selection,e.proseIntro,e.enclosure])assert.equal(doc.text.slice(r.start,r.end),r.text);assert.equal(refs.lcb.pages[5].text.slice(e.sourceExample.start,e.sourceExample.end),e.sourceExample.text);assert.equal(JSON.stringify(doc),saved);}
 assert.match(LCB_SINGLE_QUOTE_PUNCTUATION_SCOPE,/quoted wording itself is not corrected/);
});

test('inside punctuation and unsupported apostrophe measurement identifier and technical cases remain quiet',()=>{
 for(const t of ['The term ‘eligible,’ applies.','The text reads \'eligible.\'','The term ‘eligible...’.','The text reads ‘eligible.’.','The term eligible’, applies.',"The text reads 'eligible.",'The term ‘’.','The term ‘12’.',"The measure is 6'.",'The term ‘https://example.gov’.','The filename \'eligible\'.','The code string \'eligible\'.','The text reads \'eligible.csv\'.','The term ‘eligible’, is a literal string.','The code defines \'field\', as its key.','The term ‘workers’ compensation’.','The term \'workers\' compensation\'.','The instruction says ‘eligible’.','The quoted ‘eligible’.'])assert.equal(check(make(t)).length,0,t);
});

test('unambiguous internal apostrophes and Unicode lexical payloads retain the proper enclosure',()=>{
 for(const t of ["The phrase 'tenant's fee'.",'The word ‘élève’.',"The term 'data-sharing'."]){const found=check(make(t));assert.equal(found.length,1,t);assert.equal(found[0].text,t.slice(-2));}
});

test('an outside dot attached to an identifier remains protected even if that original suffix is masked',()=>{
 for(const tail of ['2','key','α'])for(const field of [null,'struck','excluded']){const doc=make("The term 'eligible'."+tail),at=doc.text.length-tail.length;if(field)doc[field].push({start:at,end:at+tail.length});assert.equal(check(doc).length,0,String(field)+' '+tail);}
});

test('every source character in the prose introducer enclosure and outside punctuation must remain intact',()=>{
 for(const phrase of ['The term ‘eligible applicant’,',"The text reads 'eligible'."]){const doc=make(phrase),start=doc.text.indexOf(phrase);assert.equal(check(doc).length,1);for(const field of ['struck','excluded'])for(let at=start;at<start+phrase.length;at++){const damaged=structuredClone(doc);damaged[field].push({start:at,end:at+1});assert.equal(check(damaged).length,0,field+' '+at+' '+phrase);}}
});

test('nested and original damaged quotation enclosures remain protected',()=>{
 for(const outer of [['“','”'],['"','"'],['‘','’'],["'","'"]]){const text='The instruction states '+outer[0]+"The term 'eligible', applies."+outer[1],doc=make(text);assert.equal(check(doc).length,0,text);for(const field of ['struck','excluded'])for(const side of ['open','close']){const damaged=structuredClone(doc),at=side==='open'?doc.text.indexOf(outer[0]):doc.text.lastIndexOf(outer[1]);damaged[field].push({start:at,end:at+1});assert.equal(check(damaged).length,0,field+' '+side+' '+text);}}
});

test('complete table heading unknown exclusion and original partial-word evidence stay protected',()=>{
 const text='The term ‘eligible’, applies.',table=make(text);table.blocks.at(-1).formatting={headerGaps:[{},{},{}]};assert.equal(check(table).length,0);
 const heading=makeDocument([text+'\nThe people do enact as follows:\nOther text applies.'],'Current');assert.equal(check(heading).length,0);
 for(const [body,hidden]of [['xThe term ‘eligible’, applies.','x'],['The unknown term ‘eligible’, applies.','unknown']])for(const field of ['struck','excluded']){const doc=make(body),at=doc.text.indexOf(hidden);doc[field].push({start:at,end:at+hidden.length});assert.equal(check(doc).length,0,body+' '+field);}
 assert.equal(check(make('αThe term ‘eligible’, applies.')).length,0);
});

test('boundary punctuation remains independent of bill-local quoted term authority and preserves exact payload',()=>{
 const doc=make('‘eligible’ means this term. The term ‘eligible’, applies.'),saved=JSON.stringify(doc),found=check(doc);assert.equal(found.length,1);assert.equal(found[0].text,'’,');assert.equal(doc.text.slice(found[0].singleQuotePunctuationEvidence.enclosure.start,found[0].singleQuotePunctuationEvidence.enclosure.end),'‘eligible’');assert.equal(JSON.stringify(doc),saved);
});

test('recognized physical page heads retain closing-mark selection and all nested physical evidence',()=>{
 const doc=makeDocument(['The people do enact as follows:\nline 1 The phrase ‘eligible','AB 224 — 2 —\nline 1 applicant’, applies.'],'Current'),head=doc.blocks.find(b=>b.text==='AB 224 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};const saved=JSON.stringify(doc),found=check(doc);assert.equal(found.length,1);const i=found[0],e=i.singleQuotePunctuationEvidence,copy=JSON.stringify(e),restored=restoreSingleQuotePunctuationEvidence(e,x=>x,doc.text);assert.equal(i.start,doc.text.lastIndexOf('’,'));for(const r of [restored.selection,restored.proseIntro,restored.enclosure])assert.equal(doc.text.slice(r.start,r.end),r.text);assert.equal(restored.sourceText,doc.text.slice(restored.start,restored.end));assert.deepEqual(restored.sourceExample,e.sourceExample);assert.equal(JSON.stringify(e),copy);assert.equal(JSON.stringify(doc),saved);head.formatting={};head.runningHead=false;head.layoutLabel=false;assert.equal(check(doc).length,0);
});
