import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeDocument}from '../app/core.mjs';import {jointStylisticIssues}from '../app/joint-style.mjs';
import {designatedOfficialTitleRecords,designatedTitleCreationIssues,designatedTitleReferenceIssues,designatedTitleProtectionRanges}from '../app/style-designated-titles.mjs';
const refs=Object.fromEntries(['lcb','gpo'].map(id=>[id,JSON.parse(fs.readFileSync(new URL('../app/data/'+id+'-reference.json',import.meta.url)))]));
const doc=text=>makeDocument([text],'Current');
const clause='This act shall be known, and may be cited, as the Community Data Sharing Act of 2026. ';
const tail='Funding shall support the community data sharing act of 2026.';
test('intact source designation forms retain exact title and naming-clause evidence',()=>{
 for(const [text,name]of [
  ['This article shall be known, and may be cited, as the “Safer Food Packaging Act of 2026.”','Safer Food Packaging Act of 2026'],
  ['This act shall be known, and may be cited, as The Child Abuse Mandated Entertainment Reporter Act (CAMERA).','Child Abuse Mandated Entertainment Reporter Act'],
  ['This chapter shall be known as the Transparency in Frontier Artificial Intelligence Act.','Transparency in Frontier Artificial Intelligence Act'],
  ['This part shall be known, and may be cited, as the “Cannabis Tax Law.”','Cannabis Tax Law'],
  ['This act shall be known, and may be cited, as the Family Preparedness Plan Act of 2025.','Family Preparedness Plan Act of 2025'],
  ['This act shall be known as the 2-1-1 Infrastructure and Emergency Response Act.','2-1-1 Infrastructure and Emergency Response Act'],
  ['This act shall be known, and may be cited, as the “Budget Act of 2026.”','Budget Act of 2026'],
  ['This act shall be known as the California Fair Elections Act of 2026.','California Fair Elections Act of 2026'],
  ['This act shall be known as the College Health and Safety Bond Act of 2026.','College Health and Safety Bond Act of 2026'],
  ['This code is known as the Community Safety Code.','Community Safety Code'],
  ['This law shall be known and shall be cited as "Public Health Law".','Public Health Law']
 ]){const d=doc(text),[r]=designatedOfficialTitleRecords(d);assert.ok(r,text);assert.equal(r.name,name);assert.equal(text.slice(r.start,r.end),name);assert.equal(text.slice(r.evidenceStart,r.evidenceEnd),r.declarationText);assert.equal(r.sourceKind,'Document-local intact self-designation');}
});
test('later exact complete title with year receives full-span reader review without replacement',()=>{
 const text=clause+tail,[i]=designatedTitleReferenceIssues(doc(text),refs);assert.ok(i);assert.equal(i.text,'community data sharing act of 2026');assert.equal(text.slice(i.start,i.end),i.text);assert.equal(i.checkId,'lcb-designated-title-reference-review');assert.equal(i.suggestion,null);assert.equal(i.references[0].preferred,null);assert.equal(i.titleWitness.name,'Community Data Sharing Act of 2026');assert.equal(text.slice(i.titleWitness.evidenceStart,i.titleWitness.evidenceEnd),i.titleWitness.declarationText);assert.equal(i.titleCaseEvidence.length,4);
 const all=jointStylisticIssues(doc(text),refs,{includeReviewSuggestions:true});assert.ok(all.some(x=>x.checkId===i.checkId&&x.start===i.start&&x.end===i.end));
});
test('quoted title only can establish a witness but quoted clauses and quoted later references cannot',()=>{
 const quoted='This act shall be known as the “Community Data Sharing Act of 2026.” ';
 assert.equal(designatedTitleReferenceIssues(doc(quoted+tail),refs).length,1);
 for(const text of ['The report states “'+clause.trim()+'” '+tail,'The example is “This act shall be known as the \'Community Data Sharing Act of 2026.\'” '+tail,'The report quotes ‘'+clause.trim()+'’ '+tail,clause+'The report quotes “community data sharing act of 2026”.']){assert.equal(designatedTitleReferenceIssues(doc(text),refs).length,0,text);}
 for(const text of ['This act shall be known as the “Community Data Sharing Act of 2026." '+tail,'This act shall be known as the "Community Data Sharing Act of 2026.” '+tail])assert.equal(designatedOfficialTitleRecords(doc(text)).length,0,text);
});
test('lowercase naming clauses including title-only quotes are reviewable without invented capitalization',()=>{
 for(const text of ['This law shall be known as the community safety law.','This code shall be known as the “Community safety Code.”']){const d=doc(text),[i]=designatedTitleCreationIssues(d,refs);assert.ok(i,text);assert.equal(i.suggestion,null);assert.equal(text.slice(i.start,i.end),i.text);assert.ok(jointStylisticIssues(d,refs,{includeReviewSuggestions:true}).some(x=>x.checkId===i.checkId));}
 assert.equal(designatedTitleCreationIssues(doc(clause),refs).length,0);
});
test('years larger names historical prose renamed names and earlier references cannot establish identity by substring',()=>{
 for(const name of ['community data sharing act','community data sharing act of 2025','Emergency Community Data Sharing Act of 2026','community data sharing act of 2026 advisory committee'])assert.equal(designatedTitleReferenceIssues(doc(clause+'Funding shall support the '+name+'.'),refs).length,0,name);
 assert.equal(designatedTitleReferenceIssues(doc(tail+' '+clause),refs).length,0);
 assert.equal(designatedTitleReferenceIssues(doc(clause+'The previous statute called the community data sharing act of 2026.'),refs).length,0);
 assert.equal(designatedTitleReferenceIssues(doc(clause+'The Community Data Sharing Act of 2026 is renamed the Public Data Act. '+tail),refs).length,0);
});
test('possible past nonbill and incomplete designation clauses are not witnesses',()=>{
 for(const text of ['This act may be known as the Community Data Sharing Act of 2026.','This act was known as the Community Data Sharing Act of 2026.','This act shall be known as the Community Data Sharing Act of 2026 to each office.','αThis act shall be known as the Community Data Sharing Act of 2026.','not-This act shall be known as the Community Data Sharing Act of 2026.'])assert.equal(designatedOfficialTitleRecords(doc(text+tail)).length,0,text);
 for(const property of ['struck','excluded'])for(const fragment of ['shall be','Community','2026']){const d=doc(clause+tail),start=d.text.indexOf(fragment);d[property]=[{start,end:start+fragment.length}];assert.equal(designatedOfficialTitleRecords(d).length,0,property+fragment);assert.equal(designatedTitleReferenceIssues(d,refs).length,0);}
});
test('every later title character must remain intact and competing witnesses cannot assert a canonical case',()=>{
 for(const property of ['struck','excluded']){const d=doc(clause+tail),start=d.text.lastIndexOf('sharing');d[property]=[{start,end:start+7}];assert.equal(designatedTitleReferenceIssues(d,refs).length,0);}
 assert.equal(designatedTitleReferenceIssues(doc(clause+'This act shall be known as the Community data Sharing Act of 2026. '+tail),refs).length,0);
});
test('source-established title protects only its own generic prefix and parser modifier changes',()=>{
 const text=clause+tail+' A data sharing agreement is required.',d=doc(text),start=text.lastIndexOf('data sharing act'),end=start+'data sharing'.length,candidate={start,end,engineRule:'LCB_DATA_SHARING_MODIFIER',suggestion:'data-sharing',text:text.slice(start,end)};
 const protections=designatedTitleProtectionRanges(d,refs);assert.ok(protections.some(p=>p.start<=start&&p.end>=end));
 const result=jointStylisticIssues(d,refs,{engineIssues:[candidate],includeReviewSuggestions:true});assert.ok(result.some(i=>i.checkId==='lcb-designated-title-reference-review'));
 assert.ok(result.some(i=>i.text==='data sharing'&&i.start>start),'ordinary prose remains checkable');
 assert.equal(result.filter(i=>i.start===start&&i.suggestion==='data-sharing').length,0);
});
test('important hyphen components and original wrapped source offsets are preserved',()=>{
 const text='This act shall be known as the Clean-Energy Community Act. Funding shall support the Clean-energy Community Act.',[i]=designatedTitleReferenceIssues(doc(text),refs);assert.ok(i);assert.equal(i.titleCaseEvidence[0].canonical,'Energy');assert.equal(text.slice(i.titleCaseEvidence[0].start,i.titleCaseEvidence[0].end),'energy');
 const divided='This act shall be known as the Community Transpor-\ntation Act. Funding shall support the community transpor-\ntation act.',[r]=designatedTitleReferenceIssues(doc(divided),refs);assert.ok(r);assert.equal(divided.slice(r.start,r.end),r.text);assert.equal(divided.slice(r.titleWitness.start,r.titleWitness.end),r.titleWitness.text);assert.equal(divided.slice(r.titleWitness.evidenceStart,r.titleWitness.evidenceEnd),r.titleWitness.declarationText);
});
