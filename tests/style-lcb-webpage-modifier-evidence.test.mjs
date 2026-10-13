import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';
import{makeDocument}from'../app/core.mjs';import{jointStylisticIssues}from'../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(x=>[x,JSON.parse(fs.readFileSync(new URL('../app/data/'+x+'-reference.json',import.meta.url)))])),make=t=>makeDocument(Array.isArray(t)?t:[t],'Current');
const issues=d=>jointStylisticIssues(d,refs).filter(i=>i.checkId==='listed-nouns'&&i.suggestion==='web page');
const excerpt='The information shall be posted on the stand-alone webpage for the specific election on an elections official’s internet website.';
test('actualSB3 wording supplies bounded noun evidence forLCB14 web page',()=>{
 assert.ok(refs.lcb.pages[13].lexicalEntries.includes('web page'));for(const text of[excerpt,'line 21 The information is on the\nline 22 stand-alone webpage for the specific election.','The information is on the stand-alone\nwebpage for the specific election.']){const doc=make(text),saved=JSON.stringify(doc),i=issues(doc)[0];assert.ok(i,text);assert.equal(i.text,'webpage');assert.equal(doc.text.slice(i.start,i.end),'webpage');assert.ok(i.references.some(r=>r.guideId==='lcb'&&r.guidePage===14&&r.sourcePassage.text==='web page'));assert.ok(!i.references.some(r=>r.guideId==='gpo'));assert.equal(JSON.stringify(doc),saved);assert.equal(issues(make(text.replace('webpage','web page'))).length,0);}
});
test('the bounded bridge retains unknown syntax, verbs, authentic-looking names and bill-local quoted terms',()=>{
 for(const text of['The information is on the standalone webpage for an election.','The information is on the stand-alone webpage unknown for an election.','The information is on the unfamiliar webpage for an election.','The agency shall stand-alone webpage for an election.','The Stand-Alone Webpage Program exists.','The stand-alone Webpage Program exists.','The term “webpage” is defined. '+excerpt,'The phrase “'+excerpt+'” is literal.'])assert.equal(issues(make(text)).length,0,text);
 assert.equal(issues(make(excerpt)).length,1,'quoted authority must not carry to a new bill');
});
test('every determiner, modifier, noun, connecting space and nominal continuation rejects source damage',()=>{
 for(const term of['the stand-alone','stand-alone','webpage','for']){const doc=make(excerpt),start=term==='for'?excerpt.indexOf(' for ')+1:doc.text.indexOf(term);doc.struck=[{start,end:start+term.length}];assert.equal(issues(doc).length,0,term);}
 for(const at of[excerpt.indexOf('stand-alone')-1,excerpt.indexOf('webpage')-1,excerpt.indexOf(' for ')]){const doc=make(excerpt);doc.struck=[{start:at,end:at+1}];assert.equal(issues(doc).length,0,'connecting space '+at);}
 for(const term of['the','stand-alone','webpage','for'])for(const tail of['é','\u0301','7'])for(const masked of[false,true]){const at=(term==='for'?excerpt.indexOf(' for ')+1:excerpt.indexOf(term))+term.length,doc=make(excerpt.slice(0,at)+tail+excerpt.slice(at));if(masked)doc.excluded.push({start:at,end:at+tail.length});assert.equal(issues(doc).length,0,term+tail+masked);}
});
test('uncertain excluded bridges, tables and unclassified heads cannot establish the noun',()=>{
 const text=excerpt.replace('stand-alone webpage','stand-alone unknown webpage'),doc=make(text),at=text.indexOf('unknown');doc.excluded.push({start:at,end:at+7});assert.equal(issues(doc).length,0);
 assert.equal(issues(make('The stand-alone webpage for the election........100')).length,0);
 const head=make(['The information is on the stand-alone','UNKNOWN HEADER\nwebpage for the election.']),b=head.blocks.find(x=>x.text==='UNKNOWN HEADER');b.ignored=true;head.excluded.push({start:b.start,end:b.end});assert.equal(issues(head).length,0);
});
test('reader-classified page heads preserve full bounded evidence and exact noun offsets',()=>{
 for(const [before,after]of[['The information is on the','stand-alone webpage for the election.'],['The information is on the stand-alone','webpage for the election.']]){const doc=make([before,'AB 3 — recognized page label 2 —\n'+after]),head=doc.blocks.find(b=>b.page===2&&b.text.startsWith('AB 3'));head.ignored=true;head.layoutLabel=true;head.formatting={headerParts:[{}]};doc.excluded.push({start:head.start,end:head.end});const saved=JSON.stringify(doc),i=issues(doc)[0];assert.ok(i,after);assert.equal(doc.text.slice(i.start,i.end),'webpage');assert.equal(JSON.stringify(doc),saved);}
});
