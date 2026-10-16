import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';import {styleContext}from '../app/style-context.mjs';
import {jointStylisticIssues}from '../app/joint-style.mjs';import {lcbOpinionFormIssues}from '../app/style-lcb-opinion-forms.mjs';
import {normalizeStyleDocumentType,styleDocumentType}from '../app/style-document-type.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const make=(body,kind='opinion')=>({...makeDocument([body],'Current'),styleDocumentType:kind}),check=doc=>jointStylisticIssues(doc,refs).filter(i=>i.checkId==='lcb-opinion-forms');
test('document types are explicit and local while opinion and cover-letter numerals inherit the Bill base',()=>{
 assert.equal(styleDocumentType(makeDocument(['The title is Opinion.'],'Opinion')),'bill');assert.equal(normalizeStyleDocumentType('unexpected'),'bill');
 for(const kind of ['opinion','cover-letter']){const doc=make('The office has 2 employees.',kind);assert.equal(styleContext(doc).documentType,kind);assert.equal(styleContext(doc).at(0),'Bill');const found=jointStylisticIssues(doc,refs).find(i=>i.text==='2');assert.equal(found.suggestion,'two');assert.match(found.context,/Opinion|Cover letter/u);}
 const automatic=make('LEGISLATIVE COUNSEL’S DIGEST\nThe office has two employees.','bill');assert.equal(styleContext(automatic).at(automatic.text.indexOf('two')),'Digest');assert.equal(styleContext({...automatic,styleDocumentType:'opinion'}).at(automatic.text.indexOf('two')),'Bill');
});
test('opinion and cover-letter money uses one complete figure form and preserves the printed mills exception',()=>{
 for(const kind of ['opinion','cover-letter'])for(const [body,wanted]of [['The fee is ten dollars.','$10'],['The fee is ten dollars ($10).','$10'],['The fee is 10 dollars.','$10'],['The fee is fifty cents.','$0.50'],['The fee is four hundred fifty-seven dollars and forty-two cents ($457.42).','$457.42'],['The fee is two mills ($0.002).','2 mills'],['The fee is two-hundred-dollar ($200) minimum.','$200']]){
  const doc=make(body,kind),saved=JSON.stringify(doc),found=check(doc);assert.equal(found.length,1,body);const i=found[0];assert.equal(i.suggestion,wanted);assert.equal(doc.text.slice(i.start,i.end),i.text);assert.equal(i.documentTypeEvidence.sourceText,doc.text.slice(i.documentTypeEvidence.start,i.documentTypeEvidence.end));assert.equal(jointStylisticIssues(doc,refs).filter(x=>x.start<i.end&&x.end>i.start).length,1);assert.equal(JSON.stringify(doc),saved);
 }
 for(const body of ['The fee is $10.','The fee is $457.42.','The fee is 2 mills.'])assert.equal(check(make(body)).length,0,body);
 assert.equal(check(make('The fee is ten dollars.','bill')).length,0);
});
test('monetary disagreements request judgment without choosing an intended value',()=>{
 const [i]=check(make('The fee is ten dollars ($20).'));assert.ok(i);assert.equal(i.suggestion,null);assert.equal(i.conditionalSuggestion,'$10');assert.equal(i.reviewSuggested,true);
});
test('complete Section references and Opinion Constitution wording use the exact printed source context',()=>{
 for(const kind of ['opinion','cover-letter']){const doc=make('Under Section 123.5(a) et seq. the rule applies.',kind),[i]=check(doc);assert.equal(i.text,'et seq.');assert.equal(i.suggestion,'and following');assert.equal(i.guidePage,22);assert.ok(i.documentTypeEvidence.sourceText.startsWith('Section'));assert.equal(check(make('Under Section 123 and following the rule applies.',kind)).length,0);}
 const [i]=check(make('The State and Federal Constitutions apply.'));assert.equal(i.suggestion,'state and federal Constitutions');assert.equal(i.guidePage,20);
 assert.equal(check(make('State and federal Constitutions apply.')).length,0);assert.equal(check(make('The State and Federal Constitutions apply.','cover-letter')).length,0);
 for(const body of ['The phrase et seq. appears.','Under Section Alpha et seq. the rule applies.','Under Article 123 et seq. the rule applies.'])assert.equal(check(make(body)).length,0,body);
});
test('every original money and complete reference character is required, including spacing and quote endpoints',()=>{
 for(const phrase of ['ten dollars ($10)','Section 123 et seq.']){const doc=make('The text uses '+phrase+' here.'),start=doc.text.indexOf(phrase);assert.equal(lcbOpinionFormIssues(doc,refs).length,1);for(const field of ['struck','excluded'])for(let at=start;at<start+phrase.length;at++){const damaged=structuredClone(doc);damaged[field].push({start:at,end:at+1});assert.equal(lcbOpinionFormIssues(damaged,refs).length,0,field+' '+phrase+' '+at);}}
 for(const [open,close]of [['“','”'],['"','"'],['‘','’'],["'","'"]]){const doc=make('The text uses '+open+'ten dollars ($10)'+close+' here.');assert.equal(check(doc).length,0);for(const field of ['struck','excluded'])for(const at of [doc.text.indexOf(open),doc.text.lastIndexOf(close)]){const damaged=structuredClone(doc);damaged[field].push({start:at,end:at+1});assert.equal(check(damaged).length,0);}}
});
test('unknown technical amounts, extended names, tables and bill-local quoted forms remain protected',()=>{
 for(const body of ['The fee is − ten dollars.','The fee is 1.10 dollars.','The fee is ID.10 dollars.','The fee is ten dollars Act.','The fee is CAD ten dollars.','The fee is ten dollars-code.','The fee is ten dollars and one hundred cents.','The fee is ten unrelated dollars.','The fee is twenty thirty dollars.'])assert.equal(check(make(body)).length,0,body);
 const table=make('The fee is ten dollars.');table.blocks[0].formatting={headerGaps:[{},{},{}]};assert.equal(check(table).length,0);
 assert.equal(check(make('The term “Ten dollars” is defined. The fee is ten dollars.')).length,0);assert.equal(check(make('The fee is ten dollars.')).length,1);
});
test('production review preserves complete nested physical coordinates across recognized page heads',()=>{
 for(const pages of [['The fee is ten','AB 224 — 2 —\nline 1 dollars ($10).'],['Under Section 123','AB 224 — 2 —\nline 1 et seq. the rule applies.']]){
  const doc={...makeDocument(pages,'Current'),styleDocumentType:'opinion'},head=doc.blocks.find(b=>b.text==='AB 224 — 2 —');head.formatting={headerParts:[{start:0,end:head.text.length,anchor:'left'}]};const saved=JSON.stringify(doc),[i]=check(doc);assert.ok(i);assert.equal(doc.text.slice(i.start,i.end),i.text);const e=i.documentTypeEvidence;assert.equal(doc.text.slice(e.start,e.end),e.sourceText);assert.equal(refs.lcb.pages[e.sourceExample.guidePage-1].text.slice(e.sourceExample.start,e.sourceExample.end),e.sourceExample.text);assert.equal(JSON.stringify(doc),saved);
 }
});
