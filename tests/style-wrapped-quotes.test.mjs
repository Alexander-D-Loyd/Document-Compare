import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument} from '../app/core.mjs';import {styleContext} from '../app/style-context.mjs';import {wrappedStraightQuotes} from '../app/style-wrapped-quotes.mjs';import {jointStylisticIssues} from '../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))])),find=t=>jointStylisticIssues(makeDocument([t],'Current'),refs);
test('complete wrapped straight quotations protect source content across several style families',()=>{
 for(const text of ['The term "data sharing\nagreement" is defined.','The text "It won’t\napply" is literal.','The phrase "highly-qualified\napplicants" is defined.','The phrase "sixty\nfive people" is literal.','The term "low and\nmoderate-income families" is literal.']){assert.equal(find(text).length,0,text);const doc=makeDocument([text],'Current'),ctx=styleContext(doc);assert.equal(ctx.wrappedLiteralRanges.length,1);assert.equal(doc.text.slice(ctx.wrappedLiteralRanges[0].start,ctx.wrappedLiteralRanges[0].end),text.slice(text.indexOf('"'),text.lastIndexOf('"')+1));}
});
test('ordinary unquoted counterparts retain their required corrections',()=>{
 for(const [text,term,suggestion]of [['The data sharing\nagreement applies.','data sharing','data-sharing'],['It won’t\napply.','won’t','will not'],['The highly-qualified\napplicants apply.','highly-qualified','highly qualified'],['The agency retains sixty\nfive people.','sixty five','65'],['Support low and\nmoderate-income families.','low and\nmoderate-income','low- and moderate-income']]){const found=find(text);assert.ok(found.some(i=>i.text===term&&i.suggestion===suggestion),text);}
});
test('measurement marks and unmatched openings do not protect unrelated prose',()=>{
 for(const text of ['The panel is 2" wide.\nA highly-qualified applicant applies.','The panel is 2" wide.\nThe term "plain text" is defined. A data sharing agreement applies.','The term "unfinished\nA data sharing agreement applies.','The term "unfinished\nThe term "plain text" is defined. A data sharing agreement applies.']){const found=find(text);assert.ok(found.some(i=>['data-sharing','highly qualified'].includes(i.suggestion)),text);assert.equal(styleContext(makeDocument([text],'Current')).wrappedLiteralRanges.length,0,text);}
});
test('trusted interior running heads preserve exact cross-page quote offsets',()=>{
 const doc=makeDocument(['The term "data sharing','AB 1 — 2 —\nagreement" is defined.\nThe data sharing agreement applies.'],'Current'),head=doc.blocks.find(b=>b.ignored);assert.ok(head);head.formatting={headerParts:[{text:head.text}]};const ctx=styleContext(doc);assert.equal(ctx.wrappedLiteralRanges.length,1);const found=jointStylisticIssues(doc,refs).filter(i=>i.suggestion==='data-sharing');assert.equal(found.length,1);assert.ok(found[0].start>ctx.wrappedLiteralRanges[0].end);head.formatting={};assert.equal(styleContext(doc).wrappedLiteralRanges.length,0);
});
test('quote boundary commas and periods remain independently checked',()=>{
 for(const mark of ['.',',']){const text='The term "plain\ntext"'+mark+' applies.',found=find(text);assert.ok(found.some(i=>i.rule==='Punctuation: Quotation Marks'&&i.suggestion===mark+'"'),text);assert.equal(found.filter(i=>i.rule!=='Punctuation: Quotation Marks').length,0,text);}
});
test('strikeout, unsupported ignored bridges and excessive quote spans cannot establish a new literal',()=>{
 const doc=makeDocument(['The term "highly-qualified\napplicants" is defined.'],'Current'),start=doc.text.indexOf('highly');doc.struck=[{start,end:start+6}];assert.equal(styleContext(doc).wrappedLiteralRanges.length,0);assert.deepEqual(wrappedStraightQuotes('"word\n'+ 'a'.repeat(4096)+'"',()=>false),[]);assert.deepEqual(wrappedStraightQuotes('"word\ntext"',()=>true),[]);
});
test('corporation classification and conflicting-guide policies survive quote context changes',()=>{
 assert.ok(find('A "s" corporation applies.').some(i=>i.checkId==='corporation-letter'&&i.suggestion==='S'));assert.equal(find('The term "a \'s\' corporation\napplies" is literal.').length,0);assert.equal(find('The federal\ngovernment applies.').length,0);
});
