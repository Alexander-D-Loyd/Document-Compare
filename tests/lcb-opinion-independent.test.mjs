import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';import {styleContext}from '../app/style-context.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';import {lcbOpinionFormIssues}from '../app/style-lcb-opinion-forms.mjs';import {styleDocumentType,normalizeStyleDocumentType}from '../app/style-document-type.mjs';import {workerWords}from './helpers/spelling-worker.mjs';
const words=await workerWords(),refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=(body,type='opinion')=>({...makeDocument([body],'Independent Opinion',[],[],words),styleDocumentType:type});
const check=(doc,joint=false)=>{const original=JSON.stringify(doc),found=joint?jointStylisticIssues(doc,refs).filter(i=>i.checkId==='lcb-opinion-forms'):lcbOpinionFormIssues(doc,refs);assert.equal(JSON.stringify(doc),original);for(const i of found){assert.equal(doc.text.slice(i.start,i.end),i.text);const e=i.documentTypeEvidence;assert.equal(doc.text.slice(e.start,e.end),e.sourceText);const page=refs.lcb.pages[e.sourceExample.guidePage-1];assert.equal(page.text.slice(e.sourceExample.start,e.sourceExample.end),e.sourceExample.text);}return found;};

test('independent document types are exact explicit choices and never persist to another document',()=>{
 for(const invalid of [undefined,null,'Opinion','cover letter',{},'digest','resolution'])assert.equal(normalizeStyleDocumentType(invalid),'bill');
 for(const kind of ['opinion','cover-letter']){const doc=make('LEGISLATIVE COUNSEL’S DIGEST\nThe office has 2 employees.',kind);assert.equal(styleDocumentType(doc),kind);assert.equal(styleContext(doc).at(doc.text.indexOf('2')),'Bill');assert.equal(jointStylisticIssues(doc,refs).find(i=>i.text==='2').suggestion,'two');assert.equal(check(make('The fee is ten dollars.',kind)).length,1);}
 assert.equal(check(make('The fee is ten dollars.','bill')).length,0);const doc=make('The fee is ten dollars.');assert.equal(check(doc).length,1);doc.styleDocumentType='bill';assert.equal(check(doc).length,0);doc.styleDocumentType='cover-letter';assert.equal(check(doc).length,1);
});
test('independent complete monetary values cannot select only a suffix following internal scale-and',()=>{
 for(const whole of ['one hundred and ten dollars','four hundred and fifty-seven dollars and forty-two cents','one thousand and one cents']){const doc=make('The fee is '+whole+'.'),at=doc.text.indexOf(whole);for(const i of check(doc,true))assert.ok(i.start===at&&i.end===at+whole.length,'No isolated monetary suffix: '+i.text);}
});
test('independent repeated cents are separate quantities and cannot be summed into an asserted value',()=>{
 for(const body of ['The fee is fifty cents and ten cents.','The fee is ten cents and twenty-five cents.','The fee is ten mills and two cents.'])for(const i of check(make(body),true))assert.ok(!i.text.includes(' and '),'Do not total independent quantities '+body);
});
test('independent quoted monetary components and reference tails override document-type normalization locally',()=>{
 for(const body of ['The term “ten dollars” is defined. The fee is ten dollars ($10).','The term “fifty cents” is defined. The fee is ten dollars and fifty cents.','The term “et seq.” is defined. Under Section 123 et seq. the rule applies.'])assert.equal(check(make(body),true).length,0,body);
 assert.equal(check(make('The fee is ten dollars ($10).'),true).length,1);assert.equal(check(make('Under Section 123 et seq. the rule applies.'),true).length,1);
});
test('independent exact disagreements do not assert a monetary value and coherent full values retain one owner',()=>{
 for(const type of ['opinion','cover-letter']){const doc=make('The fee is ten dollars ($20).',type),[i]=check(doc,true);assert.equal(i.suggestion,null);assert.equal(i.conditionalSuggestion,'$10');assert.equal(i.reviewSuggested,true);const full=make('The fee is four hundred fifty-seven dollars and forty-two cents ($457.42).',type),[good]=check(full,true);assert.equal(good.suggestion,'$457.42');assert.equal(jointStylisticIssues(full,refs).filter(i=>i.start<good.end&&i.end>good.start).length,1);}
});
test('independent original source and literal boundaries cannot manufacture special monetary or reference forms',()=>{
 for(const phrase of ['ten dollars ($10)','Section 123.5(a) et seq.','state and federal constitutions']){const original=make('The text uses '+phrase+' here.'),at=original.text.indexOf(phrase);assert.equal(check(original).length,1);for(const field of ['struck','excluded'])for(let offset=at;offset<at+phrase.length;offset++){const doc=structuredClone(original);doc[field].push({start:offset,end:offset+1});assert.equal(check(doc).length,0,field+' '+phrase+' '+offset);}}
 for(const [open,close]of [['“','”'],['"','"'],['‘','’'],["'","'"]])for(const phrase of ['ten dollars ($10)','Section 123 et seq.']){const original=make('The instruction says '+open+phrase+close+'.');assert.equal(check(original).length,0);for(const field of ['struck','excluded'])for(const at of [original.text.indexOf(open),original.text.lastIndexOf(close)]){const doc=structuredClone(original);doc[field].push({start:at,end:at+1});assert.equal(check(doc).length,0,field+open);}}
});
test('independent special-type whole evidence retains physical coordinates through recognized word divisions',()=>{
 for(const [pages,wanted]of [[['The fee is four hun-','AB 224 — 2 —\nline 1 dred fifty-seven dollars and forty-two cents ($457.42).'],'$457.42'],[['Under Sec-','AB 224 — 2 —\nline 1 tion 123 et seq. the rule applies.'],'and following']]){const doc={...makeDocument(pages,'Current',[],[],words),styleDocumentType:'opinion'},head=doc.blocks.find(b=>b.text==='AB 224 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};const found=check(doc,true);assert.equal(found.length,1);assert.equal(found[0].suggestion,wanted);}
});
test('independent repeated cents digits in parenthetical figures cannot move components or crash review',()=>{
 for(const body of ['The fee is 10 dollars and 10 cents ($10.10).','The fee is ten dollars and 10 cents ($10.10).','The fee is 457 dollars and 42 cents ($457.42).']){const doc=make(body),found=check(doc,true);assert.equal(found.length,1);assert.equal(found[0].suggestion,body.includes('457')?'$457.42':'$10.10');}
 const protectedDoc=make('The term “10 cents” is defined. The fee is ten dollars and 10 cents ($10.10).');assert.equal(check(protectedDoc,true).length,0);
});
test('independent monetary canonical parsing does not invent a value from and before a scale',()=>{
 for(const body of ['The fee is one hundred and thousand dollars.','The fee is one thousand and million dollars.','The fee is one hundred and and ten dollars.'])assert.equal(check(make(body)).length,0,body);
 for(const type of ['opinion','cover-letter']){const [i]=check(make('The fee is one hundred and ten dollars.',type),true);assert.ok(i);assert.equal(i.text,'one hundred and ten dollars');assert.equal(i.suggestion,'$110');}
});
test('independent malformed grouped and ratio-like monetary tokens cannot expose valid suffix amounts',()=>{
 for(const body of ['The fee is 1,1100 dollars.','The fee is 1,1234 dollars.','The fee is 1:1100 dollars.','The fee is ten dollars and 1,42 cents.'])for(const field of [null,'struck','excluded']){const doc=make(body);if(field){const prefix=body.includes('1:')?'1:':'1,',at=doc.text.indexOf(prefix);doc[field].push({start:at,end:at+prefix.length});}assert.equal(check(doc).length,0,String(field)+' '+body);}
});
test('independent sentence-opening money preserves whole values without proposing a figure-start replacement',()=>{
 for(const kind of['opinion','cover-letter'])for(const amount of['Ten dollars','One hundred and ten dollars','Fifty cents','Two mills'])for(const prefix of['','(a) '])assert.equal(check(make(prefix+amount+' shall be paid.',kind),true).length,0,'Spelled-out source satisfies the general opening rule');
 for(const kind of['opinion','cover-letter'])for(const amount of['10 dollars','Ten dollars ($10)','10 dollars ($10)','$10'])for(const prefix of['','(a) ']){const doc=make(prefix+amount+' shall be paid.',kind),found=check(doc,true);assert.equal(found.length,1,kind+' '+prefix+amount);const i=found[0];assert.equal(i.text,amount);assert.equal(i.suggestion,null);assert.equal(i.reviewSuggested,true);assert.ok(i.references.some(r=>r.guidePage===21));assert.ok(i.references.some(r=>r.guidePage===23));assert.match(i.message,/opening|rephras/iu);assert.equal(jointStylisticIssues(doc,refs,{includeReviewSuggestions:true}).filter(j=>j.start<i.end&&j.end>i.start).length,1,'One whole opening owner');}
 for(const kind of['opinion','cover-letter']){const [i]=check(make('Ten dollars ($20) shall be paid.',kind),true);assert.ok(i);assert.equal(i.suggestion,null);assert.match(i.message,/disagree/iu);assert.ok(i.references.some(r=>r.guidePage===21));}
});
