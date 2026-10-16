import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';
import{makeDocument}from'../app/core.mjs';import{contextualPunctuationIssues}from'../app/style-punctuation.mjs';import{timePossessiveReviewIssues}from'../app/style-time-possessive-review.mjs';import{jointStylisticIssues}from'../app/joint-style.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const owned=i=>['Punctuation: Listed possessive forms','Punctuation: Time possessives'].includes(i.rule)||i.checkId==='lcb-time-possessive-review';
const direct=d=>[...contextualPunctuationIssues(d,refs),...timePossessiveReviewIssues(d,refs)].filter(owned),joint=d=>jointStylisticIssues(d,refs,{includeReviewSuggestions:true}).filter(owned);
const phrases=['workers compensation','drivers license','contractors licenses','one week notice','90 days notice','three years salary'];

test('explicit LCB possessive phrases do not match technical suffixes or reveal conditional fallback warnings',()=>{
 for(const phrase of phrases)for(const suffix of ['/key','\\key','#key','@key','.field','.α','.\u{10400}']){const doc=makeDocument(['The record is '+phrase+suffix+'.'],'Current');assert.equal(direct(doc).length,0,phrase+suffix);assert.equal(joint(doc).length,0,phrase+suffix);}
});

test('technical prefix boundaries protect whole source phrases including Unicode identifier bases',()=>{
 for(const phrase of phrases)for(const prefix of ['key/','key\\','key#','key@','key.','α.','\u{10400}.']){const doc=makeDocument(['The record is '+prefix+phrase+'.'],'Current');assert.equal(direct(doc).length,0,prefix+phrase);assert.equal(joint(doc).length,0,prefix+phrase);}
});

test('original struck and uncertain excluded technical marks cannot manufacture a prose possessive',()=>{
 for(const phrase of phrases)for(const [prefix,suffix]of [['','/key'],['','\\key'],['','#key'],['','@key'],['','.field'],['key/',''],['key\\',''],['key#',''],['key@',''],['key.','']])for(const mode of ['struck','excluded']){
  const text='The record is '+prefix+phrase+suffix+'.',doc=makeDocument([text],'Current'),at=prefix?doc.text.indexOf(prefix):doc.text.indexOf(suffix);doc[mode]=[{start:at,end:at+(prefix||suffix).length}];const before=structuredClone(doc);assert.equal(direct(doc).length,0,text+mode);assert.equal(joint(doc).length,0,text+mode);assert.deepEqual(doc,before);
 }
});

test('actual possessive errors, ordinary compound hyphens and separated narrative punctuation remain precise',()=>{
 for(const [text,wanted]of [['The workers compensation applies.','workers’ compensation'],['The drivers license applies.','driver’s license'],['The contractors licenses apply.','contractor’s licenses'],['The workers compensation-related benefits apply.','workers’ compensation'],['The agency’s one week notice applies.','one week’s notice'],['The agency requires 90 days notice.','90 days’ notice'],['The source lists drivers license: records.','driver’s license'],['The record lists workers compensation—additional details follow.','workers’ compensation']]){const doc=makeDocument([text],'Current'),issues=joint(doc);assert.ok(issues.some(i=>i.suggestion===wanted),text);}
 for(const text of ['The workers’ compensation applies.','The driver’s license applies.','The contractor’s licenses apply.','The agency requires 90 days’ notice.'])assert.equal(joint(makeDocument([text],'Current')).length,0,text);
 // Existing conditional reader review of a possible compound nominal head
 // remains separate; a genuine compound is not a technical delimiter.
 const compound=joint(makeDocument(['The source requires one week notice-related records.'],'Current'));assert.ok(compound.every(i=>i.reviewSuggested&&i.suggestion===null));
});

test('bill-local quoted forms reset per bill and all original quotation marks remain protected',()=>{
 const quoted=makeDocument(['The term “workers compensation” means the benefits. The workers compensation applies.'],'Current'),plain=makeDocument(['The workers compensation applies.'],'Current');assert.equal(joint(quoted).length,0);assert.equal(joint(plain).length,1);assert.equal(joint(quoted).length,0);
 for(const [open,close]of [['“','”'],['"','"'],['‘','’'],["'","'"]])for(const phrase of phrases){const doc=makeDocument(['The source says '+open+phrase+close+'.'],'Current');assert.equal(joint(doc).length,0,open+phrase);}
});

test('physical word/page divisions preserve genuine selections while technical divided terms stay protected',()=>{
 for(const suffix of ['','/key','.field']){const doc=makeDocument(['The people do enact as follows:\nline 1 The workers compen-','AB 224 — 2 —\nline 1 sation'+suffix+' applies.'],'Current',[],[],new Set(['compensation'])),head=doc.blocks.find(b=>b.text==='AB 224 — 2 —');head.formatting={headerParts:[{text:head.text}]};const before=structuredClone(doc),issues=joint(doc);assert.equal(issues.length,suffix?0:1,suffix);if(!suffix){const [issue]=issues;assert.equal(issue.text,doc.text.slice(issue.start,issue.end));assert.ok(issue.text.includes('compen-'));assert.equal(issue.suggestion,'workers’ compensation');}assert.deepEqual(doc,before);}
});

test('unrelated explicit word-choice findings and source text remain independent of possessive technical guards',()=>{
 const doc=makeDocument(['The record is workers compensation/key. The agency shall insure compliance.'],'Current'),before=structuredClone(doc),issues=jointStylisticIssues(doc,refs,{includeReviewSuggestions:true});assert.equal(issues.filter(owned).length,0);assert.ok(issues.some(i=>i.checkId==='word-choice'&&i.suggestion==='ensure'));assert.deepEqual(doc,before);
});
