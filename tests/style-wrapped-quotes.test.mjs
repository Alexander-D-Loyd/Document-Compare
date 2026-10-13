import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {styleContext} from '../app/style-context.mjs';import {wrappedStraightQuotes} from '../app/style-wrapped-quotes.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';import {corporationLetterIssues}from '../app/style-corporation-letters.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),find=t=>jointStylisticIssues(makeDocument([t],'Current'),refs);
test('complete wrapped straight quotations protect source content across several style families',()=>{
 for(const text of ['The term "data processing\nagreement" is defined.','The text "It won’t\napply" is literal.','The phrase "publicly-owned\nutility" is defined.','The phrase "sixty\nfive people" is literal.','The term "low and\nmoderate-income families" is literal.']){assert.equal(find(text).length,0,text);const doc=makeDocument([text],'Current'),ctx=styleContext(doc);assert.equal(ctx.wrappedLiteralRanges.length,1);assert.equal(doc.text.slice(ctx.wrappedLiteralRanges[0].start,ctx.wrappedLiteralRanges[0].end),text.slice(text.indexOf('"'),text.lastIndexOf('"')+1));}
});
test('ordinary unquoted counterparts retain their required corrections',()=>{
 for(const [text,term,suggestion]of [['The data processing\nagreement applies.','data processing','data-processing'],['It won’t\napply.','won’t','will not'],['The publicly-owned\nutility apply.','publicly-owned','publicly owned'],['The agency retains sixty\nfive people.','sixty five','65'],['Support low and\nmoderate-income families.','low and\nmoderate-income','low- and moderate-income']]){const found=find(text);assert.ok(found.some(i=>i.text===term&&i.suggestion===suggestion),text);}
});
test('measurement marks and unmatched openings do not protect unrelated prose',()=>{
 for(const text of ['The panel is 2" wide.\nA publicly-owned utility applies.','The panel is 2" wide.\nThe term "plain text" is defined. A data processing agreement applies.','The term "unfinished\nA data processing agreement applies.','The term "unfinished\nThe term "plain text" is defined. A data processing agreement applies.']){const found=find(text);assert.ok(found.some(i=>['data-processing','publicly owned'].includes(i.suggestion)),text);assert.equal(styleContext(makeDocument([text],'Current')).wrappedLiteralRanges.length,0,text);}
});
test('trusted interior running heads preserve exact cross-page quote offsets',()=>{
 const doc=makeDocument(['The term "data processing','AB 1 — 2 —\nagreement" is defined.\nThe data processing agreement applies.'],'Current'),head=doc.blocks.find(b=>b.ignored);assert.ok(head);head.formatting={headerParts:[{text:head.text}]};const ctx=styleContext(doc);assert.equal(ctx.wrappedLiteralRanges.length,1);const found=jointStylisticIssues(doc,refs).filter(i=>i.suggestion==='data-processing');assert.equal(found.length,0,'matching complete quoted term protects the later occurrence');head.formatting={};assert.equal(styleContext(doc).wrappedLiteralRanges.length,0);head.runningHead=false;head.layoutLabel=false;assert.ok(jointStylisticIssues(doc,refs).some(i=>i.suggestion==='data-processing'),'an unverified ignored bridge cannot establish authority');
});
test('quote boundary commas and periods remain independently checked',()=>{
 for(const mark of ['.',',']){const text='The term "plain\ntext"'+mark+' applies.',found=find(text);assert.ok(found.some(i=>i.rule==='Punctuation: Quotation Marks'&&i.suggestion===mark+'"'),text);assert.equal(found.filter(i=>i.rule!=='Punctuation: Quotation Marks').length,0,text);}
});
test('strikeout, unsupported ignored bridges and excessive quote spans cannot establish a new literal',()=>{
 const doc=makeDocument(['The term "publicly-owned\nutility" is defined.'],'Current'),start=doc.text.indexOf('publicly');doc.struck=[{start,end:start+'publicly'.length}];assert.equal(styleContext(doc).wrappedLiteralRanges.length,0);assert.deepEqual(wrappedStraightQuotes('"word\n'+ 'a'.repeat(4096)+'"',()=>false),[]);assert.deepEqual(wrappedStraightQuotes('"word\ntext"',()=>true),[]);
});
test('corporation classification and conflicting-guide policies survive quote context changes',()=>{
 assert.ok(corporationLetterIssues(makeDocument(['A "s" corporation applies.'],'Current'),refs).some(i=>i.checkId==='corporation-letter'&&i.suggestion==='S'));assert.ok(!find('A "s" corporation applies.').some(i=>i.checkId==='corporation-letter'));assert.equal(find('The term "a \'s\' corporation\napplies" is literal.').length,0);assert.equal(find('The federal\ngovernment applies.').length,0);
});




